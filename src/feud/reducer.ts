/**
 * Les règles des Pensées d'Anya, sans réseau ni écran : le serveur les applique,
 * les tests les vérifient. Toute décision passe par ici.
 */
import type { PlayerId } from "../types";
import { FEUD_ROUNDS, FEUD_TITLE } from "./data";
import type { FeudEvent, FeudGame, FeudHostAction, FeudHostView, FeudLiveView, FeudPlayerView, FeudResult, FeudRole, FeudRound, FeudSlot, FeudState, FeudView } from "./types";

/** Trois erreurs dans une manche, et le joueur la regarde finir. */
export const MAX_STRIKES = 3;
/** Redonner une réponse déjà affichée coûte une erreur. Passer à `false` pour l'excuser. */
export const ALREADY_GIVEN_IS_STRIKE = true;
/** À la révélation, une valeur tombe toutes les 1,2 s, de la moins citée à la plus citée. */
export const REVEAL_STEP_MS = 1200;
const HISTORY_LIMIT = 40;

const PLAYERS: PlayerId[] = ["player1", "player2"];
const zero = (): Record<PlayerId, number> => ({ player1: 0, player2: 0 });

export function createFeud(): FeudState {
  return {
    roundIndex: 0, phase: "waiting", found: [], strikes: zero(), buzzOpen: false, buzzWinner: null,
    roundScore: zero(), totals: zero(), revealStartedAt: null,
    event: { seq: 0, kind: "nextRound", player: null }, history: [],
  };
}

export const feudRound = (state: FeudGame, rounds: FeudRound[] = FEUD_ROUNDS): FeudRound => rounds[state.roundIndex];
const eligible = (state: FeudGame, player: PlayerId) => state.strikes[player] < MAX_STRIKES;
const emit = (state: FeudState, kind: FeudEvent["kind"], player: PlayerId | null, rank?: number) => {
  state.event = { seq: state.event.seq + 1, kind, player, ...(rank ? { rank } : {}) };
};

/** Un instantané avant chaque décision du présentateur : c'est ce que « Annuler » restaure. */
function remember(state: FeudState) {
  const { history, ...game } = state;
  history.push(structuredClone(game));
  if (history.length > HISTORY_LIMIT) history.shift();
}

/** Après un jugement : la manche est-elle finie, ou rouvre-t-on le buzzer ? */
function settle(state: FeudState, rounds: FeudRound[]) {
  state.buzzWinner = null;
  const over = state.found.length >= feudRound(state, rounds).answers.length || PLAYERS.every(id => !eligible(state, id));
  state.phase = over ? "roundEnded" : "playing";
  state.buzzOpen = !over && !state.handMode;
  return over;
}

/**
 * Le buzz d'un joueur. Le serveur ne retient que le premier, et seulement si
 * le buzzer est ouvert et le joueur encore en lice : le bouton grisé du
 * téléphone n'est qu'un confort, la règle est ici.
 */
export function pressBuzzer(state: FeudState, player: PlayerId): string | null {
  if (state.buzzWinner) return "Quelqu'un a déjà buzzé.";
  if (state.phase !== "playing" || !state.buzzOpen) return "Le buzzer est fermé.";
  if (!eligible(state, player)) return "Trois erreurs : tu es hors manche.";
  state.buzzWinner = player;
  state.buzzOpen = false;
  state.phase = "buzzLocked";
  emit(state, "buzz", player);
  return null;
}

