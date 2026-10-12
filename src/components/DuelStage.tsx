import { useState } from "react";
import type { DuelSession, Epreuve, GameControls, PlayerId } from "../types";
import { currentFeedback, resolveEpreuve } from "../duel/engine";
import { DuelHeader } from "./DuelHeader";
import { EpreuvePlayer } from "./EpreuvePlayer";
import { EpisodeCard } from "./EpisodeCard";
import { RulesVideo } from "./RulesVideo";
import { REGLE_VIDEOS } from "../data/regleVideos";

interface Props extends GameControls {
  session: DuelSession;
  epreuve: Epreuve;
  onRespondent: (id: PlayerId) => void;
}

export function RespondentPicker({ progress, players, onRespondent }: Pick<Props, "progress" | "onRespondent"> & { players: DuelSession["players"] }) {
  return <div className="duel-respondent" role="group" aria-label="Joueur qui répond">
    <span>À qui attribuer cette réponse ?</span>
    {(["player1", "player2"] as const).map(id => <button key={id} className={id} aria-pressed={progress.respondent === id}
      disabled={Boolean(currentFeedback(progress))} onClick={() => onRespondent(id)}>{players[id].name}</button>)}
    <small>{currentFeedback(progress) ? "Réponse enregistrée" : "Le présentateur choisit avant validation."}</small>
  </div>;
}

export function DuelStage({ session, epreuve, onRespondent, ...controls }: Props) {
  const current = session.selected[session.currentIndex];
  const active = resolveEpreuve(epreuve, current.difficulty);
  const chooser = current.selectedBy === "host" ? "Présentateur" : session.players[current.selectedBy].name;
  // Les règles en vidéo : une fois, à l'ouverture d'une épreuve que personne n'a encore entamée
  const stageKey = `${session.id}-${current.epreuveId}`;
  const untouched = controls.progress.roundIndex === 0 && controls.progress.rounds.length === 0 && !controls.progress.killerBee?.audioTime;
  const [rulesFor, setRulesFor] = useState(() => (untouched && REGLE_VIDEOS[epreuve.id] ? stageKey : null));
  const [seen, setSeen] = useState(stageKey);
  if (seen !== stageKey) { setSeen(stageKey); setRulesFor(untouched && REGLE_VIDEOS[epreuve.id] ? stageKey : null); }
  return <div className="duel-stage">
    {rulesFor === stageKey && <RulesVideo key={stageKey} src={REGLE_VIDEOS[epreuve.id]} delayMs={2600} onDone={() => setRulesFor(null)} />}
    <EpisodeCard key={`${session.id}-${current.epreuveId}`} label="Épreuve" step={`${session.currentIndex + 1}/5`} name={epreuve.nom} difficulty={current.difficulty} chooser={`Choix de ${chooser}`} epreuveId={epreuve.id} selector={current.selectedBy} />
    <DuelHeader players={session.players} current={current} epreuveName={epreuve.nom} index={session.currentIndex} />
    {epreuve.id !== "blind-test-openings" && <RespondentPicker players={session.players} progress={controls.progress} onRespondent={onRespondent} />}
    {epreuve.difficulties[current.difficulty].status === "shared" && <p className="duel-notice">Classe {current.difficulty} · {epreuve.difficulties[current.difficulty].description}</p>}
    <EpreuvePlayer key={`${session.id}-${current.epreuveId}`} epreuve={active} players={session.players} difficulty={current.difficulty} {...controls} />
  </div>;
}
