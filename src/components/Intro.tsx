import { useCallback, useEffect, useState } from "react";

const SEEN_KEY = "anime-quiz-intro-seen";
const DURATION_MS = 3000;

function shouldPlay(): boolean {
  if (window.location.pathname !== "/") return false;
  try { return sessionStorage.getItem(SEEN_KEY) !== "1"; } catch { return true; }
}

/**
 * Ouverture : l'écran est fermé par la coupe d'or, le sceau frappe, le nom de
 * l'émission monte lettre par lettre, puis les deux moitiés s'écartent sur
 * l'accueil. Une fois par onglet ; une touche, un clic ou le bouton la passent.
 */
export function Intro() {
  const [open, setOpen] = useState(shouldPlay);
  const close = useCallback(() => {
    try { sessionStorage.setItem(SEEN_KEY, "1"); } catch { /* storage unavailable: replay next time */ }
    setOpen(false);
  }, []);
  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(close, DURATION_MS);
    window.addEventListener("keydown", close);
    return () => { window.clearTimeout(timer); window.removeEventListener("keydown", close); };
  }, [open, close]);
  if (!open) return null;
  return <div className="intro zk-cut" onClick={close}>
    <span className="zk-cut-half zk-cut-a" aria-hidden="true" />
    <span className="zk-cut-half zk-cut-b" aria-hidden="true" />
    <div className="intro-title" role="img" aria-label="Quiz'Animanga, le duel anime, présenté par Zenkai">
      <img className="intro-seal" src="/logo-zenkai.png" alt="" />
      <span className="intro-kicker" aria-hidden="true">Zenkai présente</span>
      <span className="intro-word" aria-hidden="true">{[..."QUIZ'ANIMANGA"].map((letter, index) => <span key={index} style={{ ["--i" as string]: index }}>{letter}</span>)}</span>
      <span className="intro-tagline" aria-hidden="true">Le duel anime · 1 contre 1</span>
    </div>
    <button className="intro-skip" type="button" onClick={close}>Passer l'intro</button>
  </div>;
}
