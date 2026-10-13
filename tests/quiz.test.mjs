import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { QUIZ_ATTEMPTS, QUIZ_LOCK_MS, canBuzz, createQuiz, hostQuiz, pressQuizBuzzer, quizView } from '../src/quiz/reducer.ts';
import { quizItems } from '../server/quizData.ts';
import { startServer } from '../server/index.ts';

const ITEMS = [
  { id: 'a', prompt: 'Première réplique', answer: 'Luffy', points: 100 },
  { id: 'b', answer: 'Naruto', points: 5, audioSrc: '/extrait.mp3', imageSrc: '/reponse.jpg' },
];
const context = { room: 'T', names: { player1: 'Kagami', player2: 'Rico' }, connected: { player1: true, player2: true }, now: 0 };
const host = (state, type, now = 1000) => hostQuiz(state, { type }, now, ITEMS);

test('les questions viennent du catalogue : sept morceaux par classe, et les répliques', () => {
  for (const level of ['D', 'C', 'B', 'A']) {
    const items = quizItems('beats', level);
    assert.equal(items.length, 7, level);
    assert.ok(items.every((item, index) => index === 0 || item.points > items[index - 1].points), 'chaque morceau vaut plus que le précédent');
  }
  assert.equal(quizItems('beats', 'D')[0].points, 3);
  assert.ok(quizItems('beats', 'D')[0].audioSrc.includes('CLASSE%20D'));
  const citations = quizItems('citations', null);
  assert.ok(citations.length >= 5);
  assert.ok(citations.every(item => item.prompt && item.answer && item.points === 100));
});

test('premier buzz, erreur qui bloque sept secondes, deux tentatives, puis révélation', () => {
  const state = createQuiz('beats', 'D');
  assert.equal(pressQuizBuzzer(state, 'player1', 0), 'Le buzzer est fermé.');
  host(state, 'quiz:open');
  assert.equal(pressQuizBuzzer(state, 'player1', 1000), null);
  assert.equal(pressQuizBuzzer(state, 'player2', 1000), "Quelqu'un a déjà buzzé.");
  host(state, 'quiz:wrong', 1000);
  assert.deepEqual(state.attempts, { player1: QUIZ_ATTEMPTS - 1, player2: QUIZ_ATTEMPTS });
  // Pour un morceau, le buzzer ne se rouvre que quand le présentateur relance la musique
  assert.equal(state.phase, 'idle');
  host(state, 'quiz:open');
  assert.equal(canBuzz(state, 'player1', 1000 + QUIZ_LOCK_MS - 1), false);
  assert.equal(pressQuizBuzzer(state, 'player1', 1000 + QUIZ_LOCK_MS - 1), 'Ton buzzer est encore bloqué.');
  assert.equal(canBuzz(state, 'player2', 1001), true, "l'adversaire, lui, peut buzzer tout de suite");
  assert.equal(pressQuizBuzzer(state, 'player1', 1000 + QUIZ_LOCK_MS), null);
  host(state, 'quiz:wrong', 9000);
  assert.equal(state.attempts.player1, 0);
  host(state, 'quiz:open');
  assert.equal(pressQuizBuzzer(state, 'player1', 99999), "Tu n'as plus de tentative sur cette question.");
  for (let attempt = 0; attempt < 2; attempt++) { host(state, 'quiz:open'); pressQuizBuzzer(state, 'player2', 99999 + attempt * 10000); host(state, 'quiz:wrong', 99999 + attempt * 10000); }
  assert.equal(host(state, 'quiz:open'), "Plus personne n'a de tentative : révèle la réponse.");
  assert.equal(host(state, 'quiz:next'), "Révèle d'abord la réponse.");
  host(state, 'quiz:reveal');
  assert.equal(state.phase, 'revealed');
  assert.deepEqual(state.scores, { player1: 0, player2: 0 }, 'une erreur ne coûte rien');
});

test('bonne réponse : les points vont au joueur, la réponse se révèle, les tentatives repartent à la question suivante', () => {
  const state = createQuiz('citations');
  host(state, 'quiz:open');
  pressQuizBuzzer(state, 'player2', 0);
  host(state, 'quiz:wrong', 0);
  assert.equal(state.phase, 'open', 'pour une réplique, le buzzer se rouvre aussitôt');
  pressQuizBuzzer(state, 'player1', 10);
  host(state, 'quiz:correct');
  assert.deepEqual(state.scores, { player1: 100, player2: 0 });
  assert.equal(state.phase, 'revealed');
  assert.equal(quizView(state, 'live', context, ITEMS).revealed.winner, 'player1');
  host(state, 'quiz:next');
  assert.equal(state.itemIndex, 1);
  assert.deepEqual(state.attempts, { player1: 2, player2: 2 });
  host(state, 'quiz:open'); pressQuizBuzzer(state, 'player2', 20); host(state, 'quiz:correct');
  host(state, 'quiz:next');
  assert.equal(state.phase, 'done');
  assert.deepEqual(state.scores, { player1: 100, player2: 5 });
  assert.equal(host(state, 'quiz:next'), "L'épreuve est terminée.");
  // Annuler revient un cran en arrière
  host(state, 'quiz:undo');
  assert.equal(state.phase, 'revealed');
});

