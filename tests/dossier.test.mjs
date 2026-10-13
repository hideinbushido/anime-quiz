import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { compareCharacterGuess, compareExact, compareMulti, compareOrdered, normalize, searchRoster, universeReady } from '../src/dossier/engine.ts';
import { createDossier, dossierView, guessDossier, hostDossier } from '../src/dossier/reducer.ts';
import { DOSSIER_CONFIG } from '../src/dossier/data/universes.ts';
import { NARUTO } from '../src/dossier/data/naruto.ts';
import { startServer } from '../server/index.ts';
import { TEST_A, TEST_CONFIG } from './fixtures/dossierFixtures.mjs';

const context = { room: 'T', names: { player1: 'Kagami', player2: 'Rico' }, connected: { player1: true, player2: true }, now: 0 };
const host = (state, type, extra = {}) => hostDossier(state, { type, ...extra }, 1000, TEST_CONFIG, () => 0);
const guess = (state, player, id) => guessDossier(state, player, id, 2000, TEST_CONFIG);
const view = (state, role) => dossierView(state, role, context, TEST_CONFIG);
const byId = id => TEST_A.roster.find(character => character.id === id);

test('le moteur : exact, multi (vert, orange, rouge) et ordonné', () => {
  assert.equal(compareExact('Konoha', 'konoha '), 'correct');
  assert.equal(compareExact('Konoha', 'Suna'), 'wrong');
  assert.equal(compareExact(null, null), 'correct', 'deux absences se valent');
  assert.equal(compareExact(null, 'Uchiha'), 'wrong');

  assert.equal(compareMulti(['Konoha', 'Akatsuki'], ['Akatsuki', 'Konoha']), 'correct', "l'ordre ne compte pas");
  assert.equal(compareMulti(['Yugakure', 'Akatsuki'], ['Konoha', 'Akatsuki']), 'partial');
  assert.equal(compareMulti(['Feu', 'Foudre'], ['Feu', 'Vent']), 'partial');
  assert.equal(compareMulti(['Feu'], ['Feu', 'Vent']), 'partial', 'un sous-ensemble reste orange');
  assert.equal(compareMulti(['Eau'], ['Feu', 'Vent']), 'wrong');
  assert.equal(compareMulti([], []), 'correct');
  assert.equal(compareMulti([], ['Feu']), 'wrong');

  assert.deepEqual(compareOrdered(3, 3), { state: 'correct' });
  assert.deepEqual(compareOrdered(3, 5), { state: 'wrong', direction: 'up' });
  assert.deepEqual(compareOrdered(5, 1), { state: 'wrong', direction: 'down' });

  const result = compareCharacterGuess(TEST_A, byId('beta'), byId('alpha'));
  assert.equal(result.found, false);
  assert.deepEqual(result.cells.map(cell => cell.state), ['correct', 'partial', 'wrong']);
  assert.deepEqual(result.cells.map(cell => cell.value), ['rouge', 'feu, foudre', '5'], 'la case montre les valeurs du personnage proposé');
  assert.equal(compareCharacterGuess(TEST_A, byId('delta'), byId('alpha')).cells[1].value, 'Aucun');
  assert.equal(compareCharacterGuess(TEST_A, byId('alpha'), byId('alpha')).found, true);
});

test('la recherche ignore la casse et les accents, et connaît les surnoms', () => {
  assert.equal(normalize('  Hyūga '), 'hyuga');
  assert.equal(searchRoster(NARUTO.roster, 'hyuga').length, 2);
  assert.equal(searchRoster(NARUTO.roster, 'NARUTO')[0].id, 'naruto-uzumaki');
  assert.equal(searchRoster(NARUTO.roster, 'pain')[0].id, 'nagato');
  assert.equal(searchRoster(NARUTO.roster, 'danzo')[0].id, 'danzo-shimura');
  assert.deepEqual(searchRoster(NARUTO.roster, 'zzz'), []);
  assert.deepEqual(searchRoster(NARUTO.roster, '  '), []);
});

