import { useState } from "react";
import type { DifficultyClass, Epreuve } from "../types";
import { createDuel, currentFeedback, newProgress, progressReducer, resolveEpreuve, roundIds, scoreRounds } from "../duel/engine";
import { EpreuvePlayer } from "./EpreuvePlayer";
import { RespondentPicker } from "./DuelStage";
import { DuelHeader } from "./DuelHeader";
import { EpisodeCard } from "./EpisodeCard";
import { RulesVideo } from "./RulesVideo";
import { REGLE_VIDEOS } from "../data/regleVideos";

export function EpreuvePreview({ epreuve, difficulty, onBack }: { epreuve: Epreuve; difficulty: DifficultyClass; onBack: () => void }) {
  const [progress, setProgress] = useState(newProgress);
  const [finished, setFinished] = useState(false);
  // En répétition aussi, les règles passent en vidéo à l'ouverture de l'épreuve
  const [rules, setRules] = useState(() => Boolean(REGLE_VIDEOS[epreuve.id]));
  const active = resolveEpreuve(epreuve, difficulty);
  const players = createDuel("Joueur 1", "Joueur 2", "preview").players;
  players.player1.score = scoreRounds(progress.rounds, "player1");
  players.player2.score = scoreRounds(progress.rounds, "player2");
  return <div className="duel-stage">
    {rules && <RulesVideo src={REGLE_VIDEOS[epreuve.id]} delayMs={2600} onDone={() => setRules(false)} />}
    <EpisodeCard label="Répétition" name={epreuve.nom} difficulty={difficulty} chooser="Aucun résultat enregistré" epreuveId={epreuve.id} />
    <div className="duel-preview-bar"><p>ESSAI · {epreuve.nom} · Classe {difficulty} · Aucun résultat enregistré</p><button className="links-secondary" onClick={onBack}>Retour à la sélection</button></div>
    <DuelHeader players={players} label={finished ? "ESSAI TERMINÉ" : "RÉPÉTITION"} />
    {!finished ? <>
      {epreuve.id !== "blind-test-openings" && <RespondentPicker players={players} progress={progress} onRespondent={playerId => setProgress(current => progressReducer(current, { type: "respondent", playerId }, active))} />}
      {epreuve.id !== "blind-test-openings" && <p className="duel-notice">{epreuve.difficulties[difficulty].description}</p>}
      <EpreuvePlayer epreuve={active} progress={progress} players={players} difficulty={difficulty}
        onKillerBee={event => setProgress(current => progressReducer(current, { type: "killerBee", event }, active))}
        onEdit={patch => setProgress(current => progressReducer(current, { type: "edit", patch }, active))}
        onValidate={result => setProgress(current => progressReducer(current, { type: "validate", result }, active))}
        onNext={() => {
          if (!currentFeedback(progress)) return;
          if (progress.roundIndex === roundIds(active).length - 1) setFinished(true);
          else setProgress(current => progressReducer(current, { type: "next" }, active));
        }} />
    </> : <div className="screen"><p>Essai terminé. Les scores du LIVE sont inchangés.</p><button className="btn-primary" onClick={() => { setProgress(newProgress()); setFinished(false); }}>Rejouer l'essai</button></div>}
  </div>;
}
