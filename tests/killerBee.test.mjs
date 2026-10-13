import test from 'node:test';
import assert from 'node:assert/strict';
import { epreuves } from '../src/data/epreuves.ts';
import { getKillerBeePoints, canPlayerBuzz, newKillerBeeState, BUZZ_COOLDOWN_SECONDS } from '../src/duel/killerBee.ts';
import { createDuel, newProgress, progressReducer, resolveEpreuve, duelReducer } from '../src/duel/engine.ts';
import { parseDuel } from '../src/duel/storage.ts';
const bee = epreuves[0];
const active = resolveEpreuve(bee, 'B');
const send = (p, event) => progressReducer(p, { type: 'killerBee', event }, active);
test('exact score tables and seven independent slots per class', () => {
  const expected = { D: [3,5,8,10,12,15,18], C: [3,5,8,11,13,16,19], B: [4,6,9,12,14,17,20], A: [4,6,10,13,15,18,22] };
  for (const level of Object.keys(expected)) {
    assert.deepEqual(Array.from({length:7}, (_, i) => getKillerBeePoints(level,i)), expected[level]);
    assert.equal(resolveEpreuve(bee,level).killerBeeTracks.length,7);
  }
  assert.throws(() => getKillerBeePoints('A',7),RangeError);
});
test('first buzz wins; manual validation only; no duplicate scoring', () => {
  let p = send(newProgress(),{ type:'buzz', playerId:'player2', audioTime:12 });
  assert.equal(send(p,{type:'buzz',playerId:'player1'}),p);
  assert.equal(p.rounds.length,0);
  assert.equal(p.killerBee.audioTime,12);
  p = send(p,{type:'judge',correct:true});
  assert.equal(p.rounds[0].playerId,'player2');
  assert.equal(p.rounds[0].points,4);
  assert.equal(p.killerBee.phase,'reveal');
  assert.equal(send(p,{type:'judge',correct:true}),p);
});
test('a wrong answer blocks the buzzer for seven seconds of music, not until the opponent tries', () => {
  assert.equal(BUZZ_COOLDOWN_SECONDS, 7);
  let p = newProgress();
  p = send(p,{type:'buzz',playerId:'player1',audioTime:3});
  p = send(p,{type:'judge',correct:false});
  assert.equal(canPlayerBuzz(p.killerBee,'player1'),false);
  assert.equal(canPlayerBuzz(p.killerBee,'player2'),true);
  // La musique avance par petits pas : le délai suit
  for (let time = 3.25; time <= 9.75; time += 0.25) p = send(p,{type:'audioTime',audioTime:time});
  assert.equal(canPlayerBuzz(p.killerBee,'player1'),false);
  // Un retour au début ne fait pas gagner de temps
  p = send(p,{type:'audioTime',audioTime:0});
  assert.equal(canPlayerBuzz(p.killerBee,'player1'),false);
  for (let time = 0.25; time <= 0.5; time += 0.25) p = send(p,{type:'audioTime',audioTime:time});
  assert.equal(canPlayerBuzz(p.killerBee,'player1'),true);
  p = send(p,{type:'buzz',playerId:'player1'});
  assert.equal(p.killerBee.phase,'player1Buzzed');
});
test('two attempts each, alternating first failures, explicit reveal only', () => {
  let p = newProgress();
  assert.equal(send(p,{type:'judge',correct:true}),p);
  assert.equal(send(p,{type:'reveal'}),p);
  for (const id of ['player1','player2','player1','player2']) {
    p = send(p,{type:'buzz',playerId:id});
    p = send(p,{type:'judge',correct:false});
    const from = p.killerBee.audioTime;
    assert.equal(p.rounds.length,0);
    assert.notEqual(p.killerBee.phase,'reveal');
    assert.equal(canPlayerBuzz(p.killerBee,id),false);
    for (let step = 1; step <= 8; step++) p = send(p,{type:'audioTime',audioTime:from + step});
  }
  assert.equal(p.killerBee.phase,'roundComplete');
  assert.equal(canPlayerBuzz(p.killerBee,'player2'),false);
  p = send(p,{type:'reveal'});
  assert.equal(p.rounds[0].points,0);
  assert.equal(p.killerBee.phase,'reveal');
  p = progressReducer(p,{type:'next'},active);
  assert.equal(p.roundIndex,1);
  assert.deepEqual(p.killerBee ?? newKillerBeeState(),newKillerBeeState());
});
test('saved duel resumes buzz, attempts, audio and attributed scores', () => {
  const citation = epreuves.find(e => e.type === 'citation');
  const catalog = [bee,...Array.from({length:4},(_,i) => ({...citation,id:`extra-${i}`}))];
  let session = createDuel('Kagami','Bee','test');
  for (const e of catalog) session = duelReducer(session,{type:'select',epreuveId:e.id,difficulty:'B'},catalog);
  session = duelReducer(session,{type:'start'},catalog);
  const act = event => { session = duelReducer(session,{type:'killerBee',event},catalog); assert.deepEqual(parseDuel(JSON.parse(JSON.stringify(session)),catalog),session); };
  act({type:'buzz',playerId:'player1',audioTime:9});
  act({type:'judge',correct:false});
  act({type:'buzz',playerId:'player2'});
  act({type:'judge',correct:true});
  // Les points du morceau vont au joueur 2 ; le score du duel, lui, ne bouge qu'à la fin de l'épreuve
  assert.deepEqual(session.progress.rounds.map(round => [round.playerId, round.points]), [['player2', 4]]);
  assert.equal(session.players.player2.score,0);
  assert.equal(session.players.player1.score,0);
  assert.equal(parseDuel({...session,progress:{...session.progress,killerBee:{...session.progress.killerBee,attempts:{player1:-1,player2:2}}}},catalog),null);
});