test('Naruto : huit colonnes fixées, trois statuts spéciaux, des fiches complètes', () => {
  assert.deepEqual(NARUTO.attributes.map(attribute => [attribute.key, attribute.comparisonType]), [
    ['sexe', 'exact'], ['village', 'exact'], ['clan', 'exact'], ['affiliations', 'multi'],
    ['typesJutsu', 'multi'], ['naturesChakra', 'multi'], ['statutSpecial', 'multi'], ['premiereApparition', 'exact'],
  ]);
  assert.ok(universeReady(NARUTO));
  assert.equal(new Set(NARUTO.roster.map(character => character.id)).size, NARUTO.roster.length);
  for (const character of NARUTO.roster) {
    for (const { key, comparisonType } of NARUTO.attributes) {
      assert.ok(key in character.attributes, `${character.id} : ${key} manque`);
      if (comparisonType === 'multi') assert.ok(Array.isArray(character.attributes[key]), `${character.id} : ${key} doit être une liste`);
    }
    for (const statut of character.attributes.statutSpecial) assert.ok(['Jinchūriki', 'Ermite', 'Invocateur'].includes(statut), `${character.id} : ${statut}`);
    if (character.attributes.village) assert.ok(character.attributes.affiliations.includes(character.attributes.village), `${character.id} : son village fait partie de ses affiliations`);
    assert.ok(character.attributes.typesJutsu.length > 0, `${character.id} : au moins un type de jutsu`);
    assert.ok(character.attributes.premiereApparition, `${character.id} : une première apparition`);
  }
  // L'exemple du cahier des charges : Hidan face à Itachi, orange sur l'affiliation
  const hidan = NARUTO.roster.find(c => c.id === 'hidan'), itachi = NARUTO.roster.find(c => c.id === 'itachi-uchiha');
  assert.equal(compareCharacterGuess(NARUTO, hidan, itachi).cells.find(cell => cell.key === 'affiliations').state, 'partial');
});

test('cinq rounds dans l\'ordre : Naruto, Naruto, One Piece, One Piece, Dragon Ball', () => {
  assert.deepEqual(DOSSIER_CONFIG.rounds, ['naruto', 'naruto', 'one-piece', 'one-piece', 'dragon-ball']);
  // Chaque univers a ses colonnes et un roster complet : toute fiche renseigne toutes ses colonnes, avec le bon type
  for (const universe of Object.values(DOSSIER_CONFIG.universes)) {
    assert.ok(universeReady(universe), universe.name);
    assert.ok(universe.roster.length >= 50, `${universe.name} : ${universe.roster.length} personnages`);
    assert.equal(new Set(universe.roster.map(character => character.id)).size, universe.roster.length, `${universe.name} : identifiants uniques`);
    for (const character of universe.roster) for (const { key, comparisonType } of universe.attributes) {
      const value = character.attributes[key];
      assert.ok(key in character.attributes, `${universe.name} / ${character.id} : ${key} manque`);
      if (comparisonType === 'multi') assert.ok(Array.isArray(value), `${universe.name} / ${character.id} : ${key} doit être une liste`);
      if (comparisonType === 'ordered') assert.ok(Number.isFinite(value), `${universe.name} / ${character.id} : ${key} doit être un nombre`);
    }
  }
  // La prime de One Piece est ordonnée : une flèche dit dans quel sens chercher
  const onePiece = DOSSIER_CONFIG.universes['one-piece'];
  const of = id => onePiece.roster.find(character => character.id === id);
  const prime = compareCharacterGuess(onePiece, of('nami'), of('monkey-d-luffy')).cells.find(cell => cell.key === 'prime');
  assert.deepEqual([prime.state, prime.direction, prime.value], ['wrong', 'up', '366 000 000']);
  assert.equal(compareCharacterGuess(onePiece, of('monkey-d-luffy'), of('roronoa-zoro')).cells.find(cell => cell.key === 'affiliations').state, 'partial');
});

