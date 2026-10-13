import { useRoom } from "../realtime/roomContext";
import type { DossierPhase, DossierView, RosterEntry, RoundOutcome } from "./types";

/** L'état du Dossier de L vu depuis un écran : la part de la room qui concerne cette épreuve. */
export function useDossier<V extends DossierView>(role: V["role"]) {
  const { dossier, dossierRosters, status, error, send } = useRoom();
  const view = dossier && dossier.role === role ? (dossier as V) : null;
  // Le catalogue de l'univers en cours, reçu à part ; vide le temps qu'il arrive
  return { view, roster: (view && dossierRosters[view.universe.id]) || EMPTY, status, error, send };
}

const EMPTY: RosterEntry[] = [];

export const DOSSIER_PHASE_LABEL: Record<DossierPhase, string> = {
  intro: "Round prêt",
  guessing: "Propositions en cours",
  debrief: "Debrief",
  finished: "Épreuve terminée",
};

/** La phrase qui annonce l'issue d'un round. */
export function outcomeLabel(outcome: RoundOutcome | null, names: Record<"player1" | "player2", string>): string {
  if (outcome === "player1" || outcome === "player2") return `${names[outcome]} a trouvé`;
  if (outcome === "draw") return "Égalité : les deux ont trouvé";
  return "Personne n'a trouvé";
}
