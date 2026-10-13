import { useEffect, useMemo, useRef } from "react";
import type { DuelSession, Epreuve } from "../../types";
import type { ShowState } from "../../quiz/types";
import { epreuveWinner } from "../../duel/engine";
import { useRoom } from "../../realtime/roomContext";

/**
 * Tient le live et les téléphones au courant de l'émission : le programme, ce
 * qui a été joué, le score du duel. Hors d'une épreuve (sélection, programme,
 * récapitulatif), il garde tous les écrans sur l'écran d'émission.
 */
export function ShowSync({ session, epreuves }: { session: DuelSession; epreuves: Epreuve[] }) {
  const { status, game, info, send } = useRoom();
  const show = useMemo<ShowState>(() => ({
    phase: session.phase === "recap" ? "final" : session.results.length > 0 ? "between" : "lobby",
    index: session.results.length,
    wins: {
      player1: session.results.filter(result => epreuveWinner(result) === "player1").length,
      player2: session.results.filter(result => epreuveWinner(result) === "player2").length,
    },
    program: session.selected.map((selection, index) => {
      const result = session.results[index];
      return { id: selection.epreuveId, name: epreuves.find(epreuve => epreuve.id === selection.epreuveId)?.nom ?? "Épreuve", selectedBy: selection.selectedBy,
        ...(result ? { result: { player1: result.scorePlayer1, player2: result.scorePlayer2 } } : {}) };
    }),
  }), [session.phase, session.results, session.selected, epreuves]);

  const wanted = JSON.stringify(show);
  const known = JSON.stringify(info?.show ?? null);
  const sent = useRef("");
  useEffect(() => {
    if (status !== "online") { sent.current = ""; return; }
    if (info && known !== wanted && sent.current !== wanted) { sent.current = wanted; send({ type: "show:update", show }); }
  }, [status, info, known, wanted, show, send]);
  // Pendant le duel, c'est l'épreuve en cours qui décide de ce que montrent les écrans
  const idle = session.phase !== "playing";
  useEffect(() => {
    if (idle && status === "online" && game !== null && game !== "lobby") send({ type: "room:game", game: "lobby" });
  }, [idle, status, game, send]);
  return null;
}
