import type { Epreuve } from "../types";
import { hasFullLogo } from "../epreuveLogoUtils";
import { EpreuveLogoDisplay } from "./EpreuveLogoDisplay";

interface Props {
  epreuves: Epreuve[];
  playerName: string;
  selectedIds: string[];
  playedIds: string[];
  maxSelection: number;
  score: number;
  onToggle: (id: string) => void;
  onStart: () => void;
}

function getTypeLabel(type: Epreuve["type"]): string {
  if (type === "blind-test") return "Audio";
  if (type === "logic-links") return "Logique";
  return "Citation";
}

export function EpreuveGrid({
  epreuves,
  playerName,
  selectedIds,
  playedIds,
  maxSelection,
  score,
  onToggle,
  onStart,
}: Props) {
  const focusedEpreuve =
    epreuves.find((epreuve) => epreuve.id === selectedIds.at(-1)) ?? epreuves[0];

  return (
    <div className="screen menu-screen">
      <header className="menu-header">
        <div>
          <p className="menu-eyebrow">Session</p>
          <h1>Sélection d'épreuves</h1>
        </div>

        <div className="menu-stats">
          <div className="menu-stat">
            <span>Joueur</span>
            <strong>{playerName || "-"}</strong>
          </div>
          <div className="menu-stat">
            <span>Score</span>
            <strong>{score}</strong>
          </div>
          <div className="menu-stat">
            <span>Jouées</span>
            <strong>
              {playedIds.length}/{maxSelection}
            </strong>
          </div>
        </div>
      </header>

      <main className="menu-layout">
        <section className="menu-logo-board">
          <div className="menu-board-header">
            <div>
              <span className="menu-panel-label">Cadre des épreuves</span>
              <strong>{epreuves.length} logos</strong>
            </div>
            <span>
              {selectedIds.length}/{maxSelection}
            </span>
          </div>

          <div className="menu-logo-grid" aria-label="Liste des épreuves">
            {epreuves.map((epreuve, index) => {
              const isSelected = selectedIds.includes(epreuve.id);
              const isPlayed = playedIds.includes(epreuve.id);
              const disabled =
                isPlayed || (!isSelected && selectedIds.length >= maxSelection);

              return (
                <button
                  key={epreuve.id}
                  className={
                    "menu-logo-tile" +
                    (isSelected ? " menu-logo-tile-selected" : "") +
                    (isPlayed ? " menu-logo-tile-played" : "")
                  }
                  style={{
                    ["--tile-color" as string]: epreuve.couleur,
                    animationDelay: `${index * 0.04}s`,
                  }}
                  disabled={disabled}
                  onClick={() => onToggle(epreuve.id)}
                >
                  <span className="menu-logo-status">
                    {isPlayed ? "Terminé" : isSelected ? "Prêt" : getTypeLabel(epreuve.type)}
                  </span>
                  <span className="menu-logo-mark">
                    <EpreuveLogoDisplay epreuveId={epreuve.id} />
                  </span>
                  {!hasFullLogo(epreuve.id) && (
                    <span className="menu-logo-name">{epreuve.nom}</span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        <aside className="menu-panel">
          <div className="menu-panel-top">
            <span className="menu-panel-label">Deck actif</span>
            <strong>
              {selectedIds.length}/{maxSelection}
            </strong>
          </div>

          <div className="menu-progress" aria-hidden>
            {Array.from({ length: maxSelection }).map((_, i) => (
              <span
                key={i}
                className={
                  "menu-progress-dot" +
                  (i < selectedIds.length ? " menu-progress-dot-selected" : "") +
                  (i < playedIds.length ? " menu-progress-dot-played" : "")
                }
              />
            ))}
          </div>

          {focusedEpreuve && (
            <div
              className="menu-focus-card"
              style={{ ["--tile-color" as string]: focusedEpreuve.couleur }}
            >
              <span>{getTypeLabel(focusedEpreuve.type)}</span>
              <strong>{focusedEpreuve.nom}</strong>
              <p>{focusedEpreuve.theme}</p>
            </div>
          )}

          <div className="menu-selected-list">
            {selectedIds.length === 0 ? (
              <p>Aucune épreuve sélectionnée</p>
            ) : (
              selectedIds.map((id, index) => {
                const epreuve = epreuves.find((ep) => ep.id === id);
                if (!epreuve) return null;
                return (
                  <div key={id} className="menu-selected-item">
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <strong>{epreuve.nom}</strong>
                  </div>
                );
              })
            )}
          </div>
        </aside>
      </main>

      <footer className="menu-footer">
        <p>
          {selectedIds.length}/{maxSelection} épreuves sélectionnées
        </p>
        <button
          className="btn-primary menu-start"
          disabled={selectedIds.length === 0}
          onClick={onStart}
        >
          Lancer la session
        </button>
      </footer>
    </div>
  );
}
