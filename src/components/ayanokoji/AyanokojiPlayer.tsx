import { useEffect, useState } from "react";
import type { PlayerId } from "../../types";
import type { PlayerView } from "../../ayanokoji/types";
import { REVEAL_STEP_MS, useAyanokojiRoom, useServerNow } from "../../ayanokoji/useAyanokojiRoom";
import { AyanokojiBoard, AyanokojiSolution } from "./AyanokojiBoard";
import { AyanokojiTimer, ConnectionNotice, Countdown, LockIcon, RoundBadge } from "./AyanokojiParts";

/**
 * L'écran d'un joueur, pensé d'abord pour le téléphone.
 * Chaque échange s'applique tout de suite sur place, puis part au serveur :
 * le joueur n'attend jamais le réseau pour voir sa carte bouger. Il ne reçoit
 * ni le plateau adverse ni la solution : seulement « l'adversaire a validé ».
 */
export function AyanokojiPlayer({ player }: { player: PlayerId }) {
  const { view, status, error, clockOffset, send } = useAyanokojiRoom<PlayerView>(player);
  // L'ordre posé sur place, en attendant que le serveur le confirme
  const [optimistic, setOptimistic] = useState<string[] | null>(null);
  const [confirming, setConfirming] = useState(false);
  const serverOrder = view?.order.join() ?? "";
  const submitted = view?.seats[player].submitted ?? false;
  const playing = view?.phase === "playing";

  useEffect(() => {
    // Le serveur a rattrapé l'ordre local, ou l'a refusé : on se recale sur lui
    setOptimistic(current => (current && (current.join() === serverOrder || !playing || submitted || error) ? null : current));
  }, [serverOrder, playing, submitted, error]);
  useEffect(() => { if (!playing || submitted) setConfirming(false); }, [playing, submitted]);

  const revealing = view?.phase === "revealing" || view?.phase === "complete";
  const now = useServerNow(clockOffset, Boolean(revealing && view?.revealAt));
  const revealed = revealing && view?.revealAt ? Math.floor((now - view.revealAt) / REVEAL_STEP_MS) : 0;

  if (!view) return <main className={`ay-screen ay-player ${player}`}><ConnectionNotice status={status} error={error} /></main>;
  const { round, phase } = view;
  const opponent: PlayerId = player === "player1" ? "player2" : "player1";
  const order = optimistic ?? view.order;
  const reorder = (next: string[]) => { setOptimistic(next); send({ type: "ayanokoji:move", order: next }); };
  const canPlay = playing && !submitted;
  const done = revealed > (round?.links.length ?? 5);

  return <main className={`ay-screen ay-player ${player}` + (submitted ? " is-submitted" : "")}>
    <header className="ay-player-head">
      <div>
        <p className="ay-kicker">Les Liens d'Ayanokoji</p>
        <h1>{view.names[player]}</h1>
      </div>
      {round && <RoundBadge round={round} />}
      <AyanokojiTimer timer={view.timer} clockOffset={clockOffset} />
    </header>
    <ConnectionNotice status={status} error={error} />

    {!round || phase === "waiting" ? <p className="ay-wait">En attente du présentateur…</p> : <>
      <p className={"ay-opponent" + (view.seats[opponent].submitted ? " is-alert" : "")} role="status">
        {revealing ? "Correction" : view.seats[opponent].submitted ? `${view.names[opponent]} a validé` : `${view.names[opponent]} est en réflexion`}
      </p>

      <AyanokojiBoard round={round} order={order} hidden={phase === "ready"} locked={!canPlay}
        onReorder={reorder} correctLinks={view.result?.correctLinks} revealed={revealed} />

      {phase === "ready" && <p className="ay-wait">La manche va commencer. Les six cartes se retournent au signal.</p>}
      {phase === "paused" && <p className="ay-wait">Pause. Le présentateur reprend dans un instant.</p>}

      {canPlay && <footer className="ay-player-actions">
        {confirming ? <>
          <p>Valider définitivement cette chaîne ?</p>
          <button type="button" className="ay-button" onClick={() => setConfirming(false)}>Non, je continue</button>
          <button type="button" className="ay-button is-primary" onClick={() => { setConfirming(false); send({ type: "ayanokoji:submit" }); }}>Oui, je valide</button>
        </> : <>
          <button type="button" className="ay-button" disabled={order.join() === view.initialOrder.join()} onClick={() => reorder(view.initialOrder)}>Recommencer</button>
          <button type="button" className="ay-button is-primary" onClick={() => setConfirming(true)}>Valider</button>
        </>}
      </footer>}

      {submitted && !revealing && phase !== "countdown" && <div className="ay-locked" role="status">
        <LockIcon /><strong>Réponse verrouillée</strong>
        <span>{view.seats[opponent].submitted ? "En attente du présentateur…" : "En attente de l'adversaire…"}</span>
      </div>}
      {!submitted && phase === "locked" && <div className="ay-locked" role="status"><strong>Fin de la manche</strong><span>Le présentateur a arrêté le chrono.</span></div>}

      {phase === "countdown" && view.revealAt && <Countdown revealAt={view.revealAt} clockOffset={clockOffset} />}

      {revealing && done && view.result && view.solution && <div className={"ay-verdict" + (view.result.perfect ? " is-perfect" : "")} role="status">
        <strong>{view.result.perfect ? "Chaîne parfaite" : `${view.result.correctLinks.filter(Boolean).length} lien${view.result.correctLinks.filter(Boolean).length > 1 ? "s" : ""} sur ${view.result.correctLinks.length}`}</strong>
        <p className="ay-points">+{view.result.points} points · total {view.scores[player]}</p>
        <AyanokojiSolution round={round} solution={view.solution} />
      </div>}
    </>}
  </main>;
}
