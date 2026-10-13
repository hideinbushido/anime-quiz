/**
 * Les questions des épreuves au buzzer, tirées du catalogue du site : les
 * morceaux de Killer Bee pour la classe choisie, et les Répliques Cultes.
 */
import type { DifficultyClass } from "../src/types.ts";
import { epreuves } from "../src/data/epreuves.ts";
import { getKillerBeePoints } from "../src/duel/killerBee.ts";
import type { QuizItem, QuizKind } from "../src/quiz/types.ts";

/** Une bonne réplique rapporte toujours la même chose. */
const CITATION_POINTS = 100;

export function quizItems(kind: QuizKind, difficulty: DifficultyClass | null): QuizItem[] {
  if (kind === "beats") {
    const level = difficulty ?? "D";
    const tracks = epreuves.find(epreuve => epreuve.id === "blind-test-openings")?.difficulties[level].killerBeeTracks ?? [];
    return tracks.map((track, index) => ({
      id: track.id, answer: track.anime, points: getKillerBeePoints(level, index),
      ...(track.audioSrc ? { audioSrc: track.audioSrc } : {}), ...(track.imageSrc ? { imageSrc: track.imageSrc } : {}),
      ...(track.revealAudioSrc ? { revealAudioSrc: track.revealAudioSrc } : {}),
    }));
  }
  const questions = epreuves.find(epreuve => epreuve.id === "citations-cultes")?.questions ?? [];
  return questions.map(question => ({ id: question.id, prompt: question.prompt, answer: question.answer, points: CITATION_POINTS }));
}
