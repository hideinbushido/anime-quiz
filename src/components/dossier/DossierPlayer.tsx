import { useEffect, useMemo, useState } from "react";
import type { PlayerId } from "../../types";
import type { DossierPlayerView, RosterEntry } from "../../dossier/types";
import { searchRoster } from "../../dossier/engine";
import { outcomeLabel, useDossier } from "../../dossier/useDossier";
import { ConnectionNotice } from "../ayanokoji/AyanokojiParts";
import { CamToggle } from "../realtime/CamToggle";
import { StageFx } from "../fx/StageFx";
import { DossierAvatar, DossierScore, DossierTarget, DossierTurnBlock } from "./DossierParts";

/**
 * L'écran d'un joueur, pensé pour le téléphone : chercher un personnage,
 * valider, attendre l'adversaire. Les cases n'arrivent que lorsque les deux
 * ont validé, et la ligne adverse arrive en même temps que la sienne.
 */
export function DossierPlayer({ player }: { player: PlayerId }) {
  const { view, roster, status, error, send } = useDossier<DossierPlayerView>(player);
  const [query, setQuery] = useState("");
  const [choice, setChoice] = useState<RosterEntry | null>(null);
  const suggestions = useMemo(() => (!choice ? searchRoster(roster, query) : []), [roster, query, choice]);
  // Un nouveau tour, ou un nouveau round : le champ repart vide
  const turnKey = `${view?.roundNumber}-${view?.turns.length}-${view?.phase}`;
  useEffect(() => { setQuery(""); setChoice(null); }, [turnKey]);

  if (!view) return <main className={`ay-screen ds-player ${player}`}><ConnectionNotice status={status} error={error} /></main>;
  const { phase, names, universe } = view;
  const opponent: PlayerId = player === "player1" ? "player2" : "player1";
  const locked = view.myGuess ? roster.find(entry => entry.id === view.myGuess) ?? { id: view.myGuess, name: "Proposition" } : undefined;
  const tried = new Set(view.turns.map(turn => turn.guesses[player].characterId));
  const turns = [...view.turns].reverse();

  const state = phase === "finished" ? "Épreuve terminée"
    : phase === "debrief" ? "Round terminé"
    : phase === "intro" ? "En attente du présentateur"
    : locked ? (view.locked[opponent] ? "Révélation" : "En attente de l'adversaire")
    : "Choisis un personnage";

  return <main className={`ay-screen ds-player ${player}`}>
    <header className="ds-player-head">
      <p className="ay-kicker">{view.title} · {universe.name}</p>
      <p className="fd-round">Round <b>{view.roundNumber}</b>/{view.roundCount}</p>
      <DossierScore names={names} wins={view.wins} draws={view.draws} />
    </header>
    <StageFx density={0.5} />
    <ConnectionNotice status={status} error={error} />
    <CamToggle />

    <p className={"ds-state" + (locked ? " is-locked" : "")} role="status">{state}</p>

    {phase === "guessing" && (locked ? <div className="ds-lockbox">
      <DossierAvatar name={locked.name} image={locked.image} />
      <p><strong>{locked.name}</strong><span>Proposition verrouillée</span></p>
    </div> : <form className="ds-search" onSubmit={event => { event.preventDefault(); if (choice && view.canGuess) send({ type: "dossier:guess", characterId: choice.id }); }}>
      <label htmlFor="ds-query">Ton personnage</label>
      <input id="ds-query" type="search" autoComplete="off" autoCapitalize="none" spellCheck={false} placeholder={`Un personnage de ${universe.name}`}
        value={choice ? choice.name : query} onChange={event => { setChoice(null); setQuery(event.target.value); }} />
      {suggestions.length > 0 && <ul className="ds-suggestions">
        {suggestions.map(entry => <li key={entry.id}>
          <button type="button" disabled={tried.has(entry.id)} onClick={() => setChoice(entry)}>
            <DossierAvatar name={entry.name} image={entry.image} />{entry.name}{tried.has(entry.id) && <small>déjà proposé</small>}
          </button>
        </li>)}
      </ul>}
      {!choice && query.trim() !== "" && suggestions.length === 0 && <p className="ds-none">Aucun personnage à ce nom dans {universe.name}.</p>}
      <button className="ay-button is-primary" disabled={!choice || !view.canGuess}>{choice ? `Valider ${choice.name}` : "Valider"}</button>
    </form>)}

    {phase === "debrief" && view.target && <>
      <p className="ds-outcome" role="status">{view.outcome === player ? "Tu as trouvé !" : outcomeLabel(view.outcome, names)}</p>
      <DossierTarget target={view.target} kicker="Le personnage mystère" />
    </>}
    {phase === "finished" && view.result && <p className="ds-outcome" role="status">
      {view.result.winner === null ? "Égalité" : view.result.winner === player ? "Tu gagnes l'épreuve" : `${names[opponent]} gagne l'épreuve`} · {view.wins[player]} – {view.wins[opponent]}
    </p>}
    {phase === "intro" && !universe.ready && <p className="ds-none">{universe.name} n'est pas encore disponible.</p>}

    {/* Sur grand écran, les propositions s'alignent comme sur le live, sous les titres de colonnes */}
    {turns.length > 0 && <div className="ds-row ds-columns" aria-hidden="true">
      <span>Proposition</span>
      <ul className="ds-cells">{universe.attributes.map(attribute => <li key={attribute.key}>{attribute.label}</li>)}</ul>
    </div>}
    {turns.length > 0 && <ol className="ds-history">
      {turns.map(turn => <DossierTurnBlock key={turn.number} turn={turn} attributes={universe.attributes} names={names} first={player} labelled fresh={turn.number === view.turns.length} />)}
    </ol>}
  </main>;
}
