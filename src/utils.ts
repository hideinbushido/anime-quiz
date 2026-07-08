import type { LeaderboardEntry, SessionState } from "./types";

const SESSION_KEY = "anime-quiz-session";
const LEADERBOARD_KEY = "anime-quiz-leaderboard";
const MAX_LEADERBOARD_ENTRIES = 20;

// Permet de reprendre la partie en cours si l'onglet est fermé par accident.
export function loadSession(): SessionState | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as SessionState) : null;
  } catch {
    return null;
  }
}

export function saveSession(session: SessionState): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

export function loadLeaderboard(): LeaderboardEntry[] {
  try {
    const raw = localStorage.getItem(LEADERBOARD_KEY);
    return raw ? (JSON.parse(raw) as LeaderboardEntry[]) : [];
  } catch {
    return [];
  }
}

export function addLeaderboardEntry(entry: LeaderboardEntry): LeaderboardEntry[] {
  const entries = [...loadLeaderboard(), entry]
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_LEADERBOARD_ENTRIES);
  localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(entries));
  return entries;
}

export function removeLeaderboardEntry(date: string): LeaderboardEntry[] {
  const entries = loadLeaderboard().filter((entry) => entry.date !== date);
  localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(entries));
  return entries;
}

export function normalize(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export function isAnswerCorrect(
  userInput: string,
  answer: string,
  acceptableAnswers: string[] = []
): boolean {
  const candidates = [answer, ...acceptableAnswers].map(normalize);
  return candidates.includes(normalize(userInput));
}
