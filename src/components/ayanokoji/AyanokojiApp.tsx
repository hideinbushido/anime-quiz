import "../../realtime/styles";
import type { Role } from "../../ayanokoji/types";
import { RoomProvider } from "../../realtime/RoomProvider";
import { HostRoom } from "../../realtime/HostRoom";
import { useRoom } from "../../realtime/roomContext";
import { FeudHost } from "../feud/FeudHost";
import { FeudLive } from "../feud/FeudLive";
import { FeudPlayer } from "../feud/FeudPlayer";
import { DossierHost } from "../dossier/DossierHost";
import { DossierLive } from "../dossier/DossierLive";
import { DossierPlayer } from "../dossier/DossierPlayer";
import { QuizHost } from "../quiz/QuizHost";
import { QuizLive } from "../quiz/QuizLive";
import { BeatsLive } from "../quiz/BeatsLive";
import { QuizPlayer } from "../quiz/QuizPlayer";
import { ShowLive, ShowPlayer } from "../realtime/ShowScreens";
import { RulesOverlay } from "../realtime/RulesOverlay";
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
  // Entre deux épreuves, tous les écrans montrent l'émission : le programme et le score du duel
  if (game === "lobby" && role !== "host") return role === "live" ? <ShowLive /> : <ShowPlayer player={role} />;
  if (game === "beats" || game === "citations") {
    if (role === "live") return game === "beats" ? <BeatsLive /> : <QuizLive />;
    if (role === "host") return <QuizHost />;
    return <QuizPlayer player={role} />;
  }
  if (game === "dossier") {
    if (role === "live") return <DossierLive />;
    if (role === "host") return <DossierHost />;
    return <DossierPlayer player={role} />;
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
  if (path === "/live") return <RoomProvider room={room} role="live"><RoomScreen role="live" /><RulesOverlay /></RoomProvider>;
  if (path === "/host") return <HostRoom room={room} j1={params.get("j1") ?? undefined} j2={params.get("j2") ?? undefined}><RoomScreen role="host" /></HostRoom>;
  const player = params.get("player");
  if (player !== "1" && player !== "2") {
    return <main className="ay-screen"><p className="ay-notice is-error" role="alert">Il manque ta place dans l'adresse : <code>&player=1</code> ou <code>&player=2</code>.</p></main>;
  }
  const role = player === "1" ? "player1" : "player2";
  return <RoomProvider room={room} role={role} name={params.get("name") ?? undefined}><RoomScreen role={role} /><RulesOverlay quiet /></RoomProvider>;
}
