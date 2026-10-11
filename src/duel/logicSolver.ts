import type { LogicLinksPuzzle, LogicRule } from "../types";

export function matchesRule(rule: LogicRule, left: string, right: string): boolean {
  return left !== right && rule.pairs.some(([a, b]) =>
    a === left && b === right || rule.direction === "both" && b === left && a === right);
}

export function validateChain(puzzle: LogicLinksPuzzle, placements: string[]) {
  const complete = placements.length === 6 && new Set(placements).size === 6
    && placements.every(id => puzzle.characters.some(character => character.id === id));
  const correctSlots = puzzle.solutionIds.map((id, index) => placements[index] === id);
  const correctLinks = puzzle.rules.map((rule, index) => matchesRule(rule, placements[index], placements[index + 1]));
  return { correctSlots, correctLinks, correct: complete && correctSlots.every(Boolean) && correctLinks.every(Boolean) };
}

/** Enumerates global solutions independently of solutionIds. */
export function solvePuzzle(puzzle: LogicLinksPuzzle): string[][] {
  const solutions: string[][] = [];
  function visit(chain: string[]) {
    if (chain.length === puzzle.rules.length + 1) { solutions.push(chain); return; }
    for (const character of puzzle.characters) {
      if (chain.includes(character.id)) continue;
      if (chain.length && !matchesRule(puzzle.rules[chain.length - 1], chain.at(-1)!, character.id)) continue;
      visit([...chain, character.id]);
    }
  }
  visit([]);
  return solutions;
}

/** A selected slot swaps with the target; a reserve card replaces its occupant. */
export function placeCard(placements: string[], selectedId: string, target: number): string[] {
  const next = [...placements];
  const origin = next.indexOf(selectedId);
  if (origin >= 0) next[origin] = next[target];
  next[target] = selectedId;
  return next;
}
