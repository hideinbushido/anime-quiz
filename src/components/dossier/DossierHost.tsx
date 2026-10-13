import { useEffect, useState } from "react";
import type { PlayerId } from "../../types";
import type { DossierHostView } from "../../dossier/types";
import { DOSSIER_PHASE_LABEL, outcomeLabel, useDossier } from "../../dossier/useDossier";
import { ConnectionNotice } from "../ayanokoji/AyanokojiParts";
import { GameSwitch } from "../realtime/GameSwitch";
import { DossierScore, DossierTarget, DossierTurnBlock } from "./DossierParts";

const PLAYERS: PlayerId[] = ["player1", "player2"];

/**
 * La régie du présentateur. Lui seul connaît le personnage mystère pendant le
 * round, et voit les propositions verrouillées avant qu'elles soient révélées.
 */
export function DossierHost() {
  const { view, status, error, send } = useDossier<DossierHostView>("host");
  const [confirmRestart, setConfirmRestart] = useState(false);
  useEffect(() => {
    if (!confirmRestart) return;
    const timer = window.setTimeout(() => setConfirmRestart(false), 4000);
    return () => window.clearTimeout(timer);
  }, [confirmRestart]);

  if (!view) return <main className="ay-screen ay-host ds-host"><ConnectionNotice status={status} error={error} /></main>;
  const { phase, names, universe } = view;
  const link = (path: string) => `${window.location.origin}${path}`;
  const lastRound = view.roundNumber >= view.roundCount;
  const turns = [...view.turns].reverse();

  return <main className="ay-screen ay-host ds-host">
    <header className="ay-host-head">
      <div>
        <p className="ay-kicker">Régie · room {view.room}</p>
        <h1>{view.title}</h1>
      </div>
      <p className="fd-round">Round <b>{view.roundNumber}</b>/{view.roundCount} · {universe.name}</p>
      <p className="ay-phase">{DOSSIER_PHASE_LABEL[phase]}</p>
    </header>
    <GameSwitch />
    <ConnectionNotice status={status} error={error} />

    <p className="fd-host-turn" role="status">
      {phase === "intro" ? (universe.ready ? "Choisis la cible (ou laisse le hasard faire), puis démarre le round." : `${universe.name} n'a pas encore de colonnes ni de personnages : passe au round suivant.`)
        : phase === "guessing" ? "Les joueurs proposent. Le tour se révèle dès que les deux ont validé."
        : phase === "debrief" ? `${outcomeLabel(view.outcome, names)}. Commente, puis passe au round suivant.`
        : "Les cinq rounds sont joués."}
    </p>

    <section className="ay-host-controls" aria-label="Commandes du round">
      {phase === "intro" && universe.ready && <label className="ds-pick">Cible
        <select value={view.secretTarget?.id ?? ""} onChange={event => send({ type: "dossier:target", characterId: event.target.value || null })}>
          <option value="">Au hasard</option>
          {view.roster.map(entry => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
        </select>
      </label>}
      <button className="ay-button is-primary" disabled={phase !== "intro" || !universe.ready} onClick={() => send({ type: "dossier:start" })}>Démarrer le round</button>
      <button className="ay-button" disabled={phase !== "guessing"} onClick={() => send({ type: "dossier:end-round" })}>Terminer le round</button>
      <button className="ay-button is-primary" disabled={!(phase === "debrief" || (phase === "intro" && !universe.ready))} onClick={() => send({ type: "dossier:next" })}>{lastRound ? "Afficher le bilan" : "Round suivant"}</button>
      <button className="ay-button" disabled={!view.canUndo} onClick={() => send({ type: "dossier:undo" })}>Annuler la dernière action</button>
      <button className="ay-button" onClick={() => { if (confirmRestart) { send({ type: "dossier:restart" }); setConfirmRestart(false); } else setConfirmRestart(true); }}>
        {confirmRestart ? "Confirmer : tout effacer" : "Nouvelle partie"}
      </button>
    </section>

    <div className="fd-host-players">
      {PLAYERS.map(id => <section key={id} className={`ay-side ${id}`}>
        <h2><i className={"ay-dot" + (view.connected[id] ? " is-on" : "")} aria-hidden="true" />{names[id]}</h2>
        <p className="ay-status">{view.connected[id] ? "Connecté" : "Déconnecté"}</p>
        <p className={"ds-pending" + (view.locked[id] ? " is-locked" : "")}>
          {phase !== "guessing" ? "—" : view.locked[id] ? <>✓ Proposition verrouillée : <b>{view.pending[id]?.name}</b></> : "En attente…"}
        </p>
        <dl>
          <div><dt>Rounds gagnés</dt><dd>{view.wins[id]}</dd></div>
          <div><dt>Essais</dt><dd>{view.turns.length}</dd></div>
        </dl>
      </section>)}
    </div>

    {view.secretTarget && <DossierTarget target={view.secretTarget} kicker={phase === "guessing" || phase === "intro" ? "Cible (visible ici seulement)" : "Cible"} />}

    <DossierScore names={names} wins={view.wins} draws={view.draws} />
    <ol className="ds-rounds">{view.rounds.map((round, index) => <li key={index} className={index + 1 === view.roundNumber && phase !== "finished" ? "is-current" : ""}>
      <span>{index + 1}. {round.universe}</span><b>{round.outcome ? outcomeLabel(round.outcome, names) : ""}</b>
    </li>)}</ol>

    {turns.length > 0 && <ol className="ds-history">
      {turns.map(turn => <DossierTurnBlock key={turn.number} turn={turn} attributes={universe.attributes} names={names} labelled />)}
    </ol>}

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
