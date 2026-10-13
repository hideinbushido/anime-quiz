import type { DuelSession } from "../types";

/** Le code de la room d'un duel : dérivé de son identifiant, il survit aux rechargements. */
export function roomOf(session: DuelSession): string {
  return `duel-${session.id.replace(/[^A-Za-z0-9]/g, "").slice(0, 10)}`;
}
