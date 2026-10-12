import type { PlayerId } from "../../types";
import type { LiveView } from "../../ayanokoji/types";
import { REVEAL_STEP_MS, PHASE_LABEL, useAyanokojiRoom, useServerNow } from "../../ayanokoji/useAyanokojiRoom";
import { ROUNDS_PER_EPREUVE } from "../../ayanokoji/scoring";
import { EpreuveLogo } from "../EpreuveLogo";
import { AyanokojiBoard, AyanokojiSolution } from "./AyanokojiBoard";
import { AyanokojiTimer, ConnectionNotice, Countdown, LockIcon, RoundBadge } from "./AyanokojiParts";

const PLAYERS: PlayerId[] = ["player1", "player2"];

/**
 * L'écran du LIVE, à capturer dans OBS : 16:9, sans défilement, sans aucun
 * contrôle. Les deux plateaux côte à côte, chaque mouvement animé au moment où
 * le joueur le fait. Il ne reçoit la solution qu'à la révélation.
 */
export function AyanokojiLive({ room }: { room: string }) {
  const { view, status, error, clockOffset } = useAyanokojiRoom<LiveView>(room, "live");
  const revealing = view?.phase === "revealing" || view?.phase === "complete";
  const now = useServerNow(clockOffset, Boolean(revealing && view?.revealAt));
  const revealed = revealing && view?.revealAt ? Math.floor((now - view.revealAt) / REVEAL_STEP_MS) : 0;

  if (!view) return <main className="ay-screen ay-live"><ConnectionNotice status={status} error={error} /></main>;
  const { round, phase } = view;
  const done = revealed > (round?.links.length ?? 5);

  return <main className={"ay-screen ay-live phase-" + phase}>
    <header className="ay-live-head">
      <div className="ay-live-logo"><EpreuveLogo epreuveId="liens-ayanokoji" /></div>
      <div className="ay-live-title">
        <p className="ay-kicker">{round ? round.title : PHASE_LABEL[phase]}</p>
        <h1>Les Liens d'Ayanokoji</h1>
      </div>
      {round && <RoundBadge round={round} />}
      {round && <p className="ay-round-count">Manche {round.level}/{ROUNDS_PER_EPREUVE}<span>{view.maxPoints} pts en jeu</span></p>}
      <AyanokojiTimer timer={view.timer} clockOffset={clockOffset} />
    </header>
    <ConnectionNotice status={status} error={error} />

    {!round ? <p className="ay-wait">La manche arrive…</p> : <div className="ay-duel">
      {PLAYERS.map(id => {
        const result = view.results?.[id];
        const moves = view.moveCounts[id];
        return <section key={id} className={`ay-side ${id}` + (view.seats[id].submitted ? " is-submitted" : "") + (done && result?.perfect ? " is-perfect" : "")}>
          <header className="ay-side-head">
            <h2>{view.names[id]}</h2>
            <p className="ay-score" aria-label={`${view.scores[id]} points`}><b key={view.scores[id]}>{view.scores[id]}</b> pts</p>
            <p className="ay-moves"><b key={moves}>{moves}</b> mouvement{moves > 1 ? "s" : ""}</p>
          </header>
          <AyanokojiBoard round={round} order={view.orders[id]} hidden={phase === "ready"} correctLinks={result?.correctLinks} revealed={revealed} />
          <p className="ay-status" role="status">
            {done && result ? <>{result.perfect ? "Chaîne parfaite" : `${result.correctLinks.filter(Boolean).length} lien${result.correctLinks.filter(Boolean).length > 1 ? "s" : ""} sur ${result.correctLinks.length}`} <em className="ay-gain">+{result.points}</em></>
              : view.seats[id].submitted ? <><LockIcon /> {view.names[id]} a validé</>
              : phase === "playing" ? "En réflexion"
              : phase === "paused" ? "Pause"
              : phase === "ready" ? "Prêt"
              : !view.seats[id].connected ? "Déconnecté" : "Temps écoulé"}
          </p>
        </section>;
      })}
      <div className="ay-duel-blade" aria-hidden="true"><img src="/logo-zenkai.png" alt="" /></div>
    </div>}

    {round && done && view.solution && <footer className="ay-live-solution">
      <p className="ay-kicker">La chaîne parfaite</p>
      <AyanokojiSolution round={round} solution={view.solution} />
    </footer>}
    {phase === "countdown" && view.revealAt && <Countdown revealAt={view.revealAt} clockOffset={clockOffset} />}
  </main>;
}
