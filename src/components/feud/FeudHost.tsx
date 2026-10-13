import { useEffect, useState } from "react";
import type { PlayerId } from "../../types";
import type { FeudHostView } from "../../feud/types";
import { FEUD_PHASE_LABEL, useFeud } from "../../feud/useFeud";
import { ConnectionNotice } from "../ayanokoji/AyanokojiParts";
import { FeudStrikes } from "./FeudParts";

const PLAYERS: PlayerId[] = ["player1", "player2"];

/**
 * La régie du présentateur. Lui seul voit les huit réponses et leurs valeurs,
 * et lui seul tranche : le site n'écoute pas les réponses, il les enregistre.
 */
export function FeudHost() {
  const { view, status, error, send } = useFeud<FeudHostView>("host");
  // « Nouvelle partie » efface tout : le bouton demande une confirmation
  const [confirmRestart, setConfirmRestart] = useState(false);
  useEffect(() => {
    if (!confirmRestart) return;
    const timer = window.setTimeout(() => setConfirmRestart(false), 4000);
    return () => window.clearTimeout(timer);
  }, [confirmRestart]);

  if (!view) return <main className="ay-screen ay-host fd-host"><ConnectionNotice status={status} error={error} /></main>;
  const { phase, buzzWinner, names } = view;
  const judging = phase === "buzzLocked" && buzzWinner !== null;
  const inPlay = phase === "waiting" || phase === "playing" || phase === "buzzLocked";
  const link = (path: string) => `${window.location.origin}${path}`;

  return <main className="ay-screen ay-host fd-host">
    <header className="ay-host-head">
      <div>
        <p className="ay-kicker">Régie · room {view.room}</p>
        <h1>{view.title}</h1>
      </div>
      <p className="fd-round">Manche <b>{view.roundNumber}</b>/{view.roundCount}</p>
      <p className="ay-phase">{FEUD_PHASE_LABEL[phase]}</p>
      <button className="ay-button ay-switch" onClick={() => send({ type: "room:game", game: "ayanokoji" })}>Passer aux Liens d'Ayanokoji</button>
    </header>
    <ConnectionNotice status={status} error={error} />

    <p className="fd-host-question">{view.question}</p>

    <p className={"fd-host-turn" + (buzzWinner ? ` ${buzzWinner}` : "")} role="status">
      {judging ? <><strong>{names[buzzWinner]}</strong> a buzzé — clique sa réponse, ou Faux.</>
        : phase === "waiting" ? "Buzzer fermé. Lis la question, puis ouvre le buzzer."
        : phase === "playing" ? (view.buzzOpen ? "Buzzer ouvert : en attente d'un buzz." : "Buzzer fermé par la régie.")
        : phase === "roundEnded" ? "La manche est finie. Révèle les points quand tu veux."
        : phase === "revealingPoints" ? "Les valeurs tombent sur le live…"
        : phase === "roundComplete" ? "Manche comptée. Tu peux lancer la suivante."
        : "Épreuve terminée."}
    </p>

    <section className="fd-host-answers" aria-label="Les huit réponses">
      {view.answers.map(answer => <button key={answer.id} className={"fd-host-answer" + (answer.foundBy ? ` is-found ${answer.foundBy}` : "")}
        disabled={!judging || answer.foundBy !== null} onClick={() => send({ type: "feud:correct", answerId: answer.id })}>
        <span className="fd-rank">{answer.rank}</span>
        <span className="fd-answer"><strong>{answer.label}</strong>{answer.aliases && <em>{answer.aliases.join(" · ")}</em>}</span>
        <span className="fd-owner">{answer.foundBy ? names[answer.foundBy] : ""}</span>
        <span className="fd-value">{answer.points}</span>
      </button>)}
    </section>

    <section className="ay-host-controls" aria-label="Verdict">
      <button className="ay-button fd-wrong" disabled={!judging} onClick={() => send({ type: "feud:wrong" })}>✕ Faux</button>
      <button className="ay-button" disabled={!judging} onClick={() => send({ type: "feud:already" })}>Déjà donnée</button>
      <button className="ay-button" disabled={!view.canUndo} onClick={() => send({ type: "feud:undo" })}>Annuler la dernière action</button>
    </section>

    <section className="ay-host-controls" aria-label="Buzzer et manche">
      <button className="ay-button is-primary" disabled={!(phase === "waiting" || (phase === "playing" && !view.buzzOpen))} onClick={() => send({ type: "feud:buzzer-open" })}>Ouvrir le buzzer</button>
      <button className="ay-button" disabled={!(phase === "playing" && view.buzzOpen)} onClick={() => send({ type: "feud:buzzer-close" })}>Fermer le buzzer</button>
      <button className="ay-button" disabled={phase !== "buzzLocked"} onClick={() => send({ type: "feud:buzzer-reset" })}>Reset buzzer</button>
      <button className="ay-button" disabled={!inPlay} onClick={() => send({ type: "feud:end-round" })}>Forcer la fin de manche</button>
      <button className="ay-button is-primary" disabled={phase !== "roundEnded"} onClick={() => send({ type: "feud:reveal" })}>Révéler les points</button>
      <button className="ay-button" disabled={phase !== "roundComplete"} onClick={() => send({ type: "feud:next" })}>Manche suivante</button>
      <button className="ay-button" onClick={() => { if (confirmRestart) { send({ type: "feud:restart" }); setConfirmRestart(false); } else setConfirmRestart(true); }}>
        {confirmRestart ? "Confirmer : tout effacer" : "Nouvelle partie"}
      </button>
    </section>

    <div className="fd-host-players">
      {PLAYERS.map(id => <section key={id} className={`ay-side ${id}` + (buzzWinner === id ? " is-buzzing" : "")}>
        <h2><i className={"ay-dot" + (view.connected[id] ? " is-on" : "")} aria-hidden="true" />{names[id]}</h2>
        <p className="ay-status">{view.connected[id] ? "Connecté" : "Déconnecté"}{view.strikes[id] >= view.maxStrikes ? " · hors manche" : ""}</p>
        <FeudStrikes count={view.strikes[id]} max={view.maxStrikes} />
        <dl>
          <div><dt>Trouvées</dt><dd>{view.foundCount[id]}</dd></div>
          <div><dt>Manche</dt><dd>{view.roundScore[id]}</dd></div>
          <div><dt>Total</dt><dd>{view.totals[id]}</dd></div>
        </dl>
      </section>)}
    </div>

    {view.result && <p className="fd-host-result" role="status">
      Résultat : {view.result.winner ? `${names[view.result.winner]} gagne` : "égalité"} · {view.result.player1FeudScore} – {view.result.player2FeudScore}
    </p>}

    <section className="ay-host-links">
      <p className="ay-kicker">Liens à ouvrir</p>
      <ul>
        <li><span>Joueur 1</span><code>{link(`/player?room=${view.room}&player=1`)}</code></li>
        <li><span>Joueur 2</span><code>{link(`/player?room=${view.room}&player=2`)}</code></li>
        <li><span>Live (OBS)</span><code>{link(`/live?room=${view.room}`)}</code></li>
      </ul>
    </section>
  </main>;
}
