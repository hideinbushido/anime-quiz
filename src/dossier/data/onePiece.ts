import type { AttributeConfig, UniverseConfig } from "../types";
import { ONE_PIECE_ROSTER } from "./onePiece.roster";

/**
 * LE DOSSIER DE L — One Piece (rounds 3 et 4).
 *
 * Sept colonnes. Le fruit du démon se dit par son ou ses types ; quand une
 * révélation a changé ce qu'on savait, les deux restent (Luffy : Paramecia,
 * puis Zoan mythique). Le Haki tient en une colonne, affichée en petites
 * icônes : une par type que le personnage maîtrise.
 *
 * Les personnages (`onePiece.roster.ts`) sont construits à partir du wiki
 * onepiece.fandom.com par `scripts/dossier/build-onepiece.mjs`.
 */
export const ONE_PIECE_ATTRIBUTES: AttributeConfig[] = [
  { key: "sexe", label: "Genre", comparisonType: "exact" },
  { key: "espece", label: "Race / Espèce", comparisonType: "multi" },
  { key: "origine", label: "Origine", comparisonType: "exact" },
  { key: "fruit", label: "Fruit du démon", comparisonType: "multi" },
  { key: "haki", label: "Haki", comparisonType: "multi", display: "icons" },
  { key: "affiliations", label: "Affiliation / Équipage", comparisonType: "multi" },
  { key: "premiereApparition", label: "Premier arc", comparisonType: "exact" },
];

export const ONE_PIECE: UniverseConfig = {
  id: "one-piece", name: "One Piece", attributes: ONE_PIECE_ATTRIBUTES, roster: ONE_PIECE_ROSTER,
};
