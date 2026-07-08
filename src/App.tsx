import { useEffect, useRef, useState } from "react";
import { epreuves } from "./data/epreuves";
import type { EpreuveResult, Phase } from "./types";
import { TitleScreen } from "./components/TitleScreen";
import { EpreuveGrid } from "./components/EpreuveGrid";
import { EpreuvePlayer } from "./components/EpreuvePlayer";
import { Recap } from "./components/Recap";
import { Navbar } from "./components/Navbar";
import {
  addLeaderboardEntry,
  clearSession,
  loadSession,
  saveSession,
} from "./utils";
import "./App.css";

const MAX_SELECTION = 5;

// Chaque écran a sa propre URL pour que le bouton précédent/suivant du
// navigateur fonctionne comme sur un site normal, au lieu de quitter l'appli.
const PHASE_PATH: Record<Phase, string> = {
  title: "/",
  selection: "/menu",
  playing: "/jeu",
  recap: "/recap",
};

function phaseFromPath(pathname: string): Phase {
  const match = (Object.entries(PHASE_PATH) as [Phase, string][]).find(
    ([, path]) => path === pathname
  );
  return match ? match[0] : "title";
}

function App() {
  const savedSession = loadSession();
  const [phase, setPhase] = useState<Phase>(savedSession?.phase ?? "title");
  const [playerName, setPlayerName] = useState(savedSession?.playerName ?? "");
  const [selectedIds, setSelectedIds] = useState<string[]>(
    savedSession?.selectedIds ?? []
  );
  const [currentIndex, setCurrentIndex] = useState(
    savedSession?.currentIndex ?? 0
  );
  const [results, setResults] = useState<EpreuveResult[]>(
    savedSession?.results ?? []
  );
  const [recorded, setRecorded] = useState(savedSession?.recorded ?? false);
  const mountedRef = useRef(false);
  const isPoppingRef = useRef(false);

  const score = results.reduce((sum, r) => sum + r.points, 0);

  // Sauvegarde continue pour pouvoir reprendre la partie après une fermeture accidentelle.
  useEffect(() => {
    if (phase === "title") {
      clearSession();
      return;
    }
    saveSession({ phase, playerName, selectedIds, currentIndex, results, recorded });
  }, [phase, playerName, selectedIds, currentIndex, results, recorded]);

  // Enregistre le score final dans le classement une seule fois par partie.
  useEffect(() => {
    if (phase === "recap" && !recorded) {
      addLeaderboardEntry({ name: playerName, score, date: new Date().toISOString() });
      setRecorded(true);
    }
  }, [phase, recorded, playerName, score]);

  // Aligne l'URL sur l'écran affiché, sans ajouter d'entrée d'historique au premier rendu.
  useEffect(() => {
    window.history.replaceState({ phase }, "", PHASE_PATH[phase]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Chaque changement d'écran (hors retour navigateur) devient une entrée d'historique.
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

  // Bouton précédent/suivant du navigateur : on resynchronise l'écran affiché.
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
    setPhase("playing");
  }

  function handleEpreuveComplete(result: EpreuveResult) {
    // Indexé sur l'épreuve elle-même (pas sur currentIndex) pour rester correct
    // si l'utilisateur revient en arrière puis rejoue une épreuve déjà validée.
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
        onPlay={(name) => {
          setPlayerName(name);
          setPhase("selection");
        }}
      />
    );
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
