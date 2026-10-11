import type { DifficultyClass, DifficultyConfig, KillerBeeTrack } from "../types";

// Order is one-based; score helpers take a zero-based track index.
// Existing instrumentals are provisional D assets: replace with normal, long excerpts.
const existing = [
  ["One Piece", "/Beats%20killer%20Bee/1ere%20manche.MP3"],
  ["Naruto", "/Beats%20killer%20Bee/2e%20manche.MP3"],
  ["Attack on Titan", "/Beats%20killer%20Bee/3e%20Manche.MP3"],
  ["Demon Slayer", "/Beats%20killer%20Bee/4e%20manche.MP3"],
  ["Jujutsu Kaisen", "/Beats%20killer%20Bee/5e%20manche.MP3"],
];
const descriptions = {
  D: "Normal · grand public · extraits longs. Les instrumentales existantes sont provisoires.",
  C: "Normal · moins évident · extraits plus courts.",
  B: "Normal, instrumental ou voix seule · choix plus profonds mais accessibles.",
  A: "Normal, instrumental ou voix seule · extraits courts, exigeants mais équitables.",
};
// Complete anime/audioSrc, then optionally imageSrc/revealAudioSrc for each slot.
// Arrange each class from easiest (1) to hardest (5); avoid difficulty based only on obscurity.
export const killerBeeTracks: Record<DifficultyClass, KillerBeeTrack[]> = Object.fromEntries(
  (["D", "C", "B", "A"] as const).map(difficulty => [difficulty,
    Array.from({ length: 5 }, (_, index) => ({
      id: `bee-${difficulty}-${index + 1}`, difficulty, order: index + 1,
      anime: difficulty === "D" ? existing[index][0] : "À renseigner",
      audioSrc: difficulty === "D" ? existing[index][1] : "",
      audioType: difficulty === "D" ? "instrumental" : "normal",
    })),
  ]),
) as Record<DifficultyClass, KillerBeeTrack[]>;

export const killerBeeDifficulties = Object.fromEntries(
  (["D", "C", "B", "A"] as const).map(level => [level, {
    label: { D: "Introduction", C: "Intermédiaire", B: "Difficile", A: "Élite" }[level],
    status: "host", description: descriptions[level], killerBeeTracks: killerBeeTracks[level],
  }]),
) as Record<DifficultyClass, DifficultyConfig>;
