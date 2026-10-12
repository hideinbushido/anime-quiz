import { useEffect, useState } from "react";
import type { DifficultyClass, Selector } from "../types";
import { EpreuveLogo } from "./EpreuveLogo";

interface Props {
  label: string;
  step?: string;
  name: string;
  difficulty: DifficultyClass;
  chooser: string;
  epreuveId: string;
  /** Celui qui a choisi l'épreuve : la carte prend sa couleur. */
  selector?: Selector;
}

const DURATION_MS = 3300;

/**
 * La carte qui annonce une épreuve : l'écran se referme sur la coupe d'or, le
 * logo frappe, le nom monte lettre par lettre, puis l'écran se rouvre sur le jeu.
 * Purement décorative : elle ne bloque jamais le jeu en dessous.
 */
export function EpisodeCard({ label, step, name, difficulty, chooser, epreuveId, selector = "host" }: Props) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    if (!visible) return;
    const timer = window.setTimeout(() => setVisible(false), DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [visible]);
  if (!visible) return null;
  let letter = 0;
  return <div className={`episode zk-cut ${selector}`} aria-hidden="true">
    <span className="zk-cut-half zk-cut-a" />
    <span className="zk-cut-half zk-cut-b" />
    <div className="episode-body">
      <div className="episode-emblem"><EpreuveLogo epreuveId={epreuveId} /></div>
      <p className="episode-number">{label}{step && <b>{step}</b>}</p>
      <p className="episode-title">{name.split(" ").map((word, w) => <span key={w} className="episode-word">
        {[...word].map((char, c) => <span key={c} style={{ ["--i" as string]: letter++ }}>{char}</span>)}
      </span>)}</p>
      <p className="episode-meta"><span>Classe {difficulty}</span><span>{chooser}</span></p>
    </div>
  </div>;
}
