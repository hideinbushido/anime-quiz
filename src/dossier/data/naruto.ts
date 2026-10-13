import type { AttributeConfig, UniverseConfig } from "../types";
import { NARUTO_ROSTER } from "./naruto.roster";

/**
 * LE DOSSIER DE L — Naruto.
 *
 * Les huit colonnes sont fixées par le cahier des charges. « Groupe » et
 * « Affiliation » ne font qu'une colonne ; le statut spécial ne connaît que
 * Jinchūriki, Ermite et Invocateur.
 *
 * Les personnages (`naruto.roster.ts`) sont construits à partir du wiki
 * naruto.fandom.com par `scripts/dossier/build-naruto.mjs` : sexe, clan,
 * affiliations, natures de chakra, techniques du manga et chapitre de première
 * apparition. Les règles de regroupement et les quelques corrections manuelles
 * (clan de naissance plutôt que par alliance…) sont dans ce script.
 */
export const NARUTO_ATTRIBUTES: AttributeConfig[] = [
  { key: "sexe", label: "Sexe", comparisonType: "exact" },
  { key: "village", label: "Village", comparisonType: "exact" },
  { key: "clan", label: "Clan", comparisonType: "exact" },
  { key: "affiliations", label: "Groupe / Affiliation", comparisonType: "multi" },
  { key: "typesJutsu", label: "Types de jutsu", comparisonType: "multi" },
  { key: "naturesChakra", label: "Natures de chakra", comparisonType: "multi" },
  { key: "statutSpecial", label: "Statut spécial", comparisonType: "multi" },
  { key: "premiereApparition", label: "Première apparition", comparisonType: "exact" },
];

export const NARUTO: UniverseConfig = {
  id: "naruto", name: "Naruto", attributes: NARUTO_ATTRIBUTES, roster: NARUTO_ROSTER,
};
