export type EpreuveType = "blind-test" | "citation" | "logic-links";

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
  logicPuzzles?: LogicLinksPuzzle[];
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
}

export interface LogicRule {
  id: string;
  text: string;
}

export interface LogicLinksPuzzle {
  id: string;
  title: string;
  intro: string;
  characters: LogicCharacter[];
  rules: LogicRule[];
  solutionIds: string[];
}

export interface EpreuveResult {
  epreuveId: string;
  points: number;
  bonusIndiceUtilise: boolean;
  bonusDoubleUtilise: boolean;
}

export type Phase = "title" | "selection" | "playing" | "recap" | "scores";

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
