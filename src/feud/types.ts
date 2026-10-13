import type { PlayerId } from "../types";

/** Une réponse du sondage. Sa valeur reste secrète jusqu'à la révélation de la manche. */
export interface FeudAnswer {
  id: string;
  label: string;
  points: number;
  /** D'autres façons de la dire, pour aider le présentateur à trancher. */
  aliases?: string[];
}

export interface FeudRound {
  id: string;
  roundNumber: 1 | 2 | 3;
  question: string;
  /** Exactement huit réponses, de la plus citée à la moins citée. */
  answers: FeudAnswer[];
}

export type FeudPhase =
  | "waiting"          // manche chargée, buzzer pas encore ouvert
  | "playing"          // on attend un buzz (ou le présentateur a fermé le buzzer)
  | "buzzLocked"       // un joueur a la main et répond à voix haute
  | "roundEnded"       // plus rien à jouer : prêt à révéler les points
  | "revealingPoints"  // les valeurs tombent une à une
  | "roundComplete"    // manche comptée, la suivante peut être chargée
  | "gameComplete";    // troisième manche comptée : score final

export interface FeudFound { answerId: string; foundBy: PlayerId }

/** Le dernier fait marquant, pour que les écrans jouent la bonne animation et le bon son. */
export interface FeudEvent {
  seq: number;
  kind: "buzz" | "correct" | "wrong" | "strike3" | "roundEnd" | "pointsReveal" | "nextRound";
  player: PlayerId | null;
  /** Le rang de la case retournée, pour une bonne réponse. */
  rank?: number;
}

/** L'état complet d'une partie, tel que seul le serveur le connaît. */
export interface FeudGame {
  roundIndex: number;
  phase: FeudPhase;
  found: FeudFound[];
  strikes: Record<PlayerId, number>;
  buzzOpen: boolean;
  buzzWinner: PlayerId | null;
  /** Les points de la manche en cours : calculés au fil de l'eau, jamais diffusés avant la révélation. */
  roundScore: Record<PlayerId, number>;
  /** Le cumul des manches dont la révélation a été lancée. */
  totals: Record<PlayerId, number>;
  revealStartedAt: number | null;
  event: FeudEvent;
}

/** Une partie et sa pile d'annulation : un instantané avant chaque décision du présentateur. */
export interface FeudState extends FeudGame {
  history: FeudGame[];
}

export type FeudRole = PlayerId | "host" | "live";

/** Le résultat exposé au duel global, qui décide lui-même de ce qu'il vaut. */
export interface FeudResult {
  winner: PlayerId | null;
  player1FeudScore: number;
  player2FeudScore: number;
}

interface FeudBaseView {
  game: "feud";
  room: string;
  title: string;
  phase: FeudPhase;
  roundNumber: number;
  roundCount: number;
  names: Record<PlayerId, string>;
  connected: Record<PlayerId, boolean>;
  strikes: Record<PlayerId, number>;
  maxStrikes: number;
  foundCount: Record<PlayerId, number>;
  buzzOpen: boolean;
  buzzWinner: PlayerId | null;
  /** Le cumul des manches révélées (jamais la manche en cours avant sa révélation). */
  totals: Record<PlayerId, number>;
  serverNow: number;
  event: FeudEvent;
  result: FeudResult | null;
}

/** Le téléphone du joueur : un buzzer et ses compteurs. Aucune réponse, aucune valeur. */
export interface FeudPlayerView extends FeudBaseView {
  role: PlayerId;
  canBuzz: boolean;
}

/** Une case du tableau telle que le public la voit. */
export interface FeudSlot {
  rank: number;
  /** Présent dès que la réponse est trouvée, ou pour toutes à la révélation. */
  label: string | null;
  foundBy: PlayerId | null;
  /** Présent à partir de la révélation des points seulement. */
  points: number | null;
}

export interface FeudLiveView extends FeudBaseView {
  role: "live";
  question: string;
  slots: FeudSlot[];
  /** Les points de la manche : absents tant que le présentateur n'a pas lancé la révélation. */
  roundScore: Record<PlayerId, number> | null;
  revealStartedAt: number | null;
  revealStepMs: number;
}

export interface FeudHostView extends FeudBaseView {
  role: "host";
  question: string;
  answers: (FeudAnswer & { rank: number; foundBy: PlayerId | null })[];
  roundScore: Record<PlayerId, number>;
  revealStartedAt: number | null;
  revealStepMs: number;
  canUndo: boolean;
}

export type FeudView = FeudPlayerView | FeudLiveView | FeudHostView;

export type FeudHostAction =
  | { type: "feud:buzzer-open" }
  | { type: "feud:buzzer-close" }
  | { type: "feud:buzzer-reset" }
  | { type: "feud:correct"; answerId: string }
  | { type: "feud:wrong" }
  | { type: "feud:already" }
  | { type: "feud:end-round" }
  | { type: "feud:reveal" }
  | { type: "feud:next" }
  | { type: "feud:undo" }
  | { type: "feud:restart" };

/** Les épreuves en temps réel qu'une room peut jouer. */
export type RoomGame = "ayanokoji" | "feud" | "dossier";

export type FeudClientMessage =
  | { type: "room:game"; game: RoomGame }
  | { type: "buzzer:press" }
  | FeudHostAction;

export type FeudServerMessage = { type: "feud:state"; view: FeudView };
