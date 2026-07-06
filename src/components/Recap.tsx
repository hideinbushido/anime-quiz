import type { Epreuve, EpreuveResult } from "../types";

interface Props {
  epreuves: Epreuve[];
  results: EpreuveResult[];
  onRestart: () => void;
}

export function Recap({ epreuves, results, onRestart }: Props) {
  const total = results.reduce((sum, r) => sum + r.points, 0);

  return (
    <div className="screen">
      <header className="header">
        <div>
          <p className="eyebrow">SESSION TERMINÉE</p>
          <h1>RÉCAPITULATIF</h1>
        </div>
        <div className="score-box">
          <span className="score-label">SCORE FINAL</span>
          <span className="score-value">{total}</span>
        </div>
      </header>

      <div className="recap-list">
        {results.map((r) => {
          const ep = epreuves.find((e) => e.id === r.epreuveId);
          if (!ep) return null;
          return (
            <div key={r.epreuveId} className="recap-row">
              <span className="tile-logo">{ep.logo}</span>
              <span className="recap-nom">{ep.nom}</span>
              <span className="recap-points">{r.points} pts</span>
            </div>
          );
        })}
      </div>

      <div className="footer">
        <button className="btn-primary" onClick={onRestart}>
          Nouvelle session
        </button>
      </div>
    </div>
  );
}
