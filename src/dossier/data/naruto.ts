import type { AttributeConfig, UniverseConfig } from "../types";
import { NARUTO_ROSTER } from "./naruto.roster";

/**
 * LE DOSSIER DE L — Naruto.
 *
 * Sept colonnes. L'affiliation tient en une colonne : le village, et l'Akatsuki
 * pour ceux qui en ont fait partie. Les types de jutsu se limitent aux trois
 * grands (ninjutsu, genjutsu, taijutsu), les natures de chakra aux cinq de base.
 * Le statut spécial connaît Bijû (les démons à queues), Jinchūriki, Ermite, Invocateur, Ninja déserteur et
 * Ninja médical.
 *
 * Les personnages (`naruto.roster.ts`) sont construits à partir du wiki
 * naruto.fandom.com par `scripts/dossier/build-naruto.mjs` : sexe, clan,
 * affiliations, natures de chakra, techniques du manga et chapitre de première
 * apparition. Les règles de regroupement et les quelques corrections manuelles
 * (clan de naissance plutôt que par alliance…) sont dans ce script.
 */
export const NARUTO_ATTRIBUTES: AttributeConfig[] = [
  { key: "sexe", label: "Sexe", comparisonType: "exact" },
  { key: "affiliations", label: "Affiliation", comparisonType: "multi" },
  { key: "clan", label: "Clan", comparisonType: "exact" },
  { key: "typesJutsu", label: "Types de jutsu", comparisonType: "multi" },
  { key: "naturesChakra", label: "Natures de chakra", comparisonType: "multi", display: "icons" },
  { key: "statutSpecial", label: "Statut spécial", comparisonType: "multi" },
  { key: "premiereApparition", label: "Première apparition", comparisonType: "exact" },
];

export const NARUTO: UniverseConfig = {
  id: "naruto", name: "Naruto", attributes: NARUTO_ATTRIBUTES, roster: NARUTO_ROSTER,
};
