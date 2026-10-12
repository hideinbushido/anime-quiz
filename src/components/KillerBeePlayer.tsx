import { useCallback, useEffect, useRef, useState } from "react";
import type { Epreuve, GameControls, PlayerId } from "../types";
import { buzzCooldown, buzzedPlayer, canPlayerBuzz, newKillerBeeState, type DuelBuzzSource } from "../duel/killerBee";
import { currentFeedback } from "../duel/engine";
import { EpreuveLogo } from "./EpreuveLogo";
import { KillerBeeDeck } from "./killerBee/KillerBeeDeck";

interface Props extends GameControls {
  epreuve: Epreuve;
  buzzSource?: DuelBuzzSource;
  showLocalBuzzers?: boolean;
}

const PLAYER_IDS = ["player1", "player2"] as const;
const BUZZ_KEYS = { player1: { code: "ArrowLeft", hint: "←" }, player2: { code: "ArrowRight", hint: "→" } };
const timecode = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

function RevealJingle({ src }: { src: string }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    const element = audio.current;
    element?.play().catch(() => undefined);
    return () => { element?.pause(); };
  }, []);
  return <>
    <audio ref={audio} src={src} className="beats-reveal-audio" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} />
    <button className="beats-play beats-player-icon beats-play-start" aria-label={playing ? "Mettre la révélation en pause" : "Lire la révélation"} onClick={() => { const el = audio.current; if (el?.paused) el.play().catch(() => undefined); else el?.pause(); }}>
      <svg viewBox="0 0 24 24" aria-hidden="true">{playing ? <path d="M6 5h4v14H6zM14 5h4v14h-4z" /> : <path d="M8 4v16l13-8z" />}</svg>
    </button>
  </>;
}

