import test from 'node:test';
import assert from 'node:assert/strict';
import { epreuves } from '../src/data/epreuves.ts';
import { createDuel, duelReducer, newProgress, progressReducer, resolveEpreuve, SELECTION_ORDER } from '../src/duel/engine.ts';
import { parseDuel, readDuel, readHistory, saveDuel, DUEL_KEY, HISTORY_KEY } from '../src/duel/storage.ts';

// Ces épreuves d'essai se jouent sur un seul écran, comme les répétitions : elles exercent le moteur local du duel.
// (Dans le vrai catalogue, les cinq épreuves se jouent en temps réel : voir le dernier test.)
const question = { ...epreuves.find(epreuve => epreuve.type === 'citation'), realtime: undefined };
const catalog = Array.from({ length: 6 }, (_, index) => ({ ...question, id: `fixture-${index}`, questions: [question.questions[0]] }));
const fresh = () => createDuel('Alice', 'Bob', 'match-test');
function selectedMatch() {
  return catalog.slice(0, 5).reduce((session, epreuve, index) => duelReducer(session, {
    type: 'select', epreuveId: epreuve.id, difficulty: ['D', 'C', 'B', 'A', 'B'][index],
  }, catalog), fresh());
}

test('selection enforces 2 + 2 + 1, distinct games, five choices and classes', () => {
  let session = fresh();
  for (const epreuve of epreuves.slice(0, 3)) session = duelReducer(session, { type: 'select', epreuveId: epreuve.id, difficulty: 'B' }, epreuves);
  assert.equal(session.selected.length, 3);
  assert.equal(duelReducer(session, { type: 'start' }, epreuves).phase, 'selection');
  assert.equal(duelReducer(session, { type: 'select', epreuveId: epreuves[0].id, difficulty: 'A' }, epreuves), session);
  assert.equal(duelReducer(fresh(), { type: 'select', epreuveId: epreuves[0].id, difficulty: 'X' }, epreuves).selected.length, 0);
  session = selectedMatch();
  assert.equal(session.phase, 'ready');
  assert.deepEqual(session.selected.map(item => item.selectedBy), SELECTION_ORDER);
  assert.equal(duelReducer(session, { type: 'select', epreuveId: catalog[5].id, difficulty: 'D' }, catalog), session);
  const undone = duelReducer(session, { type: 'undo' }, catalog);
  assert.equal(undone.phase, 'selection');
  assert.equal(undone.selected.length, 4);
  assert.equal(duelReducer(undone, { type: 'select', epreuveId: catalog[5].id, difficulty: 'A' }, catalog).selected[4].selectedBy, 'host');
});

test('complete five-game LIVE, alternating respondents, no double scoring, exact detailed totals', () => {
  let session = duelReducer(selectedMatch(), { type: 'start' }, catalog);
  for (let index = 0; index < 5; index++) {
    assert.equal(session.currentIndex, index);
    assert.equal(duelReducer(session, { type: 'undo' }, catalog), session);
    session = duelReducer(session, { type: 'respondent', playerId: index % 2 ? 'player2' : 'player1' }, catalog);
    const action = { type: 'validate', result: { roundId: question.questions[0].id, correct: true, points: 100, answer: ['Luffy'] } };
    session = duelReducer(session, action, catalog);
    const again = duelReducer(session, action, catalog);
    assert.deepEqual(again.players, session.players);
    assert.equal(again.progress.rounds.length, 1);
    assert.deepEqual(parseDuel(JSON.parse(JSON.stringify(session)), catalog), session);
    session = duelReducer(session, { type: 'next' }, catalog);
  }
  assert.equal(session.phase, 'recap');
  assert.equal(session.results.length, 5);
  // Un point par épreuve gagnée : joueur 1 a gagné les épreuves 1, 3 et 5, joueur 2 les 2 et 4
  assert.equal(session.players.player1.score, 3);
  assert.equal(session.players.player2.score, 2);
  // Le détail des points de chaque épreuve reste dans son résultat, pour l'historique
  assert.deepEqual(session.results.map(result => [result.scorePlayer1, result.scorePlayer2]), [[100, 0], [0, 100], [100, 0], [0, 100], [100, 0]]);
  assert.equal(session.progress.rounds.length, 0);
  assert.deepEqual(parseDuel(session, catalog), session);
  assert.equal(duelReducer(session, { type: 'next' }, catalog), session);
});

