import { lazy, Suspense } from "react";
import App from "./App";
import { RecapPreview } from "./dev/RecapPreview";

// Le duel en temps réel des Liens d'Ayanokoji a ses propres écrans, chargés à part : /player, /live et /host
const AyanokojiApp = lazy(() => import("./components/ayanokoji/AyanokojiApp"));
const AYANOKOJI_PATHS = ["/player", "/live", "/host"];

/** Choisit ce qu'on affiche d'après l'adresse : le site, ou l'un des écrans du duel en temps réel. */
export function Root() {
  const path = window.location.pathname;
  if (AYANOKOJI_PATHS.includes(path)) return <Suspense fallback={null}><AyanokojiApp /></Suspense>;
  // En développement seulement : l'écran de fin, visible sans attendre un catalogue de cinq épreuves
  if (import.meta.env.DEV && path === "/apercu-recap") return <RecapPreview />;
  return <App />;
}
