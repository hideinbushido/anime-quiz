import { useEffect, useRef, useState } from "react";
import type { DifficultyClass, DuelSession, Epreuve, Selector } from "../types";
import { CLASSES, SELECTION_ORDER } from "../duel/engine";
import { EpreuveLogo } from "./EpreuveLogo";
import { hasLogo } from "../epreuveLogos";

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

/** Les lettres d'un titre, qui montent une à une à chaque changement de tour. */
function Rise({ text }: { text: string }) {
  let letter = 0;
  return <>{text.split(" ").map((word, w) => <span key={w} className="zk-word" aria-hidden="true">
    {[...word].map((char, c) => <span key={c} style={{ ["--i" as string]: letter++ }}>{char}</span>)}
  </span>)}</>;
}

/**
 * La sélection : chacun choisit ses épreuves dans la galerie, et la feuille de
 * match fixée en bas se remplit au fur et à mesure, un sceau par choix.
 */
export function EpreuveGrid({ epreuves, session, onSelect, onUndo, onStart, onPreview }: Props) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<DifficultyClass>("D");
  const classPickerRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!pendingId) return;
    classPickerRef.current?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setPendingId(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pendingId]);

  const ready = session.phase === "ready";
  const currentSelector: Selector | undefined = SELECTION_ORDER[session.selected.length];
  const pending = epreuves.find(epreuve => epreuve.id === pendingId);
  const pendingLocked = pending ? session.selected.some(item => item.epreuveId === pending.id) : false;
  const turn = ready || !currentSelector ? "host" : currentSelector;
  const title = ready || !currentSelector ? "Le programme est prêt" : `À ${selectorName(currentSelector, session)} de choisir`;
  const pickNumber = currentSelector ? session.selected.filter(item => item.selectedBy === currentSelector).length + 1 : 0;

  return <div className="duel-selection">
    <header className={"zk-turn " + turn}>
      <div className="duel-steps" aria-label="Étapes de sélection">
        {(["player1", "player2", "host"] as const).map(selector => {
          const done = session.selected.filter(item => item.selectedBy === selector).length;
          const total = selector === "host" ? 1 : 2;
          return <div key={selector} className={selector + (currentSelector === selector && !ready ? " active" : "") + (done === total ? " done" : "")}
            aria-current={currentSelector === selector && !ready ? "step" : undefined}>
            <span>{selectorName(selector, session)}</span><b>{done}/{total}</b>
          </div>;
        })}
      </div>
      <div className="duel-selection-heading">
        <h1 key={title} aria-label={title}><Rise text={title} /></h1>
        <p>{ready ? "Vérifie les cinq épreuves, puis lance le duel."
          : currentSelector === "host" ? "Le défi surprise du présentateur : une épreuve, puis sa classe."
          : `Choix ${pickNumber} sur 2 : une épreuve, puis sa classe.`}</p>
      </div>
    </header>

    {epreuves.length < 5 && <p className="duel-notice" role="status">{epreuves.length} épreuves disponibles. Le LIVE pourra démarrer quand le catalogue en proposera au moins 5. Tu peux déjà préparer la sélection et essayer chaque épreuve.</p>}

    <main className="menu-layout">
      <div className="menu-board-header"><strong>Les épreuves</strong><span>{session.selected.length}/5 verrouillées</span></div>
      <div className="menu-logo-grid">
        {epreuves.map((epreuve, index) => {
          const selected = session.selected.find(item => item.epreuveId === epreuve.id);
          return <article key={epreuve.id} className={"duel-tile-wrap" + (selected ? ` is-locked ${selected.selectedBy}` : "")} style={{ ["--i" as string]: index }}>
            <button className={"menu-logo-tile" + (selected ? " menu-logo-tile-selected" : "") + (hasLogo(epreuve.id) ? " has-logo" : "")}
              disabled={Boolean(selected) || ready} aria-label={`Choisir ${epreuve.nom}`}
              onClick={() => { setPendingId(epreuve.id); setDifficulty("D"); }}>
              <span className="menu-logo-mark"><EpreuveLogo epreuveId={epreuve.id} /></span>
              <span className="menu-logo-name">{epreuve.nom}</span>
              <span className="zk-tile-theme">{epreuve.theme}</span>
              <span className="menu-logo-status">{selected ? `${epreuve.classless ? "" : `Classe ${selected.difficulty} · `}${selectorName(selected.selectedBy, session)}` : epreuve.classless ? "Sans classe" : "Classes D · C · B · A"}</span>
              {selected && <img className="zk-tile-stamp" src="/logo-zenkai.png" alt="" />}
            </button>
            {!(epreuve.classless && epreuve.type === "realtime") && <button className="duel-text-button" onClick={() => { setPendingId(epreuve.id); setDifficulty(selected?.difficulty ?? "D"); }}>{epreuve.classless ? "Essayer" : "Essayer / voir les classes"}</button>}
          </article>;
        })}
      </div>
    </main>

    {/* La feuille de match : toujours à l'écran, elle garde la trace des choix */}
    <aside className="menu-panel" aria-label="Programme du LIVE">
      <div className="menu-panel-top"><span className="menu-panel-label">Programme du LIVE</span><strong>{session.selected.length}/5</strong></div>
      <ol className="duel-program">
        {SELECTION_ORDER.map((selector, index) => {
          const selection = session.selected[index];
          const next = !ready && index === session.selected.length;
          return <li key={index} className={selector + (selection ? " is-filled" : "") + (next ? " is-next" : "")}>
            <small>{index + 1} · {selectorName(selector, session)}</small>
            <strong>{selection ? epreuves.find(epreuve => epreuve.id === selection.epreuveId)?.nom : next ? "À choisir" : "En attente"}</strong>
            {selection && !epreuves.find(epreuve => epreuve.id === selection.epreuveId)?.classless && <span className="duel-class">Classe {selection.difficulty}</span>}
          </li>;
        })}
      </ol>
      <div className="zk-dock-actions">
        <button className="links-secondary" disabled={!session.selected.length} onClick={() => { setPendingId(null); onUndo(); }}>Annuler le dernier choix</button>
        <button className="btn-primary" disabled={!ready} onClick={onStart}>Lancer le duel</button>
      </div>
    </aside>

    {pending && <div className="zk-modal" onClick={event => { if (event.target === event.currentTarget) setPendingId(null); }}>
      <section ref={classPickerRef} tabIndex={-1} className={"duel-class-picker " + turn} role="dialog" aria-modal="true" aria-labelledby="class-title">
        <div className="zk-picker-head">
          <span className="zk-picker-emblem"><EpreuveLogo epreuveId={pending.id} /></span>
          <div>
            <p className="duel-eyebrow">{pending.classless ? "Épreuve sans classe" : "Choix de classe"}{!ready && currentSelector && !pendingLocked ? ` · ${selectorName(currentSelector, session)}` : ""}</p>
            <h2 id="class-title">{pending.nom}</h2>
            <p className="zk-picker-theme">{pending.theme}</p>
          </div>
        </div>
        {!pending.classless && <div className="duel-class-options" role="group" aria-label="Classe de difficulté">
          {CLASSES.map(level => <button key={level} aria-pressed={difficulty === level} className={difficulty === level ? "active" : ""} onClick={() => setDifficulty(level)}>
            <b>{level}</b><span>{pending.difficulties[level].label}</span>
          </button>)}
        </div>}
        {!pending.classless && <p className="zk-picker-desc" key={difficulty}>{pending.difficulties[difficulty].description}</p>}
        <div className="duel-actions">
          <button className="links-secondary" onClick={() => setPendingId(null)}>Fermer</button>
          {pending.type !== "realtime" && <button className="links-secondary" onClick={() => onPreview(pending.id, difficulty)}>{pending.classless ? "Essayer l'épreuve" : `Essayer la classe ${difficulty}`}</button>}
          <button className="btn-primary" disabled={ready || pendingLocked}
            onClick={() => { onSelect(pending.id, difficulty); setPendingId(null); }}>{pending.classless ? "Verrouiller l'épreuve" : `Verrouiller la classe ${difficulty}`}</button>
        </div>
      </section>
    </div>}
  </div>;
}
