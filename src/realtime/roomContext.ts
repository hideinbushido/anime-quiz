import { createContext, useContext } from "react";
import type { ConnectionStatus, RoomInfo } from "../ayanokoji/realtime";
import type { QuizClientMessage, QuizView } from "../quiz/types";
import type { ClientMessage, RoomView } from "../ayanokoji/types";
import type { FeudClientMessage, FeudView, RoomGame } from "../feud/types";
import type { DossierClientMessage, DossierView, RosterEntry } from "../dossier/types";

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
  /** La vue du Dossier de L, quand c'est l'épreuve en cours. */
  dossier: DossierView | null;
  /** Les catalogues de personnages déjà reçus, par univers. */
  dossierRosters: Record<string, RosterEntry[]>;
  /** La vue d'une épreuve au buzzer, quand c'est l'épreuve en cours. */
  quiz: QuizView | null;
  /** L'épreuve en cours, les joueurs et l'état de l'émission. */
  info: RoomInfo | null;
  room: string;
  status: ConnectionStatus;
  error: string;
  /** L'écart entre l'horloge du serveur et celle de l'appareil. */
  clockOffset: number;
  send: (message: ClientMessage | FeudClientMessage | DossierClientMessage | QuizClientMessage) => void;
}

export const RoomContext = createContext<RoomState | null>(null);

export function useRoom(): RoomState {
  const state = useContext(RoomContext);
  if (!state) throw new Error("useRoom doit être appelé sous un RoomProvider.");
  return state;
}
