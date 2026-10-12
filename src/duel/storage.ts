import type { DuelRoundResult, DuelSession, Epreuve, GameProgress } from "../types";
import { CLASSES, resolveEpreuve, roundIds, SELECTION_ORDER, withScores } from "./engine";

export const DUEL_KEY = "anime-quiz-duel-v2";
export const HISTORY_KEY = "anime-quiz-duel-history-v2";
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;
const isPlayer = (id: unknown) => id === "player1" || id === "player2";
const isStrings = (value: unknown): value is string[] => Array.isArray(value) && value.every(item => typeof item === "string");

function validRounds(value: unknown, ids: string[]): value is DuelRoundResult[] {
  return Array.isArray(value) && value.length <= ids.length && value.every((round, index) =>
    isRecord(round) && round.roundId === ids[index] && isPlayer(round.playerId)
    && Number.isFinite(round.points) && Number(round.points) >= 0
    && typeof round.correct === "boolean" && isStrings(round.answer)
    && [round.correctSlots, round.correctLinks].every(flags => flags === undefined
      || Array.isArray(flags) && flags.every(flag => typeof flag === "boolean")));
}

function validProgress(value: unknown, epreuve?: Epreuve): value is GameProgress {
  if (!isRecord(value) || !Number.isInteger(value.roundIndex) || Number(value.roundIndex) < 0
      || !isPlayer(value.respondent) || typeof value.input !== "string"
      || !isStrings(value.placements) || !(value.selectedId === null || typeof value.selectedId === "string")) return false;
  const ids = epreuve ? roundIds(epreuve) : [];
  if (!validRounds(value.rounds, ids)) return false;
  const index = Number(value.roundIndex);
  if (!epreuve) return index === 0 && value.rounds.length === 0 && value.placements.length === 0;
  if (index >= ids.length || ![index, index + 1].includes(value.rounds.length)) return false;
  if (value.killerBee !== undefined) {
    const state = value.killerBee;
    if (!epreuve.killerBeeTracks || !isRecord(state) || !isRecord(state.attempts)
        || !["listening", "player1Buzzed", "player2Buzzed", "player1Locked", "player2Locked", "reveal", "roundComplete"].includes(String(state.phase))
        || ![state.attempts.player1, state.attempts.player2].every(n => Number.isInteger(n) && Number(n) >= 0 && Number(n) <= 2)
        || !Number.isFinite(state.audioTime) || Number(state.audioTime) < 0) return false;
    const a = Number(state.attempts.player1), b = Number(state.attempts.player2);
    const revealed = value.rounds.length === index + 1;
    if ((state.phase === "reveal") !== revealed
        || state.phase === "roundComplete" && (a !== 0 || b !== 0)
        || state.phase === "listening" && (a === 0 || b === 0)
        || state.phase === "player1Locked" && (a !== 0 || b === 0)
        || state.phase === "player2Locked" && (b !== 0 || a === 0)
        || state.phase === "player1Buzzed" && (a === 0 || a < b || value.respondent !== "player1")
        || state.phase === "player2Buzzed" && (b === 0 || b < a || value.respondent !== "player2")) return false;
  }
  if (epreuve.type === "logic-links") {
    const puzzle = epreuve.logicPuzzles?.[index];
    if (!puzzle) return false;
    const placed = value.placements.filter(Boolean);
    if (value.placements.length !== 0 && value.placements.length !== 6) return false;
    if (new Set(placed).size !== placed.length || placed.some(id => !puzzle.characters.some(character => character.id === id))) return false;
    if (value.selectedId !== null && !puzzle.characters.some(character => character.id === value.selectedId)) return false;
  }
  return true;
}

/** Treat browser storage as untrusted and reject outdated or incomplete matches. */
export function parseDuel(value: unknown, catalog: Epreuve[]): DuelSession | null {
  if (!isRecord(value) || value.version !== 2 || typeof value.id !== "string"
      || !["selection", "ready", "playing", "recap"].includes(String(value.phase))
      || !isRecord(value.players) || !Array.isArray(value.selected) || value.selected.length > 5
      || !Array.isArray(value.results) || !Number.isInteger(value.currentIndex)) return null;
  for (const id of ["player1", "player2"]) {
    const player = value.players[id];
    if (!isRecord(player) || player.id !== id || typeof player.name !== "string" || !player.name.trim()) return null;
  }
  const selectedIds = new Set<string>();
  const resolved: Epreuve[] = [];
  for (const [index, selection] of value.selected.entries()) {
    if (!isRecord(selection) || typeof selection.epreuveId !== "string"
        || selection.selectedBy !== SELECTION_ORDER[index]
        || !CLASSES.includes(selection.difficulty as never) || selectedIds.has(selection.epreuveId)) return null;
    const epreuve = catalog.find(item => item.id === selection.epreuveId);
    if (!epreuve) return null;
    selectedIds.add(epreuve.id);
    resolved.push(resolveEpreuve(epreuve, selection.difficulty as keyof typeof epreuve.difficulties));
  }
  const beforePlay = value.phase === "selection" || value.phase === "ready";
  if (value.phase === "selection" && value.selected.length === 5) return null;
  if (value.phase !== "selection" && value.selected.length !== 5) return null;
  if (beforePlay && (value.results.length !== 0 || value.currentIndex !== 0)) return null;
  if (value.phase === "playing" && (value.currentIndex !== value.results.length || value.results.length >= 5)) return null;
  if (value.phase === "recap" && (value.results.length !== 5 || value.currentIndex !== 4)) return null;
  for (const [index, result] of value.results.entries()) {
    const selected = value.selected[index];
    if (!isRecord(result) || !resolved[index] || result.epreuveId !== selected.epreuveId
        || result.difficulty !== selected.difficulty || result.selectedBy !== selected.selectedBy
        || !validRounds(result.rounds, roundIds(resolved[index]))
        || result.rounds.length !== roundIds(resolved[index]).length) return null;
  }
  if (!validProgress(value.progress, value.phase === "playing" ? resolved[Number(value.currentIndex)] : undefined)) return null;
  return withScores(value as unknown as DuelSession);
}

export function readDuel(catalog: Epreuve[]): { session: DuelSession | null; warning: string } {
  try {
    const raw = localStorage.getItem(DUEL_KEY);
    if (!raw) return { session: null, warning: "" };
    const session = parseDuel(JSON.parse(raw), catalog);
    return { session, warning: session ? "" : "La sauvegarde du duel est incompatible. Tu peux créer un nouveau LIVE." };
  } catch {
    return { session: null, warning: "La sauvegarde locale est illisible ou indisponible." };
  }
}

export function readHistory(catalog: Epreuve[]): DuelSession[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]");
    return Array.isArray(raw) ? raw.map(entry => parseDuel(entry, catalog)).filter((entry): entry is DuelSession => entry?.phase === "recap") : [];
  } catch { return []; }
}

export function saveDuel(session: DuelSession, catalog: Epreuve[]): void {
  localStorage.setItem(DUEL_KEY, JSON.stringify(session));
  if (session.phase === "recap") {
    const history = readHistory(catalog);
    // Un duel terminé est réenregistré à chaque passage : il garde la date de sa première entrée
    const finishedAt = history.find(entry => entry.id === session.id)?.finishedAt ?? new Date().toISOString();
    const previous = history.filter(entry => entry.id !== session.id);
    localStorage.setItem(HISTORY_KEY, JSON.stringify([{ ...session, finishedAt }, ...previous].slice(0, 20)));
  }
}
