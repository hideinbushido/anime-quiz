export type EpreuveType = "blind-test" | "citation" | "logic-links";

export type DifficultyClass = "A" | "B" | "C" | "D";
export type PlayerId = "player1" | "player2";
export type Selector = PlayerId | "host";

export interface DifficultyConfig {
  label: string;
  description: string;
  status: "ready" | "shared" | "host";
  killerBeeTracks?: KillerBeeTrack[];
  logicPuzzles?: LogicLinksPuzzle[];
}

export interface KillerBeeTrack {
  id: string;
  difficulty: DifficultyClass;
  order: number;
  anime: string;
  audioSrc: string;
  imageSrc?: string;
  revealAudioSrc?: string;
  audioType?: "normal" | "instrumental" | "vocals";
}

export interface KillerBeeState {
  phase: "listening" | "player1Buzzed" | "player2Buzzed" | "player1Locked" | "player2Locked" | "reveal" | "roundComplete";
  attempts: Record<PlayerId, number>;
  audioTime: number;
}

export interface Question {
  id: string;
  prompt: string;
  audioSrc?: string;
  revealAudioSrc?: string;
  imageSrc?: string;
  answer: string;
  acceptableAnswers?: string[];
  choices?: string[];
}

export interface Epreuve {
  id: string;
  nom: string;
  logo: string;
  couleur: string;
  theme: string;
  type: EpreuveType;
  questions: Question[];
  killerBeeTracks?: KillerBeeTrack[];
  logicPuzzles?: LogicLinksPuzzle[];
  difficulties: Record<DifficultyClass, DifficultyConfig>;
}

export interface LogicCharacter {
  id: string;
  name: string;
  anime: string;
  year: number;
  age: string;
  hair: string;
  role: string;
  weapon: string;
  power: string;
  tags: string[];
  details?: string[];
  source?: string;
  imageSrc?: string;
  relations?: CharacterRelation[];
}

export interface CharacterRelation {
  targetId: string;
  type: string;
  direction: "both" | "outgoing";
  source?: string;
}

export interface LogicRule {
  id: string;
  text: string;
  direction: "both" | "left-to-right";
  /** Exhaustive valid pairs among this puzzle's visible characters. */
  pairs: [string, string][];
  explanation: string;
}

export interface LogicLinksPuzzle {
  id: string;
  title: string;
  intro: string;
  characters: LogicCharacter[];
  rules: LogicRule[];
  solutionIds: string[];
  sources?: string[];
}

export interface DuelPlayer {
  id: PlayerId;
  name: string;
  score: number;
}

export interface SelectedEpreuve {
  epreuveId: string;
  selectedBy: Selector;
  difficulty: DifficultyClass;
}

export interface DuelRoundResult {
  roundId: string;
  playerId: PlayerId;
  points: number;
  correct: boolean;
  answer: string[];
  correctSlots?: boolean[];
  correctLinks?: boolean[];
}

export interface GameProgress {
  killerBee?: KillerBeeState;
  roundIndex: number;
  respondent: PlayerId;
  input: string;
  placements: string[];
  selectedId: string | null;
  rounds: DuelRoundResult[];
}

export interface DuelEpreuveResult extends SelectedEpreuve {
  rounds: DuelRoundResult[];
  scorePlayer1: number;
  scorePlayer2: number;
}

export interface DuelSession {
  version: 2;
  id: string;
  /** Date de fin du duel (ISO), posée à son entrée dans l'historique. Absente des duels plus anciens. */
  finishedAt?: string;
  phase: "selection" | "ready" | "playing" | "recap";
  players: Record<PlayerId, DuelPlayer>;
  selected: SelectedEpreuve[];
  currentIndex: number;
  progress: GameProgress;
  results: DuelEpreuveResult[];
}

export interface GameControls {
  progress: GameProgress;
  players?: Record<PlayerId, DuelPlayer>;
  difficulty?: DifficultyClass;
  onKillerBee?: (event: import("./duel/killerBee").KillerBeeEvent) => void;
  onEdit: (patch: Partial<Pick<GameProgress, "input" | "placements" | "selectedId">>) => void;
  onValidate: (result: Omit<DuelRoundResult, "playerId">) => void;
  onNext: () => void;
}

/** Legacy solo result, retained for archive compatibility. LIVE uses DuelEpreuveResult. */
export interface EpreuveResult {
  epreuveId: string;
  points: number;
  bonusIndiceUtilise: boolean;
  bonusDoubleUtilise: boolean;
}

export type Phase = "title" | "selection" | "playing" | "recap" | "scores";

/** Legacy solo storage shape. New sessions use DuelSession. */
export interface SessionState {
  phase: Phase;
  playerName: string;
  selectedIds: string[];
  currentIndex: number;
  results: EpreuveResult[];
  recorded: boolean;
}

export interface LeaderboardEntry {
  name: string;
  score: number;
  date: string;
  epreuveIds?: string[];
}
