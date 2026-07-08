import type { Phase } from "../types";
import { LogoHeader } from "./Logo";

interface Props {
  phase: Phase;
  playerName: string;
  canGoRecap: boolean;
  onNavigate: (phase: Phase) => void;
}

export function Navbar({ phase, playerName, canGoRecap, onNavigate }: Props) {
  return (
    <nav className="navbar">
      <button className="navbar-brand" onClick={() => onNavigate("title")}>
        <LogoHeader />
      </button>
      <div className="navbar-links">
        <button
          className={"navbar-link" + (phase === "selection" ? " navbar-link-active" : "")}
          onClick={() => onNavigate("selection")}
        >
          Épreuves
        </button>
        <button
          className={"navbar-link" + (phase === "recap" ? " navbar-link-active" : "")}
          disabled={!canGoRecap}
          onClick={() => onNavigate("recap")}
        >
          Récap
        </button>
      </div>
      {playerName && <span className="navbar-player">{playerName}</span>}
    </nav>
  );
}
