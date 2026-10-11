import type { DuelSession, SelectedEpreuve } from "../types";

interface Props {
  players: DuelSession["players"];
  current?: SelectedEpreuve;
  epreuveName?: string;
  index?: number;
  label?: string;
}

export function DuelHeader({ players, current, epreuveName, index, label }: Props) {
  return <header className="duel-header">
    <div className="duel-player player1"><span>JOUEUR 1</span><strong>{players.player1.name}</strong><b>{players.player1.score}<small> PTS</small></b></div>
    <div className="duel-header-center"><span className="duel-eyebrow">{label ?? `ÉPREUVE ${(index ?? 0) + 1}/5`}</span>
      <strong className="duel-vs">VS</strong>
      {current && <><span>{epreuveName}</span><b className="duel-class">CLASSE {current.difficulty}</b></>}
    </div>
    <div className="duel-player player2"><span>JOUEUR 2</span><strong>{players.player2.name}</strong><b>{players.player2.score}<small> PTS</small></b></div>
  </header>;
}
