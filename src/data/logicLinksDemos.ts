import type { DifficultyClass, LogicLinksPuzzle, LogicRule } from "../types";
import { narutoIds, pickNarutoCharacters } from "./narutoCharacters";

const sources = [
  "https://naruto-official.com/en/news/01_1694", // Tobirama and Hiruzen
  "https://naruto-official.com/en/news/01_1643", // Jiraiya and his students
  "https://naruto-official.com/en/news/01_1903", // Kakashi and Team Seven
  "https://naruto-official.com/en/news/01_1868", // Tsunade and Sakura
  "https://naruto-official.com/en/news/01_1681", // Minato and his team
  "https://naruto-official.com/en/news/01_1629", // Orochimaru and the invasion
];

// Curated relations among the demo cast, not a migration of the whole Naruto base.
const mentors: [number, number][] = [
  [58, 12], [12, 41], [12, 42], [12, 40], [41, 46], [41, 1], [41, 130],
  [46, 4], [46, 48], [4, 1], [4, 2], [4, 3], [42, 2], [40, 3],
];
const succession: [number, number][] = [[58, 12], [12, 46], [12, 40], [40, 4], [4, 1]];
const sameSensei: [number, number][] = [[41, 42], [41, 40], [42, 40], [46, 1], [46, 130], [1, 130], [4, 48], [1, 2], [1, 3], [2, 3]];

function rule(id: string, text: string, pairs: [number, number][], cast: number[], explanation: string, direction: LogicRule["direction"] = "left-to-right"): LogicRule {
  return { id, text, direction, explanation,
    pairs: pairs.filter(([left, right]) => cast.includes(left) && cast.includes(right))
      .map(pair => narutoIds(pair) as [string, string]),
  };
}

const casts: Record<DifficultyClass, number[]> = {
  D: [58, 12, 41, 46, 4, 1],
  C: [58, 12, 41, 46, 4, 1, 42, 40],
  B: [58, 12, 41, 46, 4, 1, 42, 40, 2, 3],
  A: [58, 12, 41, 46, 4, 1, 42, 40, 2, 3, 48, 130],
};

function makePuzzle(difficulty: DifficultyClass): LogicLinksPuzzle {
  const cast = casts[difficulty];
  const elite = difficulty === "A";
  const solution = elite ? [12, 42, 41, 46, 4, 1] : [58, 12, 41, 46, 4, 1];
  const explanations = elite ? [
    "Hiruzen affronte son ancien élève Orochimaru sur les toits pendant l'invasion de Konoha.",
    "Orochimaru et Jiraiya ont été les élèves de Hiruzen, au sein de la même équipe.",
    "Jiraiya a été le sensei de Minato.", "Minato a dirigé l'équipe de Kakashi.",
  ] : [
    "Tobirama a formé Hiruzen, son futur successeur.", "Hiruzen a été le sensei de Jiraiya.",
    "Jiraiya a été le sensei de Minato.", "Minato a dirigé l'équipe de Kakashi.",
  ];
  const rules = explanations.map((explanation, index) => rule(
    `mentor-${index}`, "Gauche a été un maître ninja de droite (équipe ou apprentissage personnel).",
    mentors, cast, explanation,
  ));
  if (elite) {
    rules[0] = rule("invasion", "Gauche a affronté son ancien élève, à droite, sur les toits pendant l'invasion de Konoha.", [[12, 42]], cast, explanations[0]);
    rules[1] = rule("same-sensei", "Ils ont eu au moins un maître ninja en commun.", sameSensei, cast, explanations[1], "both");
  }
  rules.push(rule("succession", "Gauche a été Hokage ; droite lui a immédiatement succédé (hors intérim).",
    succession, cast, "Naruto, septième Hokage, succède à Kakashi, le sixième."));
  return {
    id: `ayanokoji-demo-${difficulty}`, title: elite ? "Héritages et ruptures" : `La relève de Konoha — ${difficulty}`,
    intro: `${cast.length} personnages, 6 places. Chaque carte ne peut être utilisée qu'une fois.`,
    // Alphabetical deck order never exposes the authored solution order.
    characters: pickNarutoCharacters(cast).sort((a, b) => a.name.localeCompare(b.name, "fr")),
    solutionIds: narutoIds(solution), rules, sources,
  };
}

export const puzzlesByClass: Record<DifficultyClass, LogicLinksPuzzle[]> = {
  D: [makePuzzle("D")], C: [makePuzzle("C")], B: [makePuzzle("B")], A: [makePuzzle("A")],
};
export const ayanokojiPuzzles = puzzlesByClass.D;
