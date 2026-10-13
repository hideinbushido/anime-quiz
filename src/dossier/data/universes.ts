import type { UniverseConfig } from "../types";
import { DRAGON_BALL } from "./dragonBall";
import { NARUTO } from "./naruto";
import { ONE_PIECE } from "./onePiece";

export const DOSSIER_TITLE = "Le Dossier de L";

/** Ce dont une partie a besoin : les univers, et l'ordre des rounds. */
export interface DossierConfig {
  universes: Record<string, UniverseConfig>;
  /** L'univers de chaque round, dans l'ordre. */
  rounds: string[];
}

/** Cinq rounds, dans cet ordre exact : Naruto, Naruto, One Piece, One Piece, Dragon Ball. */
export const DOSSIER_CONFIG: DossierConfig = {
  universes: { [NARUTO.id]: NARUTO, [ONE_PIECE.id]: ONE_PIECE, [DRAGON_BALL.id]: DRAGON_BALL },
  rounds: [NARUTO.id, NARUTO.id, ONE_PIECE.id, ONE_PIECE.id, DRAGON_BALL.id],
};
