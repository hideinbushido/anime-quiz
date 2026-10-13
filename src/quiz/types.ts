import type { DifficultyClass, PlayerId, Selector } from "../types";

/** Les deux épreuves au buzzer : le blind test de Killer Bee et les Répliques Cultes. */
export type QuizKind = "beats" | "citations";

/** Une question : ce que le public voit, ce que seul le présentateur sait, et ce qu'elle rapporte. */
export interface QuizItem {
  id: string;
  /** Montré à tous dès le début (la réplique). Un extrait musical n'a rien à montrer. */
  prompt?: string;
  answer: string;
  points: number;
  /** L'extrait que le présentateur lance sur sa machine. */
  audioSrc?: string;
  /** L'image et le jingle de la réponse, montrés à la révélation. */
  imageSrc?: string;
  revealAudioSrc?: string;
}

export type QuizPhase =
  | "idle"      // question chargée, buzzer fermé (musique à l'arrêt)
  | "open"      // on attend un buzz
  | "buzzed"    // un joueur a la main et répond à voix haute
  | "revealed"  // la réponse est montrée ; la question suivante peut être chargée
  | "done";     // toutes les questions sont jouées

export interface QuizEvent { seq: number; kind: "start" | "buzz" | "correct" | "wrong" | "reveal" | "next" | "done"; player: PlayerId | null }

/** L'état d'une épreuve au buzzer, tel que seul le serveur le connaît. */
export interface QuizGame {
  kind: QuizKind;
  difficulty: DifficultyClass | null;
  itemIndex: number;
  phase: QuizPhase;
  buzzWinner: PlayerId | null;
  /** Les tentatives qui restent à chacun sur la question en cours. */
  attempts: Record<PlayerId, number>;
  /** Après une erreur, l'heure (du serveur) jusqu'à laquelle le buzzer du joueur reste bloqué. */
  lockedUntil: Record<PlayerId, number>;
  scores: Record<PlayerId, number>;
  /** Qui a trouvé chaque question déjà jouée (personne : null). */
  winners: (PlayerId | null)[];
  event: QuizEvent;
}
export interface QuizState extends QuizGame { history: QuizGame[] }

interface QuizBaseView {
  game: "quiz";
  kind: QuizKind;
  room: string;
  title: string;
  difficulty: DifficultyClass | null;
  phase: QuizPhase;
  itemNumber: number;
  itemCount: number;
  /** Ce que rapporte la question en cours. */
  points: number;
  prompt: string | null;
  names: Record<PlayerId, string>;
  avatars: Record<PlayerId, string | null>;
  connected: Record<PlayerId, boolean>;
  attempts: Record<PlayerId, number>;
  maxAttempts: number;
  lockedUntil: Record<PlayerId, number>;
  scores: Record<PlayerId, number>;
  buzzWinner: PlayerId | null;
  /** La réponse, une fois révélée : jamais avant. */
  revealed: { answer: string; imageSrc?: string; winner: PlayerId | null } | null;
  /** Le fil de l'épreuve, sans les réponses : ce que vaut chaque question et qui l'a trouvée. */
  steps: { points: number; winner: PlayerId | null; played: boolean }[];
  serverNow: number;
  event: QuizEvent;
}

export interface QuizPlayerView extends QuizBaseView { role: PlayerId }
export interface QuizLiveView extends QuizBaseView { role: "live" }
export interface QuizHostView extends QuizBaseView {
  role: "host";
  answer: string;
  audioSrc: string | null;
  revealAudioSrc: string | null;
  /** Le fil de l'épreuve : chaque question, sa réponse et qui l'a trouvée. */
  items: { answer: string; points: number; winner: PlayerId | null; played: boolean }[];
  canUndo: boolean;
}
export type QuizView = QuizPlayerView | QuizLiveView | QuizHostView;

export type QuizHostAction =
  | { type: "quiz:start"; kind: QuizKind; difficulty?: DifficultyClass | null }
  | { type: "quiz:open" }
  | { type: "quiz:close" }
  | { type: "quiz:correct" }
  | { type: "quiz:wrong" }
  | { type: "quiz:reset-buzz" }
  | { type: "quiz:reveal" }
  | { type: "quiz:next" }
  | { type: "quiz:undo" };

/**
 * L'état de l'émission entre deux épreuves : le programme, le score du duel et
 * ce qui vient. C'est le site du présentateur qui le tient ; le serveur le
 * relaie tel quel au live et aux joueurs.
 */
export interface ShowState {
  phase: "lobby" | "between" | "final";
  /** Le rang de la prochaine épreuve (ou le nombre d'épreuves, quand tout est joué). */
  index: number;
  wins: Record<PlayerId, number>;
  program: { id: string; name: string; selectedBy: Selector; result?: { player1: number; player2: number } }[];
}

/** La vidéo des règles qui passe sur le live : son adresse, et l'heure du serveur à laquelle elle a démarré. */
export interface IntroState { src: string; startedAt: number }

export type QuizClientMessage = QuizHostAction | { type: "show:update"; show: ShowState | null } | { type: "show:intro"; src: string | null };

export type QuizServerMessage = { type: "quiz:state"; view: QuizView };
