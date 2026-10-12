import type { AyanokojiLink, AyanokojiRound, OrderEvaluation } from "./types";

/** Un lien est-il vérifié entre le personnage de gauche et celui de droite ? */
export function linkHolds(link: AyanokojiLink, left: string, right: string): boolean {
  return link.pairs.some(([a, b]) => (a === left && b === right) || (link.direction === "both" && a === right && b === left));
}

/**
 * Corrige une proposition. Ce sont les RELATIONS qui font foi : une chaîne est
 * parfaite quand ses cinq liens sont vérifiés. Le nombre de personnages à la
 * même place que dans la solution est donné à titre d'information.
 */
export function validateOrder(round: AyanokojiRound, order: string[]): OrderEvaluation {
  const correctLinks = round.links.map((link, index) => linkHolds(link, order[index], order[index + 1]));
  return {
    perfect: correctLinks.every(Boolean),
    correctPositions: order.filter((id, index) => id === round.solutionOrder[index]).length,
    correctLinks,
  };
}

/** Une proposition est recevable si elle utilise chaque personnage de la manche exactement une fois. */
export function isPermutation(round: AyanokojiRound, order: unknown): order is string[] {
  if (!Array.isArray(order) || order.length !== round.characters.length) return false;
  const ids = new Set(round.characters.map(character => character.id));
  return order.every(id => typeof id === "string" && ids.delete(id));
}

function permutations<T>(items: T[]): T[][] {
  if (items.length <= 1) return [items];
  return items.flatMap((item, index) => permutations([...items.slice(0, index), ...items.slice(index + 1)]).map(rest => [item, ...rest]));
}

/** Outil de développement : teste les 720 ordres possibles et rend ceux qui vérifient tous les liens. */
export function findValidSolutions(round: AyanokojiRound): string[][] {
  return permutations(round.characters.map(character => character.id)).filter(order => validateOrder(round, order).perfect);
}

/**
 * Outil de développement : mesure la difficulté d'une manche.
 * `remaining[k]` est le nombre d'ordres encore possibles quand on ne regarde
 * que les k premiers liens. Plus ces nombres restent hauts, plus la manche
 * laisse de fausses pistes localement valides.
 */
export function analyseRound(round: AyanokojiRound): { solutions: number; unique: boolean; matchesSolution: boolean; remaining: number[] } {
  const all = permutations(round.characters.map(character => character.id));
  const remaining = round.links.map((_, k) => all.filter(order =>
    round.links.slice(0, k + 1).every((link, index) => linkHolds(link, order[index], order[index + 1]))).length);
  const solutions = findValidSolutions(round);
  return {
    solutions: solutions.length,
    unique: solutions.length === 1,
    matchesSolution: solutions.length === 1 && solutions[0].join() === round.solutionOrder.join(),
    remaining: [all.length, ...remaining],
  };
}
