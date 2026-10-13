import { useState, type FormEvent, type ReactNode } from "react";
import { RoomProvider } from "./RoomProvider";
import { useRoom } from "./roomContext";

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

/**
 * La connexion du présentateur à sa room, pour la régie seule comme pour le
 * site. Le mot de passe reste sur cet appareil : il n'est pas redemandé à
 * chaque rechargement.
 */
export function HostRoom({ room, j1, j2, children }: { room: string; j1?: string; j2?: string; children: ReactNode }) {
  const [password, setPassword] = useState(() => { try { return localStorage.getItem(PASSWORD_KEY) ?? ""; } catch { return ""; } });
  const remember = (next: string) => { try { localStorage.setItem(PASSWORD_KEY, next); } catch { /* stockage indisponible */ } setPassword(next); };
  return <RoomProvider key={password} room={room} role="host" j1={j1} j2={j2} password={password || undefined}>
    <HostGate onPassword={remember}>{children}</HostGate>
  </RoomProvider>;
}
