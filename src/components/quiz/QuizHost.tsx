import { useEffect, useRef } from "react";
import type { PlayerId } from "../../types";
import type { QuizHostView } from "../../quiz/types";
import { QUIZ_LOOK, QUIZ_PHASE_LABEL, useQuiz } from "../../quiz/useQuiz";
import { shrinkPhoto } from "../../realtime/avatar";
import { ConnectionNotice } from "../ayanokoji/AyanokojiParts";
import { FeudAvatar } from "../feud/FeudParts";
import { GameSwitch } from "../realtime/GameSwitch";
import { RoomLinks } from "../realtime/RoomLinks";
import { QuizAttempts } from "./QuizLive";

const PLAYERS: PlayerId[] = ["player1", "player2"];

/**
 * La régie d'une épreuve au buzzer. Le présentateur voit la réponse, lance la
 * musique sur sa machine (c'est elle qui passe à l'antenne) et tranche chaque
 * réponse. Lancer la musique ouvre le buzzer ; un buzz la coupe.
 */
export function QuizHost() {
  const { view, status, error, send, lockLeft } = useQuiz<QuizHostView>("host");
  const audio = useRef<HTMLAudioElement>(null);
  const phase = view?.phase;
  const hasAudio = Boolean(view?.audioSrc);
  // Un buzz coupe la musique ; la révélation aussi
  useEffect(() => { if (phase === "buzzed" || phase === "revealed" || phase === "done") audio.current?.pause(); }, [phase]);

  if (!view) return <main className="ay-screen ay-host qz-host"><ConnectionNotice status={status} error={error} /></main>;
  const { names, buzzWinner } = view;
  const look = QUIZ_LOOK[view.kind];
  const judging = view.phase === "buzzed" && buzzWinner !== null;
  const exhausted = PLAYERS.every(id => view.attempts[id] <= 0);
  const last = view.itemNumber >= view.itemCount;

  return <main className="ay-screen ay-host qz-host">
    <header className="ay-host-head">
      <div>
        <p className="ay-kicker">Régie · room {view.room}</p>
        <h1>{view.title}</h1>
      </div>
      <p className="fd-round">{view.difficulty && <>Classe <b>{view.difficulty}</b> · </>}{look.item} <b>{view.itemNumber}</b>/{view.itemCount}</p>
      <p className="ay-phase">{QUIZ_PHASE_LABEL[view.phase]}</p>
    </header>
    <GameSwitch />
    <ConnectionNotice status={status} error={error} />

    {view.phase !== "done" && <section className="qz-answer" aria-label="Réponse, visible ici seulement">
      <p className="ay-kicker">Réponse (visible ici seulement) · {view.points} pts</p>
      <strong>{view.answer}</strong>
      {view.prompt && <blockquote>{view.prompt}</blockquote>}
    </section>}

    <p className={"fd-host-turn" + (buzzWinner ? ` ${buzzWinner}` : "")} role="status">
      {judging ? <><strong>{names[buzzWinner]}</strong> a buzzé — vrai ou faux ?</>
        : view.phase === "done" ? `Épreuve terminée : ${view.scores.player1} – ${view.scores.player2}.`
        : view.phase === "revealed" ? "Réponse révélée. Passe à la suite quand tu veux."
        : exhausted ? "Plus personne n'a de tentative : révèle la réponse."
        : view.phase === "open" ? "Buzzer ouvert : en attente d'un buzz."
        : hasAudio ? "Lance la musique : le buzzer s'ouvre avec elle." : "Lis la réplique, puis ouvre le buzzer."}
    </p>

    {hasAudio && view.phase !== "done" && <audio ref={audio} key={view.audioSrc} className="qz-audio" src={view.audioSrc ?? undefined} controls preload="auto"
      onPlay={() => { if (view.phase === "idle" && !exhausted) send({ type: "quiz:open" }); }}
      onPause={() => { if (view.phase === "open") send({ type: "quiz:close" }); }} />}
    {view.kind === "beats" && !hasAudio && view.phase !== "done" && <p className="ay-notice">Aucun extrait n'est branché pour ce morceau : ouvre le buzzer à la main.</p>}

    <section className="ay-host-controls" aria-label="Verdict">
      {hasAudio
        ? <button className="ay-button is-primary" disabled={view.phase !== "idle" || exhausted} onClick={() => void audio.current?.play()}>▶ Lancer la musique</button>
        : <button className="ay-button is-primary" disabled={view.phase !== "idle" || exhausted} onClick={() => send({ type: "quiz:open" })}>Ouvrir le buzzer</button>}
      <button className="ay-button qz-right" disabled={!judging} onClick={() => send({ type: "quiz:correct" })}>✓ Vrai</button>
      <button className="ay-button fd-wrong" disabled={!judging} onClick={() => send({ type: "quiz:wrong" })}>✕ Faux</button>
      <button className="ay-button" disabled={view.phase !== "buzzed"} onClick={() => send({ type: "quiz:reset-buzz" })}>Annuler le buzz</button>
    </section>
    <section className="ay-host-controls" aria-label="Déroulé">
      <button className="ay-button" disabled={view.phase === "revealed" || view.phase === "done"} onClick={() => send({ type: "quiz:reveal" })}>Révéler la réponse</button>
      <button className="ay-button is-primary" disabled={view.phase !== "revealed"} onClick={() => send({ type: "quiz:next" })}>{last ? "Terminer l'épreuve" : `${look.item} suivant${view.kind === "citations" ? "e" : ""}`}</button>
      <button className="ay-button" disabled={!view.canUndo} onClick={() => send({ type: "quiz:undo" })}>Annuler la dernière action</button>
      <button className="ay-button" onClick={() => send({ type: "quiz:start", kind: view.kind, difficulty: view.difficulty })}>Recommencer l'épreuve</button>
    </section>

    <div className="fd-host-players">
      {PLAYERS.map(id => <section key={id} className={`ay-side ${id}` + (buzzWinner === id ? " is-buzzing" : "")}>
        <h2><i className={"ay-dot" + (view.connected[id] ? " is-on" : "")} aria-hidden="true" />{names[id]}</h2>
        <p className="ay-status">{view.connected[id] ? "Connecté" : "Déconnecté"}{lockLeft(id) > 0 ? ` · bloqué ${lockLeft(id)} s` : ""}</p>
        <label className="fd-photo fd-photo-host">
          <FeudAvatar player={id} name={names[id]} image={view.avatars[id]} />
          <span>{view.avatars[id] ? "Changer la photo" : "Ajouter une photo"}</span>
          <input type="file" accept="image/*" hidden onChange={async event => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) try { send({ type: "room:avatar", player: id, image: await shrinkPhoto(file) }); } catch { /* fichier illisible : la photo actuelle reste */ }
          }} />
        </label>
        <QuizAttempts left={view.attempts[id]} max={view.maxAttempts} />
        <dl><div><dt>Score</dt><dd>{view.scores[id]}</dd></div></dl>
      </section>)}
    </div>

    <ol className="qz-items">{view.items.map((item, index) => <li key={index} className={(index + 1 === view.itemNumber && view.phase !== "done" ? "is-current " : "") + (item.winner ?? "")}>
      <span>{index + 1}. {item.answer}</span><em>{item.points} pts</em><b>{item.played ? (item.winner ? names[item.winner] : "Personne") : ""}</b>
    </li>)}</ol>

    <RoomLinks room={view.room} names={names} />
  </main>;
}
