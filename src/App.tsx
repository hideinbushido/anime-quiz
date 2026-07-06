import { useState } from "react";
import { epreuves } from "./data/epreuves";
import type { EpreuveResult } from "./types";
import { EpreuveGrid } from "./components/EpreuveGrid";
import { EpreuvePlayer } from "./components/EpreuvePlayer";
import { Recap } from "./components/Recap";
import "./App.css";

const MAX_SELECTION = 5;

type Phase = "selection" | "playing" | "recap";

function App() {
  const [phase, setPhase] = useState<Phase>("selection");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<EpreuveResult[]>([]);

  const score = results.reduce((sum, r) => sum + r.points, 0);

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
    const nextResults = [...results, result];
    setResults(nextResults);
    if (currentIndex + 1 < selectedIds.length) {
      setCurrentIndex((i) => i + 1);
    } else {
      setPhase("recap");
    }
  }

  function restart() {
    setSelectedIds([]);
    setResults([]);
    setCurrentIndex(0);
    setPhase("selection");
  }

  if (phase === "playing") {
    const epreuve = epreuves.find((e) => e.id === selectedIds[currentIndex])!;
    return (
      <EpreuvePlayer
        key={epreuve.id}
        epreuve={epreuve}
        onComplete={handleEpreuveComplete}
      />
    );
  }

  if (phase === "recap") {
    return <Recap epreuves={epreuves} results={results} onRestart={restart} />;
  }

  return (
    <EpreuveGrid
      epreuves={epreuves}
      selectedIds={selectedIds}
      playedIds={results.map((r) => r.epreuveId)}
      maxSelection={Math.min(MAX_SELECTION, epreuves.length)}
      score={score}
      onToggle={toggleSelection}
      onStart={startSession}
    />
  );
}

export default App;
