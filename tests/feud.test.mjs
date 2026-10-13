import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FEUD_ROUNDS } from '../src/feud/data.ts';
import { ALREADY_GIVEN_IS_STRIKE, MAX_STRIKES, REVEAL_STEP_MS, createFeud, feudResult, feudView, hostFeud, pressBuzzer, revealDurationMs, tickFeud } from '../src/feud/reducer.ts';
import { startServer } from '../server/index.ts';

const context = { room: 'T', names: { player1: 'Kagami', player2: 'Rico' }, connected: { player1: true, player2: true }, now: 0 };
const act = (state, type, extra = {}) => hostFeud(state, { type, ...extra }, 1000);
/** Un joueur buzze et le présentateur donne son verdict. */
const answer = (state, player, verdict, answerId) => {
  assert.equal(pressBuzzer(state, player), null);
  assert.equal(act(state, verdict, answerId ? { answerId } : {}), null);
};

test('trois manches de huit réponses, sans classe, aux identifiants uniques', () => {
  assert.equal(FEUD_ROUNDS.length, 3);
  assert.deepEqual(FEUD_ROUNDS.map(round => round.roundNumber), [1, 2, 3]);
  for (const round of FEUD_ROUNDS) {
    assert.equal(round.answers.length, 8, round.id);
    assert.equal(new Set(round.answers.map(item => item.id)).size, 8);
    assert.equal(new Set(round.answers.map(item => item.label)).size, 8);
    assert.ok(round.answers.every(item => Number.isInteger(item.points) && item.points > 0));
    assert.ok(!('difficulty' in round));
  }
});

test('le premier buzz verrouille, une erreur coûte un strike et rouvre le buzzer aux deux', () => {
  const state = createFeud();
  assert.equal(pressBuzzer(state, 'player1'), 'Le buzzer est fermé.');
  act(state, 'feud:buzzer-open');
  assert.equal(pressBuzzer(state, 'player1'), null);
  assert.equal(state.phase, 'buzzLocked');
  assert.equal(pressBuzzer(state, 'player2'), "Quelqu'un a déjà buzzé.");
  assert.equal(pressBuzzer(state, 'player1'), "Quelqu'un a déjà buzzé.");
  assert.equal(state.buzzWinner, 'player1');
  act(state, 'feud:wrong');
  assert.deepEqual(state.strikes, { player1: 1, player2: 0 });
  assert.equal(state.found.length, 0);
  assert.equal(state.buzzWinner, null);
  // Pas de priorité à l'adversaire : celui qui vient de se tromper peut rebuzzer tout de suite
  assert.equal(state.buzzOpen, true);
  assert.equal(pressBuzzer(state, 'player1'), null);
});

test('une bonne réponse est attribuée, sa valeur reste cachée au live et inconnue des joueurs', () => {
  const state = createFeud();
  const [first, , third] = FEUD_ROUNDS[0].answers;
  act(state, 'feud:buzzer-open');
  answer(state, 'player2', 'feud:correct', third.id);
  assert.deepEqual(state.found, [{ answerId: third.id, foundBy: 'player2' }]);
  assert.equal(state.roundScore.player2, third.points);
  assert.equal(state.buzzOpen, true);

  const live = feudView(state, 'live', context);
  assert.deepEqual(live.slots[2], { rank: 3, label: third.label, foundBy: 'player2', points: null });
  assert.deepEqual(live.slots[0], { rank: 1, label: null, foundBy: null, points: null });
  assert.equal(live.roundScore, null);
  assert.deepEqual(live.foundCount, { player1: 0, player2: 1 });
  assert.deepEqual(live.avatars, { player1: null, player2: null });
  assert.ok(!JSON.stringify(live).includes(first.label), 'une réponse cachée ne part pas vers le live');

  const player = JSON.stringify(feudView(state, 'player2', context));
  for (const item of FEUD_ROUNDS[0].answers) assert.ok(!player.includes(item.label), 'le téléphone ne reçoit aucune réponse');
  assert.ok(!player.includes('"points"') && !player.includes('roundScore') && !player.includes('question'));

  const host = feudView(state, 'host', context);
  assert.equal(host.answers[0].points, first.points);
  assert.equal(host.answers[2].foundBy, 'player2');
  assert.deepEqual(host.roundScore, { player1: 0, player2: third.points });

  // Une réponse déjà révélée ne peut pas être donnée deux fois
  pressBuzzer(state, 'player1');
  assert.equal(act(state, 'feud:correct', { answerId: third.id }), 'Cette réponse est déjà révélée.');
  act(state, 'feud:already');
  assert.equal(state.strikes.player1, ALREADY_GIVEN_IS_STRIKE ? 1 : 0);
});

