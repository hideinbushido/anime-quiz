import type { DifficultyClass, Epreuve, GameProgress, KillerBeeState, PlayerId } from "../types";

const POINTS: Record<DifficultyClass, readonly number[]> = {
  D: [3, 5, 8, 10, 12], C: [3, 5, 8, 11, 13], B: [4, 6, 9, 12, 14], A: [4, 6, 10, 13, 15],
};
export function getKillerBeePoints(difficulty: DifficultyClass, trackIndex: number): number {
  if (!Number.isInteger(trackIndex) || trackIndex < 0 || trackIndex > 4) throw new RangeError("Invalid track index");
  return POINTS[difficulty][trackIndex];
}
export const newKillerBeeState = (): KillerBeeState => ({ phase: "listening", attempts: { player1: 2, player2: 2 }, audioTime: 0 });
export function buzzedPlayer(state: KillerBeeState): PlayerId | null {
  return state.phase === "player1Buzzed" ? "player1" : state.phase === "player2Buzzed" ? "player2" : null;
}
export function canPlayerBuzz(state: KillerBeeState, id: PlayerId): boolean {
  const other = id === "player1" ? "player2" : "player1";
  return !buzzedPlayer(state) && !["reveal", "roundComplete"].includes(state.phase)
    && state.attempts[id] > 0 && state.attempts[id] >= state.attempts[other];
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
    return { ...progress, killerBee: { ...state, audioTime: event.audioTime } };
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
    return { ...progress, killerBee: { ...state, attempts, phase } };
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