test('un tour : le premier à valider ne voit rien tant que l\'autre n\'a pas validé', () => {
  const state = createDossier();
  assert.equal(guess(state, 'player1', 'beta'), "Le round n'est pas en cours.");
  host(state, 'dossier:start');
  assert.equal(state.targetId, 'alpha', 'sans choix du présentateur, le serveur tire la cible');
  assert.equal(guess(state, 'player1', 'inconnu'), "Ce personnage n'existe pas dans cet univers.");
  assert.equal(guess(state, 'player1', 'un'), "Ce personnage n'existe pas dans cet univers.", "un personnage d'un autre univers est refusé");

  assert.equal(guess(state, 'player1', 'beta'), null);
  assert.equal(guess(state, 'player1', 'gamma'), 'Ta proposition est déjà verrouillée.');
  for (const role of ['player1', 'player2', 'live']) {
    const seen = view(state, role);
    assert.deepEqual(seen.turns, [], `${role} : aucune case avant la double validation`);
    assert.deepEqual(seen.locked, { player1: true, player2: false });
    assert.equal(seen.target, null);
  }
  assert.equal(view(state, 'player1').myGuess, 'beta');
  assert.equal(view(state, 'player1').canGuess, false);
  assert.equal(view(state, 'player2').myGuess, null);
  assert.ok(!JSON.stringify(view(state, 'player2')).includes('"myGuess":"beta"'));
  assert.equal(view(state, 'host').pending.player1.id, 'beta', 'le présentateur, lui, voit la proposition verrouillée');

  // Le second valide : les deux lignes deviennent publiques ensemble
  assert.equal(guess(state, 'player2', 'gamma'), null);
  assert.equal(state.revealedAt, 2000);
  for (const role of ['player1', 'player2', 'live', 'host']) {
    const [turn] = view(state, role).turns;
    assert.equal(turn.number, 1);
    assert.deepEqual(turn.guesses.player1.cells.map(cell => cell.state), ['correct', 'partial', 'wrong']);
    assert.deepEqual(turn.guesses.player2.cells.map(cell => cell.state), ['wrong', 'wrong', 'wrong']);
    assert.equal(turn.guesses.player2.name, 'GAMMA');
  }
  assert.deepEqual(view(state, 'live').locked, { player1: false, player2: false });
  assert.equal(guess(state, 'player1', 'beta'), 'Tu as déjà proposé ce personnage.');

  // L'ordre de validation ne change rien : cette fois le joueur 2 commence
  assert.equal(guess(state, 'player2', 'delta'), null);
  assert.equal(view(state, 'player1').turns.length, 1);
  assert.equal(guess(state, 'player1', 'delta'), null);
  assert.equal(view(state, 'player1').turns.length, 2);
  assert.equal(state.phase, 'guessing');
});

test('la cible ne quitte jamais le serveur avant la fin du round', () => {
  const state = createDossier();
  host(state, 'dossier:target', { characterId: 'alpha' });
  assert.equal(view(state, 'host').secretTarget.name, 'ALPHA');
  host(state, 'dossier:start');
  guess(state, 'player1', 'beta'); guess(state, 'player2', 'gamma');
  for (const role of ['player1', 'player2', 'live']) {
    const raw = JSON.stringify(view(state, role));
    assert.equal(view(state, role).target, null);
    for (const leak of ['targetId', 'secretTarget', 'records', '"pending"', 'history']) assert.ok(!raw.includes(leak), `${role} : ${leak} a fuité`);
    // Les attributs du catalogue ne partent pas non plus : seules les cases des propositions sont publiques
    assert.ok(!raw.includes('"attributes":{'), `${role} : le catalogue ne contient que des noms`);
    assert.ok(!raw.includes('feu, vent'), `${role} : les valeurs de la cible n'apparaissent nulle part`);
  }
  assert.equal(host(state, 'dossier:target', { characterId: 'beta' }), 'La cible se choisit avant de démarrer le round.');
});

test('un joueur trouve : le round se ferme après la révélation commune, la cible est montrée, rien n\'avance tout seul', () => {
  const state = createDossier();
  host(state, 'dossier:start');
  guess(state, 'player1', 'gamma');
  assert.equal(state.phase, 'guessing');
  guess(state, 'player2', 'alpha');
  assert.equal(state.phase, 'debrief');
  assert.equal(state.outcome, 'player2');
  assert.deepEqual(state.wins, { player1: 0, player2: 1 });
  const live = view(state, 'live');
  assert.equal(live.turns[0].guesses.player2.found, true);
  assert.equal(live.target.name, 'ALPHA');
  assert.deepEqual(live.target.cells.map(cell => cell.value), ['rouge', 'feu, vent', '3']);
  assert.equal(guess(state, 'player1', 'beta'), "Le round n'est pas en cours.");
  assert.equal(view(state, 'player1').canGuess, false);
  assert.equal(host(state, 'dossier:start'), 'Le round est déjà lancé.');
});

