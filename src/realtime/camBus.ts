import type { PlayerId } from "../types";

type Listener = (image: string | null) => void;

/**
 * Les images des caméras des joueurs, telles qu'elles arrivent du serveur.
 * Elles passent hors de l'état React : plusieurs images par seconde ne doivent
 * pas redessiner tout l'écran, seulement le cadre qui les affiche.
 */
export interface CamBus {
  push: (player: PlayerId, image: string | null) => void;
  latest: (player: PlayerId) => string | null;
  subscribe: (player: PlayerId, listener: Listener) => () => void;
}

export function createCamBus(): CamBus {
  const latest: Record<PlayerId, string | null> = { player1: null, player2: null };
  const listeners: Record<PlayerId, Set<Listener>> = { player1: new Set(), player2: new Set() };
  return {
    push(player, image) { latest[player] = image; for (const listener of listeners[player]) listener(image); },
    latest: player => latest[player],
    subscribe(player, listener) { listeners[player].add(listener); return () => { listeners[player].delete(listener); }; },
  };
}
