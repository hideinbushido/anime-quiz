import type { DuelSession } from "../types";
import { LogoDuel } from "./Logo";
import { DuelPlayerCard } from "./title/DuelPlayerCard";
import { DuelVsStage } from "./title/DuelVsStage";
import { TitleSessionResume } from "./title/TitleSessionResume";
import { useTitlePlayers } from "./title/useTitlePlayers";

interface Props {
  savedSession: DuelSession | null;
  onPlay: (name1: string, name2: string) => void;
  onContinue: () => void;
  onScores: () => void;
  onRules: () => void;
  onDeleteSession: () => void;
}

const TITLE = ["Qui", "entre", "dans", "l'arène", "?"];

export function TitleScreen({ savedSession, onPlay, onContinue, onScores, onRules, onDeleteSession }: Props) {
  const { names, setName, reset, clearDraft, draftUnavailable } = useTitlePlayers(savedSession);
  const ready = names.map(name => Boolean(name.trim()));
  const canStart = ready.every(Boolean);
  let letter = 0;
  return <div className={"arena-home" + (canStart ? " is-armed" : "")}>
    {/* Le fond : une moitié par joueur, séparées par le trait d'or */}
    <div className="arena-split" aria-hidden="true">
      <span className={"arena-half arena-half-1" + (ready[0] ? " is-lit" : "")} />
      <span className={"arena-half arena-half-2" + (ready[1] ? " is-lit" : "")} />
      <span className="arena-blade" />
    </div>
    <div className="arena-shell">
      <header className="arena-topbar">
        <LogoDuel />
        <div className="arena-topbar-links">
          <button className="arena-history" type="button" onClick={onRules}>Les règles</button>
          <button className="arena-history" type="button" onClick={onScores}>Historique des duels</button>
        </div>
      </header>
      <main className="arena-main">
        <div className="arena-heading">
          <p className="arena-overline"><span className="arena-live-dot" /> Le duel anime · 1 contre 1</p>
          <h1 aria-label={TITLE.join(" ")}>
            {TITLE.map((word, w) => <span key={w} className="arena-word" aria-hidden="true">
              {[...word].map((char, c) => <span key={c} style={{ ["--i" as string]: letter++ }}>{char}</span>)}
            </span>)}
          </h1>
        </div>
        <form className="arena-form" onSubmit={event => {
          event.preventDefault();
          if (!canStart) return;
          clearDraft();
          onPlay(names[0].trim(), names[1].trim());
        }}>
          <div className="arena-matchup">
            <DuelPlayerCard player={1} name={names[0]} onChange={name => setName(0, name)} />
            <DuelVsStage armed={canStart} />
            <DuelPlayerCard player={2} name={names[1]} onChange={name => setName(1, name)} />
          </div>
          <div className="arena-launch">
            <button className="arena-cta" type="submit" disabled={!canStart} aria-describedby="arena-launch-hint">
              <span>Entrer dans l'arène</span>
            </button>
            <p id="arena-launch-hint">{canStart ? "Prochaine étape : le choix des épreuves." : "Saisis les deux pseudos pour ouvrir l'arène."}</p>
          </div>
        </form>
        {draftUnavailable && <p className="arena-storage-warning" role="status">Les noms ne peuvent pas être mémorisés dans ce navigateur.</p>}
        {savedSession && <TitleSessionResume session={savedSession} onContinue={onContinue} onDelete={() => { onDeleteSession(); reset(); }} />}
      </main>
      <footer className="arena-footer"><span>Quiz'Animanga</span><span>Présenté par Zenkai</span></footer>
    </div>
  </div>;
}
