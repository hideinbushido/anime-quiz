import "../../design/ayanokoji.css";
import { AyanokojiHost } from "./AyanokojiHost";
import { AyanokojiLive } from "./AyanokojiLive";
import { AyanokojiPlayer } from "./AyanokojiPlayer";

/**
 * Aiguille vers le bon écran d'après l'adresse.
 *   /player?room=TEST&player=1   (ou player=2, &name=Kagami pour le pseudo)
 *   /live?room=TEST
 *   /host?room=TEST              (&j1=Kagami&j2=Rico pour nommer les joueurs)
 */
export default function AyanokojiApp() {
  const params = new URLSearchParams(window.location.search);
  const room = (params.get("room") ?? "").trim();
  const path = window.location.pathname;
  if (!/^[A-Za-z0-9_-]{1,24}$/.test(room)) {
    return <main className="ay-screen"><p className="ay-notice is-error" role="alert">Il manque le code de la room dans l'adresse : ajoute <code>?room=TEST</code> (lettres, chiffres, tirets).</p></main>;
  }
  if (path === "/live") return <AyanokojiLive room={room} />;
  if (path === "/host") return <AyanokojiHost room={room} j1={params.get("j1") ?? undefined} j2={params.get("j2") ?? undefined} />;
  const player = params.get("player");
  if (player !== "1" && player !== "2") {
    return <main className="ay-screen"><p className="ay-notice is-error" role="alert">Il manque ta place dans l'adresse : <code>&player=1</code> ou <code>&player=2</code>.</p></main>;
  }
  return <AyanokojiPlayer room={room} player={player === "1" ? "player1" : "player2"} name={params.get("name") ?? undefined} />;
}
