import { useCallback, useEffect, useRef, useState } from "react";
import { connectRoom, type ConnectionStatus, type RoomConnection } from "./realtime";
import type { ClientMessage, Role, RoomView, RoundPhase, TimerState } from "./types";

/**
 * L'état d'une room vu depuis un écran. `clockOffset` recale l'horloge locale
 * sur celle du serveur : chrono et compte à rebours se calculent ensuite sur
 * place, sans qu'aucune seconde ne transite par le réseau.
 */
export function useAyanokojiRoom<V extends RoomView>(room: string, role: V["role"], labels: { name?: string; j1?: string; j2?: string } = {}) {
  const [view, setView] = useState<V | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [error, setError] = useState("");
  const [clockOffset, setClockOffset] = useState(0);
  const connection = useRef<RoomConnection | null>(null);

  useEffect(() => {
    const link = connectRoom({
      room, role: role as Role, name: labels.name, names: { player1: labels.j1, player2: labels.j2 },
      onView: (next, receivedAt) => {
        if (next.role !== role) return;
        setView(next as V);
        setClockOffset(next.serverNow - receivedAt);
      },
      onStatus: setStatus,
      onError: setError,
    });
    connection.current = link;
    return () => { link.close(); connection.current = null; };
  }, [room, role, labels.name, labels.j1, labels.j2]);

  // Un refus du serveur s'affiche quelques secondes, puis s'efface de lui-même
  // (un refus à l'entrée, lui, reste affiché : sans vue, il n'y a rien d'autre à montrer)
  const joined = view !== null;
  useEffect(() => {
    if (!error || !joined) return;
    const timer = window.setTimeout(() => setError(""), 4000);
    return () => window.clearTimeout(timer);
  }, [error, joined]);

  const send = useCallback((message: ClientMessage) => connection.current?.send(message), []);
  return { view, status, error, clockOffset, send };
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
