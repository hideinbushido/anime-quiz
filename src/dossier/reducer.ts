/**
 * Les règles du Dossier de L, sans réseau ni écran : le serveur les applique,
 * les tests les vérifient. La cible ne sort d'ici que par `dossierView`, qui
 * décide de ce que chaque écran a le droit de savoir.
 */
import type { PlayerId } from "../types";
import { DOSSIER_CONFIG, DOSSIER_TITLE, type DossierConfig } from "./data/universes";
import { compareCharacterGuess, displayValue, findCharacter, universeReady } from "./engine";
import type { DossierCharacter, DossierGame, DossierHostAction, DossierHostView, DossierLiveView, DossierPlayerView, DossierState, DossierView, PublicTurn, RosterEntry, RoundOutcome, TargetCard, UniverseConfig } from "./types";

/** Garde-fou technique, invisible pour les joueurs : ce n'est pas une règle du jeu. */
const MAX_TURNS = 500;
const HISTORY_LIMIT = 20;
const PLAYERS: PlayerId[] = ["player1", "player2"];

export function createDossier(): DossierState {
  return {
    roundIndex: 0, phase: "intro", targetId: null, turns: [], pending: {}, outcome: null,
    wins: { player1: 0, player2: 0 }, draws: 0, records: [], revealedAt: null, history: [],
  };
}

export const dossierUniverse = (state: DossierGame, config: DossierConfig = DOSSIER_CONFIG): UniverseConfig =>
  config.universes[config.rounds[Math.min(state.roundIndex, config.rounds.length - 1)]];

function remember(state: DossierState) {
  const { history, ...game } = state;
  history.push(structuredClone(game));
  if (history.length > HISTORY_LIMIT) history.shift();
}

/** Tire une cible au hasard, en évitant celles des rounds déjà joués. */
function drawTarget(state: DossierState, universe: UniverseConfig, random: () => number): string {
  const used = new Set(state.records.map(record => record.targetId));
  const pool = universe.roster.filter(character => !used.has(character.id));
  const from = pool.length ? pool : universe.roster;
  return from[Math.floor(random() * from.length)].id;
}

function closeRound(state: DossierState, outcome: RoundOutcome, config: DossierConfig) {
  state.phase = "debrief";
  state.outcome = outcome;
  state.pending = {};
  if (outcome === "draw") state.draws++;
  else if (outcome !== "none") state.wins[outcome]++;
  state.records.push({ universeId: dossierUniverse(state, config).id, targetId: state.targetId, outcome, turns: state.turns.length });
}

/**
 * La proposition d'un joueur. Elle est verrouillée sans rien révéler ; quand
 * les deux le sont, le tour se révèle d'un seul coup, pour tout le monde.
 */
export function guessDossier(state: DossierState, player: PlayerId, characterId: unknown, now: number, config: DossierConfig = DOSSIER_CONFIG): string | null {
  if (state.phase !== "guessing") return "Le round n'est pas en cours.";
  if (state.pending[player]) return "Ta proposition est déjà verrouillée.";
  const universe = dossierUniverse(state, config);
  const character = findCharacter(universe, characterId);
  if (!character) return "Ce personnage n'existe pas dans cet univers.";
  if (state.turns.some(turn => turn.guesses[player] === character.id)) return "Tu as déjà proposé ce personnage.";
  if (state.turns.length >= MAX_TURNS) return "Le round est trop long : le présentateur doit le terminer.";
  state.pending[player] = character.id;
  if (!PLAYERS.every(id => state.pending[id])) return null;

  // Les deux sont engagés : le tour devient public, d'un seul bloc
  state.turns.push({ guesses: { player1: state.pending.player1!, player2: state.pending.player2! } });
  state.pending = {};
  state.revealedAt = now;
  const found = PLAYERS.filter(id => state.turns.at(-1)!.guesses[id] === state.targetId);
  // Deux bonnes réponses dans le même tour : égalité, on ne départage pas à la milliseconde
  if (found.length) closeRound(state, found.length === 2 ? "draw" : found[0], config);
  return null;
}

