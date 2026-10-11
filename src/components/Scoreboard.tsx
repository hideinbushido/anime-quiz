import { useState } from "react";
import type { Epreuve } from "../types";
import { readHistory } from "../duel/storage";
import { loadLeaderboard } from "../utils";
import { Recap } from "./Recap";
import { winnerLabel } from "../duel/engine";

export function Scoreboard({ epreuves, onBack }: { epreuves: Epreuve[]; onBack: () => void }) {
  const [entries] = useState(() => readHistory(epreuves));
  const [legacy] = useState(loadLeaderboard);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = entries.find(entry => entry.id === selectedId);
  if (selected) return <><button className="links-secondary" onClick={() => setSelectedId(null)}>Retour à l'historique</button><Recap epreuves={epreuves} session={selected} onRestart={onBack} /></>;
  return <div className="screen scores-screen">
    <header className="scores-header"><div><p className="menu-eyebrow">Les derniers LIVE</p><h1>Historique des duels</h1></div><button className="scores-back" onClick={onBack}>Retour</button></header>
    <p>Les 20 derniers duels terminés sont conservés dans ce navigateur.</p>
    <section className="duel-results">
      {!entries.length && <p className="scores-empty">Aucun duel terminé pour le moment.</p>}
      {entries.map(entry => <article key={entry.id}><h2>{entry.players.player1.name} VS {entry.players.player2.name}</h2>
        <p>{entry.players.player1.score} — {entry.players.player2.score} · {winnerLabel(entry)}</p>
        <button className="links-secondary" onClick={() => setSelectedId(entry.id)}>Voir les 5 épreuves</button>
      </article>)}
    </section>
    {legacy.length > 0 && <details><summary>Archives solo ({legacy.length})</summary><ul>{legacy.map((entry, index) => <li key={`${entry.date}-${index}`}>{entry.name} · {entry.score} pts</li>)}</ul></details>}
  </div>;
}
