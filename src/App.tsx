import { useEffect, useState } from "react";
import { epreuves } from "./data/epreuves";
import type { DifficultyClass } from "./types";
import { useDuel } from "./duel/useDuel";
import { TitleScreen } from "./components/TitleScreen";
import { EpreuveGrid } from "./components/EpreuveGrid";
import { DuelStage } from "./components/DuelStage";
import { EpreuvePreview } from "./components/EpreuvePreview";
import { Recap } from "./components/Recap";
import { Navbar } from "./components/Navbar";
import { Scoreboard } from "./components/Scoreboard";
import { Intro } from "./components/Intro";
import { Rules } from "./components/Rules";
import { demoCatalog, demoHistory } from "./dev/demo";

// En développement seulement : /scores?apercu montre l'historique rempli de duels fictifs
const apercuHistorique = import.meta.env.DEV && new URLSearchParams(window.location.search).has("apercu");
import { useGoldCut } from "./components/GoldCut";

type View = "home" | "match" | "scores" | "rules";
const PHASE_PATH = { selection: "/menu", ready: "/programme", playing: "/jeu", recap: "/recap" };
function viewFromPath(): View {
  if (window.location.pathname === "/scores") return "scores";
  if (window.location.pathname === "/regles") return "rules";
  return Object.values(PHASE_PATH).includes(window.location.pathname) ? "match" : "home";
}

export default function App() {
  const { session, warning, start, dispatch, clear } = useDuel(epreuves);
  const [view, setView] = useState<View>(viewFromPath);
  const { cut, overlay } = useGoldCut();
  const [preview, setPreview] = useState<{ id: string; difficulty: DifficultyClass } | null>(null);
  const effectiveView = view === "match" && !session ? "home" : view;
  const path = effectiveView === "scores" ? "/scores" : effectiveView === "rules" ? "/regles" : effectiveView === "match" && session ? PHASE_PATH[session.phase] : "/";

  useEffect(() => { window.history.replaceState(null, "", path); }, [path]);
  useEffect(() => {
    const onPop = () => { setPreview(null); setView(viewFromPath()); };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  function navigate(next: View) {
    setPreview(null);
    const target = next === "scores" ? "/scores" : next === "rules" ? "/regles" : next === "match" ? (session ? PHASE_PATH[session.phase] : "/menu") : "/";
    if (window.location.pathname !== target) window.history.pushState(null, "", target);
    setView(next);
  }
  const active = session ? epreuves.find(epreuve => epreuve.id === session.selected[session.currentIndex]?.epreuveId) : undefined;
  const previewEpreuve = preview ? epreuves.find(epreuve => epreuve.id === preview.id) : undefined;

  return <>
    <Intro />
    {overlay}
    {warning && <p className="duel-notice" role="alert">{warning}</p>}
    {effectiveView === "home" ? <TitleScreen savedSession={session}
      onPlay={(name1, name2) => cut(() => { start(name1, name2); navigate("match"); })}
      onContinue={() => cut(() => navigate("match"))} onScores={() => cut(() => navigate("scores"))} onRules={() => cut(() => navigate("rules"))} onDeleteSession={clear} />
      : <>
        <Navbar onHome={() => navigate("home")} onScores={() => navigate("scores")} onRules={() => navigate("rules")} />
        {effectiveView === "rules" ? <Rules epreuves={epreuves} onBack={() => cut(() => navigate("home"))} />
          : effectiveView === "scores" ? (apercuHistorique
            ? <Scoreboard epreuves={demoCatalog} demo={demoHistory()} onBack={() => navigate("home")} />
            : <Scoreboard epreuves={epreuves} onBack={() => navigate("home")} />)
          : session && (preview && previewEpreuve ? <EpreuvePreview key={`${preview.id}-${preview.difficulty}`} epreuve={previewEpreuve} difficulty={preview.difficulty} onBack={() => setPreview(null)} />
            : session.phase === "selection" || session.phase === "ready" ? <EpreuveGrid epreuves={epreuves} session={session}
              onSelect={(epreuveId, difficulty) => dispatch({ type: "select", epreuveId, difficulty })}
              onUndo={() => dispatch({ type: "undo" })} onStart={() => cut(() => dispatch({ type: "start" }))}
              onPreview={(id, difficulty) => cut(() => setPreview({ id, difficulty }))} />
            : session.phase === "recap" ? <Recap epreuves={epreuves} session={session} onRestart={() => navigate("home")} />
            : active ? <DuelStage session={session} epreuve={active} progress={session.progress}
              onKillerBee={event => dispatch({ type: "killerBee", event })}
              onEdit={patch => dispatch({ type: "edit", patch })}
              onRespondent={playerId => dispatch({ type: "respondent", playerId })}
              onValidate={result => dispatch({ type: "validate", result })}
              onNext={() => dispatch({ type: "next" })} />
            : <p className="duel-notice">Épreuve indisponible. Retourne à l'accueil pour préparer un nouveau LIVE.</p>)}
      </>}
  </>;
}