test('la réponse, son image et l\'extrait ne quittent le serveur que vers le présentateur', () => {
  const state = createQuiz('beats', 'D');
  state.itemIndex = 1;
  host(state, 'quiz:open');
  for (const role of ['player1', 'live']) {
    const raw = JSON.stringify(quizView(state, role, context, ITEMS));
    for (const secret of ['Naruto', 'Luffy', '/extrait.mp3', '/reponse.jpg', '"items"', '"answer"']) assert.ok(!raw.includes(secret), `${role} : ${secret}`);
  }
  const console_ = quizView(state, 'host', context, ITEMS);
  assert.equal(console_.answer, 'Naruto');
  assert.equal(console_.audioSrc, '/extrait.mp3');
  pressQuizBuzzer(state, 'player1', 0); host(state, 'quiz:correct');
  const live = quizView(state, 'live', context, ITEMS);
  assert.deepEqual(live.revealed, { answer: 'Naruto', imageSrc: '/reponse.jpg', winner: 'player1' });
  assert.ok(!JSON.stringify(live).includes('/extrait.mp3'));
});

function connect(port, room, role) {
  const socket = new WebSocket(`ws://127.0.0.1:${port}`);
  const client = { quiz: null, show: null, game: null, errors: [], socket };
  const waiters = [];
  socket.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.type === 'room:error') client.errors.push(message.message);
    if (message.type === 'quiz:state') client.quiz = message.view;
    if (message.type === 'show:state') { client.show = message.show; client.game = message.game; }
    for (const waiter of [...waiters]) if (waiter.test()) { waiters.splice(waiters.indexOf(waiter), 1); waiter.resolve(); }
  };
  client.send = message => socket.send(JSON.stringify(message));
  client.until = (check, label = 'condition') => new Promise((resolve, reject) => {
    const guarded = () => { try { return check(client); } catch { return false; } };
    if (guarded()) return resolve();
    const timer = setTimeout(() => reject(new Error(`Jamais atteint : ${label}`)), 6000);
    waiters.push({ test: guarded, resolve: () => { clearTimeout(timer); resolve(); } });
  });
  client.close = () => new Promise(resolve => { socket.onclose = resolve; socket.close(); });
  client.ready = new Promise(resolve => { socket.onopen = () => { client.send({ type: 'room:join', room, role }); resolve(); }; });
  return client;
}

test('en temps réel : Killer Bee au buzzer, puis l\'écran d\'émission entre deux épreuves', async () => {
  const server = startServer({ port: 18791, hostPassword: '', storeFile: join(mkdtempSync(join(tmpdir(), 'quiz-')), 'rooms.json') });
  try {
    const host = connect(server.port, 'TEST', 'host'), live = connect(server.port, 'TEST', 'live');
    const p1 = connect(server.port, 'TEST', 'player1'), p2 = connect(server.port, 'TEST', 'player2');
    await Promise.all([host.ready, live.ready, p1.ready, p2.ready]);

    p1.send({ type: 'quiz:start', kind: 'beats', difficulty: 'A' });
    await p1.until(c => c.errors.includes('Action non autorisée.'), 'un joueur ne lance pas une épreuve');
    host.send({ type: 'quiz:start', kind: 'beats', difficulty: 'B' });
    await Promise.all([host, live, p1, p2].map(c => c.until(x => x.quiz?.phase === 'idle' && x.game === 'beats', 'épreuve lancée')));
    assert.equal(live.quiz.itemCount, 7);
    assert.equal(live.quiz.points, 4, 'premier morceau de la classe B');
    assert.equal(live.quiz.revealed, null);
    assert.ok(host.quiz.audioSrc.includes('CLASSE%20B'));

    host.send({ type: 'quiz:open' });
    await p2.until(c => c.quiz.phase === 'open', 'buzzer ouvert');
    p2.send({ type: 'buzzer:press' }); p1.send({ type: 'buzzer:press' });
    await Promise.all([live, p1].map(c => c.until(x => x.quiz.buzzWinner === 'player2', 'joueur 2 a la main')));
    host.send({ type: 'quiz:correct' });
    await live.until(c => c.quiz.revealed?.winner === 'player2', 'réponse révélée');
    assert.equal(live.quiz.revealed.answer, host.quiz.answer);
    assert.deepEqual(live.quiz.scores, { player1: 0, player2: 4 });

    // Entre deux épreuves : le site envoie le programme et le score, tous les écrans passent sur l'émission
    const show = { phase: 'between', index: 1, wins: { player1: 0, player2: 1 }, program: [{ id: 'blind-test-openings', name: 'Les Beats de Killer Bee', selectedBy: 'player1', result: { player1: 0, player2: 4 } }, { id: 'dossier-l', name: 'Le Dossier de L', selectedBy: 'player2' }] };
    live.send({ type: 'show:update', show });
    await live.until(c => c.errors.includes('Action non autorisée.'), "seul le présentateur tient l'émission");
    host.send({ type: 'show:update', show });
    host.send({ type: 'room:game', game: 'lobby' });
    await Promise.all([live, p1, p2].map(c => c.until(x => x.game === 'lobby' && x.show?.wins.player2 === 1, 'écran d\'émission')));
    assert.equal(p1.show.program[0].result.player2, 4);
    host.send({ type: 'show:update', show: { phase: 'nimporte', program: [] } });
    await host.until(c => c.errors.includes("État de l'émission invalide."), 'état invalide refusé');

    await Promise.all([host, live, p1, p2].map(c => c.close()));
  } finally {
    await server.close();
  }
});
