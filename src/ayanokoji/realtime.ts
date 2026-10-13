import type { ClientMessage, Role, RoomView, ServerMessage } from "./types";
import type { FeudClientMessage, FeudServerMessage, FeudView } from "../feud/types";

/**
 * La couche réseau des épreuves en temps réel. Les composants ne parlent jamais au
 * WebSocket directement : ils passent par cette connexion, qui se charge de
 * rejoindre la room, de garder le jeton de la place et de se reconnecter.
 */
export type ConnectionStatus = "connecting" | "online" | "offline";

export interface RoomConnection {
  send: (message: ClientMessage | FeudClientMessage) => void;
  close: () => void;
}

interface Options {
  room: string;
  role: Role;
  /** Pseudo du joueur, ou pseudos des deux joueurs quand c'est le présentateur qui rejoint. */
  name?: string;
  names?: Partial<Record<"player1" | "player2", string>>;
  onView: (view: RoomView, receivedAt: number) => void;
  /** L'état des Pensées d'Anya, quand c'est l'épreuve ouverte dans la room. */
  onFeud?: (view: FeudView, receivedAt: number) => void;
  onStatus: (status: ConnectionStatus) => void;
  onError: (message: string) => void;
}

/** L'adresse du serveur : `VITE_REALTIME_URL` en production, sinon le port 8787 de la machine qui sert la page. */
export function realtimeUrl(): string {
  const configured = import.meta.env.VITE_REALTIME_URL as string | undefined;
  if (configured) return configured;
  return `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.hostname}:8787`;
}

const tokenKey = (room: string, role: Role) => `ayanokoji-token-${room}-${role}`;

export function connectRoom({ room, role, name, names, onView, onFeud, onStatus, onError }: Options): RoomConnection {
  let socket: WebSocket | null = null;
  let closed = false;
  let retry = 0;
  let timer = 0;

  const open = () => {
    if (closed) return;
    onStatus("connecting");
    socket = new WebSocket(realtimeUrl());
    socket.onopen = () => {
      retry = 0;
      let token: string | undefined;
      try { token = localStorage.getItem(tokenKey(room, role)) ?? undefined; } catch { /* stockage indisponible : la place ne survivra pas à un rechargement */ }
      socket?.send(JSON.stringify({ type: "room:join", room, role, token, name, names } satisfies ClientMessage));
    };
    socket.onmessage = event => {
      let message: ServerMessage | FeudServerMessage;
      try { message = JSON.parse(String(event.data)) as ServerMessage | FeudServerMessage; } catch { return; }
      if (message.type === "room:joined") {
        onStatus("online");
        if (message.token) try { localStorage.setItem(tokenKey(room, role), message.token); } catch { /* voir plus haut */ }
      } else if (message.type === "room:state") onView(message.view, Date.now());
      else if (message.type === "feud:state") onFeud?.(message.view, Date.now());
      else if (message.type === "room:error") onError(message.message);
    };
    socket.onclose = () => {
      if (closed) return;
      onStatus("offline");
      // On réessaie de plus en plus lentement, sans dépasser quatre secondes
      timer = window.setTimeout(open, Math.min(4000, 400 * 2 ** retry++));
    };
  };
  open();

  return {
    send: message => { if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message)); },
    close: () => { closed = true; window.clearTimeout(timer); socket?.close(); },
  };
}
