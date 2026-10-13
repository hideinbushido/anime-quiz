import "../../design/ayanokoji.css";
import "../../design/feud.css";
import type { Role } from "../../ayanokoji/types";
import { RoomProvider } from "../../realtime/RoomProvider";
import { useRoom } from "../../realtime/roomContext";
import { FeudHost } from "../feud/FeudHost";
import { FeudLive } from "../feud/FeudLive";
import { FeudPlayer } from "../feud/FeudPlayer";
import { AyanokojiHost } from "./AyanokojiHost";
import { AyanokojiLive } from "./AyanokojiLive";
import { AyanokojiPlayer } from "./AyanokojiPlayer";

/** L'écran du rôle, pour l'épreuve que le présentateur a ouverte dans la room. */
function RoomScreen({ role }: { role: Role }) {
  const { game } = useRoom();
  if (game === "feud") {
    if (role === "live") return <FeudLive />;
    if (role === "host") return <FeudHost />;
    return <FeudPlayer player={role} />;
  }
  if (role === "live") return <AyanokojiLive />;
  if (role === "host") return <AyanokojiHost />;
  return <AyanokojiPlayer player={role} />;
}

/**
 * Les écrans du duel en temps réel, aiguillés d'après l'adresse. Les mêmes
 * adresses servent toutes les épreuves : c'est la régie qui choisit laquelle
 * se joue, et les autres écrans la suivent.
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
  if (path === "/live") return <RoomProvider room={room} role="live"><RoomScreen role="live" /></RoomProvider>;
  if (path === "/host") return <RoomProvider room={room} role="host" j1={params.get("j1") ?? undefined} j2={params.get("j2") ?? undefined}><RoomScreen role="host" /></RoomProvider>;
  const player = params.get("player");
  if (player !== "1" && player !== "2") {
    return <main className="ay-screen"><p className="ay-notice is-error" role="alert">Il manque ta place dans l'adresse : <code>&player=1</code> ou <code>&player=2</code>.</p></main>;
  }
  const role = player === "1" ? "player1" : "player2";
  return <RoomProvider room={room} role={role} name={params.get("name") ?? undefined}><RoomScreen role={role} /></RoomProvider>;
}
