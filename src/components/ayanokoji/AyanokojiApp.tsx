import "../../design/ayanokoji.css";
import "../../design/feud.css";
import "../../design/dossier.css";
import { useState, type FormEvent, type ReactNode } from "react";
import type { Role } from "../../ayanokoji/types";
import { RoomProvider } from "../../realtime/RoomProvider";
import { useRoom } from "../../realtime/roomContext";
import { FeudHost } from "../feud/FeudHost";
import { FeudLive } from "../feud/FeudLive";
import { FeudPlayer } from "../feud/FeudPlayer";
import { DossierHost } from "../dossier/DossierHost";
import { DossierLive } from "../dossier/DossierLive";
import { DossierPlayer } from "../dossier/DossierPlayer";
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
  if (game === "dossier") {
    if (role === "live") return <DossierLive />;
    if (role === "host") return <DossierHost />;
    return <DossierPlayer player={role} />;
  }
  if (role === "live") return <AyanokojiLive />;
  if (role === "host") return <AyanokojiHost />;
  return <AyanokojiPlayer player={role} />;
}

const PASSWORD_KEY = "regie-mot-de-passe";

/** Tant que le serveur refuse le mot de passe de la régie, on le demande à la place de l'écran. */
function HostGate({ onPassword, children }: { onPassword: (password: string) => void; children: ReactNode }) {
  const { game, error } = useRoom();
  const [draft, setDraft] = useState("");
  if (game || !error.startsWith("Mot de passe")) return children;
  const submit = (event: FormEvent) => { event.preventDefault(); if (draft) onPassword(draft); };
  return <main className="ay-screen ay-gate">
    <form onSubmit={submit}>
      <p className="ay-kicker">Régie</p>
      <label htmlFor="regie-password">Mot de passe de la régie</label>
      <input id="regie-password" type="password" autoFocus autoComplete="current-password" value={draft} onChange={event => setDraft(event.target.value)} />
      <button className="ay-button is-primary" disabled={!draft}>Entrer</button>
    </form>
  </main>;
}

function HostRoom({ room, j1, j2 }: { room: string; j1?: string; j2?: string }) {
  // Le mot de passe reste sur cet appareil : la régie ne le redemande pas à chaque rechargement
  const [password, setPassword] = useState(() => { try { return localStorage.getItem(PASSWORD_KEY) ?? ""; } catch { return ""; } });
  const remember = (next: string) => { try { localStorage.setItem(PASSWORD_KEY, next); } catch { /* stockage indisponible */ } setPassword(next); };
  return <RoomProvider key={password} room={room} role="host" j1={j1} j2={j2} password={password || undefined}>
    <HostGate onPassword={remember}><RoomScreen role="host" /></HostGate>
  </RoomProvider>;
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
  if (path === "/host") return <HostRoom room={room} j1={params.get("j1") ?? undefined} j2={params.get("j2") ?? undefined} />;
  const player = params.get("player");
  if (player !== "1" && player !== "2") {
    return <main className="ay-screen"><p className="ay-notice is-error" role="alert">Il manque ta place dans l'adresse : <code>&player=1</code> ou <code>&player=2</code>.</p></main>;
  }
  const role = player === "1" ? "player1" : "player2";
  return <RoomProvider room={room} role={role} name={params.get("name") ?? undefined}><RoomScreen role={role} /></RoomProvider>;
}
