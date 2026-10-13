import { useEffect, useRef } from "react";
import type { PlayerId } from "../../types";
import type { FeudLiveView } from "../../feud/types";
import { playFeudSound, revealProgress, useFeud, useFeudSounds } from "../../feud/useFeud";
import { useServerNow } from "../../ayanokoji/useAyanokojiRoom";
import { ConnectionNotice } from "../ayanokoji/AyanokojiParts";
import { FeudAnswerRow, FeudAvatar, FeudStrikes } from "./FeudParts";

const PLAYERS: PlayerId[] = ["player1", "player2"];

/**
 * L'écran du live, pensé pour OBS en 1920×1080 et 1280×720, sans défilement.
 * Le public voit qui a trouvé quoi, jamais ce que ça vaut : les valeurs ne
 * quittent le serveur qu'au moment où le présentateur lance la révélation.
 */
export function FeudLive() {
  const { view, status, error, clockOffset } = useFeud<FeudLiveView>("live");
  useFeudSounds(view?.event);
  const now = useServerNow(clockOffset, view?.phase === "revealingPoints");
  const reveal = view ? revealProgress(view, now) : null;

  // Un son par valeur qui tombe, puis celui de la victoire
  const shownCount = view && reveal ? view.slots.filter(slot => reveal.shown(slot.rank)).length : 0;
  const finished = reveal?.finished ?? false;
  const final = view?.phase === "gameComplete";
  const heard = useRef({ count: 0, finished: true });
  useEffect(() => {
    if (view?.phase === "revealingPoints") {
      if (shownCount > heard.current.count) playFeudSound("answerReveal");
      if (finished && !heard.current.finished) playFeudSound("roundWin");
    }
    heard.current = { count: shownCount, finished };
  }, [shownCount, finished, view?.phase]);
  useEffect(() => { if (final) playFeudSound("finalWin"); }, [final]);

  if (!view || !reveal) return <main className="ay-screen fd-live"><ConnectionNotice status={status} error={error} /></main>;
  const { names, phase } = view;
  const half = Math.ceil(view.slots.length / 2);
  const roundWinner = reveal.finished && reveal.score.player1 !== reveal.score.player2 ? (reveal.score.player1 > reveal.score.player2 ? "player1" : "player2") : null;

  const side = (id: PlayerId) => {
    const out = view.strikes[id] >= view.maxStrikes && !reveal.active;
    return <section key={id} className={`fd-side ${id}` + (view.buzzWinner === id ? " is-buzzing" : "") + (out ? " is-out" : "")}>
      <FeudAvatar player={id} name={names[id]} image={view.avatars[id]} />
      <h2><i className={"ay-dot" + (view.connected[id] ? " is-on" : "")} aria-hidden="true" />{names[id]}</h2>
      {view.buzzWinner === id && <p className="fd-hand">A la main</p>}
      <FeudStrikes count={view.strikes[id]} max={view.maxStrikes} />
      <p className="fd-found"><b>{view.foundCount[id]}</b> trouvée{view.foundCount[id] > 1 ? "s" : ""}</p>
      {reveal.active
        ? <p className="fd-score"><b>{reveal.score[id]}</b><span>manche</span></p>
        : out && <p className="fd-out">Hors manche</p>}
      {(view.roundNumber > 1 || reveal.active) && <p className="fd-total"><span>Total</span> <b>{reveal.totals[id]}</b></p>}
    </section>;
  };

  return <main className={"ay-screen fd-live" + ` phase-${phase}`}>
    <header className="fd-head">
      <img className="ay-live-logo" src="/logos-epreuves/les-pensees-d-anya.webp" alt="" />
      <h1>{view.title}</h1>
      <p className="fd-round">Manche <b>{view.roundNumber}</b>/{view.roundCount}</p>
    </header>
    <ConnectionNotice status={status} error={error} />

    <div className="fd-stage">
      {side("player1")}
      <section className="fd-board">
        {/* La ligne du haut porte la question, puis les annonces de fin de manche : rien ne vient couvrir les cases */}
        {reveal.finished && !final ? <p key="win" className={"fd-question is-announce" + (roundWinner ? ` ${roundWinner}` : "")} role="status">
          {roundWinner ? `${names[roundWinner]} gagne la manche` : "Égalité sur la manche"} <b>{reveal.score.player1} – {reveal.score.player2}</b>
        </p> : phase === "roundEnded" ? <p key="end" className="fd-question is-announce" role="status">Fin de la manche <b>Qui a marqué le plus ?</b></p>
          : <p key="question" className="fd-question">{view.question}</p>}
        <div className="fd-columns">
          {[view.slots.slice(0, half), view.slots.slice(half)].map((column, index) => <ol key={index} className="fd-list">
            {column.map(slot => <FeudAnswerRow key={slot.rank} slot={slot} names={names} avatars={view.avatars}
              valueShown={reveal.active && reveal.shown(slot.rank)}
              labelShown={slot.foundBy !== null || !reveal.active || reveal.shown(slot.rank)}
              fresh={phase !== "revealingPoints" && view.event.kind === "correct" && view.event.rank === slot.rank} />)}
          </ol>)}
        </div>
      </section>
      {side("player2")}
    </div>

    {view.buzzWinner && <div key={view.event.seq} className={`fd-buzz ${view.buzzWinner}`} role="status"><strong>{names[view.buzzWinner]}</strong><span>Buzz !</span></div>}
    {(view.event.kind === "wrong" || view.event.kind === "strike3") && view.event.player && !view.buzzWinner && phase === "playing"
      && <div key={view.event.seq} className={`fd-flash ${view.event.player}`} aria-hidden="true">
        <FeudStrikes count={view.strikes[view.event.player]} max={view.maxStrikes} />
        {view.event.kind === "strike3" && <strong>{names[view.event.player]} hors manche</strong>}
      </div>}
    {final && view.result && <div className={"fd-final" + (view.result.winner ? ` ${view.result.winner}` : "")} role="status">
      <p className="ay-kicker">{view.title} · score final</p>
      <div className="fd-final-scores">
        {PLAYERS.map(id => <p key={id} className={id}><span>{names[id]}</span><b>{view.totals[id]}</b></p>)}
      </div>
      <strong>{view.result.winner ? `${names[view.result.winner]} l'emporte` : "Égalité parfaite"}</strong>
    </div>}
  </main>;
}
