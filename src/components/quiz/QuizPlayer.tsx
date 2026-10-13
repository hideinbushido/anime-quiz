import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import type { PlayerId } from "../../types";
import type { QuizPlayerView } from "../../quiz/types";
import { QUIZ_LOOK, useQuiz } from "../../quiz/useQuiz";
import { shrinkPhoto } from "../../realtime/avatar";
import { ConnectionNotice } from "../ayanokoji/AyanokojiParts";
import { FeudAvatar } from "../feud/FeudParts";
import { QuizAttempts } from "./QuizLive";
import { CamToggle } from "../realtime/CamToggle";
import { StageFx } from "../fx/StageFx";

/**
 * Le téléphone du joueur pendant une épreuve au buzzer : un gros buzzer, ses
 * tentatives, son score. La réponse se donne à voix haute ; elle n'arrive ici
 * qu'une fois révélée.
 */
export function QuizPlayer({ player }: { player: PlayerId }) {
  const { view, status, error, send, lockLeft, canBuzz } = useQuiz<QuizPlayerView>(player);
  const [pressed, setPressed] = useState(false);
  const open = canBuzz(player);
  const buzz = useCallback(() => {
    if (!open || pressed) return;
    setPressed(true);
    send({ type: "buzzer:press" });
  }, [open, pressed, send]);
  useEffect(() => { if (!open) setPressed(false); }, [open]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.code === "Space" && !event.repeat) { event.preventDefault(); buzz(); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [buzz]);
  const picker = useRef<HTMLInputElement>(null);
  const onPhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) try { send({ type: "room:avatar", image: await shrinkPhoto(file) }); } catch { /* fichier illisible : la photo actuelle reste */ }
  };

  if (!view) return <main className={`ay-screen fd-player ${player}`}><ConnectionNotice status={status} error={error} /></main>;
  const opponent: PlayerId = player === "player1" ? "player2" : "player1";
  const { phase } = view;
  const mine = view.buzzWinner === player;
  const wait = lockLeft(player);
  const look = QUIZ_LOOK[view.kind];

  const [label, hint, tone] = phase === "done" ? ["Épreuve terminée", `${view.scores[player]} – ${view.scores[opponent]}`, "is-over"]
    : view.revealed ? [view.revealed.answer, view.revealed.winner === player ? `Bien joué : +${view.points}` : view.revealed.winner ? `${view.names[opponent]} marque` : "Personne ne trouve", "is-over"]
    : mine ? ["Tu as buzzé !", "Donne ta réponse à voix haute.", "is-mine"]
    : view.buzzWinner ? [`${view.names[opponent]} a buzzé`, "En attente du présentateur…", "is-theirs"]
    : view.attempts[player] <= 0 ? ["Plus de tentative", "Tu attends la question suivante.", "is-out"]
    : wait > 0 ? [`Bloqué ${wait} s`, "Ton buzzer se libère bientôt.", "is-closed"]
    : open ? ["Buzzer ouvert", "Premier arrivé, premier servi.", "is-open"]
    : ["Buzzer fermé", "En attente du présentateur…", "is-closed"];

  return <main className={`ay-screen fd-player ${player} ${tone}`}>
    <header className="fd-player-head">
      <button type="button" className="fd-photo" onClick={() => picker.current?.click()} aria-label="Changer ma photo de profil">
        <FeudAvatar player={player} name={view.names[player]} image={view.avatars[player]} />
        <span>{view.avatars[player] ? "Changer la photo" : "Ajouter ma photo"}</span>
      </button>
      <input ref={picker} type="file" accept="image/*" hidden onChange={onPhoto} />
      <h1>{view.names[player]}</h1>
      <p className="ay-kicker">{view.title}</p>
      {phase !== "done" && <p className="fd-round">{look.item} <b>{view.itemNumber}</b>/{view.itemCount}</p>}
    </header>
    <StageFx density={0.5} />
    <ConnectionNotice status={status} error={error} />
    <CamToggle />

    <dl className="fd-player-stats">
      <div><dt>Tentatives</dt><dd><QuizAttempts left={view.attempts[player]} max={view.maxAttempts} /></dd></div>
      <div><dt>Score</dt><dd><b>{view.scores[player]}</b></dd></div>
    </dl>

    {view.kind === "citations" && view.prompt && !view.revealed && phase !== "done" && <blockquote className="qz-quote is-small">{view.prompt}</blockquote>}

    <button type="button" className={"fd-buzzer" + (pressed || mine ? " is-pressed" : "")} disabled={!open} onPointerDown={buzz} onClick={buzz}>Buzz</button>

    <p className="fd-player-state" role="status"><strong>{label}</strong><span>{hint}</span></p>
  </main>;
}
