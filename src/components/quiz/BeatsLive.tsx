import type { PlayerId } from "../../types";
import type { QuizLiveView } from "../../quiz/types";
import { useQuiz } from "../../quiz/useQuiz";
import { ConnectionNotice } from "../ayanokoji/AyanokojiParts";
import { StageFx, type FxBurst } from "../fx/StageFx";
import { KillerBeeDeck } from "../killerBee/KillerBeeDeck";
import { PlayerFrame } from "../realtime/PlayerFrame";

const NO_AUDIO = { current: null };

/**
 * L'écran du live des Beats de Killer Bee : la platine au centre, un camp de
 * chaque côté. La musique sort de la machine du présentateur ; ici la platine
 * tourne tant que le buzzer est ouvert, et les huit queues de Gyûki dansent.
 * La réponse n'arrive qu'une fois révélée : elle sort alors de sa pochette.
 */
export function BeatsLive() {
  const { view, status, error, lockLeft } = useQuiz<QuizLiveView>("live");
  if (!view) return <main className="beats-session beats-live"><ConnectionNotice status={status} error={error} /></main>;
  const { names, phase, buzzWinner, revealed, event } = view;
  const done = phase === "done";
  const playing = phase === "open";
  const leader: PlayerId | null = view.scores.player1 === view.scores.player2 ? null : view.scores.player1 > view.scores.player2 ? "player1" : "player2";
  const headline = buzzWinner ? `${names[buzzWinner]} buzz !` : playing ? "À l'écoute" : "Pause";
  const hint = buzzWinner ? "Réponse à voix haute : le présentateur tranche" : playing ? "Quel est cet anime ?" : "La musique va reprendre…";

  const burst: FxBurst | null = done ? { key: "done", tone: leader ?? "gold", from: "rain" }
    : event.kind === "correct" && event.player ? { key: event.seq, tone: event.player, from: event.player === "player1" ? "left" : "right" }
    : null;

  const corner = (id: PlayerId) => {
    const attempts = view.attempts[id];
    const wait = attempts > 0 && !revealed && !done ? lockLeft(id) : 0;
    const won = revealed?.winner === id;
    return <section key={id} className={`beats-corner ${id}` + (buzzWinner === id ? " beats-buzz-active" : "") + (buzzWinner && buzzWinner !== id ? " beats-corner-dim" : "") + (won ? " beats-corner-won" : "") + (attempts <= 0 && !revealed && !done ? " beats-corner-out" : "")}>
      <PlayerFrame player={id} name={names[id]} image={view.avatars[id]} />
      <strong className="beats-corner-name"><i className={"ay-dot" + (view.connected[id] ? " is-on" : "")} aria-hidden="true" />{names[id]}</strong>
      <span className="beats-corner-score"><b key={view.scores[id]}>{view.scores[id]}</b> pts</span>
      {!revealed && !done && <span className="beats-lives" role="img" aria-label={`${attempts} tentative${attempts > 1 ? "s" : ""} restante${attempts > 1 ? "s" : ""}`}>
        {Array.from({ length: view.maxAttempts }, (_, life) => <svg key={life} viewBox="0 0 64 16" className={"beats-blade" + (life >= attempts ? " beats-blade-spent" : "")}>
          <rect x="1" y="5" width="15" height="6" rx="2" /><rect x="16" y="1" width="3.5" height="14" rx="1.5" /><path d="M20 4.6 H52 L63 8 L52 11.4 H20 Z" />
        </svg>)}
      </span>}
      {buzzWinner === id && <span className="beats-corner-tag">A la main</span>}
      {wait > 0 && buzzWinner !== id && <span className="beats-corner-lock">Bloqué <b>{wait}</b></span>}
      {won && <span className="beats-corner-gain" aria-hidden="true">+{view.points}</span>}
    </section>;
  };

  return <main className={`beats-session beats-live phase-${phase}`} data-state={buzzWinner ? `${buzzWinner}Buzzed` : phase}>
    <StageFx burst={burst} />
    <div className="beats-backdrop" aria-hidden="true"><span>八</span><span>尾</span></div>
    {buzzWinner && <div key={event.seq} className={`beats-impact ${buzzWinner}`} aria-hidden="true" />}
    <header className="beats-header">
      <img className="beats-live-logo" src="/logos-epreuves/les-beats-de-killer-bee.webp" alt="" />
      {!done && <p className="beats-meta"><span>{view.difficulty ? `Classe ${view.difficulty} · ` : ""}{view.points} pts en jeu</span>Morceau {view.itemNumber}/{view.itemCount}</p>}
    </header>
    <ConnectionNotice status={status} error={error} />

    <div className={"beats-stage" + (revealed || done ? " beats-stage-revealed" : "")}>
      {corner("player1")}
      {done ? <section className={"beats-final" + (leader ? ` ${leader}` : "")}>
        <span>Épreuve terminée</span>
        <strong>{leader ? `${names[leader]} remporte les Beats` : "Égalité parfaite"}</strong>
        <p><b className="player1">{view.scores.player1}</b><i>–</i><b className="player2">{view.scores.player2}</b></p>
      </section> : revealed ? <section className="beats-reveal-scene" key={`r${view.itemNumber}`}>
        <div className="beats-reveal-media">
          <div className="beats-sleeve-disc" />
          <div className="beats-sleeve">{revealed.imageSrc ? <img src={revealed.imageSrc} alt="" />
            : <div className="beats-sleeve-type" aria-hidden="true">{[0, 1, 2, 3, 4, 5].map(row => <span key={row}>{revealed.answer} {revealed.answer}</span>)}<b>{revealed.answer}</b></div>}</div>
        </div>
        <div className="beats-reveal-info">
          <span>La réponse</span>
          <strong>{revealed.answer}</strong>
          <p className={revealed.winner ?? ""}>{revealed.winner ? `${names[revealed.winner]} +${view.points} pts` : "Aucun gagnant · 0 pt"}</p>
        </div>
      </section> : <section className="beats-console">
        <div className="beats-turntable"><KillerBeeDeck audio={NO_AUDIO} playing={playing} /></div>
        <div className="beats-now-playing">
          <strong role="status"><span key={headline}>{headline}</span></strong>
          <p key={hint}>{hint}</p>
        </div>
      </section>}
      {corner("player2")}
    </div>

    <footer className="beats-live-foot">
      <div className={"beats-eq" + (playing ? " is-playing" : "")} aria-hidden="true">{Array.from({ length: 48 }, (_, index) => <i key={index} style={{ ["--i" as string]: index }} />)}</div>
      <nav className="beats-rounds" aria-label="Progression des morceaux">{view.steps.map((step, index) => {
        const current = index === view.itemNumber - 1 && !done;
        const label = step.played ? (step.winner ? `trouvé par ${names[step.winner]}` : "personne n'a trouvé") : current ? "en cours" : "à venir";
        return <span key={index} className={"beats-round" + (current ? " beats-round-current" : "") + (step.played ? ` beats-round-done ${step.winner ?? "beats-round-missed"}` : "")}
          role="img" aria-label={`Morceau ${index + 1} : ${label}`}>
          <strong aria-hidden="true">{index + 1}</strong><em aria-hidden="true">{step.points} pts</em>
        </span>;
      })}</nav>
    </footer>

    {event.kind === "wrong" && event.player && !buzzWinner && !revealed
      && <div key={event.seq} className={`beats-wrong ${event.player}`} aria-hidden="true"><strong>Faux</strong><span>{names[event.player]} est bloqué</span></div>}
  </main>;
}
