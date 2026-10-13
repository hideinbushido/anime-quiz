import { useEffect, useState } from "react";
import type { DuelSession, Epreuve, PlayerId, SelectedEpreuve } from "../../types";
import { useRoom } from "../../realtime/roomContext";
import { AyanokojiHost } from "../ayanokoji/AyanokojiHost";
import { DossierHost } from "../dossier/DossierHost";
import { FeudHost } from "../feud/FeudHost";
import { QuizHost } from "../quiz/QuizHost";
import { EpreuveLogo } from "../EpreuveLogo";
import { RoomLinks } from "./RoomLinks";
import { roomOf } from "../../realtime/roomOf";

interface Props {
  session: DuelSession;
  epreuve: Epreuve;
  current: SelectedEpreuve;
  /** Clôt l'épreuve avec les points de chacun : le duel passe à la suivante. */
  onComplete: (scores: Record<PlayerId, number>) => void;
}

/** La clé qui retient, sur cet appareil, qu'une épreuve du duel a déjà été lancée. */
const startedKey = (session: DuelSession) => `anime-quiz-epreuve-lancee-${session.id}-${session.currentIndex}`;

/**
 * Une épreuve du duel, côté présentateur. Avant le lancement, le live montre
 * l'écran d'émission (programme et score) ; au lancement, l'épreuve repart de
 * zéro sur le serveur et la régie de cette épreuve s'affiche ici. À la fin, le
 * présentateur la clôt : ses points entrent dans le duel et la suivante attend.
 */
export function RealtimeStage({ session, epreuve, current, onComplete }: Props) {
  const { game, view, feud, dossier, quiz, status, send } = useRoom();
  const target = epreuve.realtime!;
  const key = startedKey(session);
  const [started, setStarted] = useState(() => { try { return localStorage.getItem(key) === "1"; } catch { return false; } });
  const [confirming, setConfirming] = useState(false);
  useEffect(() => {
    if (!confirming) return;
    const timer = window.setTimeout(() => setConfirming(false), 4000);
    return () => window.clearTimeout(timer);
  }, [confirming]);

  // Tant que l'épreuve n'est pas lancée, tous les écrans restent sur l'émission ; ensuite, sur l'épreuve
  // (y compris après un rechargement de cette page, sans rien remettre à zéro)
  const wanted = started ? target : "lobby";
  useEffect(() => {
    if (status === "online" && game !== null && game !== wanted) send({ type: "room:game", game: wanted });
  }, [status, game, wanted, send]);

  const launch = () => {
    // Chaque épreuve repart de zéro : c'est un nouveau duel
    if (target === "beats" || target === "citations") send({ type: "quiz:start", kind: target, difficulty: epreuve.classless ? null : current.difficulty });
    else {
      send({ type: "room:game", game: target });
      if (target === "feud") send({ type: "feud:restart" });
      if (target === "dossier") send({ type: "dossier:restart" });
      if (target === "ayanokoji") send({ type: "ayanokoji:load", roundId: `${current.difficulty.toLowerCase()}1` });
    }
    try { localStorage.setItem(key, "1"); } catch { /* sans stockage, un rechargement redemandera de lancer l'épreuve */ }
    setStarted(true);
  };

  // Les points de l'épreuve, lus sur la régie en cours
  const scores: Record<PlayerId, number> | null =
    (target === "beats" || target === "citations") && quiz ? quiz.scores
      : target === "feud" && feud ? feud.totals
      : target === "dossier" && dossier ? dossier.wins
      : target === "ayanokoji" && view ? view.scores : null;
  const names = { player1: session.players.player1.name, player2: session.players.player2.name };
  const last = session.currentIndex >= session.selected.length - 1;

  if (!started) return <section className="rt-launch">
    <div className="rt-launch-emblem"><EpreuveLogo epreuveId={epreuve.id} /></div>
    <p className="duel-eyebrow">Épreuve {session.currentIndex + 1}/{session.selected.length}{epreuve.classless ? "" : ` · Classe ${current.difficulty}`}</p>
    <h1>{epreuve.nom}</h1>
    <p className="rt-launch-theme">{epreuve.theme}</p>
    <button className="btn-primary" disabled={status !== "online"} onClick={launch}>Lancer l'épreuve</button>
    {status !== "online" && <p className="duel-notice" role="status">Connexion au serveur… Le serveur peut mettre une minute à se réveiller.</p>}
    <p className="rt-launch-hint">Le live affiche pour l'instant le programme et le score. L'épreuve apparaît chez tout le monde au lancement.</p>
    <RoomLinks room={roomOf(session)} names={names} />
  </section>;

  return <div className="rt-stage">
    {target === "ayanokoji" ? <AyanokojiHost /> : target === "feud" ? <FeudHost /> : target === "dossier" ? <DossierHost /> : <QuizHost />}
    <footer className="rt-finish" aria-label="Fin de l'épreuve">
      <p><span className="player1">{names.player1} <b>{scores?.player1 ?? 0}</b></span><i aria-hidden="true">–</i><span className="player2"><b>{scores?.player2 ?? 0}</b> {names.player2}</span></p>
      <button className="btn-primary" disabled={!scores} onClick={() => { if (confirming && scores) onComplete(scores); else setConfirming(true); }}>
        {confirming ? "Confirmer : clore l'épreuve" : last ? "Terminer l'épreuve et le duel" : "Terminer l'épreuve"}
      </button>
    </footer>
  </div>;
}
