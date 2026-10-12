import { epreuves } from "../data/epreuves";
import type { DuelEpreuveResult, DuelSession, Epreuve, PlayerId } from "../types";

/**
 * Des duels fictifs, pour les aperçus de développement seulement.
 * Un LIVE demande cinq épreuves et le catalogue n'en a pas encore autant :
 * sans eux, l'écran de fin et l'historique resteraient vides. Rien n'est enregistré.
 */

/** Le catalogue, complété de deux emplacements pour les épreuves qui manquent encore. */
export const demoCatalog: Epreuve[] = [...epreuves, ...[4, 5].map(n => ({ ...epreuves[0], id: `apercu-${n}`, nom: `Épreuve ${n} à venir` }))];

const SELECTORS = ["player1", "player1", "player2", "player2", "host"] as const;
const CLASSES = ["B", "D", "A", "C", "B"] as const;

export function demoDuel(id: string, names: [string, string], scores: [number, number][], finishedAt?: string): DuelSession {
  const results: DuelEpreuveResult[] = demoCatalog.slice(0, 5).map((epreuve, i) => ({
    epreuveId: epreuve.id, selectedBy: SELECTORS[i], difficulty: CLASSES[i],
    scorePlayer1: scores[i][0], scorePlayer2: scores[i][1],
    rounds: [0, 1].map(r => ({ roundId: `${epreuve.id}-${r}`, playerId: (r ? "player2" : "player1") as PlayerId, points: scores[i][r], correct: scores[i][r] > 0, answer: [] })),
  }));
  const total = (n: 0 | 1) => scores.reduce((sum, pair) => sum + pair[n], 0);
  return {
    version: 2, id, phase: "recap", currentIndex: 4, finishedAt,
    players: { player1: { id: "player1", name: names[0], score: total(0) }, player2: { id: "player2", name: names[1], score: total(1) } },
    selected: results.map(({ epreuveId, selectedBy, difficulty }) => ({ epreuveId, selectedBy, difficulty })),
    progress: { roundIndex: 0, respondent: "player1", input: "", placements: [], selectedId: null, rounds: [] },
    results,
  };
}

/** Les trois issues possibles d'un duel. */
export const DEMO_SCORES: Record<string, [number, number][]> = {
  "1": [[300, 100], [14, 9], [400, 600], [200, 100], [300, 200]],
  "2": [[100, 300], [9, 14], [600, 400], [100, 200], [200, 300]],
  egalite: [[300, 100], [9, 9], [400, 600], [200, 100], [100, 200]],
};

/** Un historique de démonstration : certains joueurs reviennent d'un duel à l'autre. */
export function demoHistory(): DuelSession[] {
  return [
    demoDuel("d6", ["Shikamaru", "Itachi"], DEMO_SCORES["1"], "2026-10-10T21:40:00"),
    demoDuel("d5", ["Itachi", "Levi"], DEMO_SCORES["2"], "2026-10-03T21:35:00"),
    demoDuel("d4", ["Shikamaru", "Levi"], DEMO_SCORES.egalite, "2026-09-26T21:50:00"),
    demoDuel("d3", ["Nami", "Shikamaru"], DEMO_SCORES["2"], "2026-09-19T21:30:00"),
    demoDuel("d2", ["Itachi", "Nami"], DEMO_SCORES["1"], "2026-09-12T21:45:00"),
    demoDuel("d1", ["Levi", "Nami"], [[200, 100], [12, 5], [500, 300], [100, 0], [300, 100]]),
  ];
}