test('à trois strikes un joueur sort de la manche, l\'autre continue seul, puis la manche se ferme', () => {
  const state = createFeud();
  act(state, 'feud:buzzer-open');
  for (let i = 0; i < MAX_STRIKES; i++) answer(state, 'player1', 'feud:wrong');
  assert.equal(state.strikes.player1, 3);
  assert.equal(state.event.kind, 'strike3');
  assert.equal(state.phase, 'playing');
  assert.equal(pressBuzzer(state, 'player1'), 'Trois erreurs : tu es hors manche.');
  assert.equal(feudView(state, 'player1', context).canBuzz, false);
  assert.equal(feudView(state, 'player2', context).canBuzz, true);
  answer(state, 'player2', 'feud:correct', FEUD_ROUNDS[0].answers[0].id);
  for (let i = 0; i < MAX_STRIKES; i++) answer(state, 'player2', 'feud:wrong');
  assert.equal(state.phase, 'roundEnded');
  assert.equal(state.buzzOpen, false);
  assert.equal(pressBuzzer(state, 'player2'), 'Le buzzer est fermé.');
  // Rien n'est révélé tout seul
  assert.equal(feudView(state, 'live', context).slots[1].points, null);
});

test('huit réponses trouvées ferment la manche ; la révélation donne les valeurs et le cumul', () => {
  const state = createFeud();
  const answers = FEUD_ROUNDS[0].answers;
  act(state, 'feud:buzzer-open');
  answers.forEach((item, index) => answer(state, index % 2 ? 'player2' : 'player1', 'feud:correct', item.id));
  assert.equal(state.phase, 'roundEnded');
  assert.equal(act(state, 'feud:next'), "Révèle d'abord les points de la manche.");
  const p1 = answers.filter((_, i) => i % 2 === 0).reduce((sum, item) => sum + item.points, 0);
  const p2 = answers.filter((_, i) => i % 2 === 1).reduce((sum, item) => sum + item.points, 0);
  assert.deepEqual(feudView(state, 'live', context).totals, { player1: 0, player2: 0 });

  act(state, 'feud:reveal');
  assert.equal(state.phase, 'revealingPoints');
  const live = feudView(state, 'live', context);
  assert.deepEqual(live.slots.map(slot => slot.points), answers.map(item => item.points));
  assert.deepEqual(live.roundScore, { player1: p1, player2: p2 });
  assert.equal(live.revealStepMs, REVEAL_STEP_MS);
  assert.equal(tickFeud(state, 1000 + revealDurationMs(FEUD_ROUNDS[0]) - 1), false);
  assert.equal(tickFeud(state, 1000 + revealDurationMs(FEUD_ROUNDS[0])), true);
  assert.equal(state.phase, 'roundComplete');
  assert.deepEqual(state.totals, { player1: p1, player2: p2 });

  // Manche suivante : strikes, réponses et points de manche repartent de zéro, le cumul reste
  act(state, 'feud:next');
  assert.equal(state.roundIndex, 1);
  assert.equal(state.phase, 'waiting');
  assert.deepEqual(state.strikes, { player1: 0, player2: 0 });
  assert.deepEqual(state.found, []);
  assert.deepEqual(state.roundScore, { player1: 0, player2: 0 });
  assert.deepEqual(state.totals, { player1: p1, player2: p2 });
  assert.equal(feudView(state, 'live', context).question, FEUD_ROUNDS[1].question);
});

