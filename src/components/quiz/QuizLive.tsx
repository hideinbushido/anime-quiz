import type { PlayerId } from "../../types";
import type { QuizLiveView } from "../../quiz/types";
import { QUIZ_LOOK, useQuiz } from "../../quiz/useQuiz";
import { ConnectionNotice } from "../ayanokoji/AyanokojiParts";
import { StageFx, type FxBurst } from "../fx/StageFx";
import { PlayerFrame } from "../realtime/PlayerFrame";

/** Les tentatives qui restent à un joueur : des pastilles qui s'éteignent. */
export function QuizAttempts({ left, max }: { left: number; max: number }) {
  return <span className="qz-attempts" role="img" aria-label={`${left} tentative${left > 1 ? "s" : ""} restante${left > 1 ? "s" : ""}`}>
    {Array.from({ length: max }, (_, index) => <i key={index} className={index < left ? "is-on" : ""} aria-hidden="true" />)}
  </span>;
}

/**
 * L'écran du live d'une épreuve au buzzer. Il montre la question (la réplique,
 * ou la platine qui tourne pour un extrait), qui a la main et les scores ; la
 * réponse n'apparaît qu'une fois révélée par le présentateur.
 */
export function QuizLive() {
  const { view, status, error, lockLeft } = useQuiz<QuizLiveView>("live");
  if (!view) return <main className="ay-screen qz-live"><ConnectionNotice status={status} error={error} /></main>;
  const { names, phase, kind } = view;
  const look = QUIZ_LOOK[kind];
  const leader: PlayerId | null = view.scores.player1 === view.scores.player2 ? null : view.scores.player1 > view.scores.player2 ? "player1" : "player2";
  const burst: FxBurst | null = phase === "done" ? { key: "done", tone: leader ?? "gold", from: "rain" }
    : view.event.kind === "correct" && view.event.player ? { key: view.event.seq, tone: view.event.player, from: view.event.player === "player1" ? "left" : "right" } : null;

  const side = (id: PlayerId) => {
    const wait = lockLeft(id);
    return <section key={id} className={`fd-side ${id}` + (view.buzzWinner === id ? " is-buzzing" : "") + (view.attempts[id] <= 0 && phase !== "revealed" && phase !== "done" ? " is-out" : "")}>
      <PlayerFrame player={id} name={names[id]} image={view.avatars[id]} />
      <h2><i className={"ay-dot" + (view.connected[id] ? " is-on" : "")} aria-hidden="true" />{names[id]}</h2>
      {view.buzzWinner === id && <p className="fd-hand">A la main</p>}
      {phase !== "done" && <QuizAttempts left={view.attempts[id]} max={view.maxAttempts} />}
      {wait > 0 && view.attempts[id] > 0 && phase !== "revealed" && <p className="fd-out">Bloqué {wait} s</p>}
      <p className="fd-score"><b>{view.scores[id]}</b><span>points</span></p>
    </section>;
  };

  return <main className={`ay-screen qz-live kind-${kind} phase-${phase}`}>
    <header className="fd-head">
      <img className="ay-live-logo" src={look.logo} alt="" />
      <h1>{view.title}</h1>
      {phase !== "done" && <p className="fd-round">{look.item} <b>{view.itemNumber}</b>/{view.itemCount} · <b>{view.points}</b> pts</p>}
    </header>
    <StageFx burst={burst} />
    <ConnectionNotice status={status} error={error} />

    <div className="fd-stage">
      {side("player1")}
      <section className="qz-center">
        {phase === "done" ? <div className="qz-done">
          <p className="ay-kicker">Épreuve terminée</p>
          <strong>{view.scores.player1 === view.scores.player2 ? "Égalité" : `${names[view.scores.player1 > view.scores.player2 ? "player1" : "player2"]} remporte l'épreuve`}</strong>
          <em>{view.scores.player1} – {view.scores.player2}</em>
        </div> : view.revealed ? <div key={`r${view.itemNumber}`} className={"qz-reveal" + (view.revealed.winner ? ` ${view.revealed.winner}` : "")}>
          {view.revealed.imageSrc && <img src={view.revealed.imageSrc} alt="" />}
          <div>
            <p className="ay-kicker">La réponse</p>
            <strong>{view.revealed.answer}</strong>
            <em>{view.revealed.winner ? `${names[view.revealed.winner]} · +${view.points}` : "Personne ne trouve"}</em>
          </div>
        </div> : kind === "citations" ? <blockquote key={`q${view.itemNumber}`} className="qz-quote">{view.prompt}</blockquote>
          : <div className={"qz-deck" + (phase === "open" ? " is-playing" : "")} aria-hidden="true">
            <div className="qz-vinyl"><i /><i /><i /></div>
            <div className="qz-eq">{Array.from({ length: 17 }, (_, index) => <span key={index} style={{ ["--i" as string]: index }} />)}</div>
          </div>}
        {!view.revealed && phase !== "done" && <p className="qz-status" role="status">
          {view.buzzWinner ? `${names[view.buzzWinner]} répond…` : phase === "open" ? (kind === "beats" ? "Quel est cet anime ?" : "Qui a dit ça ?") : kind === "beats" ? "La musique va reprendre…" : "Le buzzer va s'ouvrir…"}
        </p>}
      </section>
      {side("player2")}
    </div>

    {view.buzzWinner && <div key={view.event.seq} className={`fd-buzz ${view.buzzWinner}`} role="status"><strong>{names[view.buzzWinner]}</strong><span>Buzz !</span></div>}
    {view.event.kind === "wrong" && view.event.player && !view.buzzWinner && !view.revealed
      && <div key={view.event.seq} className={`fd-flash qz-wrong ${view.event.player}`} aria-hidden="true"><strong>Faux</strong></div>}
  </main>;
}
