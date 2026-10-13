/**
 * Les règles des épreuves au buzzer (Les Beats de Killer Bee, Répliques Cultes),
 * sans réseau ni écran. Le premier qui buzze a la main, répond à voix haute, et
 * le présentateur tranche. La réponse ne sort d'ici qu'à la révélation.
 */
import type { PlayerId } from "../types";
import type { QuizGame, QuizHostAction, QuizHostView, QuizItem, QuizKind, QuizLiveView, QuizPlayerView, QuizState, QuizView } from "./types";
import type { DifficultyClass } from "../types";

/** Deux tentatives par question et par joueur. */
export const QUIZ_ATTEMPTS = 2;
/** Après une erreur, le buzzer du joueur reste bloqué sept secondes. */
export const QUIZ_LOCK_MS = 7000;
const HISTORY_LIMIT = 30;
const PLAYERS: PlayerId[] = ["player1", "player2"];
const both = <T,>(value: () => T): Record<PlayerId, T> => ({ player1: value(), player2: value() });

export const QUIZ_TITLES: Record<QuizKind, string> = { beats: "Les Beats de Killer Bee", citations: "Répliques Cultes" };

export function createQuiz(kind: QuizKind, difficulty: DifficultyClass | null = null): QuizState {
  return {
    kind, difficulty, itemIndex: 0, phase: "idle", buzzWinner: null,
    attempts: both(() => QUIZ_ATTEMPTS), lockedUntil: both(() => 0), scores: both(() => 0), winners: [],
    event: { seq: 0, kind: "start", player: null }, history: [],
  };
}

const emit = (state: QuizState, kind: QuizGame["event"]["kind"], player: PlayerId | null) => { state.event = { seq: state.event.seq + 1, kind, player }; };
function remember(state: QuizState) {
  const { history, ...game } = state;
  history.push(structuredClone(game));
  if (history.length > HISTORY_LIMIT) history.shift();
}

export const canBuzz = (state: QuizGame, player: PlayerId, now: number) =>
  state.phase === "open" && !state.buzzWinner && state.attempts[player] > 0 && now >= state.lockedUntil[player];

/** Le buzz d'un joueur : le serveur ne retient que le premier, et refuse un joueur bloqué ou sans tentative. */
export function pressQuizBuzzer(state: QuizState, player: PlayerId, now: number): string | null {
  if (state.buzzWinner) return "Quelqu'un a déjà buzzé.";
  if (state.phase !== "open") return "Le buzzer est fermé.";
  if (state.attempts[player] <= 0) return "Tu n'as plus de tentative sur cette question.";
  if (now < state.lockedUntil[player]) return "Ton buzzer est encore bloqué.";
  state.buzzWinner = player;
  state.phase = "buzzed";
  emit(state, "buzz", player);
  return null;
}

