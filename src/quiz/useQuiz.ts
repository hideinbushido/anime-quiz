import { useServerNow } from "../ayanokoji/useAyanokojiRoom";
import { useRoom } from "../realtime/roomContext";
import type { PlayerId } from "../types";
import type { QuizPhase, QuizView } from "./types";

/** L'état de l'épreuve au buzzer vu depuis un écran. */
export function useQuiz<V extends QuizView>(role: V["role"]) {
  const { quiz, status, error, clockOffset, send } = useRoom();
  const view = quiz && quiz.role === role ? (quiz as V) : null;
  // Tant qu'un buzzer est bloqué, l'horloge tourne pour afficher le décompte et le libérer à l'heure
  const locked = view ? Math.max(view.lockedUntil.player1, view.lockedUntil.player2) : 0;
  const now = useServerNow(clockOffset, Boolean(view && locked > view.serverNow));
  /** Les secondes de blocage qui restent à un joueur (0 : libre). */
  const lockLeft = (player: PlayerId) => (view ? Math.max(0, Math.ceil((view.lockedUntil[player] - now) / 1000)) : 0);
  const canBuzz = (player: PlayerId) => Boolean(view && view.phase === "open" && !view.buzzWinner && view.attempts[player] > 0 && now >= view.lockedUntil[player]);
  return { view, status, error, send, lockLeft, canBuzz };
}

export const QUIZ_PHASE_LABEL: Record<QuizPhase, string> = {
  idle: "Buzzer fermé",
  open: "Buzzer ouvert",
  buzzed: "Réponse en cours",
  revealed: "Réponse révélée",
  done: "Épreuve terminée",
};

/** Le logo et le vocabulaire de chaque épreuve au buzzer. */
export const QUIZ_LOOK = {
  beats: { logo: "/logos-epreuves/les-beats-de-killer-bee.webp", item: "Morceau" },
  citations: { logo: "/logos-epreuves/repliques-cultes.webp", item: "Réplique" },
} as const;