test('fin forcée : les réponses non trouvées sont révélées sans propriétaire, et la troisième manche clôt l\'épreuve', () => {
  const state = createFeud();
  for (let round = 0; round < 3; round++) {
    act(state, 'feud:buzzer-open');
    answer(state, round === 1 ? 'player1' : 'player2', 'feud:correct', FEUD_ROUNDS[round].answers[0].id);
    act(state, 'feud:end-round');
    assert.equal(state.phase, 'roundEnded');
    act(state, 'feud:reveal');
    const live = feudView(state, 'live', context);
    assert.equal(live.slots[7].label, FEUD_ROUNDS[round].answers[7].label);
    assert.equal(live.slots[7].foundBy, null);
    tickFeud(state, 1000 + revealDurationMs(FEUD_ROUNDS[round]));
    if (round < 2) { assert.equal(state.phase, 'roundComplete'); assert.equal(feudView(state, 'host', context).result, null); act(state, 'feud:next'); }
  }
  assert.equal(state.phase, 'gameComplete');
  const top = FEUD_ROUNDS.map(round => round.answers[0].points);
  assert.deepEqual(feudResult(state), { winner: 'player2', player1FeudScore: top[1], player2FeudScore: top[0] + top[2] });
  assert.deepEqual(feudView(state, 'player1', context).result, feudResult(state));
  assert.equal(act(state, 'feud:next'), "L'épreuve est terminée.");
});

test('annuler la dernière action : strike, réponse attribuée au mauvais joueur, fin de manche', () => {
  const state = createFeud();
  const first = FEUD_ROUNDS[0].answers[0];
  assert.equal(act(state, 'feud:undo'), 'Rien à annuler.');
  act(state, 'feud:buzzer-open');
  answer(state, 'player1', 'feud:wrong');
  act(state, 'feud:undo');
  // On revient au moment du jugement : le joueur a toujours la main
  assert.deepEqual(state.strikes, { player1: 0, player2: 0 });
  assert.equal(state.phase, 'buzzLocked');
  assert.equal(state.buzzWinner, 'player1');
  act(state, 'feud:correct', { answerId: first.id });
  assert.equal(state.roundScore.player1, first.points);
  act(state, 'feud:undo');
  assert.deepEqual(state.found, []);
  assert.equal(state.roundScore.player1, 0);
  act(state, 'feud:buzzer-reset');
  act(state, 'feud:end-round');
  assert.equal(state.phase, 'roundEnded');
  act(state, 'feud:undo');
  assert.equal(state.phase, 'playing');
  assert.equal(state.buzzOpen, true);
});

test('la régie est gardée par un mot de passe quand le serveur en a un', async () => {
  const server = startServer({ port: 18789, hostPassword: 'secret', storeFile: join(mkdtempSync(join(tmpdir(), 'feud-')), 'rooms.json') });
  try {
    const enter = (role, password) => new Promise(resolve => {
      const socket = new WebSocket(`ws://127.0.0.1:${server.port}`);
      socket.onopen = () => socket.send(JSON.stringify({ type: 'room:join', room: 'MDP', role, password }));
      socket.onmessage = event => { const message = JSON.parse(event.data); if (message.type !== 'room:state') { socket.close(); resolve(message); } };
    });
    assert.equal((await enter('host')).message, 'Mot de passe de la régie incorrect.');
    assert.equal((await enter('host', 'faux')).message, 'Mot de passe de la régie incorrect.');
    // Un refus ne réserve pas la place : le vrai présentateur peut toujours entrer
    assert.equal((await enter('host', 'secret')).type, 'room:joined');
    // Les joueurs et le live n'ont pas besoin du mot de passe
    assert.equal((await enter('player1')).type, 'room:joined');
    assert.equal((await enter('live')).type, 'room:joined');
  } finally {
    await server.close();
  }
});

