import type { AttributeConfig, UniverseConfig } from "../types";
import { ONE_PIECE_ROSTER } from "./onePiece.roster";

/**
 * LE DOSSIER DE L — One Piece (rounds 3 et 4).
 *
 * Huit colonnes, proposées pour démarrer et faciles à changer : il suffit de
 * modifier cette liste (et, pour une colonne nouvelle, de la faire remplir par
 * le script). La prime est une colonne « ordonnée » : rouge avec une flèche
 * vers le haut ou vers le bas tant qu'on n'a pas la bonne.
 *
 * Les personnages (`onePiece.roster.ts`) sont construits à partir du wiki
 * onepiece.fandom.com par `scripts/dossier/build-onepiece.mjs`.
 */
export const ONE_PIECE_ATTRIBUTES: AttributeConfig[] = [
  { key: "sexe", label: "Sexe", comparisonType: "exact" },
  { key: "espece", label: "Espèce", comparisonType: "multi" },
  { key: "affiliations", label: "Affiliations", comparisonType: "multi" },
  { key: "origine", label: "Origine", comparisonType: "exact" },
  { key: "fruit", label: "Fruit du démon", comparisonType: "exact" },
  { key: "haki", label: "Haki", comparisonType: "multi" },
  { key: "prime", label: "Prime", comparisonType: "ordered" },
  { key: "premiereApparition", label: "Première apparition", comparisonType: "exact" },
];

export const ONE_PIECE: UniverseConfig = {
  id: "one-piece", name: "One Piece", attributes: ONE_PIECE_ATTRIBUTES, roster: ONE_PIECE_ROSTER,
};