export function hostFeud(state: FeudState, action: FeudHostAction, now: number, rounds: FeudRound[] = FEUD_ROUNDS): string | null {
  const round = feudRound(state, rounds);
  switch (action.type) {
    case "feud:undo": {
      const previous = state.history.pop();
      if (!previous) return "Rien à annuler.";
      // L'événement garde un numéro neuf : les écrans ne rejouent pas une animation déjà vue
      Object.assign(state, previous, { event: { seq: state.event.seq + 1, kind: "nextRound", player: null } });
      return null;
    }
    case "feud:restart":
      Object.assign(state, createFeud(), { event: { seq: state.event.seq + 1, kind: "nextRound", player: null } });
      return null;
    case "feud:buzzer-open":
      if (state.phase !== "waiting" && state.phase !== "playing") return "Le buzzer ne peut pas s'ouvrir maintenant.";
      if (state.buzzOpen) return null;
      remember(state);
      state.phase = "playing";
      state.buzzOpen = true;
      return null;
    case "feud:buzzer-close":
      if (state.phase !== "playing" || !state.buzzOpen) return "Le buzzer n'est pas ouvert.";
      remember(state);
      state.buzzOpen = false;
      return null;
    case "feud:buzzer-reset":
      if (state.phase !== "buzzLocked" && state.phase !== "playing") return "Aucun buzz à remettre à zéro.";
      remember(state);
      state.buzzWinner = null;
      state.phase = "playing";
      state.buzzOpen = !state.handMode;
      return null;
    case "feud:hand": {
      // Pas de buzzer : on répond à voix haute, et le présentateur désigne qui a la main
      if (!["waiting", "playing", "buzzLocked"].includes(state.phase)) return "La main ne peut pas être donnée maintenant.";
      if (action.player !== "player1" && action.player !== "player2") return "Joueur inconnu.";
      if (!eligible(state, action.player)) return "Ce joueur est hors manche.";
      if (state.buzzWinner === action.player) return null;
      remember(state);
      state.handMode = true;
      state.buzzWinner = action.player;
      state.buzzOpen = false;
      state.phase = "buzzLocked";
      emit(state, "buzz", action.player);
      return null;
    }
    case "feud:correct": {
      const player = state.buzzWinner;
      if (state.phase !== "buzzLocked" || !player) return "Personne n'a buzzé.";
      const answer = round.answers.find(item => item.id === action.answerId);
      if (!answer) return "Réponse inconnue.";
      if (state.found.some(item => item.answerId === answer.id)) return "Cette réponse est déjà révélée.";
      remember(state);
      state.found.push({ answerId: answer.id, foundBy: player });
      state.roundScore[player] += answer.points;
      settle(state, rounds);
      emit(state, "correct", player, round.answers.indexOf(answer) + 1);
      return null;
    }
    case "feud:wrong":
    case "feud:already": {
      const player = state.buzzWinner;
      if (state.phase !== "buzzLocked" || !player) return "Personne n'a buzzé.";
      remember(state);
      if (action.type === "feud:already" && !ALREADY_GIVEN_IS_STRIKE) { settle(state, rounds); return null; }
      state.strikes[player]++;
      settle(state, rounds);
      emit(state, eligible(state, player) ? "wrong" : "strike3", player);
      return null;
    }
    case "feud:end-round":
      if (!["waiting", "playing", "buzzLocked"].includes(state.phase)) return "Aucune manche à terminer.";
      remember(state);
      state.buzzWinner = null;
      state.buzzOpen = false;
      state.phase = "roundEnded";
      emit(state, "roundEnd", null);
      return null;
    case "feud:reveal":
      if (state.phase !== "roundEnded") return "La manche n'est pas terminée.";
      remember(state);
      state.phase = "revealingPoints";
      state.revealStartedAt = now;
      // Les points rejoignent le cumul dès maintenant ; les écrans les font monter au rythme de la révélation
      for (const id of PLAYERS) state.totals[id] += state.roundScore[id];
      emit(state, "pointsReveal", null);
      return null;
    case "feud:next":
      if (state.phase !== "roundComplete") return state.phase === "gameComplete" ? "L'épreuve est terminée." : "Révèle d'abord les points de la manche.";
      remember(state);
      state.roundIndex++;
      state.phase = "waiting";
      state.found = [];
      state.strikes = zero();
      state.roundScore = zero();
      state.buzzOpen = false;
      state.buzzWinner = null;
      state.revealStartedAt = null;
      emit(state, "nextRound", null);
      return null;
  }
}

