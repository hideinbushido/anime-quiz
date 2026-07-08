import { useEffect, useMemo, useRef, useState } from "react";
import type { Epreuve, SessionState } from "../types";
import { loadLeaderboard } from "../utils";
import { LogoHero } from "./Logo";
import { TitleReadyScene } from "./TitleReadyScene";

interface Props {
  savedSession: SessionState | null;
  epreuves: Epreuve[];
  onPlay: (playerName: string) => void;
  onContinue: () => void;
  onScores: () => void;
  onDeleteSession: () => void;
}

const MAX_VISIBLE_SCORES = 4;

function getSessionMode(session: SessionState, epreuves: Epreuve[]): string {
  if (session.phase === "selection") return "Sélection";
  if (session.phase === "recap") return "Récap";

  const lastResultId = session.results.at(-1)?.epreuveId;
  const currentId = session.selectedIds[session.currentIndex] ?? lastResultId;
  return epreuves.find((epreuve) => epreuve.id === currentId)?.nom ?? "Menu";
}

function getSessionScore(session: SessionState): number {
  return session.results.reduce((sum, result) => sum + result.points, 0);
}

export function TitleScreen({
  savedSession,
  epreuves,
  onPlay,
  onContinue,
  onScores,
  onDeleteSession,
}: Props) {
  const [name, setName] = useState(savedSession?.playerName ?? "");
  const [leaving, setLeaving] = useState(false);
  const [muted, setMuted] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const leaderboard = useMemo(() => loadLeaderboard(), []);
  const totalScore = leaderboard.reduce((sum, entry) => sum + entry.score, 0);
  const sessionScore = savedSession ? getSessionScore(savedSession) : 0;
  const sessionMode = savedSession ? getSessionMode(savedSession, epreuves) : "";

  useEffect(() => {
    audioRef.current?.play().catch(() => setBlocked(true));
  }, []);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    glowRef.current?.style.setProperty("--mx", `${x * 30}px`);
    glowRef.current?.style.setProperty("--my", `${y * 30}px`);
  }

  function ensureAudioPlaying() {
    if (audioRef.current?.paused) {
      audioRef.current.play().then(() => setBlocked(false)).catch(() => {});
    }
  }

  function toggleMute() {
    setMuted((m) => !m);
    ensureAudioPlaying();
  }

  function handleReady() {
    if (!name.trim() || leaving) return;
    setLeaving(true);
    window.setTimeout(() => onPlay(name.trim()), 480);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    handleReady();
  }

  function handleContinue() {
    if (!savedSession || leaving) return;
    setLeaving(true);
    window.setTimeout(onContinue, 320);
  }

  function handleDeleteSession() {
    if (!savedSession || leaving) return;
    onDeleteSession();
    setName("");
  }

  return (
    <div
      className={"title-screen" + (leaving ? " title-leaving" : "")}
      onMouseMove={handleMouseMove}
    >
      <audio ref={audioRef} src="/audio/theme-titre.mp3" loop muted={muted} autoPlay />

      <div ref={glowRef} className="title-glows" aria-hidden>
        <span className="title-glow title-glow-red" />
        <span className="title-glow title-glow-blue" />
      </div>
      <div className="title-cabinet-lines" aria-hidden />
      <div className="title-vignette" aria-hidden />

      <button
        type="button"
        className="title-music-toggle"
        onClick={toggleMute}
        title={muted ? "Activer le son" : "Couper le son"}
      >
        {muted ? "OFF" : "ON"}
      </button>
      {blocked && !muted && <p className="title-music-hint">Audio en attente</p>}

      <div className="title-content">
        <section className="title-hero animate-fade-up" style={{ animationDelay: "0.05s" }}>
          <div className="title-logo">
            <LogoHero />
          </div>

          <form className="title-form" onSubmit={handleSubmit}>
            <label className="title-label" htmlFor="player-name">
              Nom du joueur
            </label>
            <div className="title-launch-row">
              <input
                id="player-name"
                className="title-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onFocus={ensureAudioPlaying}
                placeholder="Entre ton nom"
                autoFocus
                maxLength={20}
              />
            </div>
          </form>

          <button className="title-total-score" type="button" onClick={onScores}>
            <span>Score total des participants</span>
            <strong>{totalScore}</strong>
          </button>

          {savedSession && (
            <div className="title-session-actions">
              <button className="title-continue" type="button" onClick={handleContinue}>
                Continuer la partie en cours
              </button>
              <button
                className="title-delete-session"
                type="button"
                onClick={handleDeleteSession}
              >
                Supprimer
              </button>
            </div>
          )}
        </section>

        <section className="title-stage animate-fade-up" style={{ animationDelay: "0.14s" }}>
          <button
            type="button"
            className="title-platform-wrap"
            onClick={handleReady}
            disabled={!name.trim()}
            aria-label="Entrer dans le menu"
          >
            <TitleReadyScene />
            <span className="title-platform-core">
              <span>READY</span>
            </span>
          </button>

          {savedSession && (
            <div className="title-side-panel">
              <div className="title-stat">
                <span>MODE</span>
                <strong>{sessionMode}</strong>
              </div>
              <div className="title-stat">
                <span>JOUEUR</span>
                <strong>{savedSession.playerName}</strong>
              </div>
              <div className="title-stat">
                <span>SCORE</span>
                <strong>{sessionScore}</strong>
              </div>
            </div>
          )}
        </section>

        {leaderboard.length > 0 && (
          <section className="title-scores animate-fade-up" style={{ animationDelay: "0.22s" }}>
            <p className="title-scores-label">Top runs</p>
            <ol className="title-scores-list">
              {leaderboard.slice(0, MAX_VISIBLE_SCORES).map((entry, i) => (
                <li key={`${entry.name}-${entry.date}`} className="title-scores-row">
                  <span className="title-scores-rank">0{i + 1}</span>
                  <span className="title-scores-name">{entry.name}</span>
                  <span className="title-scores-points">{entry.score}</span>
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>
    </div>
  );
}
