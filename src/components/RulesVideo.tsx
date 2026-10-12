import { useCallback, useEffect, useRef, useState } from "react";

interface Props {
  src: string;
  /** Laisse la carte d'annonce de l'épreuve finir avant de lancer la vidéo. */
  delayMs?: number;
  onDone: () => void;
}

/**
 * La vidéo des règles, en plein écran au lancement d'une épreuve.
 * Elle se ferme d'elle-même à la fin ; le présentateur peut la passer à tout moment.
 * Tant qu'elle est là, le clavier ne commande pas le jeu en dessous.
 */
export function RulesVideo({ src, delayMs = 0, onDone }: Props) {
  const video = useRef<HTMLVideoElement>(null);
  const [blocked, setBlocked] = useState(false);
  const play = useCallback(() => {
    video.current?.play().then(() => setBlocked(false), () => setBlocked(true));
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(play, delayMs);
    return () => window.clearTimeout(timer);
  }, [play, delayMs]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      event.stopImmediatePropagation();
      if (event.key === "Escape") onDone();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onDone]);
  return <div className="rules-video" role="dialog" aria-label="Les règles de l'épreuve">
    <video ref={video} src={src} playsInline preload="auto" onEnded={onDone} onError={onDone} />
    {blocked && <button className="rules-video-play" onClick={play}>Lancer les règles</button>}
    <button className="rules-video-skip" onClick={onDone}>Passer <kbd>Échap</kbd></button>
  </div>;
}
