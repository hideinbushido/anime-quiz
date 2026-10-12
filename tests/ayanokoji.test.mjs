import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AYANOKOJI_ROUNDS } from '../src/ayanokoji/rounds.ts';
import { analyseRound, findValidSolutions, validateOrder } from '../src/ayanokoji/validator.ts';
import { LINK_POINTS, maxRoundPoints, roundPoints } from '../src/ayanokoji/scoring.ts';
import { startServer } from '../server/index.ts';

test('chaque manche a six personnages, cinq liens et une seule chaîne parfaite', () => {
  for (const round of AYANOKOJI_ROUNDS) {
    assert.equal(round.characters.length, 6, round.id);
    assert.equal(round.links.length, 5, round.id);
    const report = analyseRound(round);
    assert.equal(report.solutions, 1, `${round.id} : ${report.solutions} solutions`);
    assert.ok(report.matchesSolution, `${round.id} : la solution trouvée n'est pas celle annoncée`);
    assert.equal(report.remaining[0], 720);
    assert.equal(report.remaining.at(-1), 1);
    assert.deepEqual(findValidSolutions(round), [round.solutionOrder]);
  }
});

test('la correction porte sur les relations', () => {
  const round = AYANOKOJI_ROUNDS.find(item => item.id === 'd2-racine-et-clans');
  assert.deepEqual(validateOrder(round, round.solutionOrder), { perfect: true, correctPositions: 6, correctLinks: [true, true, true, true, true] });
  // Torune et Fû échangés : le lien de clan casse, les liens de la Racine tiennent encore
  const swapped = ['shino', 'fu', 'torune', 'sai', 'ino', 'choji'];
  assert.deepEqual(validateOrder(round, swapped).correctLinks, [false, true, true, true, true]);
  assert.equal(validateOrder(round, swapped).perfect, false);
});

test("le barème : des points par lien juste, le double pour la chaîne parfaite, plus cher quand c'est plus dur", () => {
  const d1 = { difficulty: 'D', level: 1, links: [1, 2, 3, 4, 5] };
  assert.equal(roundPoints(d1, { perfect: false, correctPositions: 0, correctLinks: [true, true, false, false, true] }), 60);
  assert.equal(roundPoints(d1, { perfect: false, correctPositions: 0, correctLinks: [false, false, false, false, false] }), 0);
  assert.equal(roundPoints(d1, { perfect: true, correctPositions: 6, correctLinks: [true, true, true, true, true] }), 200);
  assert.equal(maxRoundPoints(d1), 200);
  // Sans la chaîne parfaite, on n'a jamais la totalité : quatre liens justes restent sous la moitié du maximum
  assert.ok(roundPoints(d1, { perfect: false, correctPositions: 0, correctLinks: [true, true, true, true, false] }) < maxRoundPoints(d1) / 2);
  // Chaque manche vaut plus que la précédente, de D1 à A3
  const values = ['D', 'C', 'B', 'A'].flatMap(level => LINK_POINTS[level]);
  assert.equal(values.length, 12);
  assert.ok(values.every((value, index) => index === 0 || value > values[index - 1]));
});

/** Un client de test : il garde la dernière vue reçue et sait attendre une condition. */
function connect(port, room, role, token) {
  const socket = new WebSocket(`ws://127.0.0.1:${port}`);
  const client = { view: null, token: null, errors: [], seen: [], socket };
  const waiters = [];
  socket.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.type === 'room:joined') client.token = message.token;
    if (message.type === 'room:error') client.errors.push(message.message);
    if (message.type === 'room:state') { client.view = message.view; client.seen.push(event.data); }
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

