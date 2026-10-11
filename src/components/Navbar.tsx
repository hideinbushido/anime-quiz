import { LogoDuel } from "./Logo";

export function Navbar({ onHome, onScores }: { onHome: () => void; onScores: () => void }) {
  return <nav className="navbar">
    <button className="navbar-brand" onClick={onHome} aria-label="Accueil"><LogoDuel /></button>
    <div className="navbar-links"><button className="navbar-link" onClick={onHome}>Accueil</button><button className="navbar-link" onClick={onScores}>Historique</button></div>
    <span className="navbar-player">LIVE 1V1</span>
  </nav>;
}
