import type { DifficultyClass, Epreuve, GameProgress, KillerBeeState, PlayerId } from "../types";

/** Sept morceaux par classe, du plus évident au plus retors. */
export const KILLER_BEE_TRACK_COUNT = 7;
/** Chaque morceau vaut plus que le précédent, et une classe plus dure paie davantage. */
const POINTS: Record<DifficultyClass, readonly number[]> = {
  D: [3, 5, 8, 10, 12, 15, 18], C: [3, 5, 8, 11, 13, 16, 19], B: [4, 6, 9, 12, 14, 17, 20], A: [4, 6, 10, 13, 15, 18, 22],
};
export function getKillerBeePoints(difficulty: DifficultyClass, trackIndex: number): number {
  if (!Number.isInteger(trackIndex) || trackIndex < 0 || trackIndex >= KILLER_BEE_TRACK_COUNT) throw new RangeError("Invalid track index");
  return POINTS[difficulty][trackIndex];
}
/** Après une erreur, le joueur ne peut plus buzzer pendant ce nombre de secondes de musique. */
export const BUZZ_COOLDOWN_SECONDS = 7;
export const buzzCooldown = (state: KillerBeeState, id: PlayerId): number => state.cooldown?.[id] ?? 0;
export const newKillerBeeState = (): KillerBeeState => ({ phase: "listening", attempts: { player1: 2, player2: 2 }, audioTime: 0 });
export function buzzedPlayer(state: KillerBeeState): PlayerId | null {
  return state.phase === "player1Buzzed" ? "player1" : state.phase === "player2Buzzed" ? "player2" : null;
}
export function canPlayerBuzz(state: KillerBeeState, id: PlayerId): boolean {
  return !buzzedPlayer(state) && !["reveal", "roundComplete"].includes(state.phase)
    && state.attempts[id] > 0 && buzzCooldown(state, id) <= 0;
}
export type KillerBeeEvent =
  | { type: "buzz"; playerId: PlayerId; audioTime?: number }
  | { type: "judge"; correct: boolean }
  | { type: "reveal" }
  | { type: "audioTime"; audioTime: number };

/** All local and remote buzzes enter the same atomic reducer. Never checks oral answers. */
export function reduceKillerBee(progress: GameProgress, event: KillerBeeEvent, epreuve: Epreuve): GameProgress {
  const track = epreuve.killerBeeTracks?.[progress.roundIndex];
  if (!track || progress.rounds[progress.roundIndex]) return progress;
  const state = progress.killerBee ?? newKillerBeeState();
  const player = buzzedPlayer(state);
  if (event.type === "audioTime") {
    if (player || !Number.isFinite(event.audioTime) || event.audioTime < 0) return progress;
    // Le délai ne s'écoule que pendant que la musique avance : ni en pause, ni sur un retour au début
    const elapsed = event.audioTime - state.audioTime;
    const cooldown = state.cooldown && elapsed > 0 && elapsed < 2
      ? { player1: Math.max(0, state.cooldown.player1 - elapsed), player2: Math.max(0, state.cooldown.player2 - elapsed) }
      : state.cooldown;
    return { ...progress, killerBee: { ...state, audioTime: event.audioTime, cooldown } };
  }
  if (event.type === "buzz") {
    if (!canPlayerBuzz(state, event.playerId)) return progress;
    return { ...progress, respondent: event.playerId, killerBee: { ...state,
      phase: event.playerId === "player1" ? "player1Buzzed" : "player2Buzzed",
      audioTime: Number.isFinite(event.audioTime) && event.audioTime! >= 0 ? event.audioTime! : state.audioTime,
    } };
  }
  if (event.type === "judge" && !player) return progress;
  if (event.type === "judge" && !event.correct) {
    const attempts = { ...state.attempts, [player!]: state.attempts[player!] - 1 };
    const phase = attempts.player1 === 0 && attempts.player2 === 0 ? "roundComplete"
      : attempts.player1 === 0 ? "player1Locked" : attempts.player2 === 0 ? "player2Locked" : "listening";
    const cooldown = { player1: buzzCooldown(state, "player1"), player2: buzzCooldown(state, "player2"), [player!]: BUZZ_COOLDOWN_SECONDS };
    return { ...progress, killerBee: { ...state, attempts, phase, cooldown } };
  }
  if (event.type === "reveal" && (state.attempts.player1 > 0 || state.attempts.player2 > 0)) return progress;
  const correct = event.type === "judge" && event.correct;
  return { ...progress, killerBee: { ...state, phase: "reveal" }, rounds: [...progress.rounds, {
    roundId: track.id, playerId: player ?? progress.respondent, correct,
    points: correct ? getKillerBeePoints(track.difficulty, progress.roundIndex) : 0,
    answer: [correct ? "Validation du présentateur" : "Personne ne trouve"],
  }] };
}

/** Inject any global buzzer adapter; subscribe must return its cleanup function. */
export interface DuelBuzzSource {
  subscribe: (onPlayerBuzz: (playerId: PlayerId) => void) => () => void;
  resetBuzz?: () => void;
  lockPlayer?: (playerId: PlayerId) => void;
}