test('une manche complète en temps réel : même mélange, plateaux secrets, validation, révélation, reconnexion', async () => {
  const server = startServer({ port: 18787, storeFile: join(mkdtempSync(join(tmpdir(), 'ayanokoji-')), 'rooms.json') });
  try {
    const host = connect(server.port, 'TEST', 'host');
    const live = connect(server.port, 'TEST', 'live');
    let p1 = connect(server.port, 'TEST', 'player1');
    const p2 = connect(server.port, 'TEST', 'player2');
    await Promise.all([host.ready, live.ready, p1.ready, p2.ready]);
    await host.until(c => c.view?.seats.player1.connected && c.view.seats.player2.connected, 'les deux joueurs connectés');

    // 1-3. Le présentateur charge puis lance : les deux joueurs reçoivent le même mélange
    host.send({ type: 'ayanokoji:load', roundId: 'd2-racine-et-clans' });
    await p1.until(c => c.view?.phase === 'ready', 'manche chargée');
    host.send({ type: 'ayanokoji:start' });
    await Promise.all([p1, p2, live].map(c => c.until(x => x.view.phase === 'playing', 'manche lancée')));
    const initial = p1.view.initialOrder;
    assert.equal(initial.length, 6);
    assert.deepEqual(p2.view.initialOrder, initial);
    assert.deepEqual(p1.view.order, initial);
    assert.deepEqual(p2.view.order, initial);
    assert.deepEqual(live.view.orders, { player1: initial, player2: initial });
    assert.notDeepEqual(initial, host.view.solution);

    // 4-7. Joueur 1 échange deux cartes : le live le voit, joueur 2 jamais
    const moved1 = [initial[1], initial[0], ...initial.slice(2)];
    p1.send({ type: 'ayanokoji:move', order: moved1 });
    await live.until(c => c.view.orders.player1.join() === moved1.join(), 'mouvement visible sur le live');
    assert.deepEqual(p2.view.order, initial);
    assert.deepEqual(live.view.orders.player2, initial);

    // 8-10. Joueur 2 joue de son côté ; les compteurs évoluent séparément
    const moved2 = [...initial.slice(0, 4), initial[5], initial[4]];
    p2.send({ type: 'ayanokoji:move', order: moved2 });
    p2.send({ type: 'ayanokoji:move', order: moved2 }); // renvoyer le même ordre n'est pas un mouvement
    await live.until(c => c.view.orders.player2.join() === moved2.join(), 'mouvement du joueur 2');
    assert.deepEqual(live.view.moveCounts, { player1: 1, player2: 1 });
    assert.deepEqual(p1.view.order, moved1);

    // Un joueur ne peut pas jouer n'importe quoi, ni jouer pour l'autre
    p1.send({ type: 'ayanokoji:move', order: ['shino', 'shino', 'fu', 'sai', 'ino', 'choji'] });
    await p1.until(c => c.errors.includes('Ordre invalide.'), 'ordre invalide refusé');
    assert.equal(live.view.moveCounts.player1, 1);
    p1.send({ type: 'ayanokoji:start' });
    await p1.until(c => c.errors.includes('Action non autorisée.'), 'commande du présentateur refusée à un joueur');

    // 21-22. Rechargement du joueur 1 en pleine manche : il retrouve sa place et son plateau
    const token = p1.token;
    await p1.close();
    await host.until(c => !c.view.seats.player1.connected, 'déconnexion vue par le présentateur');
    const intruder = connect(server.port, 'TEST', 'player1');
    await intruder.ready;
    await intruder.until(c => c.errors.length > 0, 'place refusée sans jeton');
    assert.equal(intruder.view, null);
    p1 = connect(server.port, 'TEST', 'player1', token);
    await p1.ready;
    await p1.until(c => c.view?.phase === 'playing', 'retour du joueur 1');
    assert.deepEqual(p1.view.order, moved1);
    assert.equal(p1.view.moveCount, 1);

    // 11-14. Joueur 1 valide : verrouillé, joueur 2 sait seulement qu'il a validé
    p1.send({ type: 'ayanokoji:submit' });
    await p2.until(c => c.view.seats.player1.submitted, 'adversaire validé');
    assert.equal(p2.view.phase, 'playing');
    p1.send({ type: 'ayanokoji:move', order: initial });
    await p1.until(c => c.errors.includes('Ta réponse est verrouillée.'), 'plateau verrouillé');
    assert.deepEqual(live.view.orders.player1, moved1);

    // 15-16. Joueur 2 trouve la chaîne et valide : rien n'est encore révélé
    const solution = host.view.solution;
    p2.send({ type: 'ayanokoji:move', order: solution });
    p2.send({ type: 'ayanokoji:submit' });
    await Promise.all([p1, p2, live].map(c => c.until(x => x.view.phase === 'locked', 'prêt à révéler')));
    for (const client of [p1, p2, live]) assert.equal(client.view.solution, null);
    assert.equal(p1.view.result, null);
    assert.equal(p2.view.result, null);
    assert.equal(live.view.results, null);
    // Jusqu'ici, rien de ce qu'un joueur a reçu ne contient le plateau adverse, la solution ou les paires
    assert.ok(p1.seen.every(raw => !raw.includes('"orders"') && !raw.includes('"pairs"') && !raw.includes('solutionOrder')));
    assert.ok(p2.seen.every(raw => !raw.includes('"orders"') && !raw.includes('"pairs"')));
    assert.ok(p1.seen.every(raw => JSON.parse(raw).view.solution === null));

    // 17-20. Le présentateur révèle : compte à rebours, puis correction et solution
    host.send({ type: 'ayanokoji:reveal' });
    await live.until(c => c.view.phase === 'countdown' && c.view.revealAt > c.view.serverNow, 'compte à rebours');
    await Promise.all([p1, p2, live].map(c => c.until(x => x.view.phase === 'revealing', 'correction')));
    assert.deepEqual(live.view.solution, solution);
    assert.equal(live.view.results.player2.perfect, true);
    assert.equal(live.view.results.player1.perfect, false);
    assert.equal(live.view.results.player1.correctLinks.length, 5);
    assert.equal(p2.view.result.perfect, true);
    assert.equal(p2.view.result.moveCount, 2);
    assert.ok(p2.view.result.completionTime >= p1.view.result.completionTime);
    assert.ok(Number.isFinite(p1.view.result.submittedAt));

    // Le barème : chaque lien juste compte, la chaîne parfaite double la mise, et les totaux suivent
    const justes = live.view.results.player1.correctLinks.filter(Boolean).length;
    assert.equal(live.view.maxPoints, 250);
    assert.equal(live.view.results.player2.points, 250);
    assert.equal(live.view.results.player1.points, justes * 25);
    assert.deepEqual(live.view.scores, { player1: justes * 25, player2: 250 });
    assert.equal(p2.view.scores.player2, 250);

    // Manche suivante : la troisième de la classe, les totaux sont conservés ; après elle, l'épreuve s'arrête
    host.send({ type: 'ayanokoji:next' });
    await live.until(c => c.view.phase === 'ready' && c.view.round.level === 3, 'troisième manche chargée');
    assert.equal(live.view.lastRound, true);
    assert.deepEqual(live.view.scores, { player1: justes * 25, player2: 250 });
    assert.deepEqual(live.view.orders.player1, live.view.initialOrder);

    await Promise.all([host, live, p1, p2, intruder].map(c => c.close()));
  } finally {
    await server.close();
  }
});
