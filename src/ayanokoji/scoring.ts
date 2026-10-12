import type { DifficultyClass } from "../types";
import type { AyanokojiRound, OrderEvaluation } from "./types";

/**
 * Le barème des Liens d'Ayanokoji.
 *
 * Chaque lien juste rapporte des points, même si la chaîne n'est pas parfaite.
 * Une chaîne parfaite double la mise : sans l'ordre exact, on n'a jamais la
 * totalité des points. Plus la manche est dure, plus un lien vaut cher.
 *
 * Tout le barème tient dans ce tableau : la valeur d'UN lien juste, par classe
 * puis par manche (1, 2, 3). Changer un chiffre ici suffit.
 */
export const LINK_POINTS: Record<DifficultyClass, [number, number, number]> = {
  D: [20, 25, 30],
  C: [35, 40, 45],
  B: [50, 55, 60],
  A: [65, 70, 75],
};

/** Une épreuve se joue en trois manches : les trois niveaux de la classe choisie. */
export const ROUNDS_PER_EPREUVE = 3;

const linkValue = (round: Pick<AyanokojiRound, "difficulty" | "level">) => LINK_POINTS[round.difficulty][round.level - 1];

/** Les points d'une proposition : les liens justes, et autant en prime si la chaîne est parfaite. */
export function roundPoints(round: Pick<AyanokojiRound, "difficulty" | "level">, evaluation: OrderEvaluation): number {
  const links = evaluation.correctLinks.filter(Boolean).length * linkValue(round);
  return evaluation.perfect ? links * 2 : links;
}

/** Le maximum d'une manche : une chaîne parfaite. */
export const maxRoundPoints = (round: Pick<AyanokojiRound, "difficulty" | "level" | "links">) => round.links.length * linkValue(round) * 2;
