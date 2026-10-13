import type { PlayerId } from "../../types";
import type { HostView } from "../../ayanokoji/types";
import { formatClock, PHASE_LABEL, useAyanokojiRoom } from "../../ayanokoji/useAyanokojiRoom";
import { AyanokojiBoard, AyanokojiSolution } from "./AyanokojiBoard";
import { AyanokojiTimer, ConnectionNotice, LockIcon, RoundBadge } from "./AyanokojiParts";

const PLAYERS: PlayerId[] = ["player1", "player2"];

/**
 * La régie du présentateur : il voit tout, solution comprise, et pilote la
 * manche. Rien de ce qu'il voit ici n'est envoyé aux joueurs ni au live avant
 * qu'il clique sur Révéler.
 */
export function AyanokojiHost() {
  const { view, status, error, clockOffset, send } = useAyanokojiRoom<HostView>("host");
  if (!view) return <main className="ay-screen ay-host"><ConnectionNotice status={status} error={error} /></main>;
  const { round, phase } = view;
  const can = {
    load: !["playing", "paused", "countdown"].includes(phase),
    start: phase === "ready",
    pause: phase === "playing",
    resume: phase === "paused",
    forceEnd: phase === "playing" || phase === "paused",
    reveal: phase === "locked",
    next: phase === "revealing" || phase === "complete",
  };
  const link = (path: string) => `${window.location.origin}${path}`;

  return <main className="ay-screen ay-host">
    <header className="ay-host-head">
      <div>
        <p className="ay-kicker">Régie · room {view.room}</p>
        <h1>Les Liens d'Ayanokoji</h1>
      </div>
      {round && <RoundBadge round={round} />}
      <AyanokojiTimer timer={view.timer} clockOffset={clockOffset} />
      <p className="ay-phase">{PHASE_LABEL[phase]}</p>
      <button className="ay-button ay-switch" onClick={() => send({ type: "room:game", game: "feud" })}>Passer aux Pensées d'Anya</button>
    </header>
    <ConnectionNotice status={status} error={error} />

    <section className="ay-host-controls" aria-label="Commandes de la manche">
      <button className="ay-button is-primary" disabled={!can.start} onClick={() => send({ type: "ayanokoji:start" })}>Lancer la manche</button>
      <button className="ay-button" disabled={!can.pause} onClick={() => send({ type: "ayanokoji:pause" })}>Pause</button>
      <button className="ay-button" disabled={!can.resume} onClick={() => send({ type: "ayanokoji:resume" })}>Reprendre</button>
      <button className="ay-button" disabled={!can.forceEnd} onClick={() => send({ type: "ayanokoji:force-end" })}>Forcer la fin</button>
      <button className="ay-button is-primary" disabled={!can.reveal} onClick={() => send({ type: "ayanokoji:reveal" })}>Révéler</button>
      <button className="ay-button" disabled={!can.next || (view.lastRound && phase === "complete")} onClick={() => send({ type: "ayanokoji:next" })}>{view.lastRound ? "Terminer l'épreuve" : "Manche suivante"}</button>
    </section>

    <section className="ay-host-rounds" aria-label="Choix de la manche">
      <p className="ay-kicker">Charger une manche</p>
      <div>{view.catalog.map(item => <button key={item.id} className={"ay-button" + (round?.id === item.id ? " is-current" : "")} disabled={!can.load}
        onClick={() => send({ type: "ayanokoji:load", roundId: item.id })}><b>{item.difficulty}{item.level}</b> {item.title}</button>)}</div>
    </section>

    {round && <>
      <div className="ay-host-boards">
        {PLAYERS.map(id => {
          const result = view.results?.[id];
          return <section key={id} className={`ay-side ${id}` + (view.seats[id].submitted ? " is-submitted" : "")}>
            <header className="ay-side-head">
              <h2><i className={"ay-dot" + (view.seats[id].connected ? " is-on" : "")} aria-hidden="true" />{view.names[id]}</h2>
              <p className="ay-score"><b>{view.scores[id]}</b> pts</p>
              <p className="ay-moves"><b>{view.moveCounts[id]}</b> mouvement{view.moveCounts[id] > 1 ? "s" : ""}</p>
            </header>
            <AyanokojiBoard round={round} order={view.orders[id]} correctLinks={result?.correctLinks} revealed={round.links.length} />
            <p className="ay-status">
              {view.seats[id].connected ? "Connecté" : "Déconnecté"} ·{" "}
              {view.seats[id].submitted ? <><LockIcon /> validé à {formatClock(result?.completionTime ?? 0)}</> : "en réflexion"} ·{" "}
              {result ? `${result.correctLinks.filter(Boolean).length}/${result.correctLinks.length} liens${result.perfect ? " · chaîne parfaite" : ""} · ${result.points} pts sur ${view.maxPoints}` : ""}
            </p>
          </section>;
        })}
      </div>
      <section className="ay-host-solution">
        <p className="ay-kicker">Solution (visible ici seulement)</p>
        <AyanokojiSolution round={round} solution={view.solution} />
      </section>
    </>}

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
