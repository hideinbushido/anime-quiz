import { useEffect, useRef, useState } from "react";
import { useRoom } from "../../realtime/roomContext";

/** Sans image au bout de ce délai, on propose au joueur de lancer la vidéo lui-même ou de la passer. */
const STUCK_MS = 3500;

/**
 * La vidéo des règles : plein écran, par-dessus l'épreuve, lancée et coupée par
 * le présentateur. Sur le live, elle part avec le son ; si le navigateur le
 * refuse (un onglet où personne n'a encore cliqué), elle part muette et le dit.
 * Sur le téléphone d'un joueur (`quiet`), elle part muette : il entend déjà le
 * live, et deux sons décalés se gêneraient. Un bouton lui laisse activer le sien.
 *
 * Elle ne doit jamais laisser un écran noir : un téléphone peut refuser de lire
 * une vidéo tout seul (économie d'énergie, réseau lent). Dans ce cas l'écran
 * propose de la lancer d'un geste ou de la passer, et elle se retire d'elle-même
 * à l'heure où elle devait finir.
 */
export function RulesOverlay({ quiet = false }: { quiet?: boolean }) {
  const { info } = useRoom();
  const video = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(false);
  const [stuck, setStuck] = useState(false);
  const [ended, setEnded] = useState<string | null>(null);
  const intro = info?.intro ?? null;
  const key = intro ? `${intro.src}@${intro.startedAt}` : null;
  // Un écran qui arrive en cours de route reprend la vidéo là où elle en est
  const offset = intro && info ? Math.max(0, (info.serverNow - intro.startedAt) / 1000) : 0;
  const shown = Boolean(intro) && ended !== key;

  useEffect(() => {
    const element = video.current;
    if (!element || !key) return;
    const startedAt = performance.now();
    let endTimer = 0;
    setStuck(false);
    const onMetadata = () => {
      // La durée est connue : on se cale sur l'heure du serveur, et on sait quand ça finit
      const now = offset + (performance.now() - startedAt) / 1000;
      if (!Number.isFinite(element.duration) || now >= element.duration - 0.3) return setEnded(key);
      if (now > 1.5) element.currentTime = now;
      endTimer = window.setTimeout(() => setEnded(key), (element.duration - now + 1.5) * 1000);
    };
    if (element.readyState >= 1) onMetadata(); else element.addEventListener("loadedmetadata", onMetadata, { once: true });
    element.muted = quiet;
    element.play().then(() => setMuted(quiet), () => {
      element.muted = true;
      setMuted(true);
      // Même muette, la lecture peut être refusée : le joueur la lancera d'un geste
      element.play().catch(() => setStuck(true));
    });
    const stuckTimer = window.setTimeout(() => { if (element.paused || element.readyState < 2) setStuck(true); }, STUCK_MS);
    const onPlaying = () => setStuck(false);
    element.addEventListener("playing", onPlaying);
    return () => {
      window.clearTimeout(endTimer);
      window.clearTimeout(stuckTimer);
      element.removeEventListener("loadedmetadata", onMetadata);
      element.removeEventListener("playing", onPlaying);
    };
    // (le décalage n'est lu qu'au démarrage : la vidéo n'est pas recalée à chaque message)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Pendant la vidéo, le décor animé de l'écran du dessous se met en veille
  useEffect(() => {
    if (!shown) return;
    document.documentElement.dataset.intro = "true";
    return () => { delete document.documentElement.dataset.intro; };
  }, [shown]);

  if (!intro || !shown) return null;
  const start = () => {
    const element = video.current;
    if (!element) return;
    element.muted = false;
    setMuted(false);
    element.play().then(() => setStuck(false), () => undefined);
  };
  return <div className="rt-intro" role="dialog" aria-label="Les règles de l'épreuve">
    <video ref={video} key={key} src={intro.src} muted={quiet} playsInline preload="auto" onEnded={() => setEnded(key)} onError={() => setEnded(key)} />
    {stuck ? <div className="rt-intro-stuck">
      <p>La vidéo des règles ne démarre pas toute seule sur cet appareil.</p>
      <button type="button" className="ay-button is-primary" onClick={start}>Lire la vidéo</button>
      <button type="button" className="rt-intro-sound" onClick={() => setEnded(key)}>Passer</button>
    </div> : <>
      {muted && <button type="button" className="rt-intro-sound" onClick={() => { if (video.current) { video.current.muted = false; setMuted(false); } }}>Activer le son</button>}
      {quiet && <button type="button" className="rt-intro-sound rt-intro-skip" onClick={() => setEnded(key)}>Passer</button>}
    </>}
  </div>;
}