/** La durée de la révélation : huit valeurs, puis le temps d'annoncer le vainqueur de la manche. */
export const revealDurationMs = (round: FeudRound) => (round.answers.length + 2) * REVEAL_STEP_MS;

/** La révélation se termine côté serveur : c'est lui qui déclare la manche comptée. */
export function tickFeud(state: FeudState, now: number, rounds: FeudRound[] = FEUD_ROUNDS): boolean {
  if (state.phase !== "revealingPoints" || state.revealStartedAt === null) return false;
  if (now < state.revealStartedAt + revealDurationMs(feudRound(state, rounds))) return false;
  state.phase = state.roundIndex >= rounds.length - 1 ? "gameComplete" : "roundComplete";
  return true;
}

export function feudResult(state: FeudGame): FeudResult {
  const { player1, player2 } = state.totals;
  return { winner: player1 === player2 ? null : player1 > player2 ? "player1" : "player2", player1FeudScore: player1, player2FeudScore: player2 };
}

interface Context { room: string; names: Record<PlayerId, string>; avatars?: Record<PlayerId, string | null>; connected: Record<PlayerId, boolean>; now: number }

/**
 * La vue envoyée à un écran. C'est ici que se garde le secret : le téléphone
 * d'un joueur ne reçoit ni réponse ni valeur, le live reçoit les réponses
 * trouvées mais aucune valeur avant que le présentateur lance la révélation.
 */
export function feudView(state: FeudState, role: FeudRole, context: Context, rounds: FeudRound[] = FEUD_ROUNDS): FeudView {
  const round = feudRound(state, rounds);
  const revealed = ["revealingPoints", "roundComplete", "gameComplete"].includes(state.phase);
  const owner = (answerId: string) => state.found.find(item => item.answerId === answerId)?.foundBy ?? null;
  const count = (player: PlayerId) => state.found.filter(item => item.foundBy === player).length;
  const base = {
    game: "feud" as const, room: context.room, title: FEUD_TITLE, phase: state.phase,
    roundNumber: state.roundIndex + 1, roundCount: rounds.length,
    names: context.names, avatars: context.avatars ?? { player1: null, player2: null }, connected: context.connected,
    strikes: state.strikes, maxStrikes: MAX_STRIKES,
    foundCount: { player1: count("player1"), player2: count("player2") },
    buzzOpen: state.buzzOpen, buzzWinner: state.buzzWinner,
    totals: state.totals, serverNow: context.now, event: state.event,
    result: state.phase === "gameComplete" ? feudResult(state) : null,
  };
  // Le tableau public : une réponse n'y figure qu'une fois trouvée, une valeur qu'à la révélation
  const slots: FeudSlot[] = round.answers.map((answer, index) => {
    const foundBy = owner(answer.id);
    return { rank: index + 1, label: foundBy || revealed ? answer.label : null, foundBy, points: revealed ? answer.points : null };
  });
  if (role === "player1" || role === "player2") {
    const view: FeudPlayerView = { ...base, role, question: round.question, slots, canBuzz: state.phase === "playing" && state.buzzOpen && !state.buzzWinner && eligible(state, role) };
    return view;
  }
  if (role === "live") {
    const view: FeudLiveView = { ...base, role, question: round.question, slots,
      roundScore: revealed ? state.roundScore : null, revealStartedAt: revealed ? state.revealStartedAt : null, revealStepMs: REVEAL_STEP_MS };
    return view;
  }
  const view: FeudHostView = { ...base, role, question: round.question,
    answers: round.answers.map((answer, index) => ({ ...answer, rank: index + 1, foundBy: owner(answer.id) })),
    roundScore: state.roundScore, revealStartedAt: state.revealStartedAt, revealStepMs: REVEAL_STEP_MS,
    canUndo: state.history.length > 0 };
  return view;
}
