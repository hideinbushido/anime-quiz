import { useCallback, useEffect, useState } from "react";
import type { PlayerId } from "../../types";
import type { FeudPlayerView } from "../../feud/types";
import { useFeud } from "../../feud/useFeud";
import { ConnectionNotice } from "../ayanokoji/AyanokojiParts";
import { FeudStrikes } from "./FeudParts";

/**
 * Le téléphone du joueur : un buzzer, ses erreurs, ses réponses trouvées.
 * Le tableau se regarde sur le live ; rien de ce qui s'y cache n'arrive ici.
 */
export function FeudPlayer({ player }: { player: PlayerId }) {
  const { view, status, error, send } = useFeud<FeudPlayerView>(player);
  // Le bouton réagit sous le doigt sans attendre le serveur, qui reste seul juge du premier buzz
  const [pressed, setPressed] = useState(false);
  const canBuzz = view?.canBuzz ?? false;
  const buzz = useCallback(() => {
    // Un appui, un envoi : le doigt qui reste posé ou le clic qui suit ne rebuzzent pas
    if (!canBuzz || pressed) return;
    setPressed(true);
    send({ type: "buzzer:press" });
  }, [canBuzz, pressed, send]);
  useEffect(() => { if (!canBuzz) setPressed(false); }, [canBuzz]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code !== "Space" || event.repeat) return;
      event.preventDefault();
      buzz();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [buzz]);

  if (!view) return <main className={`ay-screen fd-player ${player}`}><ConnectionNotice status={status} error={error} /></main>;
  const opponent: PlayerId = player === "player1" ? "player2" : "player1";
  const { phase } = view;
  const out = view.strikes[player] >= view.maxStrikes;
  const over = ["roundEnded", "revealingPoints", "roundComplete", "gameComplete"].includes(phase);
  const mine = view.buzzWinner === player;

  const [label, hint, tone] = phase === "gameComplete" ? ["Épreuve terminée", "Le score final est sur le live.", "is-over"]
    : over ? ["Manche terminée", phase === "roundEnded" ? "Les points arrivent sur le live…" : "Regarde le live.", "is-over"]
    : out ? ["3 strikes", "Hors manche", "is-out"]
    : mine ? ["Tu as buzzé !", "Donne ta réponse à voix haute.", "is-mine"]
    : view.buzzWinner ? [`${view.names[opponent]} a buzzé`, "En attente du présentateur…", "is-theirs"]
    : view.canBuzz ? ["Buzzer ouvert", "Premier arrivé, premier servi.", "is-open"]
    : ["Buzzer fermé", "En attente du présentateur…", "is-closed"];

  return <main className={`ay-screen fd-player ${player} ${tone}`}>
    <header className="fd-player-head">
      <h1>{view.names[player]}</h1>
      <p className="ay-kicker">{view.title}</p>
      <p className="fd-round">Manche <b>{view.roundNumber}</b>/{view.roundCount}</p>
    </header>
    <ConnectionNotice status={status} error={error} />

    <dl className="fd-player-stats">
      <div><dt>Strikes</dt><dd><FeudStrikes count={view.strikes[player]} max={view.maxStrikes} /></dd></div>
      <div><dt>Réponses trouvées</dt><dd><b>{view.foundCount[player]}</b></dd></div>
      {(view.roundNumber > 1 || phase === "roundComplete" || phase === "gameComplete") && <div><dt>Total</dt><dd><b>{phase === "revealingPoints" ? "…" : view.totals[player]}</b></dd></div>}
    </dl>

    <button type="button" className={"fd-buzzer" + (pressed || mine ? " is-pressed" : "")} disabled={!view.canBuzz} onPointerDown={buzz} onClick={buzz}>Buzz</button>

    <p className="fd-player-state" role="status"><strong>{label}</strong><span>{hint}</span></p>
    {phase === "gameComplete" && view.result && <p className="fd-player-result">
      {view.result.winner === null ? "Égalité" : view.result.winner === player ? "Tu gagnes l'épreuve" : `${view.names[opponent]} gagne l'épreuve`}
      <b>{view.totals[player]} – {view.totals[opponent]}</b>
    </p>}
  </main>;
}
