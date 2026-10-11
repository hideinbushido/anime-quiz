import test from 'node:test';
import assert from 'node:assert/strict';
import { puzzlesByClass } from '../src/data/logicLinksDemos.ts';
import { matchesRule, placeCard, solvePuzzle, validateChain } from '../src/duel/logicSolver.ts';

for (const [level, puzzles] of Object.entries(puzzlesByClass)) {
  for (const puzzle of puzzles) {
    test(`class ${level}: one global solution and every decoy has valid local relations`, () => {
      assert.equal(puzzle.characters.length, { D: 6, C: 8, B: 10, A: 12 }[level]);
      assert.equal(puzzle.rules.length, 5);
      assert.deepEqual(solvePuzzle(puzzle), [puzzle.solutionIds]);
      assert.equal(validateChain(puzzle, puzzle.solutionIds).correct, true);
      const decoys = puzzle.characters.filter(character => !puzzle.solutionIds.includes(character.id));
      for (const decoy of decoys) {
        assert.ok(puzzle.rules.some(rule => rule.pairs.some(pair => pair.includes(decoy.id))), `${decoy.name} is an inert decoy`);
      }
      if (level === 'B' || level === 'A') {
        // At least two distinct valid 3-card fragments contain a decoy, but cannot form the solution.
        const fragments = new Set();
        for (let index = 0; index < 4; index++) {
          for (const a of puzzle.characters) for (const b of puzzle.characters) for (const c of puzzle.characters) {
            if (new Set([a.id, b.id, c.id]).size !== 3) continue;
            if (!decoys.some(decoy => [a.id, b.id, c.id].includes(decoy.id))) continue;
            if (matchesRule(puzzle.rules[index], a.id, b.id) && matchesRule(puzzle.rules[index + 1], b.id, c.id)) fragments.add(`${a.id}/${b.id}/${c.id}`);
          }
        }
        assert.ok(fragments.size >= 2, `expected credible false fragments, got ${fragments.size}`);
        if (level === 'A') {
          let falseChainsOfFour = 0;
          for (let start = 0; start < 3; start++) {
            const walk = chain => {
              if (chain.length === 4) {
                if (decoys.some(decoy => chain.includes(decoy.id))) falseChainsOfFour++;
                return;
              }
              for (const character of puzzle.characters) {
                if (chain.includes(character.id)) continue;
                if (chain.length && !matchesRule(puzzle.rules[start + chain.length - 1], chain.at(-1), character.id)) continue;
                walk([...chain, character.id]);
              }
            };
            walk([]);
          }
          assert.ok(falseChainsOfFour >= 2, 'elite class needs multiple plausible four-card dead ends');
        }
      }
    });
  }
}

test('free placement, swapping, replacement, wrong ordering and duplicate rejection', () => {
  let placements = ['', '', '', '', '', ''];
  placements = placeCard(placements, 'a', 4);
  placements = placeCard(placements, 'b', 1);
  placements = placeCard(placements, 'a', 1);
  assert.deepEqual(placements, ['', 'a', '', '', 'b', '']);
  placements = placeCard(placements, 'c', 1);
  assert.deepEqual(placements, ['', 'c', '', '', 'b', '']);
  const puzzle = puzzlesByClass.D[0];
  assert.equal(validateChain(puzzle, [...puzzle.solutionIds].reverse()).correct, false);
  assert.equal(validateChain(puzzle, Array(6).fill(puzzle.solutionIds[0])).correct, false);
  const symmetric = puzzlesByClass.A[0].rules[1];
  const [left, right] = symmetric.pairs[0];
  assert.ok(matchesRule(symmetric, left, right));
  assert.ok(matchesRule(symmetric, right, left));
  const directed = puzzle.rules[0];
  const [mentor, student] = directed.pairs[0];
  assert.ok(matchesRule(directed, mentor, student));
  assert.equal(matchesRule(directed, student, mentor), false);
});