test('les deux trouvent dans le même tour : égalité, sans départage', () => {
  const state = createDossier();
  host(state, 'dossier:start');
  guess(state, 'player2', 'alpha'); guess(state, 'player1', 'alpha');
  assert.equal(state.outcome, 'draw');
  assert.deepEqual(state.wins, { player1: 0, player2: 0 });
  assert.equal(state.draws, 1);
});

test('fin manuelle, round suivant, univers pas encore configuré, puis fin des cinq rounds', () => {
  const state = createDossier();
  assert.equal(host(state, 'dossier:next'), "Termine d'abord le round en cours.");
  host(state, 'dossier:start');
  guess(state, 'player1', 'beta');
  host(state, 'dossier:end-round');
  assert.equal(state.phase, 'debrief');
  assert.equal(state.outcome, 'none');
  assert.deepEqual(state.pending, {}, 'la proposition en attente est abandonnée');
  assert.equal(view(state, 'live').target.name, 'ALPHA');

  // Annuler une fin de round déclenchée par erreur
  host(state, 'dossier:undo');
  assert.equal(state.phase, 'guessing');
  assert.equal(state.pending.player1, 'beta');
  host(state, 'dossier:end-round');

  host(state, 'dossier:next');
  assert.equal(state.roundIndex, 1);
  assert.equal(state.phase, 'intro');
  assert.equal(view(state, 'live').target, null);
  assert.deepEqual(view(state, 'live').turns, []);
  host(state, 'dossier:start');
  assert.notEqual(state.targetId, 'alpha', 'la cible du round précédent ne revient pas');
  guess(state, 'player1', state.targetId); guess(state, 'player2', 'alpha');
  assert.deepEqual(state.wins, { player1: 1, player2: 0 });
  host(state, 'dossier:next');

  for (const round of [2, 3]) {
    assert.equal(view(state, 'live').universe.name, 'Univers B');
    host(state, 'dossier:start');
    guess(state, 'player2', state.targetId); guess(state, 'player1', round === 2 ? 'un' : state.targetId);
    host(state, 'dossier:next');
  }
  // Round 5 : un univers sans colonnes ne peut pas démarrer, mais peut être passé
  assert.equal(state.roundIndex, 4);
  assert.equal(view(state, 'host').universe.ready, false);
  assert.equal(host(state, 'dossier:start'), "Univers vide n'est pas encore configuré.");
  host(state, 'dossier:next');
  assert.equal(state.phase, 'finished');
  const final = view(state, 'live');
  assert.deepEqual(final.rounds.map(round => round.outcome), ['none', 'player1', 'draw', 'draw', 'none']);
  assert.equal(final.rounds.length, 5);
  assert.equal(host(state, 'dossier:next'), "L'épreuve est terminée.");
});

/** Un client de test : il garde la dernière vue reçue et sait attendre une condition. */
function connect(port, room, role, token) {
  const socket = new WebSocket(`ws://127.0.0.1:${port}`);
  const client = { dossier: null, token: null, errors: [], seen: [], socket };
  const waiters = [];
  socket.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.type === 'room:joined') client.token = message.token;
    if (message.type === 'room:error') client.errors.push(message.message);
    if (message.type === 'dossier:state') { client.dossier = message.view; client.seen.push(event.data); }
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
  client.ready = new Promise(resolve => { socket.onopen = () => { client.send({ type: 'room:join', room, role, token }); resolve(); }; });
  return client;
}

