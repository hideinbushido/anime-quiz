import { useCallback, useEffect, useState } from "react";

const SEEN_KEY = "anime-quiz-intro-seen";
const DURATION_MS = 3400;

function shouldPlay(): boolean {
  if (window.location.pathname !== "/") return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  try { return sessionStorage.getItem(SEEN_KEY) !== "1"; } catch { return true; }
}

/** Opening title sequence: once per tab, skippable with any key, a click or the button. */
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
  return <div className="intro" onClick={close}>
    <div className="intro-bar intro-bar-top" aria-hidden="true" />
    <div className="intro-rays" aria-hidden="true" />
    <div className="intro-sun" aria-hidden="true" />
    <div className="intro-title" role="img" aria-label="Quiz'Animanga, le duel anime">
      <span className="intro-kicker" aria-hidden="true">QUIZ'</span>
      <span className="intro-word" aria-hidden="true">{[..."ANIMANGA"].map((letter, index) => <span key={index} style={{ ["--i" as string]: index }}>{letter}</span>)}</span>
      <span className="intro-tagline" aria-hidden="true">Le duel anime · 1 contre 1</span>
    </div>
    <button className="intro-skip" type="button" onClick={close}>Passer l'intro</button>
    <div className="intro-bar intro-bar-bottom" aria-hidden="true" />
  </div>;
}
