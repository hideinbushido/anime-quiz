import type { ConnectionStatus } from "../../ayanokoji/realtime";
import { elapsedMs, formatClock, useServerNow } from "../../ayanokoji/useAyanokojiRoom";
import type { PublicRound, TimerState } from "../../ayanokoji/types";

/** Le chrono commun : calculé sur place à partir de l'état du serveur, il ne saute jamais. */
export function AyanokojiTimer({ timer, clockOffset, className = "" }: { timer: TimerState; clockOffset: number; className?: string }) {
  const now = useServerNow(clockOffset, timer.runningSince !== null);
  return <span className={"ay-timer " + className + (timer.runningSince === null ? " is-stopped" : "")} role="timer" aria-label="Chrono">{formatClock(elapsedMs(timer, now))}</span>;
}

/** La classe et le niveau de la manche : « B2 ». */
export function RoundBadge({ round }: { round: PublicRound }) {
  return <span className="ay-badge" aria-label={`Classe ${round.difficulty}, manche ${round.level}`}>{round.difficulty}{round.level}</span>;
}

export function ConnectionNotice({ status, error }: { status: ConnectionStatus; error: string }) {
  if (error) return <p className="ay-notice is-error" role="alert">{error}</p>;
  if (status === "online") return null;
  return <p className="ay-notice" role="status">{status === "connecting" ? "Connexion au serveur…" : "Connexion perdue. Nouvelle tentative…"}</p>;
}

/** Le 3-2-1 avant la correction, calé sur l'horloge du serveur. */
export function Countdown({ revealAt, clockOffset }: { revealAt: number; clockOffset: number }) {
  const now = useServerNow(clockOffset, true);
  const left = Math.max(1, Math.ceil((revealAt - now) / 1000));
  return <div className="ay-countdown" role="status" aria-label={`Révélation dans ${left}`}><b key={left}>{left}</b></div>;
}

/** Le cadenas d'une réponse verrouillée. */
export function LockIcon() {
  return <svg className="ay-lock" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10V7a5 5 0 0 1 10 0v3h1.5A1.5 1.5 0 0 1 20 11.5v9A1.5 1.5 0 0 1 18.5 22h-13A1.5 1.5 0 0 1 4 20.5v-9A1.5 1.5 0 0 1 5.500 10Zm2.200 0h5.600V7a2.800 2.800 0 0 0-5.600 0Z" /></svg>;
}
