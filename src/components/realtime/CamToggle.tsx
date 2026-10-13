import { useCallback, useEffect, useRef, useState } from "react";
import { useRoom } from "../../realtime/roomContext";

const SIZE = 220;
const INTERVAL_MS = 120;

/**
 * Le bouton « caméra » de l'écran d'un joueur. Rien ne part sans son accord :
 * il l'allume lui-même, le navigateur lui demande la permission, et il peut
 * la couper à tout moment. Une petite image carrée part alors plusieurs fois
 * par seconde vers le live, par la même connexion que le reste du jeu.
 */
export function CamToggle() {
  const { send, status } = useRoom();
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const [on, setOn] = useState(false);
  const [notice, setNotice] = useState("");

  const stop = useCallback(() => {
    stream.current?.getTracks().forEach(track => track.stop());
    stream.current = null;
    setOn(false);
    send({ type: "room:cam", image: null });
  }, [send]);

  const start = async () => {
    setNotice("");
    if (!navigator.mediaDevices?.getUserMedia) return setNotice("Caméra indisponible sur cet appareil.");
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 480 }, height: { ideal: 480 } }, audio: false });
      setOn(true);
    } catch {
      setNotice("Caméra refusée : autorise-la dans ton navigateur.");
    }
  };

  useEffect(() => {
    const element = video.current;
    if (!on || !element || !stream.current) return;
    element.srcObject = stream.current;
    element.play().catch(() => undefined);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = SIZE;
    const context = canvas.getContext("2d");
    const timer = window.setInterval(() => {
      const side = Math.min(element.videoWidth, element.videoHeight);
      if (!context || !side || status !== "online") return;
      // Un carré pris au centre, retourné comme un miroir
      context.setTransform(-1, 0, 0, 1, SIZE, 0);
      context.drawImage(element, (element.videoWidth - side) / 2, (element.videoHeight - side) / 2, side, side, 0, 0, SIZE, SIZE);
      send({ type: "room:cam", image: canvas.toDataURL("image/jpeg", 0.55) });
    }, INTERVAL_MS);
    return () => { window.clearInterval(timer); element.srcObject = null; };
  }, [on, send, status]);

  useEffect(() => () => { stream.current?.getTracks().forEach(track => track.stop()); }, []);

  return <div className={"cam-toggle" + (on ? " is-on" : "")}>
    <video ref={video} muted playsInline hidden={!on} />
    <button type="button" onClick={on ? stop : start} aria-pressed={on}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h9A1.5 1.5 0 0 1 15 7.5v2.2l5-3v10.6l-5-3v2.2a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 3 16.500z" /></svg>
      {on ? "Couper ma caméra" : "Montrer ma tête sur le live"}
    </button>
    {notice && <p role="status">{notice}</p>}
  </div>;
}