export function hostQuiz(state: QuizState, action: Exclude<QuizHostAction, { type: "quiz:start" }>, now: number, items: QuizItem[]): string | null {
  const item = items[state.itemIndex];
  switch (action.type) {
    case "quiz:undo": {
      const previous = state.history.pop();
      if (!previous) return "Rien à annuler.";
      Object.assign(state, previous, { event: { seq: state.event.seq + 1, kind: "next", player: null } });
      return null;
    }
    case "quiz:open":
      if (state.phase !== "idle") return state.phase === "open" ? null : "Le buzzer ne peut pas s'ouvrir maintenant.";
      if (PLAYERS.every(id => state.attempts[id] <= 0)) return "Plus personne n'a de tentative : révèle la réponse.";
      state.phase = "open";
      return null;
    case "quiz:close":
      if (state.phase !== "open") return null;
      state.phase = "idle";
      return null;
    case "quiz:reset-buzz":
      if (state.phase !== "buzzed") return "Aucun buzz à remettre à zéro.";
      remember(state);
      state.buzzWinner = null;
      state.phase = "idle";
      return null;
    case "quiz:correct": {
      const player = state.buzzWinner;
      if (state.phase !== "buzzed" || !player) return "Personne n'a buzzé.";
      remember(state);
      state.scores[player] += item.points;
      state.winners[state.itemIndex] = player;
      state.buzzWinner = null;
      state.phase = "revealed";
      emit(state, "correct", player);
      return null;
    }
    case "quiz:wrong": {
      const player = state.buzzWinner;
      if (state.phase !== "buzzed" || !player) return "Personne n'a buzzé.";
      remember(state);
      state.attempts[player]--;
      state.lockedUntil[player] = now + QUIZ_LOCK_MS;
      state.buzzWinner = null;
      // La musique s'est arrêtée au buzz : le buzzer se rouvre quand le présentateur la relance.
      // Pour une réplique, rien à relancer : il se rouvre aussitôt, tant qu'il reste quelqu'un pour répondre.
      state.phase = state.kind === "citations" && PLAYERS.some(id => state.attempts[id] > 0) ? "open" : "idle";
      emit(state, "wrong", player);
      return null;
    }
    case "quiz:reveal":
      if (state.phase === "revealed" || state.phase === "done") return "La réponse est déjà révélée.";
      remember(state);
      state.winners[state.itemIndex] = null;
      state.buzzWinner = null;
      state.phase = "revealed";
      emit(state, "reveal", null);
      return null;
    case "quiz:next":
      if (state.phase !== "revealed") return state.phase === "done" ? "L'épreuve est terminée." : "Révèle d'abord la réponse.";
      remember(state);
      if (state.itemIndex >= items.length - 1) { state.phase = "done"; emit(state, "done", null); return null; }
      state.itemIndex++;
      state.phase = "idle";
      state.buzzWinner = null;
      state.attempts = both(() => QUIZ_ATTEMPTS);
      state.lockedUntil = both(() => 0);
      emit(state, "next", null);
      return null;
  }
}

interface Context { room: string; names: Record<PlayerId, string>; avatars?: Record<PlayerId, string | null>; connected: Record<PlayerId, boolean>; now: number }

/**
 * La vue envoyée à un écran. La réponse, son image et l'adresse de l'extrait
 * ne partent que vers le présentateur ; le live et les joueurs ne reçoivent la
 * réponse qu'une fois révélée.
 */
export function quizView(state: QuizState, role: PlayerId | "host" | "live", context: Context, items: QuizItem[]): QuizView {
  const item = items[state.itemIndex];
  const shown = state.phase === "revealed" || state.phase === "done";
  const base = {
    game: "quiz" as const, kind: state.kind, room: context.room, title: QUIZ_TITLES[state.kind], difficulty: state.difficulty,
    phase: state.phase, itemNumber: state.itemIndex + 1, itemCount: items.length, points: item?.points ?? 0, prompt: item?.prompt ?? null,
    names: context.names, avatars: context.avatars ?? { player1: null, player2: null }, connected: context.connected,
    attempts: state.attempts, maxAttempts: QUIZ_ATTEMPTS, lockedUntil: state.lockedUntil, scores: state.scores, buzzWinner: state.buzzWinner,
    revealed: shown && item ? { answer: item.answer, ...(item.imageSrc ? { imageSrc: item.imageSrc } : {}), winner: state.winners[state.itemIndex] ?? null } : null,
    steps: items.map((entry, index) => ({ points: entry.points, winner: state.winners[index] ?? null, played: index < state.itemIndex || (index === state.itemIndex && shown) })),
    serverNow: context.now, event: state.event,
  };
  if (role === "player1" || role === "player2") { const view: QuizPlayerView = { ...base, role }; return view; }
  if (role === "live") { const view: QuizLiveView = { ...base, role }; return view; }
  const view: QuizHostView = { ...base, role, answer: item?.answer ?? "", audioSrc: item?.audioSrc || null, revealAudioSrc: item?.revealAudioSrc ?? null,
    items: items.map((entry, index) => ({ answer: entry.answer, points: entry.points, winner: state.winners[index] ?? null, played: index < state.itemIndex || (index === state.itemIndex && shown) })),
    canUndo: state.history.length > 0 };
  return view;
}
