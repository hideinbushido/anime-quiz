import type { AttributeConfig, UniverseConfig } from "../types";
import { DRAGON_BALL_ROSTER } from "./dragonBall.roster";

/**
 * LE DOSSIER DE L — Dragon Ball (round 5).
 *
 * Sept colonnes. « Peut se transformer » ne dit que Oui ou Non, jamais le nom
 * de la transformation : la colonne ne doit pas désigner un Saiyan à elle seule.
 *
 * Les personnages (`dragonBall.roster.ts`) sont construits par
 * `scripts/dossier/build-dragonball.mjs`. Genre, race et affiliations viennent
 * du wiki dragonball.fandom.com ; l'origine, la résidence, la transformation et
 * le premier arc n'y existent pas proprement et sont tenus à la main dans ce script.
 */
export const DRAGON_BALL_ATTRIBUTES: AttributeConfig[] = [
  { key: "sexe", label: "Genre", comparisonType: "exact" },
  { key: "race", label: "Race / Espèce", comparisonType: "multi" },
  { key: "origine", label: "Origine", comparisonType: "exact" },
  { key: "residence", label: "Résidence", comparisonType: "exact" },
  { key: "affiliations", label: "Affiliation", comparisonType: "multi" },
  { key: "transformation", label: "Peut se transformer", comparisonType: "exact" },
  { key: "premiereApparition", label: "Premier arc", comparisonType: "exact" },
];

export const DRAGON_BALL: UniverseConfig = {
  id: "dragon-ball", name: "Dragon Ball", attributes: DRAGON_BALL_ATTRIBUTES, roster: DRAGON_BALL_ROSTER,
};
