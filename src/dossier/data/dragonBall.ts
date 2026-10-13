import type { AttributeConfig, UniverseConfig } from "../types";
import { DRAGON_BALL_ROSTER } from "./dragonBall.roster";

/**
 * LE DOSSIER DE L — Dragon Ball (round 5).
 *
 * Six colonnes, proposées pour démarrer et faciles à changer : il suffit de
 * modifier cette liste (et, pour une colonne nouvelle, de la faire remplir par
 * le script).
 *
 * Les personnages (`dragonBall.roster.ts`) sont construits à partir du wiki
 * dragonball.fandom.com par `scripts/dossier/build-dragonball.mjs`. Ce wiki
 * mêle le manga, les films et les jeux vidéo : le script ne garde qu'une liste
 * fermée de groupes, et l'univers d'origine y est tenu à la main.
 */
export const DRAGON_BALL_ATTRIBUTES: AttributeConfig[] = [
  { key: "sexe", label: "Sexe", comparisonType: "exact" },
  { key: "race", label: "Race", comparisonType: "multi" },
  { key: "affiliations", label: "Affiliations", comparisonType: "multi" },
  { key: "univers", label: "Univers", comparisonType: "exact" },
  { key: "series", label: "Séries", comparisonType: "multi" },
  { key: "premiereSerie", label: "Première série", comparisonType: "exact" },
];

export const DRAGON_BALL: UniverseConfig = {
  id: "dragon-ball", name: "Dragon Ball", attributes: DRAGON_BALL_ATTRIBUTES, roster: DRAGON_BALL_ROSTER,
};
