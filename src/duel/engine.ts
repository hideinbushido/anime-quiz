import { reduceKillerBee, type KillerBeeEvent } from "./killerBee";
import type { DifficultyClass, DuelRoundResult, DuelSession, Epreuve, GameProgress, PlayerId, SelectedEpreuve, Selector } from "../types";

export const CLASSES: DifficultyClass[] = ["D", "C", "B", "A"];
export const SELECTION_ORDER: Selector[] = ["player1", "player1", "player2", "player2", "host"];

export function winnerLabel(session: DuelSession): string {
  const { player1, player2 } = session.players;
  if (player1.score === player2.score) return "Égalité !";
  return `${player1.score > player2.score ? player1.name : player2.name} remporte le LIVE !`;
}

export function newProgress(respondent: PlayerId = "player1"): GameProgress {
  return { roundIndex: 0, respondent, input: "", placements: [], selectedId: null, rounds: [] };
}

export function createDuel(name1: string, name2: string, id: string): DuelSession {
  return {
    version: 2, id, phase: "selection", currentIndex: 0, selected: [], results: [],
    players: {
      player1: { id: "player1", name: name1.trim(), score: 0 },
      player2: { id: "player2", name: name2.trim(), score: 0 },
    },
    progress: newProgress(),
  };
}

export function resolveEpreuve(epreuve: Epreuve, difficulty: DifficultyClass): Epreuve {
  return { ...epreuve, killerBeeTracks: epreuve.difficulties[difficulty].killerBeeTracks ?? epreuve.killerBeeTracks, logicPuzzles: epreuve.difficulties[difficulty].logicPuzzles ?? epreuve.logicPuzzles };
}

export function roundIds(epreuve: Epreuve): string[] {
  return epreuve.killerBeeTracks ? epreuve.killerBeeTracks.map(track => track.id) : epreuve.type === "logic-links"
    ? (epreuve.logicPuzzles ?? []).map(puzzle => puzzle.id)
    : epreuve.questions.map(question => question.id);
}

export function currentFeedback(progress: GameProgress): DuelRoundResult | undefined {
  return progress.rounds[progress.roundIndex];
}

export function scoreRounds(rounds: DuelRoundResult[], playerId: PlayerId): number {
  return rounds.reduce((total, round) => total + (round.playerId === playerId ? round.points : 0), 0);
}

/** Le vainqueur d'une épreuve terminée : celui qui y a marqué le plus de points. À égalité, personne. */
export function epreuveWinner(result: { scorePlayer1: number; scorePlayer2: number }): PlayerId | null {
  return result.scorePlayer1 === result.scorePlayer2 ? null : result.scorePlayer1 > result.scorePlayer2 ? "player1" : "player2";
}

/**
 * Le score du duel : un point par épreuve gagnée. Les points marqués dans
 * chaque épreuve restent dans son résultat, pour l'historique.
 */
export function withScores(session: DuelSession): DuelSession {
  const results = session.results.map(result => ({ ...result,
    scorePlayer1: scoreRounds(result.rounds, "player1"), scorePlayer2: scoreRounds(result.rounds, "player2"),
  }));
  const wins = (id: PlayerId) => results.filter(result => epreuveWinner(result) === id).length;
  return { ...session, results, players: {
    player1: { ...session.players.player1, score: wins("player1") },
    player2: { ...session.players.player2, score: wins("player2") },
  } };
}

export type GameAction =
  | { type: "killerBee"; event: KillerBeeEvent }
  | { type: "edit"; patch: Partial<Pick<GameProgress, "input" | "placements" | "selectedId">> }
  | { type: "respondent"; playerId: PlayerId }
  | { type: "validate"; result: Omit<DuelRoundResult, "playerId"> }
  | { type: "next" };

/** Shared by LIVE and the isolated rehearsal screen. Validation is single-use. */
export function progressReducer(progress: GameProgress, action: GameAction, epreuve: Epreuve): GameProgress {
  const feedback = currentFeedback(progress);
  if (action.type === "next") {
    if (!feedback || progress.roundIndex >= roundIds(epreuve).length - 1) return progress;
    return { ...newProgress(progress.respondent), roundIndex: progress.roundIndex + 1, rounds: progress.rounds };
  }
  if (feedback) return progress;
  if (action.type === "killerBee") return reduceKillerBee(progress, action.event, epreuve);
  if (epreuve.killerBeeTracks) return progress;
  if (action.type === "respondent") return { ...progress, respondent: action.playerId };
  if (action.type === "edit") return { ...progress, ...action.patch };
  if (action.result.roundId !== roundIds(epreuve)[progress.roundIndex]
      || !Number.isFinite(action.result.points) || action.result.points < 0) return progress;
  return { ...progress, selectedId: null, rounds: [...progress.rounds, { ...action.result, playerId: progress.respondent }] };
}

export type DuelAction = GameAction
  | { type: "select"; epreuveId: string; difficulty: DifficultyClass }
  | { type: "undo" }
  | { type: "start" };

export function duelReducer(session: DuelSession, action: DuelAction, catalog: Epreuve[]): DuelSession {
  if (action.type === "select") {
    if (session.phase !== "selection" || session.selected.length >= 5
        || session.selected.some(item => item.epreuveId === action.epreuveId)
        || !CLASSES.includes(action.difficulty)
        || !catalog.some(item => item.id === action.epreuveId)) return session;
    const selected: SelectedEpreuve[] = [...session.selected, {
      epreuveId: action.epreuveId, difficulty: action.difficulty,
      selectedBy: SELECTION_ORDER[session.selected.length],
    }];
    return { ...session, selected, phase: selected.length === 5 ? "ready" : "selection" };
  }
  if (action.type === "undo") {
    if (!["selection", "ready"].includes(session.phase)) return session;
    return { ...session, phase: "selection", selected: session.selected.slice(0, -1) };
  }
  if (action.type === "start") {
    if (session.phase !== "ready" || session.selected.length !== 5) return session;
    return { ...session, phase: "playing" };
  }
  if (session.phase !== "playing") return session;
  const selected = session.selected[session.currentIndex];
  const source = catalog.find(epreuve => epreuve.id === selected?.epreuveId);
  if (!source) return session;
  const epreuve = resolveEpreuve(source, selected.difficulty);
  if (action.type === "next" && currentFeedback(session.progress)
      && session.progress.roundIndex === roundIds(epreuve).length - 1) {
    const results = [...session.results, {
      ...selected, rounds: session.progress.rounds,
      scorePlayer1: scoreRounds(session.progress.rounds, "player1"),
      scorePlayer2: scoreRounds(session.progress.rounds, "player2"),
    }];
    return withScores({ ...session, results, progress: newProgress(),
      currentIndex: results.length === 5 ? 4 : session.currentIndex + 1,
      phase: results.length === 5 ? "recap" : "playing",
    });
  }
  return withScores({ ...session, progress: progressReducer(session.progress, action, epreuve) });
}
