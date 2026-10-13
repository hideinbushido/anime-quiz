/**
 * Le moteur de comparaison du Dossier de L. Il ne connaît aucun univers : il
 * compare deux personnages colonne par colonne, selon le type que la
 * configuration donne à chaque colonne.
 */
import type { AttributeConfig, AttributeValue, CellResult, DossierCharacter, GuessResult, MatchState, UniverseConfig } from "./types";

const EMPTY_LABEL = "Aucun";

/** Deux libellés se valent sans tenir compte de la casse, des accents ni des espaces en trop. */
export const normalize = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim().toLowerCase();

const asList = (value: AttributeValue | undefined): string[] =>
  value === null || value === undefined ? [] : Array.isArray(value) ? value : [String(value)];

/** Ce qu'on affiche dans la case : les valeurs du personnage proposé. */
export const displayValue = (value: AttributeValue | undefined): string =>
  typeof value === "number" ? value.toLocaleString("fr-FR").replace(/\u202f|\u00a0/g, " ") : asList(value).join(", ") || EMPTY_LABEL;

/** Valeur unique : identique, vert ; différente, rouge. Deux absences se valent. */
export function compareExact(guess: AttributeValue | undefined, target: AttributeValue | undefined): MatchState {
  return normalize(asList(guess).join("|")) === normalize(asList(target).join("|")) ? "correct" : "wrong";
}

/** Plusieurs valeurs : mêmes ensembles, vert ; au moins une en commun, orange ; aucune, rouge. */
export function compareMulti(guess: AttributeValue | undefined, target: AttributeValue | undefined): MatchState {
  const a = new Set(asList(guess).map(normalize)), b = new Set(asList(target).map(normalize));
  const shared = [...a].filter(value => b.has(value)).length;
  if (shared === a.size && shared === b.size) return "correct";
  return shared > 0 ? "partial" : "wrong";
}

/** Valeur ordonnée : égale, vert ; sinon rouge, avec le sens dans lequel chercher. */
export function compareOrdered(guess: AttributeValue | undefined, target: AttributeValue | undefined): { state: MatchState; direction?: "up" | "down" } {
  const a = Number(guess), b = Number(target);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return { state: compareExact(guess, target) };
  return a === b ? { state: "correct" } : { state: "wrong", direction: b > a ? "up" : "down" };
}

export function compareAttribute(attribute: AttributeConfig, guess: DossierCharacter, target: DossierCharacter): CellResult {
  const mine = guess.attributes[attribute.key], theirs = target.attributes[attribute.key];
  const base = { key: attribute.key, value: displayValue(mine) };
  if (attribute.comparisonType === "multi") return { ...base, state: compareMulti(mine, theirs) };
  if (attribute.comparisonType === "ordered") return { ...base, ...compareOrdered(mine, theirs) };
  return { ...base, state: compareExact(mine, theirs) };
}

/** Corrige une proposition. Le résultat ne contient rien de la cible, sauf ce que les couleurs en disent. */
export function compareCharacterGuess(universe: UniverseConfig, guess: DossierCharacter, target: DossierCharacter): GuessResult {
  return {
    characterId: guess.id, name: guess.name, ...(guess.image ? { image: guess.image } : {}),
    found: guess.id === target.id,
    cells: universe.attributes.map(attribute => compareAttribute(attribute, guess, target)),
  };
}

export const findCharacter = (universe: UniverseConfig, id: unknown): DossierCharacter | undefined =>
  typeof id === "string" ? universe.roster.find(character => character.id === id) : undefined;

/** La recherche de l'écran joueur : par nom ou surnom, sans casse ni accents. */
export function searchRoster<T extends { name: string; aliases?: string[] }>(roster: T[], query: string, limit = 8): T[] {
  const needle = normalize(query);
  if (!needle) return [];
  const score = (entry: T) => {
    const names = [entry.name, ...(entry.aliases ?? [])].map(normalize);
    if (names.some(name => name === needle)) return 0;
    if (names.some(name => name.startsWith(needle))) return 1;
    if (names.some(name => name.split(" ").some(word => word.startsWith(needle)))) return 2;
    return names.some(name => name.includes(needle)) ? 3 : -1;
  };
  return roster.map(entry => ({ entry, rank: score(entry) })).filter(item => item.rank >= 0)
    .sort((a, b) => a.rank - b.rank || a.entry.name.localeCompare(b.entry.name, "fr")).slice(0, limit).map(item => item.entry);
}

/** Un univers est jouable quand il a des colonnes et assez de personnages pour chercher. */
export const universeReady = (universe: UniverseConfig) => universe.attributes.length > 0 && universe.roster.length >= 2;