test('en temps réel, sur Naruto : révélation simultanée, cible secrète sur le réseau, reconnexion', async () => {
  const server = startServer({ port: 18790, hostPassword: '', storeFile: join(mkdtempSync(join(tmpdir(), 'dossier-')), 'rooms.json') });
  try {
    const host = connect(server.port, 'TEST', 'host');
    const live = connect(server.port, 'TEST', 'live');
    let p1 = connect(server.port, 'TEST', 'player1');
    const p2 = connect(server.port, 'TEST', 'player2');
    await Promise.all([host.ready, live.ready, p1.ready, p2.ready]);
    host.send({ type: 'room:game', game: 'dossier' });
    await Promise.all([host, live, p1, p2].map(c => c.until(x => x.dossier?.phase === 'intro', 'épreuve ouverte')));
    assert.equal(live.dossier.universe.name, 'Naruto');
    assert.equal(live.dossier.universe.attributes.length, 8);
    assert.ok(p1.dossier.roster.length >= 30);

    // Un joueur ne pilote pas la partie
    p1.send({ type: 'dossier:start' });
    await p1.until(c => c.errors.includes('Action non autorisée.'), 'régie interdite aux joueurs');
    host.send({ type: 'dossier:target', characterId: 'itachi-uchiha' });
    host.send({ type: 'dossier:start' });
    await p2.until(c => c.dossier.canGuess, 'round lancé');

    // Joueur 1 valide seul : personne ne reçoit de case, pas même lui
    p1.send({ type: 'dossier:guess', characterId: 'hidan' });
    await live.until(c => c.dossier.locked.player1, 'proposition verrouillée');
    await p1.until(c => c.dossier.myGuess === 'hidan', 'verrou confirmé au joueur');
    assert.deepEqual(p1.dossier.turns, []);
    assert.deepEqual(p2.dossier.turns, []);
    assert.equal(host.dossier.pending.player1.name, 'Hidan');

    // Il recharge sa page : sa proposition verrouillée est toujours là, toujours sans résultat
    const token = p1.token;
    await p1.close();
    p1 = connect(server.port, 'TEST', 'player1', token);
    await p1.ready;
    await p1.until(c => c.dossier?.myGuess === 'hidan' && !c.dossier.canGuess, 'verrou retrouvé après rechargement');
    assert.deepEqual(p1.dossier.turns, []);

    // Joueur 2 valide : les deux lignes arrivent ensemble chez tout le monde
    p2.send({ type: 'dossier:guess', characterId: 'sasuke-uchiha' });
    await Promise.all([p1, p2, live, host].map(c => c.until(x => x.dossier.turns.length === 1, 'tour révélé')));
    const cell = (client, player, key) => client.dossier.turns[0].guesses[player].cells.find(item => item.key === key);
    assert.equal(cell(p2, 'player1', 'affiliations').state, 'partial', 'Akatsuki en commun');
    assert.equal(cell(p2, 'player1', 'village').state, 'wrong');
    assert.equal(cell(p1, 'player2', 'clan').state, 'correct');
    assert.equal(cell(live, 'player2', 'naturesChakra').state, 'partial');
    assert.equal(p1.dossier.turns[0].guesses.player2.name, 'Sasuke Uchiha', "la proposition adverse devient visible à la révélation");

    // Rien de ce qui a transité vers les joueurs ou le live ne désigne la cible
    for (const client of [p1, p2, live]) {
      assert.ok(client.seen.every(raw => !raw.includes('targetId') && !raw.includes('secretTarget') && JSON.parse(raw).view.target === null), 'cible secrète');
      assert.ok(client.seen.every(raw => !raw.includes('"attributes":{')), 'le catalogue ne porte aucun attribut');
    }

    // Joueur 2 trouve : debrief, cible révélée à tous, et seul « Round suivant » fait avancer
    p1.send({ type: 'dossier:guess', characterId: 'kisame-hoshigaki' });
    p2.send({ type: 'dossier:guess', characterId: 'itachi-uchiha' });
    await Promise.all([p1, p2, live].map(c => c.until(x => x.dossier.phase === 'debrief', 'debrief')));
    assert.equal(live.dossier.outcome, 'player2');
    assert.equal(live.dossier.target.name, 'Itachi Uchiha');
    assert.deepEqual(live.dossier.wins, { player1: 0, player2: 1 });
    p1.send({ type: 'dossier:guess', characterId: 'gaara' });
    await p1.until(c => c.errors.includes("Le round n'est pas en cours."), 'propositions fermées');
    host.send({ type: 'dossier:next' });
    await live.until(c => c.dossier.phase === 'intro' && c.dossier.roundNumber === 2, 'round 2');
    assert.equal(live.dossier.target, null);

    await Promise.all([host, live, p1, p2].map(c => c.close()));
  } finally {
    await server.close();
  }
});
