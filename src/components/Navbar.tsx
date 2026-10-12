import { LogoDuel } from "./Logo";

export function Navbar({ onHome, onScores, onRules }: { onHome: () => void; onScores: () => void; onRules?: () => void }) {
  return <nav className="navbar">
    <button className="navbar-brand" onClick={onHome} aria-label="Accueil"><LogoDuel /></button>
    <div className="navbar-links"><button className="navbar-link" onClick={onHome}>Accueil</button>{onRules && <button className="navbar-link" onClick={onRules}>Règles</button>}<button className="navbar-link" onClick={onScores}>Historique</button></div>
    <span className="navbar-player">LIVE 1V1</span>
  </nav>;
}
