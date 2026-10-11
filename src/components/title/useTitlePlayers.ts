import { useEffect, useState } from "react";
import type { DuelSession } from "../../types";

const DRAFT_KEY = "anime-quiz-title-players-v1";

function readNames(session: DuelSession | null): [string, string] {
  try {
    const draft: unknown = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "null");
    if (Array.isArray(draft) && draft.length === 2 && draft.every(name => typeof name === "string" && name.length <= 24)) return draft as [string, string];
  } catch { /* The form remains usable when browser storage is unavailable. */ }
  return [session?.players.player1.name ?? "", session?.players.player2.name ?? ""];
}

export function useTitlePlayers(session: DuelSession | null) {
  const [names, setNames] = useState(() => readNames(session));
  const [draftUnavailable, setDraftUnavailable] = useState(false);
  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(names));
      setDraftUnavailable(false);
    } catch { setDraftUnavailable(true); }
  }, [names]);
  return {
    names, draftUnavailable,
    setName: (index: 0 | 1, value: string) => setNames(current => index === 0 ? [value, current[1]] : [current[0], value]),
    reset: () => setNames(["", ""]),
    clearDraft: () => { try { localStorage.removeItem(DRAFT_KEY); } catch { /* Match persistence reports its own status. */ } },
  };
}