export function hostDossier(state: DossierState, action: DossierHostAction, now: number, config: DossierConfig = DOSSIER_CONFIG, random: () => number = Math.random): string | null {
  const universe = dossierUniverse(state, config);
  switch (action.type) {
    case "dossier:undo": {
      const previous = state.history.pop();
      if (!previous) return "Rien à annuler.";
      Object.assign(state, previous);
      return null;
    }
    case "dossier:restart":
      Object.assign(state, createDossier());
      return null;
    case "dossier:target": {
      if (state.phase !== "intro") return "La cible se choisit avant de démarrer le round.";
      if (action.characterId === null) { state.targetId = null; return null; }
      const character = findCharacter(universe, action.characterId);
      if (!character) return "Ce personnage n'existe pas dans cet univers.";
      state.targetId = character.id;
      return null;
    }
    case "dossier:start":
      if (state.phase !== "intro") return "Le round est déjà lancé.";
      if (!universeReady(universe)) return `${universe.name} n'est pas encore configuré.`;
      remember(state);
      // Sans choix du présentateur, le serveur tire la cible au hasard
      state.targetId ??= drawTarget(state, universe, random);
      state.phase = "guessing";
      state.turns = [];
      state.pending = {};
      state.outcome = null;
      state.revealedAt = now;
      return null;
    case "dossier:end-round":
      if (state.phase !== "guessing") return "Aucun round à terminer.";
      remember(state);
      closeRound(state, "none", config);
      return null;
    case "dossier:next": {
      // Un univers pas encore configuré peut être passé sans être joué
      const skipping = state.phase === "intro" && !universeReady(universe);
      if (state.phase !== "debrief" && !skipping) return state.phase === "finished" ? "L'épreuve est terminée." : "Termine d'abord le round en cours.";
      remember(state);
      if (skipping) state.records.push({ universeId: universe.id, targetId: null, outcome: "none", turns: 0 });
      if (state.roundIndex >= config.rounds.length - 1) { state.phase = "finished"; return null; }
      state.roundIndex++;
      state.phase = "intro";
      state.targetId = null;
      state.turns = [];
      state.pending = {};
      state.outcome = null;
      state.revealedAt = null;
      return null;
    }
  }
}

const entry = ({ id, name, aliases, image }: DossierCharacter): RosterEntry => ({ id, name, ...(aliases?.length ? { aliases } : {}), ...(image ? { image } : {}) });

const targetCard = (universe: UniverseConfig, character: DossierCharacter): TargetCard => ({
  id: character.id, name: character.name, ...(character.image ? { image: character.image } : {}),
  cells: universe.attributes.map(attribute => ({ key: attribute.key, label: attribute.label, value: displayValue(character.attributes[attribute.key]) })),
});

interface Context { room: string; names: Record<PlayerId, string>; connected: Record<PlayerId, boolean>; now: number }

/**
 * La vue envoyée à un écran. Les cases sont calculées ici, côté serveur : un
 * joueur ou le live ne reçoit ni l'identifiant de la cible ni sa fiche avant
 * la fin du round, seulement les couleurs de ce qui a été proposé.
 */
export function dossierView(state: DossierState, role: PlayerId | "host" | "live", context: Context, config: DossierConfig = DOSSIER_CONFIG): DossierView {
  const universe = dossierUniverse(state, config);
  const target = findCharacter(universe, state.targetId);
  const over = state.phase === "debrief" || state.phase === "finished";
  const turns: PublicTurn[] = target ? state.turns.map((turn, index) => ({
    number: index + 1,
    guesses: {
      player1: compareCharacterGuess(universe, findCharacter(universe, turn.guesses.player1)!, target),
      player2: compareCharacterGuess(universe, findCharacter(universe, turn.guesses.player2)!, target),
    },
  })) : [];
  const finished = state.phase === "finished";
  const base = {
    game: "dossier" as const, room: context.room, title: DOSSIER_TITLE, phase: state.phase,
    roundNumber: state.roundIndex + 1, roundCount: config.rounds.length,
    universe: { id: universe.id, name: universe.name, attributes: universe.attributes, ready: universeReady(universe) },
    rounds: config.rounds.map((id, index) => ({ universe: config.universes[id].name, outcome: state.records[index]?.outcome ?? null })),
    names: context.names, connected: context.connected,
    locked: { player1: Boolean(state.pending.player1), player2: Boolean(state.pending.player2) },
    turns, wins: state.wins, draws: state.draws, outcome: state.outcome,
    target: over && target ? targetCard(universe, target) : null,
    revealedAt: state.revealedAt, serverNow: context.now,
    result: finished ? {
      winner: state.wins.player1 === state.wins.player2 ? null : state.wins.player1 > state.wins.player2 ? "player1" as const : "player2" as const,
      player1Wins: state.wins.player1, player2Wins: state.wins.player2, draws: state.draws,
    } : null,
  };
  const roster = universe.roster.map(entry);
  if (role === "player1" || role === "player2") {
    const view: DossierPlayerView = { ...base, role, roster, myGuess: state.pending[role] ?? null, canGuess: state.phase === "guessing" && !state.pending[role] };
    return view;
  }
  if (role === "live") {
    const view: DossierLiveView = { ...base, role };
    return view;
  }
  const pending: DossierHostView["pending"] = {};
  for (const id of PLAYERS) {
    const character = findCharacter(universe, state.pending[id]);
    if (character) pending[id] = entry(character);
  }
  const view: DossierHostView = { ...base, role, roster, secretTarget: target ? targetCard(universe, target) : null, pending, canUndo: state.history.length > 0 };
  return view;
}
