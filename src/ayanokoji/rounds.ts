import type { AyanokojiRound } from "./types";

/**
 * Les manches des Liens d'Ayanokoji.
 *
 * Douze emplacements sont prévus : D1 à D3, C1 à C3, B1 à B3, A1 à A3.
 * Les manches ci-dessous sont PROVISOIRES : elles servent à éprouver le moteur.
 * Les données définitives les remplaceront.
 *
 * Pour ajouter une manche : six personnages, cinq liens, la solution. Pour
 * chaque lien, `pairs` liste TOUTES les paires de la manche qui le vérifient,
 * pas seulement celle de la solution — c'est ce qui permet au validateur de
 * garantir qu'il n'existe qu'une seule chaîne. `npm test` le vérifie.
 */
export const AYANOKOJI_ROUNDS: AyanokojiRound[] = [
  {
    id: "d1-releve-de-konoha",
    difficulty: "D",
    level: 1,
    title: "La relève de Konoha",
    characters: [
      { id: "tobirama", name: "Tobirama Senju" },
      { id: "hiruzen", name: "Hiruzen Sarutobi" },
      { id: "jiraiya", name: "Jiraiya" },
      { id: "minato", name: "Minato Namikaze" },
      { id: "kakashi", name: "Kakashi Hatake" },
      { id: "naruto", name: "Naruto Uzumaki" },
    ],
    // Un seul type de lien, une seule lignée : peu de fausses pistes.
    links: ["l1", "l2", "l3", "l4", "l5"].map(id => ({
      id,
      label: "SENSEI >",
      description: "Le personnage de gauche a formé celui de droite.",
      direction: "left-to-right" as const,
      pairs: [["tobirama", "hiruzen"], ["hiruzen", "jiraiya"], ["jiraiya", "minato"], ["minato", "kakashi"], ["kakashi", "naruto"], ["jiraiya", "naruto"]] as [string, string][],
    })),
    solutionOrder: ["tobirama", "hiruzen", "jiraiya", "minato", "kakashi", "naruto"],
  },
  {
    id: "d2-racine-et-clans",
    difficulty: "D",
    level: 2,
    title: "La Racine et les clans",
    characters: [
      { id: "shino", name: "Shino Aburame" },
      { id: "torune", name: "Torune Aburame" },
      { id: "fu", name: "Fû Yamanaka" },
      { id: "sai", name: "Sai" },
      { id: "ino", name: "Ino Yamanaka" },
      { id: "choji", name: "Chôji Akimichi" },
    ],
    links: [
      // Deux clans sont représentés : Aburame (Shino, Torune) et Yamanaka (Fû, Ino).
      { id: "l1", label: "CLAN =", description: "Les deux personnages sont du même clan.", direction: "both", pairs: [["shino", "torune"], ["fu", "ino"]] },
      // Torune, Fû et Sai ont tous les trois appartenu à la Racine.
      { id: "l2", label: "ROOT =", description: "Les deux personnages ont appartenu à la Racine.", direction: "both", pairs: [["torune", "fu"], ["fu", "sai"], ["torune", "sai"]] },
      { id: "l3", label: "ROOT =", description: "Les deux personnages ont appartenu à la Racine.", direction: "both", pairs: [["torune", "fu"], ["fu", "sai"], ["torune", "sai"]] },
      { id: "l4", label: "COUPLE =", description: "Les deux personnages forment un couple.", direction: "both", pairs: [["sai", "ino"]] },
      { id: "l5", label: "ÉQUIPE =", description: "Les deux personnages ont fait partie de la même équipe.", direction: "both", pairs: [["ino", "choji"], ["torune", "fu"]] },
    ],
    solutionOrder: ["shino", "torune", "fu", "sai", "ino", "choji"],
  },
  {
    id: "d3-senju-et-sannin",
    difficulty: "D",
    level: 3,
    title: "Des Senju à l'Akatsuki",
    characters: [
      { id: "hashirama", name: "Hashirama Senju" },
      { id: "tobirama", name: "Tobirama Senju" },
      { id: "tsunade", name: "Tsunade" },
      { id: "jiraiya", name: "Jiraiya" },
      { id: "nagato", name: "Nagato" },
      { id: "konan", name: "Konan" },
    ],
    links: [
      { id: "l1", label: "AÎNÉ >", description: "Le personnage de gauche est le frère aîné de celui de droite.", direction: "left-to-right", pairs: [["hashirama", "tobirama"]] },
      // Trois Senju dans la manche : le lien de clan ne suffit pas à lui seul à les ordonner.
      { id: "l2", label: "CLAN =", description: "Les deux personnages sont du même clan.", direction: "both", pairs: [["hashirama", "tobirama"], ["hashirama", "tsunade"], ["tobirama", "tsunade"]] },
      { id: "l3", label: "ÉQUIPE =", description: "Les deux personnages ont fait partie de la même équipe.", direction: "both", pairs: [["tsunade", "jiraiya"], ["nagato", "konan"]] },
      { id: "l4", label: "TUÉ PAR >", description: "Le personnage de gauche a été tué par celui de droite.", direction: "left-to-right", pairs: [["jiraiya", "nagato"]] },
      { id: "l5", label: "ORG =", description: "Les deux personnages ont appartenu à la même organisation.", direction: "both", pairs: [["nagato", "konan"]] },
    ],
    solutionOrder: ["hashirama", "tobirama", "tsunade", "jiraiya", "nagato", "konan"],
  },
];

export const findRound = (id: string): AyanokojiRound | undefined => AYANOKOJI_ROUNDS.find(round => round.id === id);

/** La manche suivante de l'épreuve : le niveau d'après dans la même classe. Après la troisième, l'épreuve est finie. */
export function nextRound(current: AyanokojiRound): AyanokojiRound | undefined {
  return AYANOKOJI_ROUNDS.find(round => round.difficulty === current.difficulty && round.level === current.level + 1);
}
