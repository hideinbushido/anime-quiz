import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { connectRoom, type ConnectionStatus, type RoomConnection } from "../ayanokoji/realtime";
import type { ClientMessage, Role, RoomView } from "../ayanokoji/types";
import type { FeudClientMessage, FeudView } from "../feud/types";
import type { DossierClientMessage, DossierView } from "../dossier/types";
import { RoomContext, type RoomState } from "./roomContext";

interface Props {
  room: string;
  role: Role;
  /** Pseudo du joueur, ou pseudos des deux joueurs quand c'est le présentateur. */
  name?: string;
  j1?: string;
  j2?: string;
  /** Le mot de passe de la régie. */
  password?: string;
  children: ReactNode;
}

/**
 * Ouvre la connexion de l'écran à sa room et la partage. Le serveur n'envoie
 * que l'état de l'épreuve en cours : recevoir l'un efface l'autre, et les
 * écrans basculent d'eux-mêmes quand le présentateur change d'épreuve.
 */
export function RoomProvider({ room, role, name, j1, j2, password, children }: Props) {
  const [view, setView] = useState<RoomView | null>(null);
  const [feud, setFeud] = useState<FeudView | null>(null);
  const [dossier, setDossier] = useState<DossierView | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [error, setError] = useState("");
  const [clockOffset, setClockOffset] = useState(0);
  const connection = useRef<RoomConnection | null>(null);

  useEffect(() => {
    const link = connectRoom({
      room, role, name, names: { player1: j1, player2: j2 }, password,
      onView: (next, receivedAt) => {
        if (next.role !== role) return;
        setView(next);
        setFeud(null);
        setDossier(null);
        setClockOffset(next.serverNow - receivedAt);
      },
      onFeud: (next, receivedAt) => {
        if (next.role !== role) return;
        setFeud(next);
        setView(null);
        setDossier(null);
        setClockOffset(next.serverNow - receivedAt);
      },
      onDossier: (next, receivedAt) => {
        if (next.role !== role) return;
        setDossier(next);
        setView(null);
        setFeud(null);
        setClockOffset(next.serverNow - receivedAt);
      },
      onStatus: setStatus,
      onError: setError,
    });
    connection.current = link;
    return () => { link.close(); connection.current = null; };
  }, [room, role, name, j1, j2, password]);

  // Un refus du serveur s'affiche quelques secondes, puis s'efface de lui-même
  // (un refus à l'entrée, lui, reste affiché : sans vue, il n'y a rien d'autre à montrer)
  const joined = view !== null || feud !== null || dossier !== null;
  useEffect(() => {
    if (!error || !joined) return;
    const timer = window.setTimeout(() => setError(""), 4000);
    return () => window.clearTimeout(timer);
  }, [error, joined]);

  const send = useCallback((message: ClientMessage | FeudClientMessage | DossierClientMessage) => connection.current?.send(message), []);
  const state = useMemo<RoomState>(() => ({ game: dossier ? "dossier" : feud ? "feud" : view ? "ayanokoji" : null, view, feud, dossier, status, error, clockOffset, send }),
    [view, feud, dossier, status, error, clockOffset, send]);
  return <RoomContext.Provider value={state}>{children}</RoomContext.Provider>;
}
