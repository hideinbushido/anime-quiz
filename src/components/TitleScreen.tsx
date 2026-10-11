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
  onDeleteSession: () => void;
}

export function TitleScreen({ savedSession, onPlay, onContinue, onScores, onDeleteSession }: Props) {
  const { names, setName, reset, clearDraft, draftUnavailable } = useTitlePlayers(savedSession);
  const canStart = names.every(name => Boolean(name.trim()));
  return <div className="arena-home">
    <div className="arena-background" aria-hidden="true"><span /><span /><span /></div>
    <div className="arena-sun" aria-hidden="true" />
    <div className="arena-shell">
      <header className="arena-topbar">
        <LogoDuel />
        <button className="arena-history" type="button" onClick={onScores}><span aria-hidden="true">↗</span> Historique des duels</button>
      </header>
      <main className="arena-main">
        <div className="arena-heading">
          <p className="arena-overline"><span className="arena-live-dot" /> LE DUEL ANIME</p>
          <h1>L'arène <span>vous attend.</span></h1>
          <p>Deux joueurs. Une rencontre à écrire.</p>
        </div>
        <form className="arena-form" onSubmit={event => {
          event.preventDefault();
          if (!canStart) return;
          clearDraft();
          onPlay(names[0].trim(), names[1].trim());
        }}>
          <div className="arena-matchup">
            <DuelPlayerCard player={1} name={names[0]} onChange={name => setName(0, name)} />
            <DuelVsStage />
            <DuelPlayerCard player={2} name={names[1]} onChange={name => setName(1, name)} />
          </div>
          <div className="arena-launch">
            <button className="arena-cta" type="submit" disabled={!canStart} aria-describedby="arena-launch-hint">Entrer dans l'arène <span aria-hidden="true">→</span></button>
            <p id="arena-launch-hint">{canStart ? "Prochaine étape : choisissez vos épreuves." : "Renseignez vos deux pseudos pour commencer."}</p>
          </div>
        </form>
        {draftUnavailable && <p className="arena-storage-warning" role="status">Les noms ne peuvent pas être mémorisés dans ce navigateur.</p>}
        {savedSession && <TitleSessionResume session={savedSession} onContinue={onContinue} onDelete={() => { onDeleteSession(); reset(); }} />}
      </main>
      <footer className="arena-footer"><span>QUIZ'ANIMANGA <span className="arena-footer-divider">/</span> L'ANIME ENTRE EN JEU.</span><span>DUEL LOCAL <span className="arena-footer-dot" /></span></footer>
    </div>
  </div>;
}
