import { useState } from "react";
import type { Epreuve } from "../types";
import { loadLeaderboard, removeLeaderboardEntry } from "../utils";

interface Props {
  epreuves: Epreuve[];
  onBack: () => void;
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function Scoreboard({ epreuves, onBack }: Props) {
  const [entries, setEntries] = useState(() => loadLeaderboard());
  const totalScore = entries.reduce((sum, entry) => sum + entry.score, 0);

  function handleDelete(date: string) {
    setEntries(removeLeaderboardEntry(date));
  }

  return (
    <div className="screen scores-screen">
      <header className="scores-header">
        <div>
          <p className="menu-eyebrow">Classement</p>
          <h1>Scores des participants</h1>
        </div>
        <button className="scores-back" type="button" onClick={onBack}>
          Retour
        </button>
      </header>

      <section className="scores-summary">
        <div className="scores-summary-item">
          <span>Participants</span>
          <strong>{entries.length}</strong>
        </div>
        <div className="scores-summary-item">
          <span>Score total</span>
          <strong>{totalScore}</strong>
        </div>
      </section>

      <section className="scores-list">
        {entries.length === 0 ? (
          <div className="scores-empty">Aucun score enregistré pour le moment.</div>
        ) : (
          entries.map((entry, index) => {
            const played = (entry.epreuveIds ?? [])
              .map((id) => epreuves.find((epreuve) => epreuve.id === id))
              .filter((epreuve): epreuve is Epreuve => Boolean(epreuve));

            return (
              <article key={`${entry.name}-${entry.date}`} className="scores-row">
                <span className="scores-rank">#{index + 1}</span>
                <div className="scores-main">
                  <div className="scores-name-line">
                    <strong>{entry.name}</strong>
                    <span>{formatDate(entry.date)}</span>
                  </div>
                  <div className="scores-epreuves">
                    {played.length > 0 ? (
                      played.map((epreuve) => (
                        <span key={epreuve.id}>{epreuve.nom}</span>
                      ))
                    ) : (
                      <span>Épreuves non détaillées</span>
                    )}
                  </div>
                </div>
                <strong className="scores-points">{entry.score}</strong>
                <button
                  className="scores-delete"
                  type="button"
                  onClick={() => handleDelete(entry.date)}
                  aria-label={`Supprimer le score de ${entry.name}`}
                >
                  Supprimer
                </button>
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}
