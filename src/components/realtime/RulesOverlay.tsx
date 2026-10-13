import { useEffect, useRef, useState } from "react";
import { useRoom } from "../../realtime/roomContext";

/**
 * La vidéo des règles : plein écran, par-dessus l'épreuve, lancée et coupée par
 * le présentateur. Sur le live, elle part avec le son ; si le navigateur le
 * refuse (un onglet où personne n'a encore cliqué), elle part muette et le dit.
 * Sur le téléphone d'un joueur (`quiet`), elle part muette : il entend déjà le
 * live, et deux sons décalés se gêneraient. Un bouton lui laisse activer le sien.
 */
export function RulesOverlay({ quiet = false }: { quiet?: boolean }) {
  const { info } = useRoom();
  const video = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(false);
  const [ended, setEnded] = useState<string | null>(null);
  const intro = info?.intro ?? null;
  const key = intro ? `${intro.src}@${intro.startedAt}` : null;
  // Un écran qui arrive en cours de route reprend la vidéo là où elle en est
  const offset = intro && info ? Math.max(0, (info.serverNow - intro.startedAt) / 1000) : 0;
  useEffect(() => {
    const element = video.current;
    if (!element || !key) return;
    if (offset > 1.5) element.currentTime = offset;
    element.muted = quiet;
    element.play().then(() => setMuted(quiet), () => {
      element.muted = true;
      setMuted(true);
      void element.play().catch(() => { /* lecture impossible : la vidéo reste sur sa première image */ });
    });
    // (le décalage n'est lu qu'au démarrage : la vidéo n'est pas recalée à chaque message)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  if (!intro || ended === key) return null;
  return <div className="rt-intro" role="dialog" aria-label="Les règles de l'épreuve">
    <video ref={video} key={key} src={intro.src} playsInline preload="auto" onEnded={() => setEnded(key)} onError={() => setEnded(key)} />
    {muted && <button type="button" className="rt-intro-sound" onClick={() => { if (video.current) { video.current.muted = false; setMuted(false); } }}>Activer le son</button>}
  </div>;
}
