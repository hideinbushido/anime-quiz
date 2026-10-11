import { useEffect, useState } from "react";
import type { DifficultyClass } from "../types";

interface Props {
  label: string;
  step?: string;
  name: string;
  difficulty: DifficultyClass;
  chooser: string;
  color: string;
}

const DURATION_MS = 2650;

/** Episode title card shown when an épreuve starts. Purely decorative: it never blocks the game underneath. */
export function EpisodeCard({ label, step, name, difficulty, chooser, color }: Props) {
  const [visible, setVisible] = useState(() => !window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => {
    if (!visible) return;
    const timer = window.setTimeout(() => setVisible(false), DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [visible]);
  if (!visible) return null;
  return <div className="episode" aria-hidden="true" style={{ ["--ep-color" as string]: color }}>
    <div className="episode-body">
      <p className="episode-number">{label}{step && <b>{step}</b>}</p>
      <div className="episode-line" />
      <p className="episode-title">{name}</p>
      <p className="episode-meta"><span>Classe {difficulty}</span><span>{chooser}</span></p>
    </div>
  </div>;
}
