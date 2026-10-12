import type { CSSProperties } from "react";
import type { Epreuve, GameControls, LogicCharacter } from "../types";
import { currentFeedback } from "../duel/engine";
import { placeCard, validateChain } from "../duel/logicSolver";
import { EpreuveLogo } from "./EpreuveLogo";

interface Props extends GameControls { epreuve: Epreuve }

export function LogicLinksPlayer({ epreuve, progress, onEdit, onValidate, onNext }: Props) {
  const puzzle = epreuve.logicPuzzles?.[progress.roundIndex];
  if (!puzzle) return <p className="duel-notice">Aucun puzzle disponible pour cette classe.</p>;
  const placements = progress.placements.length ? progress.placements : Array<string>(6).fill("");
  const result = currentFeedback(progress);
  const selectedId = progress.selectedId;
  const getCharacter = (id: string) => puzzle.characters.find(character => character.id === id);
  const available = puzzle.characters.filter(character => !placements.includes(character.id));
  const selected = selectedId ? getCharacter(selectedId) : null;
  const placed = placements.filter(Boolean).length;
  const missing = placements.length - placed;

  function slotClick(index: number) {
    if (result) return;
    if (selectedId) onEdit({ placements: placeCard(placements, selectedId, index), selectedId: null });
    else if (placements[index]) onEdit({ selectedId: placements[index] });
  }
  function validate() {
    if (result || !placements.every(Boolean)) return;
    const evaluation = validateChain(puzzle!, placements);
    onValidate({ roundId: puzzle!.id, ...evaluation,
      points: evaluation.correctSlots.filter(Boolean).length * 100, answer: placements });
  }

  return <div className="screen links-session">
    <div className="links-bg" aria-hidden />
    <header className="links-header">
      <div className="links-title-lockup"><div className="links-title-logo"><EpreuveLogo epreuveId={epreuve.id} /></div>
        <div><p className="links-kicker">Déduction · Manche {progress.roundIndex + 1}/{epreuve.logicPuzzles?.length}</p><h1>{puzzle.title}</h1><p>{puzzle.intro}</p></div>
      </div>
      <div className="links-meter" role="img" aria-label={`${placed} cartes placées sur ${placements.length}`}>
        <strong>{placed}<small>/{placements.length}</small></strong>
        <span>{placements.map((id, index) => <i key={index} className={id ? "links-meter-on" : ""} />)}</span>
      </div>
    </header>
    <details className="links-howto">
      <summary>Comment jouer</summary>
      <p className="links-instructions">Sélectionne une carte, puis n'importe quelle case. Pour déplacer ou échanger deux cartes, sélectionne une case occupée puis une autre. Tu peux commencer où tu veux. 100 points par position correcte.</p>
    </details>
    <main className="links-board">
      <div className="links-board-heading"><span>Une seule chaîne parfaite</span><p aria-live="polite">{result ? "Correction de ta proposition" : selected ? `${selected.name} : choisis sa position.` : "Les six cases sont accessibles."}</p></div>
      <div className={"links-chain" + (selectedId && !result ? " links-chain-armed" : "")}>
        {placements.map((id, index) => {
          const character = getCharacter(id);
          const rule = puzzle.rules[index];
          const position = { ["--i" as string]: index } as CSSProperties;
          return [
            <div className="links-slot-wrap" key={`slot-${index}`} style={position}>
              <button disabled={Boolean(result)} aria-label={`Case ${index + 1}${character ? ` : ${character.name}` : " vide"}`}
                aria-pressed={Boolean(id && selectedId === id)}
                className={"links-slot" + (id ? " links-slot-filled" : "") + (id && selectedId === id ? " links-card-selected" : "") + (result ? (result.correctSlots?.[index] ? " links-slot-correct" : " links-slot-wrong") : "")}
                onClick={() => slotClick(index)}>
                <span className="links-slot-number">{index + 1}</span>
                {character ? <CharacterCard character={character} compact /> : <span className="links-slot-empty">{selectedId ? "Placer ici" : "Case libre"}</span>}
                {result && <span className="links-position-status">{result.correctSlots?.[index] ? "✓ Bien placé" : "✕ À déplacer"}</span>}
              </button>
              {id && !result && <button className="duel-text-button" aria-label={`Retirer ${character?.name}`} onClick={() => onEdit({ placements: placements.map((value, i) => index === i ? "" : value), selectedId: null })}>Retirer</button>}
            </div>,
            rule && <div className={"links-rule" + (result ? (result.correctLinks?.[index] ? " links-rule-valid" : " links-rule-invalid") : "")} key={`rule-${index}`} style={position}>
              <span>Lien {index + 1} · {rule.direction === "both" ? "↔ Deux sens" : "→ Gauche à droite"}</span><p>{rule.text}</p>
              {result && <b className={result.correctLinks?.[index] ? "links-valid" : "links-invalid"}>{result.correctLinks?.[index] ? "✓ Relation valide" : "✕ Relation invalide"}</b>}
            </div>,
          ];
        })}
      </div>
      {!result && <section className="links-deck" aria-label="Réserve de cartes">
        <div className="links-panel-heading"><span>Ta main</span><strong>{available.length} disponible{available.length > 1 ? "s" : ""}</strong></div>
        {available.length ? <div className="links-card-list">
          {available.map(character => <button key={character.id} disabled={Boolean(result)}
            className={"links-card" + (selectedId === character.id ? " links-card-selected" : "")}
            aria-pressed={selectedId === character.id}
            onClick={() => onEdit({ selectedId: selectedId === character.id ? null : character.id })}>
            <CharacterCard character={character} />
          </button>)}
        </div> : <p className="links-deck-empty">Toutes les cartes sont posées.</p>}
      </section>}
      <div className="links-actions">
        {!result && <p className="links-helper" role="status">{missing ? `Encore ${missing} carte${missing > 1 ? "s" : ""} à poser avant de valider.` : "La chaîne est complète : tu peux valider."}</p>}
        <button className="links-secondary" disabled={Boolean(result)} onClick={() => onEdit({ placements: Array<string>(6).fill(""), selectedId: null })}>Réinitialiser</button>
        {!result ? <button className="links-primary" disabled={!placements.every(Boolean)} onClick={validate}>Valider la chaîne</button>
          : <button className="links-primary" onClick={onNext}>{progress.roundIndex === (epreuve.logicPuzzles?.length ?? 0) - 1 ? "Terminer l'épreuve" : "Manche suivante"}</button>}
      </div>
      {result && <section className="links-feedback" aria-live="polite">
        <strong>{result.correct ? "Chaîne parfaite !" : `${result.correctSlots?.filter(Boolean).length}/6 positions correctes`}</strong>
        <span>+{result.points} points · {result.correctLinks?.filter(Boolean).length}/5 relations valides</span>
        <h2>La chaîne parfaite</h2>
        <ol className="links-solution">
          {puzzle.solutionIds.map((id, index) => <li key={id}><strong>{getCharacter(id)?.name}</strong>
            {puzzle.rules[index] && <p>{puzzle.rules[index].direction === "both" ? "↔" : "→"} {puzzle.rules[index].explanation}</p>}
          </li>)}
        </ol>
      </section>}
    </main>
  </div>;
}

function CharacterCard({ character, compact = false }: { character: LogicCharacter; compact?: boolean }) {
  return <span className={"links-character" + (compact ? " links-character-compact" : "")}>
    {character.imageSrc && <img src={character.imageSrc} alt="" />}
    <strong>{character.name}</strong><em>{character.anime}</em>
  </span>;
}
