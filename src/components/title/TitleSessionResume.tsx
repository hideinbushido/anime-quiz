import type { DuelSession } from "../../types";

export function TitleSessionResume({ session, onContinue, onDelete }: {
  session: DuelSession;
  onContinue: () => void;
  onDelete: () => void;
}) {
  const phase = session.phase === "selection" ? `Sélection en cours · ${session.selected.length}/5 épreuves choisies`
    : session.phase === "ready" ? "Programme complet · Prêt à entrer en jeu"
    : session.phase === "playing" ? `Épreuve ${session.currentIndex + 1}/5 · Manche ${session.progress.roundIndex + 1}`
    : "Duel terminé · Résultats disponibles";
  return <section className="arena-resume" aria-labelledby="resume-title">
    <div className="arena-resume-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none"><path d="M4 10a8 8 0 1 1 1 7M4 4v6h6M12 7v5l3 2" /></svg>
    </div>
    <div className="arena-resume-summary">
      <p className="arena-overline" id="resume-title">{session.phase === "recap" ? "DERNIER DUEL" : "DUEL SAUVEGARDÉ"}</p>
      <strong>{session.players.player1.name} <span>VS</span> {session.players.player2.name}</strong>
      <p>{phase}<span className="arena-resume-score"> · {session.players.player1.score} — {session.players.player2.score} pts</span></p>
    </div>
    <div className="arena-resume-actions">
      <button type="button" className="arena-resume-button" onClick={onContinue}>{session.phase === "recap" ? "Voir les résultats" : "Reprendre le duel"}<span aria-hidden="true">↗</span></button>
      <button type="button" className="arena-text-button" onClick={onDelete}>Effacer la session</button>
    </div>
  </section>;
}
