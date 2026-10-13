import type { PlayerId } from "../../types";
import { useRoom } from "../../realtime/roomContext";
import type { DossierLiveView } from "../../dossier/types";
import { outcomeLabel, useDossier } from "../../dossier/useDossier";
import { ConnectionNotice } from "../ayanokoji/AyanokojiParts";
import { DossierScore, DossierTarget, DossierTurnBlock } from "./DossierParts";
import { StageFx, type FxBurst } from "../fx/StageFx";
import { PlayerFrame } from "../realtime/PlayerFrame";

const PLAYERS: PlayerId[] = ["player1", "player2"];

/**
 * L'écran du live. Chaque tour occupe toute la largeur, une ligne par joueur :
 * huit cases restent lisibles dans un flux vidéo. Le tour le plus récent est
 * toujours en haut ; les plus anciens glissent vers le bas et s'effacent.
 */
export function DossierLive() {
  const { view, status, error } = useDossier<DossierLiveView>("live");
  const { info } = useRoom();
  if (!view) return <main className="ay-screen ds-live"><ConnectionNotice status={status} error={error} /></main>;
  const { phase, names, universe } = view;
  const turns = [...view.turns].reverse();
  const winner = view.outcome === "player1" || view.outcome === "player2" ? view.outcome : null;
  const burst: FxBurst | null = phase === "finished" ? { key: "final", tone: view.result?.winner ?? "gold", from: "rain" }
    : phase === "debrief" && winner ? { key: `round${view.roundNumber}`, tone: winner, from: winner === "player1" ? "left" : "right" } : null;

  return <main className={`ay-screen ds-live phase-${phase}`}>
    <header className="ds-head">
      <img className="ay-live-logo" src="/logos-epreuves/le-dossier-de-l.webp" alt="" />
      <div>
        <p className="ay-kicker">{view.title}</p>
        <h1>{universe.name}</h1>
      </div>
      <p className="fd-round">Round <b>{view.roundNumber}</b>/{view.roundCount}</p>
      <DossierScore names={names} wins={view.wins} draws={view.draws} />
    </header>
    <StageFx burst={burst} />
    <ConnectionNotice status={status} error={error} />

    {phase === "finished" && view.result ? <div className={"ds-final" + (view.result.winner ? ` ${view.result.winner}` : "")}>
      <p className="ay-kicker">{view.title} · bilan</p>
      <div className="fd-final-scores">{PLAYERS.map(id => <p key={id} className={id}><span>{names[id]}</span><b>{view.wins[id]}</b></p>)}</div>
      <strong>{view.result.winner ? `${names[view.result.winner]} l'emporte` : "Égalité parfaite"}</strong>
      <ol className="ds-recap">{view.rounds.map((round, index) => <li key={index} className={round.outcome === "player1" || round.outcome === "player2" ? round.outcome : ""}>
        <span>Round {index + 1} · {round.universe}</span><b>{outcomeLabel(round.outcome, names).replace(" a trouvé", "")}</b>
      </li>)}</ol>
    </div> : <>
      {phase === "debrief" && view.target && <div className={"ds-debrief" + (winner ? ` ${winner}` : "")}>
        <p className="ds-outcome" role="status">{outcomeLabel(view.outcome, names)}</p>
        <DossierTarget target={view.target} kicker="Le personnage mystère" />
      </div>}

      {phase === "guessing" && <div className="ds-locks" role="status">
        {PLAYERS.map(id => <p key={id} className={id + (view.locked[id] ? " is-locked" : "")}><PlayerFrame player={id} name={names[id]} image={info?.avatars[id] ?? null} /><strong>{names[id]}</strong>{view.locked[id] ? "Proposition verrouillée" : "Réfléchit…"}</p>)}
      </div>}

      {phase === "intro" && <p className="ay-wait">{universe.ready ? `Round ${view.roundNumber} : un personnage de ${universe.name} à démasquer` : `${universe.name} : bientôt disponible`}</p>}

      {turns.length > 0 && <>
        {/* Les titres de colonnes reprennent la grille d'une ligne, pour tomber pile au-dessus des cases */}
        <div className="ds-row ds-columns" aria-hidden="true">
          <span>Proposition</span>
          <ul className="ds-cells">{universe.attributes.map(attribute => <li key={attribute.key}>{attribute.label}</li>)}</ul>
        </div>
        <ol className="ds-history">
          {turns.map(turn => <DossierTurnBlock key={turn.number} turn={turn} attributes={universe.attributes} names={names} fresh={turn.number === view.turns.length && phase !== "finished"} />)}
        </ol>
      </>}
      {phase === "guessing" && turns.length === 0 && <p className="ay-wait">Les deux joueurs choisissent leur première proposition…</p>}
    </>}
  </main>;
}
