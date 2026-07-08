import { useEffect, useRef, useState } from "react";
import { epreuves } from "./data/epreuves";
import type { EpreuveResult, Phase, SessionState } from "./types";
import { TitleScreen } from "./components/TitleScreen";
import { EpreuveGrid } from "./components/EpreuveGrid";
import { EpreuvePlayer } from "./components/EpreuvePlayer";
import { Recap } from "./components/Recap";
import { Navbar } from "./components/Navbar";
import { Scoreboard } from "./components/Scoreboard";
import {
  addLeaderboardEntry,
  clearSession,
  loadSession,
  saveSession,
} from "./utils";
import "./App.css";

const MAX_SELECTION = 5;

const PHASE_PATH: Record<Phase, string> = {
  title: "/",
  selection: "/menu",
  playing: "/jeu",
  recap: "/recap",
  scores: "/scores",
};

function phaseFromPath(pathname: string): Phase {
  const match = (Object.entries(PHASE_PATH) as [Phase, string][]).find(
    ([, path]) => path === pathname
  );
  return match ? match[0] : "title";
}

function App() {
  const [savedSession, setSavedSession] = useState<SessionState | null>(() =>
    loadSession()
  );
  const [phase, setPhase] = useState<Phase>(() =>
    phaseFromPath(window.location.pathname)
  );
  const [playerName, setPlayerName] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<EpreuveResult[]>([]);
  const [recorded, setRecorded] = useState(false);
  const mountedRef = useRef(false);
  const isPoppingRef = useRef(false);

  const score = results.reduce((sum, r) => sum + r.points, 0);

  useEffect(() => {
    if (phase === "title" || phase === "scores") return;
    const session = { phase, playerName, selectedIds, currentIndex, results, recorded };
    saveSession(session);
    setSavedSession(session);
  }, [phase, playerName, selectedIds, currentIndex, results, recorded]);

  useEffect(() => {
    if (phase === "recap" && !recorded) {
      addLeaderboardEntry({
        name: playerName,
        score,
        date: new Date().toISOString(),
        epreuveIds: results.map((result) => result.epreuveId),
      });
      setRecorded(true);
    }
  }, [phase, recorded, playerName, results, score]);

  useEffect(() => {
    window.history.replaceState({ phase }, "", PHASE_PATH[phase]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    if (isPoppingRef.current) {
      isPoppingRef.current = false;
      return;
    }
    window.history.pushState({ phase }, "", PHASE_PATH[phase]);
  }, [phase]);

  useEffect(() => {
    function handlePopState(event: PopStateEvent) {
      const nextPhase =
        (event.state as { phase?: Phase } | null)?.phase ??
        phaseFromPath(window.location.pathname);
      isPoppingRef.current = true;
      setPhase(nextPhase);
    }
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  function toggleSelection(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length < MAX_SELECTION
        ? [...prev, id]
        : prev
    );
  }

  function startSession() {
    setResults([]);
    setCurrentIndex(0);
    setRecorded(false);
    setPhase("playing");
  }

  function startNewPlayer(name: string) {
    clearSession();
    setSavedSession(null);
    setPlayerName(name);
    setSelectedIds([]);
    setResults([]);
    setCurrentIndex(0);
    setRecorded(false);
    setPhase("selection");
  }

  function continueSavedSession() {
    if (!savedSession) return;
    setPlayerName(savedSession.playerName);
    setSelectedIds(savedSession.selectedIds);
    setCurrentIndex(savedSession.currentIndex);
    setResults(savedSession.results);
    setRecorded(savedSession.recorded);
    setPhase(savedSession.phase);
  }

  function showScores() {
    setPhase("scores");
  }

  function deleteSavedSession() {
    clearSession();
    setSavedSession(null);
    setPlayerName("");
    setSelectedIds([]);
    setCurrentIndex(0);
    setResults([]);
    setRecorded(false);
    setPhase("title");
  }

  function handleEpreuveComplete(result: EpreuveResult) {
    setResults((prev) => [
      ...prev.filter((r) => r.epreuveId !== result.epreuveId),
      result,
    ]);
    const answeredIndex = selectedIds.indexOf(result.epreuveId);
    if (answeredIndex + 1 < selectedIds.length) {
      setCurrentIndex(answeredIndex + 1);
    } else {
      setPhase("recap");
    }
  }

  function restart() {
    setSelectedIds([]);
    setResults([]);
    setCurrentIndex(0);
    setRecorded(false);
    setPhase("selection");
  }

  if (phase === "title") {
    return (
      <TitleScreen
        savedSession={savedSession}
        epreuves={epreuves}
        onPlay={startNewPlayer}
        onContinue={continueSavedSession}
        onScores={showScores}
        onDeleteSession={deleteSavedSession}
      />
    );
  }

  if (phase === "scores") {
    return <Scoreboard epreuves={epreuves} onBack={() => setPhase("title")} />;
  }

  return (
    <>
      <Navbar
        phase={phase}
        playerName={playerName}
        canGoRecap={recorded || phase === "recap"}
        onNavigate={setPhase}
      />

      {phase === "playing" &&
        (() => {
          const epreuve = epreuves.find((e) => e.id === selectedIds[currentIndex])!;
          return (
            <EpreuvePlayer
              key={epreuve.id}
              epreuve={epreuve}
              onComplete={handleEpreuveComplete}
            />
          );
        })()}

      {phase === "recap" && (
        <Recap epreuves={epreuves} results={results} onRestart={restart} />
      )}

      {phase === "selection" && (
        <EpreuveGrid
          epreuves={epreuves}
          playerName={playerName}
          selectedIds={selectedIds}
          playedIds={results.map((r) => r.epreuveId)}
          maxSelection={Math.min(MAX_SELECTION, epreuves.length)}
          score={score}
          onToggle={toggleSelection}
          onStart={startSession}
        />
      )}
    </>
  );
}

export default App;
