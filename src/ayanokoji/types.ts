/**
 * Les Liens d'Ayanokoji, version duel en temps réel.
 * Ces types sont partagés par le serveur et par les trois vues (joueur, live,
 * présentateur). Ils ne dépendent ni de React ni du réseau.
 */
import type { DifficultyClass, PlayerId } from "../types";

export type LinkDirection = "both" | "left-to-right";

export interface AyanokojiCharacter {
  id: string;
  name: string;
  image?: string;
}

export interface AyanokojiLink {
  id: string;
  /** Court, lisible sur le plateau : « CLAN = », « SENSEI > ». */
  label: string;
  /** Précision facultative, affichée au survol ou au clic. */
  description?: string;
  direction: LinkDirection;
  /**
   * Les paires de personnages de la manche qui vérifient ce lien, de gauche à
   * droite. Pour un lien « both », l'ordre de la paire n'a pas d'importance.
   * La liste doit être exhaustive : c'est elle qui fait foi pour la correction.
   */
  pairs: [string, string][];
}

export interface AyanokojiRound {
  id: string;
  difficulty: DifficultyClass;
  level: 1 | 2 | 3;
  title: string;
  characters: AyanokojiCharacter[];
  links: AyanokojiLink[];
  solutionOrder: string[];
  /** Ordre de départ imposé. Absent : le serveur mélange une fois pour les deux joueurs. */
  initialOrder?: string[];
}

/** Ce qu'un client a le droit de connaître d'une manche : jamais la solution ni les paires. */
export interface PublicRound {
  id: string;
  difficulty: DifficultyClass;
  level: 1 | 2 | 3;
  title: string;
  characters: AyanokojiCharacter[];
  links: Pick<AyanokojiLink, "id" | "label" | "description" | "direction">[];
}

export interface OrderEvaluation {
  perfect: boolean;
  correctPositions: number;
  correctLinks: boolean[];
}

/**
 * Les étapes d'une manche.
 * waiting : aucune manche chargée · ready : chargée, pas lancée · playing / paused
 * locked : les deux ont validé ou le présentateur a forcé la fin, prêt à révéler
 * countdown : 3-2-1 · revealing : correction en cours · complete : manche close
 */
export type RoundPhase = "waiting" | "ready" | "playing" | "paused" | "locked" | "countdown" | "revealing" | "complete";

/** Le chrono commun. Le serveur ne diffuse pas les secondes : chaque client calcule l'affichage. */
export interface TimerState {
  /** Temps déjà écoulé avant la dernière reprise, en millisecondes. */
  elapsedMs: number;
  /** Horodatage serveur de la dernière reprise, ou null si le chrono est arrêté. */
  runningSince: number | null;
}

/** Les statistiques remontées au système global, sans barème : il sera décidé plus tard. */
export interface PlayerResult extends OrderEvaluation {
  order: string[];
  /** Les points de la manche, selon le barème de scoring.ts. */
  points: number;
  moveCount: number;
  submittedAt: number | null;
  /** Temps au chrono quand le joueur a validé, ou null s'il n'a pas validé. */
  completionTime: number | null;
}

export interface SeatStatus {
  connected: boolean;
  submitted: boolean;
}

interface BaseView {
  room: string;
  phase: RoundPhase;
  round: PublicRound | null;
  initialOrder: string[];
  timer: TimerState;
  /** Horloge du serveur à l'envoi, pour recaler le chrono local. */
  serverNow: number;
  /** Fin du compte à rebours 3-2-1, en horloge serveur. */
  revealAt: number | null;
  seats: Record<PlayerId, SeatStatus>;
  /** Les pseudos, pour l'affichage seulement : ils n'identifient jamais un joueur. */
  names: Record<PlayerId, string>;
  /** Le total de chaque joueur sur l'épreuve. Les points d'une manche s'y ajoutent à la révélation. */
  scores: Record<PlayerId, number>;
  /** Le maximum de la manche en cours : une chaîne parfaite. */
  maxPoints: number;
  /** Vrai quand la manche en cours est la dernière de l'épreuve. */
  lastRound: boolean;
}

/** Vue d'un joueur : son plateau, jamais celui de l'adversaire. */
export interface PlayerView extends BaseView {
  role: PlayerId;
  order: string[];
  moveCount: number;
  /** Disponible à la révélation seulement. */
  result: PlayerResult | null;
  solution: string[] | null;
}

/** Vue du live : les deux plateaux, mais la solution seulement à la révélation. */
export interface LiveView extends BaseView {
  role: "live";
  orders: Record<PlayerId, string[]>;
  moveCounts: Record<PlayerId, number>;
  results: Record<PlayerId, PlayerResult> | null;
  solution: string[] | null;
}

/** Vue du présentateur : tout, solution comprise, dès le chargement de la manche. */
export interface HostView extends BaseView {
  role: "host";
  orders: Record<PlayerId, string[]>;
  moveCounts: Record<PlayerId, number>;
  results: Record<PlayerId, PlayerResult> | null;
  solution: string[];
  /** Les manches disponibles, pour le sélecteur. */
  catalog: { id: string; difficulty: DifficultyClass; level: 1 | 2 | 3; title: string }[];
}

export type RoomView = PlayerView | LiveView | HostView;
export type Role = RoomView["role"];

/** Messages du client vers le serveur. */
export type ClientMessage =
  | { type: "room:join"; room: string; role: Role; token?: string; name?: string; names?: Partial<Record<PlayerId, string>> }
  | { type: "ayanokoji:move"; order: string[] }
  | { type: "ayanokoji:submit" }
  | { type: "ayanokoji:load"; roundId: string }
  | { type: "ayanokoji:start" }
  | { type: "ayanokoji:pause" }
  | { type: "ayanokoji:resume" }
  | { type: "ayanokoji:force-end" }
  | { type: "ayanokoji:reveal" }
  | { type: "ayanokoji:next" };

/** Messages du serveur vers le client. */
export type ServerMessage =
  | { type: "room:joined"; token: string }
  | { type: "room:state"; view: RoomView }
  | { type: "room:error"; message: string };