test('saved games reject corrupt, solo, stale, missing or invalid state', () => {
  assert.equal(parseDuel(null, catalog), null);
  assert.equal(parseDuel({ playerName: 'Solo', selectedIds: [] }, catalog), null);
  assert.equal(parseDuel({ ...fresh(), phase: 'playing' }, catalog), null);
  assert.equal(parseDuel({ ...selectedMatch(), currentIndex: 8 }, catalog), null);
  assert.equal(parseDuel({ ...fresh(), progress: { ...newProgress(), rounds: ['bad'] } }, catalog), null);
  assert.equal(parseDuel(selectedMatch(), []), null);
  assert.equal(parseDuel({ ...fresh(), players: {} }, catalog), null);
});

test('round state resumes without changing attribution or replaying a validation', () => {
  const active = resolveEpreuve(epreuves.find(epreuve => epreuve.type === 'logic-links'), 'A');
  let progress = progressReducer(newProgress(), { type: 'respondent', playerId: 'player2' }, active);
  progress = progressReducer(progress, { type: 'edit', patch: { placements: active.logicPuzzles[0].solutionIds } }, active);
  assert.equal(progress.respondent, 'player2');
  assert.equal(progress.placements.length, 6);
  progress = progressReducer(progress, { type: 'validate', result: { roundId: active.logicPuzzles[0].id, points: 600, correct: true, answer: progress.placements } }, active);
  assert.equal(progressReducer(progress, { type: 'respondent', playerId: 'player1' }, active), progress);
  assert.equal(progressReducer(progress, { type: 'edit', patch: { placements: [] } }, active), progress);
});

test('local storage preserves legacy data and archives a finished duel once', () => {
  const memory = new Map([['anime-quiz-session', 'legacy']]);
  globalThis.localStorage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value) };
  let session = duelReducer(selectedMatch(), { type: 'start' }, catalog);
  for (let i = 0; i < 5; i++) {
    session = duelReducer(session, { type: 'validate', result: { roundId: question.questions[0].id, correct: false, points: 0, answer: [] } }, catalog);
    session = duelReducer(session, { type: 'next' }, catalog);
  }
  saveDuel(session, catalog); saveDuel(session, catalog);
  assert.equal(readHistory(catalog).length, 1);
  assert.equal(readDuel(catalog).session.id, session.id);
  assert.equal(memory.get('anime-quiz-session'), 'legacy');
  memory.set(DUEL_KEY, '{broken');
  assert.equal(readDuel(catalog).session, null);
  assert.ok(readDuel(catalog).warning);
  memory.set(HISTORY_KEY, '{}');
  assert.deepEqual(readHistory(catalog), []);
  delete globalThis.localStorage;
});

test('le vrai catalogue : cinq épreuves en temps réel, closes par leurs points, un point de duel par épreuve gagnée', () => {
  assert.equal(epreuves.length, 5);
  assert.deepEqual(epreuves.map(epreuve => epreuve.realtime), ['beats', 'ayanokoji', 'citations', 'feud', 'dossier']);
  assert.deepEqual(epreuves.filter(epreuve => epreuve.classless).map(epreuve => epreuve.id), ['citations-cultes', 'pensees-anya', 'dossier-l']);
  let session = createDuel('Kagami', 'Rico', 'live-1');
  for (const epreuve of epreuves) session = duelReducer(session, { type: 'select', epreuveId: epreuve.id, difficulty: 'D' }, epreuves);
  assert.equal(session.phase, 'ready');
  session = duelReducer(session, { type: 'start' }, epreuves);
  assert.deepEqual(parseDuel(JSON.parse(JSON.stringify(session)), epreuves), session);
  // Une épreuve en temps réel ne se joue pas dans le site : seules sa clôture et ses points y entrent
  assert.equal(duelReducer(session, { type: 'next' }, epreuves), session);
  assert.equal(duelReducer(session, { type: 'validate', result: { roundId: 'x', points: 10, correct: true, answer: [] } }, epreuves), session);
  const scores = [[12, 30], [250, 100], [300, 300], [44, 81], [3, 1]];
  for (const [index, [player1, player2]] of scores.entries()) {
    assert.equal(session.currentIndex, index);
    session = duelReducer(session, { type: 'complete', scores: { player1, player2 } }, epreuves);
    assert.deepEqual(parseDuel(JSON.parse(JSON.stringify(session)), epreuves), session, `sauvegarde après l'épreuve ${index + 1}`);
  }
  assert.equal(session.phase, 'recap');
  // Joueur 2 gagne les épreuves 1 et 4, joueur 1 les 2 et 5 ; l'égalité de la 3 ne rapporte rien à personne
  assert.deepEqual([session.players.player1.score, session.players.player2.score], [2, 2]);
  assert.deepEqual(session.results.map(result => [result.scorePlayer1, result.scorePlayer2]), scores);
  assert.equal(duelReducer(session, { type: 'complete', scores: { player1: 9, player2: 9 } }, epreuves), session);
});
