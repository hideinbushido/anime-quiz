import type { Epreuve } from "../types";
import { EpreuveLogoDisplay, hasFullLogo } from "./EpreuveLogoDisplay";

interface Props {
  epreuves: Epreuve[];
  selectedIds: string[];
  playedIds: string[];
  maxSelection: number;
  score: number;
  onToggle: (id: string) => void;
  onStart: () => void;
}

export function EpreuveGrid({
  epreuves,
  selectedIds,
  playedIds,
  maxSelection,
  score,
  onToggle,
  onStart,
}: Props) {
  return (
    <div className="screen">
      <header className="header">
        <div>
          <p className="eyebrow">QUIZ ANIME</p>
          <h1>CHOIX DE L'ÉPREUVE</h1>
        </div>
        <div className="header-right">
          <div className="joues">
            <span className="joues-label">ÉPREUVES JOUÉES</span>
            <div className="joues-dots">
              {Array.from({ length: maxSelection }).map((_, i) => (
                <span
                  key={i}
                  className={"dot" + (i < playedIds.length ? " dot-filled" : "")}
                />
              ))}
            </div>
          </div>
          <div className="score-box">
            <span className="score-label">SCORE</span>
            <span className="score-value">{score}</span>
          </div>
        </div>
      </header>

      <div className="grid">
        {epreuves.map((ep) => {
          const isSelected = selectedIds.includes(ep.id);
          const isPlayed = playedIds.includes(ep.id);
          const disabled =
            isPlayed || (!isSelected && selectedIds.length >= maxSelection);
          return (
            <button
              key={ep.id}
              className={
                "tile" +
                (isSelected ? " tile-selected" : "") +
                (isPlayed ? " tile-played" : "")
              }
              style={{ ["--tile-color" as string]: ep.couleur }}
              disabled={disabled}
              onClick={() => onToggle(ep.id)}
            >
              <div className="tile-logo">
                <EpreuveLogoDisplay epreuveId={ep.id} />
              </div>
              {!hasFullLogo(ep.id) && (
                <span className="tile-nom">{ep.nom}</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="footer">
        <p>
          {selectedIds.length}/{maxSelection} épreuves sélectionnées
        </p>
        <button
          className="btn-primary"
          disabled={selectedIds.length === 0}
          onClick={onStart}
        >
          Lancer la session
        </button>
      </div>
    </div>
  );
}
