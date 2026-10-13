import { useEffect, useRef } from "react";
import { useRoom } from "../realtime/roomContext";
import type { FeudEvent, FeudLiveView, FeudPhase, FeudView } from "./types";

/** L'état des Pensées d'Anya vu depuis un écran : la part de la room qui concerne cette épreuve. */
export function useFeud<V extends FeudView>(role: V["role"]) {
  const { feud, status, error, clockOffset, send } = useRoom();
  return { view: feud && feud.role === role ? (feud as V) : null, status, error, clockOffset, send };
}

export const FEUD_PHASE_LABEL: Record<FeudPhase, string> = {
  waiting: "Manche prête",
  playing: "Buzzer en jeu",
  buzzLocked: "Réponse en cours",
  roundEnded: "Prêt à révéler les points",
  revealingPoints: "Révélation des points",
  roundComplete: "Manche terminée",
  gameComplete: "Épreuve terminée",
};

/**
 * Où en est la révélation des points. Les valeurs tombent de la moins citée à
 * la plus citée, une par pas ; tout se calcule sur l'heure du serveur, si bien
 * que le live et un écran rechargé en cours de route montrent la même chose.
 */
export function revealProgress(view: Pick<FeudLiveView, "phase" | "slots" | "revealStartedAt" | "revealStepMs" | "roundScore" | "totals">, now: number) {
  const total = view.slots.length;
  const done = view.phase === "roundComplete" || view.phase === "gameComplete";
  const running = view.phase === "revealingPoints" && view.revealStartedAt !== null;
  const steps = done ? total + 1 : running ? Math.floor((now - view.revealStartedAt!) / view.revealStepMs) : 0;
  // Le rang 8 tombe au premier pas, le rang 1 au huitième
  const shown = (rank: number) => steps >= total - rank + 1;
  const score = { player1: 0, player2: 0 };
  for (const slot of view.slots) if (slot.foundBy && slot.points !== null && shown(slot.rank)) score[slot.foundBy] += slot.points;
  const before = view.roundScore
    ? { player1: view.totals.player1 - view.roundScore.player1, player2: view.totals.player2 - view.roundScore.player2 }
    : view.totals;
  return {
    active: running || done, shown, score,
    totals: { player1: before.player1 + score.player1, player2: before.player2 + score.player2 },
    /** Toutes les valeurs sont tombées : on peut annoncer le vainqueur de la manche. */
    finished: steps >= total + 1,
  };
}

/**
 * Les sons de l'épreuve. Chaque nom correspond à un fichier facultatif dans
 * `public/sons/anya/` (buzz.mp3, correct.mp3, wrong.mp3, strike3.mp3,
 * answerReveal.mp3, pointsReveal.mp3, roundWin.mp3, finalWin.mp3). Un fichier
 * absent ne casse rien : le son est simplement ignoré.
 */
export type FeudSound = "buzz" | "correct" | "wrong" | "strike3" | "answerReveal" | "pointsReveal" | "roundWin" | "finalWin";

const missing = new Set<FeudSound>();
export function playFeudSound(name: FeudSound) {
  if (missing.has(name)) return;
  try {
    const audio = new Audio(`/sons/anya/${name}.mp3`);
    audio.addEventListener("error", () => missing.add(name));
    void audio.play().catch(() => { /* fichier absent ou lecture refusée par le navigateur */ });
  } catch { /* pas de son sur cet appareil */ }
}

const EVENT_SOUND: Partial<Record<FeudEvent["kind"], FeudSound>> = {
  buzz: "buzz", correct: "correct", wrong: "wrong", strike3: "strike3", pointsReveal: "pointsReveal",
};

/** Joue le son du dernier fait marquant, une seule fois par événement. */
export function useFeudSounds(event: FeudEvent | undefined) {
  const last = useRef<number | null>(null);
  useEffect(() => {
    if (!event) return;
    // Le premier état reçu sert de point de départ : on ne rejoue pas le passé au chargement
    if (last.current !== null && event.seq !== last.current) {
      const sound = EVENT_SOUND[event.kind];
      if (sound) playFeudSound(sound);
    }
    last.current = event.seq;
  }, [event]);
}
