import { useEffect, useState } from "react";
import type { Epreuve } from "../types";
import { createDuel, duelReducer, type DuelAction } from "./engine";
import { DUEL_KEY, readDuel, saveDuel } from "./storage";

export function useDuel(catalog: Epreuve[]) {
  const [initial] = useState(() => readDuel(catalog));
  const [session, setSession] = useState(initial.session);
  const [warning, setWarning] = useState(initial.warning);
  useEffect(() => {
    if (!session) return;
    try { saveDuel(session, catalog); setWarning(""); }
    catch { setWarning("Sauvegarde locale indisponible : garde cet onglet ouvert pour conserver le duel."); }
  }, [session, catalog]);
  return {
    session, warning,
    start: (name1: string, name2: string) => {
      if (name1.trim() && name2.trim()) setSession(createDuel(name1, name2, crypto.randomUUID()));
    },
    dispatch: (action: DuelAction) => setSession(current => current ? duelReducer(current, action, catalog) : current),
    clear: () => {
      setSession(null);
      try { localStorage.removeItem(DUEL_KEY); setWarning(""); }
      catch { setWarning("La sauvegarde locale n'a pas pu être supprimée."); }
    },
  };
}
