import { useEffect, useRef } from "react";

const missing = new Set<string>();

/** Joue un son du dossier `public/sons/`. Un fichier absent ou une lecture refusée ne casse rien. */
export function playSound(src: string) {
  if (missing.has(src)) return;
  try {
    const audio = new Audio(src);
    audio.addEventListener("error", () => missing.add(src));
    void audio.play().catch(() => { /* lecture refusée par le navigateur */ });
  } catch { /* pas de son sur cet appareil */ }
}

/**
 * Joue le son associé au dernier événement d'une épreuve, une seule fois par
 * événement. Le premier état reçu sert de point de départ : on ne rejoue pas
 * le passé au chargement de l'écran.
 */
export function useEventSound(event: { seq: number; kind: string } | undefined, sounds: Record<string, string>) {
  const last = useRef<number | null>(null);
  useEffect(() => {
    if (!event) return;
    if (last.current !== null && event.seq !== last.current && sounds[event.kind]) playSound(sounds[event.kind]);
    last.current = event.seq;
    // (la table des sons est une constante du module appelant)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event?.seq, event?.kind]);
}
