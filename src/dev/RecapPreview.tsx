import { Navbar } from "../components/Navbar";
import { Recap } from "../components/Recap";
import { DEMO_SCORES, demoCatalog, demoDuel } from "./demo";

/**
 * Aperçu de l'écran de fin, en développement seulement (/apercu-recap).
 * Les scores sont fictifs et rien n'est enregistré. `?gagnant=2` ou
 * `?gagnant=egalite` montre les autres issues.
 */
export function RecapPreview() {
  const issue = new URLSearchParams(window.location.search).get("gagnant") ?? "1";
  const session = demoDuel("apercu", ["Shikamaru", "Itachi"], DEMO_SCORES[issue] ?? DEMO_SCORES["1"]);
  const home = () => { window.location.href = "/"; };
  return <>
    <Navbar onHome={home} onScores={home} />
    <Recap epreuves={demoCatalog} session={session} onRestart={home} />
  </>;
}
