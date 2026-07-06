export type EpreuveType = "blind-test" | "citation";

export interface Question {
  id: string;
  prompt: string;
  audioSrc?: string;
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
}

export interface EpreuveResult {
  epreuveId: string;
  points: number;
  bonusIndiceUtilise: boolean;
  bonusDoubleUtilise: boolean;
}