/** Un client de test : il garde la dernière vue de chaque épreuve et sait attendre une condition. */
function connect(port, room, role, token) {
  const socket = new WebSocket(`ws://127.0.0.1:${port}`);
  const client = { view: null, feud: null, token: null, errors: [], seen: [], socket };
  const waiters = [];
  socket.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.type === 'room:joined') client.token = message.token;
    if (message.type === 'room:error') client.errors.push(message.message);
    if (message.type === 'room:state') { client.view = message.view; client.feud = null; }
    if (message.type === 'feud:state') { client.feud = message.view; client.seen.push(event.data); }
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

test('en temps réel : le serveur tranche le buzz, garde les valeurs secrètes et survit à un rechargement', async () => {
  const server = startServer({ port: 18788, storeFile: join(mkdtempSync(join(tmpdir(), 'feud-')), 'rooms.json') });
  try {
    const host = connect(server.port, 'TEST', 'host');
    const live = connect(server.port, 'TEST', 'live');
    let p1 = connect(server.port, 'TEST', 'player1');
    const p2 = connect(server.port, 'TEST', 'player2');
    await Promise.all([host.ready, live.ready, p1.ready, p2.ready]);
    await host.until(c => c.view?.seats.player1.connected && c.view.seats.player2.connected, 'tout le monde est là, sur Ayanokoji par défaut');

    // Seul le présentateur change d'épreuve ; les autres écrans suivent
    p1.send({ type: 'room:game', game: 'feud' });
    await p1.until(c => c.errors.includes('Action non autorisée.'), 'un joueur ne change pas d\'épreuve');
    host.send({ type: 'room:game', game: 'feud' });
    await Promise.all([host, live, p1, p2].map(c => c.until(x => x.feud?.phase === 'waiting', 'épreuve ouverte')));
    assert.equal(host.feud.answers.length, 8);
    assert.equal(live.feud.slots.every(slot => slot.label === null && slot.points === null), true);

    // Buzzer fermé, puis ouvert : deux buzz partent ensemble, un seul gagne
    p1.send({ type: 'buzzer:press' });
    await p1.until(c => c.errors.includes('Le buzzer est fermé.'), 'buzz refusé buzzer fermé');
    host.send({ type: 'feud:buzzer-open' });
    await p2.until(c => c.feud.canBuzz, 'buzzer ouvert');
    p1.send({ type: 'buzzer:press' });
    p2.send({ type: 'buzzer:press' });
    await Promise.all([live, p1, p2].map(c => c.until(x => x.feud.buzzWinner === 'player1', 'joueur 1 a la main')));
    await p2.until(c => c.errors.includes("Quelqu'un a déjà buzzé."), 'second buzz refusé');
    assert.equal(p1.feud.canBuzz, false);
    assert.equal(p2.feud.canBuzz, false);

    // Un joueur ne peut pas se juger lui-même
    p1.send({ type: 'feud:correct', answerId: host.feud.answers[0].id });
    await p1.until(c => c.errors.filter(e => e === 'Action non autorisée.').length === 2, 'régie interdite aux joueurs');
    host.send({ type: 'feud:wrong' });
    await live.until(c => c.feud.strikes.player1 === 1 && c.feud.buzzOpen, 'strike et buzzer rouvert');

    // Joueur 2 trouve la troisième réponse : visible sur le live, sans sa valeur
    p2.send({ type: 'buzzer:press' });
    await host.until(c => c.feud.buzzWinner === 'player2', 'joueur 2 a la main');
    host.send({ type: 'feud:correct', answerId: host.feud.answers[2].id });
    await live.until(c => c.feud.slots[2].foundBy === 'player2', 'réponse affichée');
    assert.equal(live.feud.slots[2].label, host.feud.answers[2].label);
    assert.equal(live.feud.slots[2].points, null);
    await p2.until(c => c.feud.foundCount.player2 === 1, 'compteur du joueur 2');

    // Joueur 2 choisit sa photo de profil : tous les écrans la reçoivent ; une image trop lourde ou un lien sont refusés
    const photo = 'data:image/jpeg;base64,' + 'A'.repeat(400);
    p2.send({ type: 'room:avatar', image: photo });
    await live.until(c => c.feud.avatars.player2 === photo, 'photo visible sur le live');
    p2.send({ type: 'room:avatar', image: 'https://exemple.test/photo.jpg' });
    p2.send({ type: 'room:avatar', image: 'data:image/jpeg;base64,' + 'A'.repeat(50000) });
    await p2.until(c => c.errors.filter(e => e === 'Cette image ne peut pas servir de photo de profil.').length === 2, 'images refusées');
    live.send({ type: 'room:avatar', image: photo });
    await live.until(c => c.errors.includes('Action non autorisée.'), 'seul un joueur change sa photo');
    assert.equal(live.feud.avatars.player2, photo);
    assert.equal(live.feud.avatars.player1, null);
    // Le présentateur peut poser la photo d'un joueur depuis la régie
    host.send({ type: 'room:avatar', player: 'player1', image: photo });
    await live.until(c => c.feud.avatars.player1 === photo, 'photo posée par la régie');

    // Joueur 1 recharge sa page : il retrouve sa place, son strike et son buzzer
    const token = p1.token;
    await p1.close();
    await host.until(c => c.feud.connected.player1 === false, 'déconnexion vue par la régie');
    const intruder = connect(server.port, 'TEST', 'player1');
    await intruder.ready;
    await intruder.until(c => c.errors.length > 0, 'place gardée');
    p1 = connect(server.port, 'TEST', 'player1', token);
    await p1.ready;
    await p1.until(c => c.feud?.strikes.player1 === 1 && c.feud.canBuzz, 'état retrouvé');

    // Joueur 1 sort à trois strikes : le serveur refuse son buzz, pas seulement son bouton
    for (let strikes = 2; strikes <= 3; strikes++) {
      p1.send({ type: 'buzzer:press' });
      await host.until(c => c.feud.buzzWinner === 'player1', 'joueur 1 buzze');
      host.send({ type: 'feud:wrong' });
      await live.until(c => c.feud.strikes.player1 === strikes, `strike ${strikes}`);
    }
    p1.send({ type: 'buzzer:press' });
    await p1.until(c => c.errors.includes('Trois erreurs : tu es hors manche.'), 'hors manche');
    assert.equal(live.feud.phase, 'playing');
    assert.equal(p2.feud.canBuzz, true);

    // Jusqu'ici, aucune valeur n'a quitté le serveur vers le live ou les joueurs
    for (const client of [live, p1, p2]) assert.ok(client.seen.every(raw => !/"points":\d/.test(raw) && !raw.includes('"roundScore":{')), 'valeurs secrètes');
    for (const client of [p1, p2]) assert.ok(client.seen.every(raw => !raw.includes('"slots"') && !raw.includes('"answers"') && !raw.includes(host.feud.answers[2].label)), 'aucune réponse sur les téléphones');

    // Fin forcée, puis révélation : les valeurs arrivent, le cumul aussi
    host.send({ type: 'feud:end-round' });
    await live.until(c => c.feud.phase === 'roundEnded', 'prêt à révéler');
    host.send({ type: 'feud:reveal' });
    await live.until(c => c.feud.phase === 'revealingPoints', 'révélation');
    assert.equal(live.feud.slots[2].points, host.feud.answers[2].points);
    assert.deepEqual(live.feud.totals, { player1: 0, player2: host.feud.answers[2].points });
    assert.ok(live.feud.revealStartedAt <= live.feud.serverNow);

    // Retour à Ayanokoji puis aux Pensées : la partie est restée en l'état
    host.send({ type: 'room:game', game: 'ayanokoji' });
    await live.until(c => c.feud === null && c.view, 'retour à Ayanokoji');
    host.send({ type: 'room:game', game: 'feud' });
    await live.until(c => c.feud?.totals.player2 === host.feud.answers[2].points, 'partie conservée');

    await Promise.all([host, live, p1, p2, intruder].map(c => c.close()));
  } finally {
    await server.close();
  }
});