export function KillerBeePlayer({ epreuve, progress, players, difficulty = "D", onKillerBee, onNext, buzzSource, showLocalBuzzers = true }: Props) {
  const tracks = epreuve.killerBeeTracks ?? epreuve.difficulties[difficulty].killerBeeTracks ?? [];
  const track = tracks[progress.roundIndex];
  const state = progress.killerBee ?? newKillerBeeState();
  const player = buzzedPlayer(state);
  const result = currentFeedback(progress);
  const audio = useRef<HTMLAudioElement>(null);
  const session = useRef<HTMLDivElement>(null);
  const firstBuzz = useRef(false);
  const snapshot = useRef({ state, result });
  snapshot.current = { state, result };
  const [audioNotice, setAudioNotice] = useState("");
  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState(false);
  const names = { player1: players?.player1.name ?? "Joueur 1", player2: players?.player2.name ?? "Joueur 2" };
  const onPlayerBuzz = useCallback((id: PlayerId) => {
    if (firstBuzz.current || snapshot.current.result || !canPlayerBuzz(snapshot.current.state, id)) return;
    firstBuzz.current = true;
    audio.current?.pause(); // Synchronous, before React renders the winning buzz.
    onKillerBee?.({ type: "buzz", playerId: id, audioTime: audio.current?.currentTime });
  }, [onKillerBee]);
  useEffect(() => buzzSource?.subscribe(onPlayerBuzz), [buzzSource, onPlayerBuzz]);
  const blocked1 = buzzCooldown(state, "player1") > 0, blocked2 = buzzCooldown(state, "player2") > 0;
  useEffect(() => {
    firstBuzz.current = Boolean(player || result || state.phase === "roundComplete");
    if (player || result || state.phase === "roundComplete") audio.current?.pause();
    else {
      buzzSource?.resetBuzz?.();
    }
    for (const id of PLAYER_IDS) {
      if (!canPlayerBuzz(snapshot.current.state, id)) buzzSource?.lockPlayer?.(id);
    }
  }, [state.phase, state.attempts.player1, state.attempts.player2, blocked1, blocked2, track?.id, player, result, buzzSource]);
  useEffect(() => {
    const element = audio.current;
    if (element) { element.pause(); element.currentTime = state.audioTime; }
    setPlaying(false);
    setAudioNotice("");
    return () => { element?.pause(); };
    // Restore position only when mounting a track, never on each time update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track?.id]);
  useEffect(() => {
    // The stage fills what is left of the viewport under the navbar and duel header.
    const fit = () => session.current?.style.setProperty("--kb-top", `${Math.round(session.current.getBoundingClientRect().top + window.scrollY)}px`);
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);
  useEffect(() => {
    // Shortcuts press the matching on-screen button, so they follow exactly the same rules.
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select")) return;
      const onButton = Boolean(target?.closest("button, summary, a"));
      if ((event.code === "Space" || event.code === "Enter") && onButton) return;
      const button = session.current?.querySelector<HTMLButtonElement>(`button[data-key="${event.code}"]:not(:disabled)`);
      if (!button) return;
      event.preventDefault();
      button.click();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  if (!track) return <p className="duel-notice">Aucun morceau configuré pour cette classe.</p>;
  const exhausted = state.phase === "roundComplete";
  const listening = !player && !result && !exhausted;
  const headline = player ? `${names[player].toUpperCase()} BUZZ !` : exhausted ? "Fin du morceau" : playing ? "À l’écoute" : "Pause";

  const corner = (id: PlayerId) => {
    const attempts = state.attempts[id];
    const wait = attempts > 0 && !player ? Math.ceil(buzzCooldown(state, id)) : 0;
    const won = Boolean(result?.correct && result.playerId === id);
    return <section key={id} className={`beats-corner ${id}` + (player === id ? " beats-buzz-active" : "") + (player && player !== id ? " beats-corner-dim" : "") + (won ? " beats-corner-won" : "")}>
      <strong className="beats-corner-name">{names[id]}</strong>
      <span className="beats-corner-score"><b>{players?.[id].score ?? progress.rounds.filter(r => r.playerId === id).reduce((sum, r) => sum + r.points, 0)}</b> pts</span>
      {!result && <>
        <span className="beats-lives" role="img" aria-label={`${attempts} tentative${attempts > 1 ? "s" : ""} restante${attempts > 1 ? "s" : ""}`}>{[1, 2].map(life => <svg key={life} viewBox="0 0 64 16" className={"beats-blade" + (life > attempts ? " beats-blade-spent" : "")}>
          <rect x="1" y="5" width="15" height="6" rx="2" /><rect x="16" y="1" width="3.5" height="14" rx="1.5" /><path d="M20 4.6 H52 L63 8 L52 11.4 H20 Z" />
        </svg>)}</span>
        {showLocalBuzzers && <button className={"beats-buzzer" + (player === id ? " beats-buzzer-hit" : "")} aria-label={`Buzz de ${names[id]}`} data-key={BUZZ_KEYS[id].code} data-keyhint={BUZZ_KEYS[id].hint} disabled={!canPlayerBuzz(state, id)} onClick={() => onPlayerBuzz(id)}>{wait > 0 ? <>Bloqué <b>{wait}</b></> : <>Buzz <b>J{id === "player1" ? 1 : 2}</b></>}</button>}
      </>}
      {won && result && <span className="beats-corner-gain" aria-hidden="true">+{result.points}</span>}
    </section>;
  };

  const hint = !track.audioSrc ? "Extrait indisponible." : playing ? "En attente d'un buzz…" : state.audioTime > 0 ? "Morceau en pause." : "Lance le morceau quand les joueurs sont prêts.";

  return <div className="beats-session" ref={session} data-state={state.phase}>
    <div className="beats-backdrop" aria-hidden="true"><span>八</span><span>尾</span></div>
    {player && <div key={player + state.attempts[player]} className={`beats-impact ${player}`} aria-hidden="true" />}
    <header className="beats-header">
      <div className="beats-header-logo"><EpreuveLogo epreuveId={epreuve.id} /></div>
      <p className="beats-meta"><span>Classe {track.difficulty}</span>Morceau {progress.roundIndex + 1}/{tracks.length}</p>
    </header>
    <main className={"beats-stage" + (result ? " beats-stage-revealed" : "")}>
      {corner("player1")}
      {result ? <section className="beats-reveal-scene" key={track.id}>
        <div className="beats-reveal-media">
          <div className="beats-sleeve-disc" />
          <div className="beats-sleeve">{track.imageSrc ? <img src={track.imageSrc} alt={track.anime} />
            : <div className="beats-sleeve-type" aria-hidden="true">{[0, 1, 2, 3, 4, 5].map(row => <span key={row}>{track.anime} {track.anime}</span>)}<b>{track.anime}</b></div>}</div>
        </div>
        <div className="beats-reveal-info"><span>La réponse</span><strong>{track.anime}</strong><p className={result.correct ? result.playerId : ""}>{result.correct ? `${names[result.playerId]} +${result.points} pts` : "Aucun gagnant · 0 pt"}</p></div>
      </section> : <section className="beats-console">
        <div className="beats-turntable"><KillerBeeDeck audio={audio} /></div>
        <div className="beats-now-playing"><strong role="status"><span key={headline}>{headline}</span></strong></div>
      </section>}
      {corner("player2")}
    </main>
    <footer className="beats-dock">
      {!result && <div className="beats-audio">
        {track.audioSrc && <><audio ref={audio} preload="auto" src={track.audioSrc}
          onLoadedMetadata={event => setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)}
          onTimeUpdate={() => { if (listening && audio.current) onKillerBee?.({ type: "audioTime", audioTime: audio.current.currentTime }); }}
          onError={() => setAudioNotice("Extrait indisponible.")}
          onPlay={() => { setPlaying(true); setAudioNotice(""); }}
          onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} />
          <div className="beats-transport" role="group" aria-label="Commandes de la musique">
            <button className="beats-play beats-player-icon beats-play-restart" aria-label="Revenir au début" disabled={!listening} onClick={() => { const el = audio.current; if (el) { el.pause(); el.currentTime = 0; onKillerBee?.({ type: "audioTime", audioTime: 0 }); } }}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h3v14H5zM19 5v14L9 12z" /></svg>
            </button>
            <button className={"beats-play beats-player-icon beats-play-start" + (audioNotice ? " beats-play-needed" : "")} aria-label={playing ? "Pause" : "Lecture"} data-key="Space" disabled={!listening} onClick={() => { const el = audio.current; if (!el) return; if (!el.paused) el.pause(); else { if (el.ended) el.currentTime = 0; el.play().catch(() => setAudioNotice("Lecture indisponible.")); } }}>
              <svg viewBox="0 0 24 24" aria-hidden="true">{playing ? <path d="M6 5h4v14H6zM14 5h4v14h-4z" /> : <path d="M8 4v16l13-8z" />}</svg>
            </button>
          </div>
          <div className="beats-progress" role="img" aria-label={`Lecture : ${timecode(state.audioTime)}${duration ? ` sur ${timecode(duration)}` : ""}`}>
            <span className="beats-progress-track"><i style={{ transform: `scaleX(${duration ? Math.min(1, state.audioTime / duration) : 0})` }} /></span>
            <b>{timecode(state.audioTime)}{duration ? ` / ${timecode(duration)}` : ""}</b>
          </div></>}
        {audioNotice && <p role="status">{audioNotice}</p>}
      </div>}
      <div className="beats-answer-row">
        {result ? <>
          {track.revealAudioSrc && <RevealJingle src={track.revealAudioSrc} />}
          <button className="beats-submit" data-key="Enter" data-keyhint="Entrée" onClick={onNext}>{progress.roundIndex === tracks.length - 1 ? "Terminer l'épreuve" : "Morceau suivant"}</button>
        </> : player ? <>
          <p className="beats-hint">Réponse orale de {names[player]} : le présentateur tranche.</p>
          <button className="beats-judge beats-judge-correct" aria-label="Bonne réponse" data-key="KeyV" data-keyhint="V" onClick={() => onKillerBee?.({ type: "judge", correct: true })}>
            <svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="15" pathLength="100" strokeDasharray="91 9" transform="rotate(-70 24 24)" /></svg>Vrai</button>
          <button className="beats-judge beats-judge-incorrect" aria-label="Mauvaise réponse" data-key="KeyF" data-keyhint="F" onClick={() => onKillerBee?.({ type: "judge", correct: false })}>
            <svg viewBox="0 0 48 48" aria-hidden="true"><path d="M11 10 L37 38 M38 9 L10 39" /></svg>Faux</button>
        </> : exhausted ? <>
          <p className="beats-hint">Plus aucune tentative : personne n'a trouvé.</p>
          <button className="beats-submit" data-key="Enter" data-keyhint="Entrée" onClick={() => onKillerBee?.({ type: "reveal" })}>Révéler</button>
        </> : <p className="beats-hint" role="status">{hint}</p>}
      </div>
      <nav className="beats-rounds" aria-label="Progression des morceaux">{tracks.map((item, index) => {
        const outcome = progress.rounds[index];
        const label = outcome ? (outcome.correct ? `trouvé par ${names[outcome.playerId]}` : "personne n'a trouvé") : index === progress.roundIndex ? "en cours" : "à venir";
        return <span key={item.id} className={"beats-round" + (index === progress.roundIndex ? " beats-round-current" : "") + (outcome ? ` beats-round-done ${outcome.correct ? outcome.playerId : "beats-round-missed"}` : "")}
          role="img" aria-label={`Morceau ${index + 1} : ${label}`} aria-current={index === progress.roundIndex ? "step" : undefined}>
          <strong aria-hidden="true">{index + 1}</strong>
        </span>;
      })}</nav>
    </footer>
  </div>;
}
