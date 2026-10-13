import { useEffect, useState } from "react";
import { useRoom } from "../realtime/roomContext";
import type { RoomView, RoundPhase, TimerState } from "./types";

/**
 * L'état des Liens d'Ayanokoji vu depuis un écran. La connexion est ouverte
 * une fois pour toutes par le `RoomProvider` : ce hook n'en lit que la part
 * qui concerne cette épreuve. `clockOffset` recale l'horloge locale sur celle
 * du serveur : chrono et compte à rebours se calculent ensuite sur place.
 */
export function useAyanokojiRoom<V extends RoomView>(role: V["role"]) {
  const { view, status, error, clockOffset, send } = useRoom();
  return { view: view && view.role === role ? (view as V) : null, status, error, clockOffset, send };
}

/** L'heure du serveur, rafraîchie quelques fois par seconde tant que `active` est vrai. */
export function useServerNow(clockOffset: number, active: boolean): number {
  const [now, setNow] = useState(() => Date.now() + clockOffset);
  useEffect(() => {
    const update = () => setNow(Date.now() + clockOffset);
    update();
    if (!active) return;
    const interval = window.setInterval(update, 100);
    return () => window.clearInterval(interval);
  }, [clockOffset, active]);
  return now;
}

export const elapsedMs = (timer: TimerState, now: number) => timer.elapsedMs + (timer.runningSince === null ? 0 : Math.max(0, now - timer.runningSince));

export function formatClock(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

/** Le rythme de la révélation : un lien corrigé toutes les 900 ms, puis la chaîne parfaite. */
export const REVEAL_STEP_MS = 900;

export const PHASE_LABEL: Record<RoundPhase, string> = {
  waiting: "En attente d'une manche",
  ready: "Manche prête",
  playing: "Manche en cours",
  paused: "Pause",
  locked: "Prêt à révéler",
  countdown: "Révélation…",
  revealing: "Correction",
  complete: "Manche terminée",
};
