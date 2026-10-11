import { useEffect, useRef, useState } from "react";
import type { DifficultyClass, DuelSession, Epreuve, Selector } from "../types";
import { CLASSES, SELECTION_ORDER } from "../duel/engine";
import { EpreuveLogoDisplay } from "./EpreuveLogoDisplay";
import { DuelHeader } from "./DuelHeader";

interface Props {
  epreuves: Epreuve[];
  session: DuelSession;
  onSelect: (id: string, difficulty: DifficultyClass) => void;
  onUndo: () => void;
  onStart: () => void;
  onPreview: (id: string, difficulty: DifficultyClass) => void;
}

function selectorName(selector: Selector, session: DuelSession): string {
  return selector === "host" ? "Présentateur" : session.players[selector].name;
}

export function EpreuveGrid({ epreuves, session, onSelect, onUndo, onStart, onPreview }: Props) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<DifficultyClass>("D");
  const classPickerRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!pendingId) return;
    classPickerRef.current?.scrollIntoView({ block: "center" });
    classPickerRef.current?.focus({ preventScroll: true });
  }, [pendingId]);
  const currentSelector = SELECTION_ORDER[session.selected.length];
  const pending = epreuves.find(epreuve => epreuve.id === pendingId);
  const ready = session.phase === "ready";
  return <div className="screen menu-screen duel-selection">
    <DuelHeader players={session.players} label={ready ? "PROGRAMME DU LIVE" : "LA SÉLECTION"} />
    <div className="duel-steps" aria-label="Étapes de sélection">
      {(["player1", "player2", "host"] as const).map(selector => <div key={selector} className={selector + (currentSelector === selector ? " active" : "")} aria-current={currentSelector === selector ? "step" : undefined}>
        <span>{selectorName(selector, session)}</span><b>{session.selected.filter(item => item.selectedBy === selector).length}/{selector === "host" ? 1 : 2}</b>
      </div>)}
    </div>
    {!ready && <div className="duel-selection-heading"><h1>À {selectorName(currentSelector, session)} de choisir</h1><p>Choisis une épreuve, puis sa classe.</p></div>}
    {epreuves.length < 5 && <p className="duel-notice" role="status">{epreuves.length} épreuves disponibles. Le LIVE pourra démarrer quand le catalogue en proposera au moins 5. Tu peux déjà préparer la sélection et essayer chaque épreuve.</p>}
    <main className="menu-layout">
      <section className="menu-logo-board">
        <div className="menu-board-header"><strong>Les épreuves</strong><span>{session.selected.length}/5 verrouillées</span></div>
        <div className="menu-logo-grid">
          {epreuves.map(epreuve => {
            const selected = session.selected.find(item => item.epreuveId === epreuve.id);
            return <article key={epreuve.id} className="duel-tile-wrap">
              <button className={"menu-logo-tile" + (selected ? " menu-logo-tile-selected" : "")}
                style={{ ["--tile-color" as string]: epreuve.couleur }}
                disabled={Boolean(selected) || ready} aria-label={`Choisir ${epreuve.nom}`}
                onClick={() => { setPendingId(epreuve.id); setDifficulty("D"); }}>
                <span className="menu-logo-status">{selected ? `Classe ${selected.difficulty} · ${selectorName(selected.selectedBy, session)}` : "D / C / B / A"}</span>
                <span className="menu-logo-mark"><EpreuveLogoDisplay epreuveId={epreuve.id} /></span>
                <span className="menu-logo-name">{epreuve.nom}</span>
              </button>
              <button className="duel-text-button" onClick={() => { setPendingId(epreuve.id); setDifficulty(selected?.difficulty ?? "D"); }}>Essayer / voir les classes</button>
            </article>;
          })}
        </div>
      </section>
      <aside className="menu-panel">
        <div className="menu-panel-top"><span className="menu-panel-label">Programme du LIVE</span><strong>{session.selected.length}/5</strong></div>
        <ol className="duel-program">
          {SELECTION_ORDER.map((selector, index) => {
            const selection = session.selected[index];
            return <li key={index} className={selector}>
              <small>{index + 1} · {selectorName(selector, session)}</small>
              <strong>{selection ? epreuves.find(epreuve => epreuve.id === selection.epreuveId)?.nom : "Épreuve à choisir"}</strong>
              {selection && <span className="duel-class">Classe {selection.difficulty}</span>}
            </li>;
          })}
        </ol>
        <button className="links-secondary" disabled={!session.selected.length} onClick={() => { setPendingId(null); onUndo(); }}>Annuler le dernier choix</button>
        <button className="btn-primary" disabled={!ready} onClick={onStart}>Lancer le duel</button>
      </aside>
    </main>
    {pending && <section ref={classPickerRef} tabIndex={-1} className="duel-class-picker" aria-labelledby="class-title">
      <div><p className="duel-eyebrow">CHOIX DE CLASSE</p><h2 id="class-title">{pending.nom}</h2></div>
      <div className="duel-class-options" role="group" aria-label="Classe de difficulté">
        {CLASSES.map(level => <button key={level} aria-pressed={difficulty === level} className={difficulty === level ? "active" : ""} onClick={() => setDifficulty(level)}>
          <b>{level}</b><span>{pending.difficulties[level].label}</span>
        </button>)}
      </div>
      <p>{pending.difficulties[difficulty].description}</p>
      <div className="duel-actions">
        <button className="links-secondary" onClick={() => setPendingId(null)}>Fermer</button>
        <button className="links-secondary" onClick={() => onPreview(pending.id, difficulty)}>Essayer la classe {difficulty}</button>
        <button className="btn-primary" disabled={ready || session.selected.some(item => item.epreuveId === pending.id)}
          onClick={() => { onSelect(pending.id, difficulty); setPendingId(null); }}>Verrouiller la classe {difficulty}</button>
      </div>
    </section>}
  </div>;
}
