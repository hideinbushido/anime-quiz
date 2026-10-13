import { createContext, useContext } from "react";
import type { ConnectionStatus } from "../ayanokoji/realtime";
import type { ClientMessage, RoomView } from "../ayanokoji/types";
import type { FeudClientMessage, FeudView, RoomGame } from "../feud/types";

/**
 * Ce qu'un écran sait de sa room : une seule connexion, partagée par toutes
 * les épreuves en temps réel. `game` dit laquelle le présentateur a ouverte.
 */
export interface RoomState {
  game: RoomGame | null;
  /** La vue des Liens d'Ayanokoji, quand c'est l'épreuve en cours. */
  view: RoomView | null;
  /** La vue des Pensées d'Anya, quand c'est l'épreuve en cours. */
  feud: FeudView | null;
  status: ConnectionStatus;
  error: string;
  /** L'écart entre l'horloge du serveur et celle de l'appareil. */
  clockOffset: number;
  send: (message: ClientMessage | FeudClientMessage) => void;
}

export const RoomContext = createContext<RoomState | null>(null);

export function useRoom(): RoomState {
  const state = useContext(RoomContext);
  if (!state) throw new Error("useRoom doit être appelé sous un RoomProvider.");
  return state;
}
