import { useEffect, useState } from "react";
import type { DuelSession, Epreuve, PlayerId } from "../types";
import { winnerLabel } from "../duel/engine";
import { EpreuveLogo } from "./EpreuveLogo";

const CONFETTI = 44;
const COUNT_MS = 1600;

/** Le score final, qui grimpe depuis zéro une fois le nom du vainqueur posé. */
function CountUp({ value, delay }: { value: number; delay: number }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    let frame = 0;
    const timer = window.setTimeout(() => {
      const t0 = performance.now();
      frame = requestAnimationFrame(function step(now) {
        const p = Math.min((now - t0) / COUNT_MS, 1);
        setShown(Math.round(value * (1 - (1 - p) ** 4)));
        if (p < 1) frame = requestAnimationFrame(step);
      });
    }, delay);
    return () => { window.clearTimeout(timer); cancelAnimationFrame(frame); };
  }, [value, delay]);
  return <><span aria-hidden="true">{shown}</span><span className="zk-sr">{value}</span></>;
}

/**
 * La fin du LIVE : le nom du vainqueur monte lettre par lettre dans sa couleur,
 * les scores grimpent, l'or pleut. En dessous, la feuille de match des cinq
 * épreuves. Sert aussi à relire un ancien duel depuis l'historique.
 */
export function Recap({ epreuves, session, onRestart }: { epreuves: Epreuve[]; session: DuelSession; onRestart: () => void }) {
  const { player1, player2 } = session.players;
  const winner: PlayerId | null = player1.score === player2.score ? null : player1.score > player2.score ? "player1" : "player2";
  const title = winner ? session.players[winner].name : "Égalité";
  let letter = 0;
  return <div className={"screen duel-recap " + (winner ?? "tie")}>
    <section className="recap-hero">
      <div className="recap-burst" aria-hidden="true" />
      <div className="recap-confetti" aria-hidden="true">{Array.from({ length: CONFETTI }, (_, i) => <i key={i} style={{ ["--i" as string]: i }} />)}</div>
      <p className="recap-kicker">Live terminé · 5 épreuves</p>
      <img className="recap-seal" src="/logo-zenkai.png" alt="" />
      <h1 aria-label={winnerLabel(session)}>
        <span className="recap-name" aria-hidden="true">{title.split(" ").map((word, w) => <span key={w} className="recap-word">
          {[...word].map((char, c) => <span key={c} style={{ ["--i" as string]: letter++ }}>{char}</span>)}
        </span>)}</span>
        <span className="recap-sub" aria-hidden="true">{winner ? "remporte le LIVE" : "Personne ne cède"}</span>
      </h1>
      <div className="recap-scores">
        {(["player1", "player2"] as const).map(id => <div key={id} className={id + (winner === id ? " is-winner" : "")}>
          <span>{session.players[id].name}</span>
          <b><CountUp value={session.players[id].score} delay={1500} /></b>
          <small>{session.players[id].score > 1 ? "épreuves gagnées" : "épreuve gagnée"}</small>
        </div>)}
      </div>
    </section>

    <div className="recap-sheet">
      <p className="recap-sheet-title">La feuille de match</p>
      <div className="duel-results">
        {session.results.map((result, index) => {
          const epreuve = epreuves.find(item => item.id === result.epreuveId);
          const lead: PlayerId | null = result.scorePlayer1 === result.scorePlayer2 ? null : result.scorePlayer1 > result.scorePlayer2 ? "player1" : "player2";
          return <article key={result.epreuveId} className={lead ?? "tie"} style={{ ["--i" as string]: index }}>
            <div className="recap-card-logo"><EpreuveLogo epreuveId={result.epreuveId} /></div>
            <h2>{index + 1}. {epreuve?.nom ?? "Épreuve"}</h2>
            <p>Classe {result.difficulty} · Choix de {result.selectedBy === "host" ? "Présentateur" : session.players[result.selectedBy].name}</p>
            <div className="duel-result-scores">
              <span className={"player1" + (lead === "player1" ? " is-lead" : "")}>{session.players.player1.name} : +{result.scorePlayer1}</span>
              <span className={"player2" + (lead === "player2" ? " is-lead" : "")}>{session.players.player2.name} : +{result.scorePlayer2}</span>
            </div>
            <details><summary>Détail des manches</summary><ol>{result.rounds.map((round, i) => <li key={round.roundId}>Manche {i + 1} · {session.players[round.playerId].name} · {round.correct ? "Réussie" : "Partielle ou incorrecte"} · {round.points} pts</li>)}</ol></details>
          </article>;
        })}
      </div>
    </div>
    <button className="btn-primary" onClick={onRestart}>Préparer un nouveau LIVE</button>
  </div>;
}
