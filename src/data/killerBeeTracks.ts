import type { DifficultyClass, DifficultyConfig, KillerBeeTrack } from "../types";
import { KILLER_BEE_TRACK_COUNT } from "../duel/killerBee";

// Order is one-based; score helpers take a zero-based track index.
// Les sept extraits rangés dans `public/Beats killer Bee/CLASSE B/`. Pour une autre classe,
// créer le dossier `CLASSE D`, `CLASSE C` ou `CLASSE A` et y ajouter sa liste ici.
const dossier = (classe: DifficultyClass, fichier: string) => `/Beats%20killer%20Bee/CLASSE%20${classe}/${fichier.split("/").map(encodeURIComponent).join("/")}`;
const existing: Partial<Record<DifficultyClass, [anime: string, fichier: string, image?: string][]>> = {
  D: [
    ["One Piece", "1er.MP3", "reponse/1er.jpg"],
    ["Soul Eater", "2e.MP3", "reponse/2e.jpg"],
    ["Hunter x Hunter", "3e.MP3", "reponse/3e.jpg"],
    ["Gintama", "4e.MP3", "reponse/4e.jpg"],
    ["Inazuma Eleven", "5e.MP3", "reponse/5e.jpg"],
    ["Btooom!", "6e.MP3", "reponse/6e.jpg"],
    ["Assassination Classroom", "7e.MP3", "reponse/7e.jpg"],
  ],
  B: [
    ["One Piece", "1ere manche.MP3"],
    ["Naruto", "2e manche.MP3"],
    ["Attack on Titan", "3e Manche.MP3"],
    ["Demon Slayer", "4e manche.MP3"],
    ["Jujutsu Kaisen", "5e manche.MP3"],
    ["À renseigner", "6e manche.MP3"],
    ["À renseigner", "7e manche.MP3"],
  ],
};
const descriptions = {
  D: "Normal · grand public · extraits longs.",
  C: "Normal · moins évident · extraits plus courts.",
  B: "Normal, instrumental ou voix seule · choix plus profonds mais accessibles.",
  A: "Normal, instrumental ou voix seule · extraits courts, exigeants mais équitables.",
};
// Complete anime/audioSrc, then optionally imageSrc/revealAudioSrc for each slot.
// Arrange each class from easiest (1) to hardest (7); avoid difficulty based only on obscurity.
export const killerBeeTracks: Record<DifficultyClass, KillerBeeTrack[]> = Object.fromEntries(
  (["D", "C", "B", "A"] as const).map(difficulty => [difficulty,
    Array.from({ length: KILLER_BEE_TRACK_COUNT }, (_, index) => ({
      id: `bee-${difficulty}-${index + 1}`, difficulty, order: index + 1,
      anime: existing[difficulty]?.[index]?.[0] ?? "À renseigner",
      audioSrc: existing[difficulty]?.[index] ? dossier(difficulty, existing[difficulty]![index][1]) : "",
      imageSrc: existing[difficulty]?.[index]?.[2] ? dossier(difficulty, existing[difficulty]![index][2]!) : undefined,
      audioType: difficulty === "B" && existing[difficulty] ? "instrumental" : "normal",
    })),
  ]),
) as Record<DifficultyClass, KillerBeeTrack[]>;

export const killerBeeDifficulties = Object.fromEntries(
  (["D", "C", "B", "A"] as const).map(level => [level, {
    label: { D: "Introduction", C: "Intermédiaire", B: "Difficile", A: "Élite" }[level],
    status: "host", description: descriptions[level], killerBeeTracks: killerBeeTracks[level],
  }]),
) as Record<DifficultyClass, DifficultyConfig>;
