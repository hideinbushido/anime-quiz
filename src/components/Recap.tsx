import type { DuelSession, Epreuve } from "../types";
import { DuelHeader } from "./DuelHeader";
import { winnerLabel } from "../duel/engine";

export function Recap({ epreuves, session, onRestart }: { epreuves: Epreuve[]; session: DuelSession; onRestart: () => void }) {
  return <div className="screen duel-recap">
    <DuelHeader players={session.players} label="LIVE TERMINÉ · 5/5" />
    <h1>{winnerLabel(session)}</h1>
    <div className="duel-results">
      {session.results.map((result, index) => <article key={result.epreuveId}>
        <h2>{index + 1}. {epreuves.find(epreuve => epreuve.id === result.epreuveId)?.nom}</h2>
        <p>Classe {result.difficulty} · Choix de {result.selectedBy === "host" ? "Présentateur" : session.players[result.selectedBy].name}</p>
        <div className="duel-result-scores"><span className="player1">{session.players.player1.name} : +{result.scorePlayer1}</span><span className="player2">{session.players.player2.name} : +{result.scorePlayer2}</span></div>
        <details><summary>Détail des manches</summary><ol>{result.rounds.map((round, i) => <li key={round.roundId}>Manche {i + 1} · {session.players[round.playerId].name} · {round.correct ? "Réussie" : "Partielle ou incorrecte"} · {round.points} pts</li>)}</ol></details>
      </article>)}
    </div>
    <button className="btn-primary" onClick={onRestart}>Préparer un nouveau LIVE</button>
  </div>;
}
