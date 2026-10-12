import { useEffect, useRef, useState } from "react";
import type { DuelSession, PlayerId, SelectedEpreuve } from "../types";

interface Props {
  players: DuelSession["players"];
  current?: SelectedEpreuve;
  epreuveName?: string;
  index?: number;
  label?: string;
}

const TWEEN_MS = 900;

/** Le score d'un joueur : il grimpe jusqu'à sa nouvelle valeur et annonce le gain. */
function Score({ value }: { value: number }) {
  const [shown, setShown] = useState(value);
  const [gain, setGain] = useState(0);
  const from = useRef(value);
  useEffect(() => {
    const start = from.current;
    if (start === value) return;
    const delta = value - start;
    const t0 = performance.now();
    let frame = requestAnimationFrame(function step(now) {
      const p = Math.min((now - t0) / TWEEN_MS, 1);
      // Décélération forte : l'essentiel de la course se fait au début
      setShown(Math.round(start + delta * (1 - (1 - p) ** 4)));
      if (p < 1) frame = requestAnimationFrame(step);
    });
    setGain(delta);
    from.current = value;
    const timer = window.setTimeout(() => setGain(0), 1900);
    return () => { cancelAnimationFrame(frame); window.clearTimeout(timer); setShown(value); };
  }, [value]);
  return <b className={"zk-score" + (gain ? " is-scoring" : "")}>
    <span aria-hidden="true">{shown}</span>
    {/* La valeur réelle, pour les lecteurs d'écran : elle ne passe pas par les valeurs intermédiaires */}
    <span className="zk-sr">{value}</span>
    <small> PTS</small>
    {gain > 0 && <em key={value} aria-hidden="true">+{gain}</em>}
  </b>;
}

/**
 * Le bandeau du duel : les deux joueurs, leurs scores, et au centre l'épreuve
 * en cours. Sous le bandeau, le trait d'or se déplace vers celui qui est mené.
 */
export function DuelHeader({ players, current, epreuveName, index, label }: Props) {
  const { player1, player2 } = players;
  const total = player1.score + player2.score;
  const share = total ? Math.min(Math.max(player1.score / total, 0.08), 0.92) : 0.5;
  const leader: PlayerId | null = player1.score === player2.score ? null : player1.score > player2.score ? "player1" : "player2";
  return <header className="duel-header" style={{ ["--share" as string]: share }}>
    {(["player1", "player2"] as const).map((id, i) => <div key={id} className={`duel-player ${id}` + (leader === id ? " is-leading" : "")}>
      <div className="zk-player-name"><span>Joueur {i + 1}</span><strong>{players[id].name}</strong></div>
      <Score value={players[id].score} />
    </div>)}
    <div className="duel-header-center">
      <span className="duel-eyebrow">{label ?? `Épreuve ${(index ?? 0) + 1}/5`}</span>
      <img className="zk-header-seal" src="/logo-zenkai.png" alt="" />
      {current && <><span className="zk-header-epreuve">{epreuveName}</span><b className="duel-class">Classe {current.difficulty}</b></>}
    </div>
    <div className="zk-balance" aria-hidden="true"><i /></div>
  </header>;
}
