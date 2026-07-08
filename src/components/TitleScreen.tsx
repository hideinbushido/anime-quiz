import { useEffect, useMemo, useRef, useState } from "react";
import { loadLeaderboard } from "../utils";
import { LogoHero } from "./Logo";

interface Props {
  onPlay: (playerName: string) => void;
}

const MAX_VISIBLE_SCORES = 5;

const NOTES = ["♪", "♫", "♬", "♩"];

function useFloatingNotes(count: number) {
  return useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => ({
        id: i,
        glyph: NOTES[i % NOTES.length],
        left: 4 + ((i * 137) % 92),
        size: 14 + ((i * 53) % 22),
        duration: 7 + ((i * 29) % 10),
        delay: -((i * 17) % 12),
      })),
    [count]
  );
}

export function TitleScreen({ onPlay }: Props) {
  const [name, setName] = useState("");
  const [leaving, setLeaving] = useState(false);
  const [muted, setMuted] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const notes = useFloatingNotes(10);
  const leaderboard = useMemo(() => loadLeaderboard(), []);

  useEffect(() => {
    audioRef.current?.play().catch(() => setBlocked(true));
  }, []);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    glowRef.current?.style.setProperty("--mx", `${x * 40}px`);
    glowRef.current?.style.setProperty("--my", `${y * 40}px`);
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

  function handlePlay(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || leaving) return;
    setLeaving(true);
    window.setTimeout(() => onPlay(name.trim()), 480);
  }

  return (
    <div
      className={"title-screen" + (leaving ? " title-leaving" : "")}
      onMouseMove={handleMouseMove}
    >
      <audio ref={audioRef} src="/audio/theme-titre.mp3" loop muted={muted} autoPlay />

      <div ref={glowRef} className="title-glows" aria-hidden>
        <span className="title-glow title-glow-magenta" />
        <span className="title-glow title-glow-cyan" />
      </div>

      <div className="title-notes" aria-hidden>
        {notes.map((n) => (
          <span
            key={n.id}
            className="title-note"
            style={{
              left: `${n.left}%`,
              fontSize: `${n.size}px`,
              animationDuration: `${n.duration}s`,
              animationDelay: `${n.delay}s`,
            }}
          >
            {n.glyph}
          </span>
        ))}
      </div>

      <div className="title-vignette" aria-hidden />

      <button
        type="button"
        className="title-music-toggle"
        onClick={toggleMute}
        title={muted ? "Activer le son" : "Couper le son"}
      >
        {muted ? "🔇" : "🔊"}
      </button>
      {blocked && !muted && (
        <p className="title-music-hint">♪ Clique pour lancer le son</p>
      )}

      <div className="title-content">
        <div className="title-logo animate-fade-up" style={{ animationDelay: "0.08s" }}>
          <LogoHero />
        </div>

        <p className="title-tagline animate-fade-up" style={{ animationDelay: "0.16s" }}>
          Openings, répliques cultes et souvenirs d'anime t'attendent.
        </p>

        <form
          className="title-form animate-fade-up"
          style={{ animationDelay: "0.24s" }}
          onSubmit={handlePlay}
        >
          <label className="title-label" htmlFor="player-name">
            Ton nom, joueur
          </label>
          <input
            id="player-name"
            className="title-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onFocus={ensureAudioPlaying}
            placeholder="Entre ton pseudo"
            autoFocus
            maxLength={20}
          />
          <button className="btn-primary title-play" type="submit" disabled={!name.trim()}>
            JOUER
          </button>
        </form>

        {leaderboard.length > 0 && (
          <div className="title-scores animate-fade-up" style={{ animationDelay: "0.32s" }}>
            <p className="title-scores-label">MEILLEURS SCORES</p>
            <ol className="title-scores-list">
              {leaderboard.slice(0, MAX_VISIBLE_SCORES).map((entry, i) => (
                <li key={`${entry.name}-${entry.date}`} className="title-scores-row">
                  <span className="title-scores-rank">#{i + 1}</span>
                  <span className="title-scores-name">{entry.name}</span>
                  <span className="title-scores-points">{entry.score} pts</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
