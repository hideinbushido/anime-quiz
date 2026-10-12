import { useState } from "react";
import type { DuelSession, Epreuve, PlayerId } from "../types";
import { readHistory } from "../duel/storage";
import { loadLeaderboard } from "../utils";
import { Recap } from "./Recap";

interface Props {
  epreuves: Epreuve[];
  onBack: () => void;
  /** Duels de démonstration, pour l'aperçu de développement : remplacent ceux du navigateur. */
  demo?: DuelSession[];
}

interface Palmares { name: string; duels: number; wins: number; draws: number; losses: number; points: number; best: number }

const winnerOf = (duel: DuelSession): PlayerId | null => {
  const { player1, player2 } = duel.players;
  return player1.score === player2.score ? null : player1.score > player2.score ? "player1" : "player2";
};

/** Les joueurs reviennent d'un duel à l'autre : on les regroupe par pseudo, sans tenir compte de la casse. */
function palmares(duels: DuelSession[]): Palmares[] {
  const byName = new Map<string, Palmares>();
  for (const duel of duels) {
    const winner = winnerOf(duel);
    for (const id of ["player1", "player2"] as const) {
      const { name, score } = duel.players[id];
      const key = name.trim().toLocaleLowerCase("fr");
      const row = byName.get(key) ?? { name: name.trim(), duels: 0, wins: 0, draws: 0, losses: 0, points: 0, best: 0 };
      row.duels++;
      if (!winner) row.draws++; else if (winner === id) row.wins++; else row.losses++;
      row.points += score;
      row.best = Math.max(row.best, score);
      byName.set(key, row);
    }
  }
  return [...byName.values()].sort((a, b) => b.wins - a.wins || b.points - a.points || a.name.localeCompare(b.name, "fr"));
}

function dateLabel(iso?: string): string {
  const date = iso ? new Date(iso) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "—";
}

/**
 * L'historique : le palmarès des joueurs, puis chaque duel, ligne par ligne —
 * qui a battu qui, et de combien. Une ligne ouvre la feuille de match du duel.
 */
export function Scoreboard({ epreuves, onBack, demo }: Props) {
  const [entries] = useState(() => demo ?? readHistory(epreuves));
  const [legacy] = useState(loadLeaderboard);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = entries.find(entry => entry.id === selectedId);
  if (selected) return <>
    <div className="scores-return"><button className="links-secondary" onClick={() => setSelectedId(null)}>Retour à l'historique</button></div>
    <Recap epreuves={epreuves} session={selected} onRestart={onBack} />
  </>;
  const ranking = palmares(entries);
  return <div className="screen scores-screen">
    <header className="scores-header">
      <div><p className="menu-eyebrow">Les derniers LIVE</p><h1>Historique des duels</h1></div>
      <button className="scores-back" onClick={onBack}>Retour</button>
    </header>
    {demo && <p className="scores-demo" role="status">Aperçu : ces duels sont fictifs et ne sont pas enregistrés.</p>}

    {!entries.length ? <p className="scores-empty">Aucun duel terminé pour le moment. Le premier LIVE joué jusqu'au bout apparaîtra ici.</p> : <>
      <section className="scores-section" aria-labelledby="palmares-title">
        <h2 id="palmares-title">Le palmarès</h2>
        <div className="scores-scroll"><table className="scores-table scores-ranking">
          <thead><tr><th scope="col">Rang</th><th scope="col">Joueur</th><th scope="col">Duels</th><th scope="col">Victoires</th><th scope="col">Nuls</th><th scope="col">Défaites</th><th scope="col">Points</th><th scope="col">Meilleur score</th></tr></thead>
          <tbody>{ranking.map((row, index) => <tr key={row.name} style={{ ["--i" as string]: index }} className={index === 0 ? "is-first" : ""}>
            <td>{index + 1}</td><th scope="row">{row.name}</th><td>{row.duels}</td><td className="scores-wins">{row.wins}</td><td>{row.draws}</td><td>{row.losses}</td><td>{row.points}</td><td>{row.best}</td>
          </tr>)}</tbody>
        </table></div>
      </section>

      <section className="scores-section" aria-labelledby="duels-title">
        <h2 id="duels-title">Les duels</h2>
        <div className="scores-scroll"><table className="scores-table scores-duels">
          <thead><tr><th scope="col">Date</th><th scope="col">Côté saphir</th><th scope="col">Score</th><th scope="col">Côté rubis</th><th scope="col">Vainqueur</th><th scope="col">Écart</th><th scope="col"><span className="zk-sr">Détail</span></th></tr></thead>
          <tbody>{entries.map((entry, index) => {
            const winner = winnerOf(entry);
            const { player1, player2 } = entry.players;
            return <tr key={entry.id} style={{ ["--i" as string]: index }}>
              <td className="scores-date">{dateLabel(entry.finishedAt)}</td>
              <td className={"player1" + (winner === "player1" ? " is-winner" : "")}>{player1.name}</td>
              <td className="scores-score"><b className="player1">{player1.score}</b><span aria-hidden="true">—</span><b className="player2">{player2.score}</b></td>
              <td className={"player2" + (winner === "player2" ? " is-winner" : "")}>{player2.name}</td>
              <td className={"scores-winner " + (winner ?? "tie")}>{winner ? entry.players[winner].name : "Égalité"}</td>
              <td>{winner ? `+${Math.abs(player1.score - player2.score)}` : "0"}</td>
              <td><button className="links-secondary" onClick={() => setSelectedId(entry.id)} aria-label={`Voir les 5 épreuves du duel ${player1.name} contre ${player2.name}`}>Voir les 5 épreuves</button></td>
            </tr>;
          })}</tbody>
        </table></div>
      </section>
    </>}

    <p className="scores-note">Les 20 derniers duels terminés sont conservés dans ce navigateur.</p>
    {legacy.length > 0 && <details><summary>Archives solo ({legacy.length})</summary><ul>{legacy.map((entry, index) => <li key={`${entry.date}-${index}`}>{entry.name} · {entry.score} pts</li>)}</ul></details>}
  </div>;
}
