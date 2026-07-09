import { useEffect, useMemo, useState } from "react";
import type { Epreuve, EpreuveResult, LogicCharacter } from "../types";

const POINTS_PAR_CASE = 100;

interface Props {
  epreuve: Epreuve;
  onComplete: (result: EpreuveResult) => void;
}

interface RoundResult {
  correctSlots: boolean[];
  correctCount: number;
  earned: number;
  totalAfterRound: number;
}

export function LogicLinksPlayer({ epreuve, onComplete }: Props) {
  const puzzles = epreuve.logicPuzzles ?? [];
  const [puzzleIndex, setPuzzleIndex] = useState(0);
  const puzzle = puzzles[puzzleIndex];
  const [placements, setPlacements] = useState<string[]>(() =>
    Array(puzzle?.solutionIds.length ?? 0).fill("")
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [points, setPoints] = useState(0);
  const [roundResult, setRoundResult] = useState<RoundResult | null>(null);

  useEffect(() => {
    setPlacements(Array(puzzle?.solutionIds.length ?? 0).fill(""));
    setSelectedId(null);
    setRoundResult(null);
  }, [puzzle?.id, puzzle?.solutionIds.length]);

  const charactersById = useMemo(() => {
    return new Map((puzzle?.characters ?? []).map((character) => [character.id, character]));
  }, [puzzle?.characters]);

  if (!puzzle) {
    return (
      <div className="screen links-session">
        <section className="links-empty">
          <h1>{epreuve.nom}</h1>
          <p>Les manches de cette epreuve arrivent bientot.</p>
          <button
            className="links-primary"
            onClick={() =>
              onComplete({
                epreuveId: epreuve.id,
                points: 0,
                bonusIndiceUtilise: false,
                bonusDoubleUtilise: false,
              })
            }
          >
            Terminer l'epreuve
          </button>
        </section>
      </div>
    );
  }

  const isLastPuzzle = puzzleIndex === puzzles.length - 1;
  const availableCharacters = puzzle.characters.filter(
    (character) => !placements.includes(character.id)
  );
  const isComplete = placements.every(Boolean);

  function getCharacter(id: string) {
    return charactersById.get(id);
  }

  function handleSelectCard(id: string) {
    if (roundResult) return;
    setSelectedId((current) => (current === id ? null : id));
  }

  function handleSlotClick(index: number) {
    if (roundResult) return;

    const currentId = placements[index];
    if (!selectedId) {
      if (!currentId) return;
      setPlacements((current) => current.map((id, i) => (i === index ? "" : id)));
      setSelectedId(currentId);
      return;
    }

    setPlacements((current) => {
      const next = current.map((id) => (id === selectedId ? "" : id));
      next[index] = selectedId;
      return next;
    });
    setSelectedId(currentId || null);
  }

  function resetRound() {
    if (roundResult) return;
    setPlacements(Array(puzzle.solutionIds.length).fill(""));
    setSelectedId(null);
  }

  function validateRound() {
    if (!isComplete || roundResult) return;

    const correctSlots = placements.map((id, index) => id === puzzle.solutionIds[index]);
    const correctCount = correctSlots.filter(Boolean).length;
    const earned = correctCount * POINTS_PAR_CASE;
    const totalAfterRound = points + earned;
    setPoints(totalAfterRound);
    setRoundResult({ correctSlots, correctCount, earned, totalAfterRound });
    setSelectedId(null);
  }

  function handleNext() {
    if (!roundResult) return;

    if (isLastPuzzle) {
      onComplete({
        epreuveId: epreuve.id,
        points: roundResult.totalAfterRound,
        bonusIndiceUtilise: false,
        bonusDoubleUtilise: false,
      });
      return;
    }

    setPuzzleIndex((current) => current + 1);
  }

  return (
    <div className="screen links-session">
      <div className="links-bg" aria-hidden />

      <header className="links-header">
        <div>
          <p className="links-kicker">Placement logique</p>
          <h1>{epreuve.nom}</h1>
          <span>
            Manche {puzzleIndex + 1}/{puzzles.length}
          </span>
        </div>

        <div className="links-score">
          <span>Score</span>
          <strong>{points}</strong>
        </div>
      </header>

      <main className="links-layout">
        <aside className="links-deck">
          <div className="links-panel-heading">
            <span>Cartes</span>
            <strong>{availableCharacters.length} dispo</strong>
          </div>

          <div className="links-card-list">
            {availableCharacters.map((character) => (
              <button
                key={character.id}
                className={
                  "links-card" + (selectedId === character.id ? " links-card-selected" : "")
                }
                onClick={() => handleSelectCard(character.id)}
              >
                <CharacterCard character={character} />
              </button>
            ))}
          </div>
        </aside>

        <section className="links-board">
          <div className="links-board-heading">
            <span>{puzzle.title}</span>
            <p>{puzzle.intro}</p>
          </div>

          <div className="links-chain">
            {puzzle.solutionIds.map((_, index) => {
              const placedCharacter = placements[index] ? getCharacter(placements[index]) : null;
              const isCorrect = roundResult?.correctSlots[index] ?? false;
              const isWrong = Boolean(roundResult && !isCorrect);

              return (
                <div className="links-chain-step" key={index}>
                  <button
                    className={
                      "links-slot" +
                      (placedCharacter ? " links-slot-filled" : "") +
                      (isCorrect ? " links-slot-correct" : "") +
                      (isWrong ? " links-slot-wrong" : "")
                    }
                    onClick={() => handleSlotClick(index)}
                  >
                    <span className="links-slot-number">{index + 1}</span>
                    {placedCharacter ? (
                      <CharacterCard character={placedCharacter} compact />
                    ) : (
                      <span className="links-slot-empty">
                        {selectedId ? "Placer ici" : "Case vide"}
                      </span>
                    )}
                  </button>

                  {index < puzzle.rules.length && (
                    <div className="links-rule">
                      <span>Lien {index + 1}</span>
                      <p>{puzzle.rules[index].text}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="links-actions">
            <button className="links-secondary" onClick={resetRound} disabled={Boolean(roundResult)}>
              Reinitialiser
            </button>
            {!roundResult ? (
              <button className="links-primary" onClick={validateRound} disabled={!isComplete}>
                Valider la chaine
              </button>
            ) : (
              <button className="links-primary" onClick={handleNext}>
                {isLastPuzzle ? "Terminer l'epreuve" : "Manche suivante"}
              </button>
            )}
          </div>

          {roundResult && (
            <div className="links-feedback">
              <strong>
                {roundResult.correctCount}/{puzzle.solutionIds.length} placements corrects
              </strong>
              <span>+{roundResult.earned} points</span>
              <p>
                Ordre attendu :{" "}
                {puzzle.solutionIds
                  .map((id) => getCharacter(id)?.name ?? id)
                  .join(" > ")}
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function CharacterCard({
  character,
  compact = false,
}: {
  character: LogicCharacter;
  compact?: boolean;
}) {
  const initials = character.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");

  return (
    <span className={"links-character" + (compact ? " links-character-compact" : "")}>
      <span className="links-character-mark">{initials}</span>
      <span className="links-character-copy">
        <strong>{character.name}</strong>
        <em>{character.anime}</em>
      </span>
      {!compact && (
        <>
          <span className="links-character-grid">
            <span>Age {character.age}</span>
            <span>{character.year}</span>
            <span>{character.hair}</span>
            <span>{character.role}</span>
          </span>
          <small>
            {character.weapon} / {character.power}
          </small>
        </>
      )}
    </span>
  );
}
