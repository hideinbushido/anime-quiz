import type { PlayerId } from "../types";

/** Comment une colonne se compare : valeur unique, ensemble de valeurs, ou valeur ordonnée. */
export type ComparisonType = "exact" | "multi" | "ordered";

export interface AttributeConfig {
  key: string;
  label: string;
  comparisonType: ComparisonType;
  /** « icons » : la case montre une petite icône par valeur plutôt que du texte (le Haki, par exemple). */
  display?: "icons";
}

/** La valeur d'un attribut : une seule, plusieurs, un nombre (attribut ordonné), ou rien. */
export type AttributeValue = string | number | string[] | null;

export interface DossierCharacter {
  id: string;
  name: string;
  /** Surnoms et autres orthographes, pour la recherche. */
  aliases?: string[];
  image?: string;
  attributes: Record<string, AttributeValue>;
}

/** Un univers : ses colonnes et ses personnages. Tout ce qui change d'un univers à l'autre est ici. */
export interface UniverseConfig {
  id: string;
  name: string;
  attributes: AttributeConfig[];
  roster: DossierCharacter[];
}

/** Vert, orange, rouge. */
export type MatchState = "correct" | "partial" | "wrong";

export interface CellResult {
  key: string;
  state: MatchState;
  /** Ce que vaut l'attribut pour le personnage proposé : c'est une information publique. */
  value: string;
  /** Les mêmes valeurs, une par une, pour les colonnes affichées en icônes. */
  values: string[];
  /** Pour un attribut ordonné seulement : la cible est plus haut ou plus bas. */
  direction?: "up" | "down";
}

/** Une proposition corrigée, telle qu'elle peut être montrée à tout le monde. */
export interface GuessResult {
  characterId: string;
  name: string;
  image?: string;
  /** Vrai si c'est le personnage mystère. */
  found: boolean;
  cells: CellResult[];
}

export type DossierPhase =
  | "intro"      // round chargé, le présentateur n'a pas encore lancé
  | "guessing"   // les joueurs proposent, tour après tour
  | "debrief"    // cible révélée, on commente ; seul « Round suivant » fait avancer
  | "finished";  // les cinq rounds sont joués

export type RoundOutcome = PlayerId | "draw" | "none";

/** Un tour révélé : les deux propositions, engagées avant d'être montrées. */
export interface DossierTurn { guesses: Record<PlayerId, string> }

export interface DossierRoundRecord { universeId: string; targetId: string | null; outcome: RoundOutcome; turns: number }

/** L'état d'une partie, tel que seul le serveur le connaît (il contient la cible). */
export interface DossierGame {
  roundIndex: number;
  phase: DossierPhase;
  targetId: string | null;
  turns: DossierTurn[];
  /** Les propositions verrouillées du tour en cours, pas encore révélées. */
  pending: Partial<Record<PlayerId, string>>;
  outcome: RoundOutcome | null;
  wins: Record<PlayerId, number>;
  draws: number;
  records: DossierRoundRecord[];
  /** L'heure de la dernière révélation, pour que tous les écrans l'animent ensemble. */
  revealedAt: number | null;
}

export interface DossierState extends DossierGame {
  history: DossierGame[];
}

/** Un personnage du catalogue, pour la recherche : sans ses attributs. */
export interface RosterEntry { id: string; name: string; aliases?: string[]; image?: string }

export interface PublicTurn { number: number; guesses: Record<PlayerId, GuessResult> }

/** La fiche du personnage mystère, montrée au debrief. */
export interface TargetCard { id: string; name: string; image?: string; cells: { key: string; label: string; value: string }[] }

interface DossierBaseView {
  game: "dossier";
  room: string;
  title: string;
  phase: DossierPhase;
  roundNumber: number;
  roundCount: number;
  universe: { id: string; name: string; attributes: AttributeConfig[]; ready: boolean };
  /** Les univers des cinq rounds, dans l'ordre. */
  rounds: { universe: string; outcome: RoundOutcome | null }[];
  names: Record<PlayerId, string>;
  connected: Record<PlayerId, boolean>;
  /** Qui a verrouillé sa proposition pour le tour en cours (sans dire laquelle). */
  locked: Record<PlayerId, boolean>;
  turns: PublicTurn[];
  wins: Record<PlayerId, number>;
  draws: number;
  outcome: RoundOutcome | null;
  /** Le personnage mystère : absent tant que le round n'est pas terminé. */
  target: TargetCard | null;
  revealedAt: number | null;
  serverNow: number;
  /** Le vainqueur de l'épreuve, une fois les cinq rounds joués. */
  result: { winner: PlayerId | null; player1Wins: number; player2Wins: number; draws: number } | null;
}

export interface DossierPlayerView extends DossierBaseView {
  role: PlayerId;
  /** Sa propre proposition verrouillée, pour la retrouver après un rechargement. */
  myGuess: string | null;
  canGuess: boolean;
}

export interface DossierLiveView extends DossierBaseView {
  role: "live";
}

export interface DossierHostView extends DossierBaseView {
  role: "host";
  /** Visible du présentateur seulement, dès le début du round. */
  secretTarget: TargetCard | null;
  /** Les propositions verrouillées, que le présentateur voit avant tout le monde. */
  pending: Partial<Record<PlayerId, RosterEntry>>;
  canUndo: boolean;
}

export type DossierView = DossierPlayerView | DossierLiveView | DossierHostView;

export type DossierHostAction =
  | { type: "dossier:start" }
  | { type: "dossier:target"; characterId: string | null }
  | { type: "dossier:end-round" }
  | { type: "dossier:next" }
  | { type: "dossier:undo" }
  | { type: "dossier:restart" };

export type DossierClientMessage = { type: "dossier:guess"; characterId: string } | DossierHostAction;

/**
 * Le catalogue d'un univers part à part, une seule fois par écran et par univers :
 * avec des centaines de personnages, il n'a pas à voyager à chaque tour.
 */
export type DossierServerMessage =
  | { type: "dossier:state"; view: DossierView }
  | { type: "dossier:roster"; universe: string; roster: RosterEntry[] };
