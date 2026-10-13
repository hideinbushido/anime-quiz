/**
 * L'état des rooms des Liens d'Ayanokoji. Le serveur est la seule source de
 * vérité : les clients proposent, il valide, puis il renvoie à chacun la vue
 * à laquelle il a droit. Ce module ne connaît pas le réseau.
 */
import { randomUUID } from "node:crypto";
import type { PlayerId } from "../src/types.ts";
import type { AyanokojiRound, HostView, LiveView, PlayerResult, PlayerView, PublicRound, Role, RoomView, RoundPhase, TimerState } from "../src/ayanokoji/types.ts";
import { AYANOKOJI_ROUNDS, findRound, nextRound } from "../src/ayanokoji/rounds.ts";
import { isPermutation, validateOrder } from "../src/ayanokoji/validator.ts";
import { maxRoundPoints, roundPoints } from "../src/ayanokoji/scoring.ts";
import type { FeudState, RoomGame } from "../src/feud/types.ts";
import { createFeud } from "../src/feud/reducer.ts";
import type { DossierState } from "../src/dossier/types.ts";
import { createDossier } from "../src/dossier/reducer.ts";
import type { IntroState, QuizState, ShowState } from "../src/quiz/types.ts";
import { createQuiz } from "../src/quiz/reducer.ts";

const PLAYERS: PlayerId[] = ["player1", "player2"];
const COUNTDOWN_MS = 3000;

interface Seat {
  order: string[];
  moveCount: number;
  submittedAt: number | null;
  completionTime: number | null;
}

export interface Room {
  id: string;
  /** L'épreuve que la room joue en ce moment : c'est le présentateur qui en change. */
  game: RoomGame;
  /** La partie des Pensées d'Anya, créée à sa première ouverture et gardée ensuite. */
  feud: FeudState | null;
  /** La partie du Dossier de L, créée à sa première ouverture et gardée ensuite. */
  dossier: DossierState | null;
  /** L'épreuve au buzzer en cours (Killer Bee ou Répliques Cultes). */
  quiz: QuizState | null;
  /** L'état de l'émission entre les épreuves, tenu par le site du présentateur. */
  show: ShowState | null;
  /** La vidéo des règles en cours sur le live, lancée par le présentateur au début d'une épreuve. */
  intro: IntroState | null;
  phase: RoundPhase;
  roundId: string | null;
  initialOrder: string[];
  timer: TimerState;
  revealAt: number | null;
  seats: Record<PlayerId, Seat>;
  names: Record<PlayerId, string>;
  /** La photo de profil de chaque joueur : une petite image encodée, ou rien. */
  avatars: Record<PlayerId, string | null>;
  /** Le total de chaque joueur sur l'épreuve, et les manches déjà comptées. */
  scores: Record<PlayerId, number>;
  scored: string[];
  /** Un jeton par place : celui qui le détient est le propriétaire du plateau. */
  tokens: Partial<Record<Role, string>>;
}

const emptySeat = (order: string[] = []): Seat => ({ order: [...order], moveCount: 0, submittedAt: null, completionTime: null });

export function createRoom(id: string): Room {
  return {
    id, game: "ayanokoji", feud: null, dossier: null, quiz: null, show: null, intro: null, phase: "waiting", roundId: null, initialOrder: [], revealAt: null,
    timer: { elapsedMs: 0, runningSince: null },
    seats: { player1: emptySeat(), player2: emptySeat() },
    names: { player1: "Joueur 1", player2: "Joueur 2" },
    avatars: { player1: null, player2: null },
    scores: { player1: 0, player2: 0 },
    scored: [],
    tokens: {},
  };
}

const elapsed = (timer: TimerState, now: number) => timer.elapsedMs + (timer.runningSince === null ? 0 : now - timer.runningSince);
const stopTimer = (room: Room, now: number) => { room.timer = { elapsedMs: elapsed(room.timer, now), runningSince: null }; };

/** Un mélange unique, tiré une fois par le serveur : les deux joueurs partent de la même situation. */
function shuffle(round: AyanokojiRound): string[] {
  if (round.initialOrder) return [...round.initialOrder];
  const ids = round.characters.map(character => character.id);
  for (let attempt = 0; attempt < 50; attempt++) {
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    // Ni la solution, ni un ordre qui la donnerait presque : au moins quatre cartes à déplacer
    if (ids.filter((id, index) => id === round.solutionOrder[index]).length <= 2) break;
  }
  return ids;
}

/**
 * Attribue une place. Un joueur garde la sienne grâce à son jeton : un
 * rechargement ne la lui fait pas perdre, et personne ne peut la lui prendre.
 * Le live n'a pas de jeton : plusieurs écrans peuvent l'afficher.
 */
export function claim(room: Room, role: Role, token?: string): { token: string } | { error: string } {
  if (role === "live") return { token: "" };
  const owner = room.tokens[role];
  if (!owner) {
    const fresh = randomUUID();
    room.tokens[role] = fresh;
    return { token: fresh };
  }
  if (owner === token) return { token: owner };
  return { error: role === "host" ? "Un présentateur tient déjà cette room." : "Cette place est déjà prise par un autre appareil." };
}

/** Un pseudo est un simple libellé : il est nettoyé, jamais utilisé pour reconnaître quelqu'un. */
export function rename(room: Room, player: PlayerId, name: unknown): void {
  if (typeof name !== "string") return;
  const clean = name.replace(/\s+/g, " ").trim().slice(0, 24);
  if (clean) room.names[player] = clean;
}

/** Le présentateur fait passer la room d'une épreuve à l'autre ; chaque partie reste en l'état. */
export function switchGame(room: Room, game: unknown): string | null {
  if (game !== "ayanokoji" && game !== "feud" && game !== "dossier" && game !== "beats" && game !== "citations" && game !== "lobby") return "Épreuve inconnue.";
  room.game = game;
  // Revenir à l'écran d'émission coupe la vidéo des règles
  if (game === "lobby") room.intro = null;
  if ((game === "beats" || game === "citations") && room.quiz?.kind !== game) room.quiz = createQuiz(game, game === "beats" ? "D" : null);
  if (game === "feud") room.feud ??= createFeud();
  if (game === "dossier") room.dossier ??= createDossier();
  return null;
}

/** Une photo de profil tient en quelques kilo-octets : le téléphone la réduit avant de l'envoyer. */
const AVATAR = /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
const AVATAR_MAX_LENGTH = 40_000;

/** Un joueur change sa photo, ou la retire. Tout ce qui n'est pas une petite image est refusé. */
export function setAvatar(room: Room, player: PlayerId, image: unknown): string | null {
  if (image === null) { room.avatars[player] = null; return null; }
  if (typeof image !== "string" || image.length > AVATAR_MAX_LENGTH || !AVATAR.test(image)) return "Cette image ne peut pas servir de photo de profil.";
  room.avatars[player] = image;
  return null;
}

/** Seules les vidéos de règles du site peuvent passer sur le live. */
const INTRO_SRC = /^\/regles\/[A-Za-z0-9_-]+\.(?:mp4|webm)$/;

/** Le présentateur lance la vidéo des règles sur le live, ou la coupe. */
export function setIntro(room: Room, src: unknown, now: number): string | null {
  if (src === null) { room.intro = null; return null; }
  if (typeof src !== "string" || !INTRO_SRC.test(src)) return "Vidéo des règles inconnue.";
  room.intro = { src, startedAt: now };
  return null;
}

/** L'état de l'émission vient du site du présentateur : il est borné, puis relayé tel quel. */
export function setShow(room: Room, show: unknown): string | null {
  if (show === null) { room.show = null; return null; }
  if (typeof show !== "object" || JSON.stringify(show).length > 6000) return "État de l'émission invalide.";
  const value = show as ShowState;
  if (!["lobby", "between", "final"].includes(value.phase) || !Array.isArray(value.program) || value.program.length > 12
      || !Number.isInteger(value.index) || typeof value.wins !== "object" || value.wins === null) return "État de l'émission invalide.";
  room.show = value;
  return null;
}

export type HostAction = "start" | "pause" | "resume" | "force-end" | "reveal" | "next";

export function loadRound(room: Room, roundId: string): string | null {
  const round = findRound(roundId);
  if (!round) return "Manche introuvable.";
  if (room.phase === "playing" || room.phase === "paused" || room.phase === "countdown") return "Une manche est en cours.";
  // Charger une première manche ouvre une nouvelle épreuve : les totaux repartent de zéro
  if (round.level === 1) { room.scores = { player1: 0, player2: 0 }; room.scored = []; }
  room.roundId = round.id;
  room.initialOrder = shuffle(round);
  room.seats = { player1: emptySeat(room.initialOrder), player2: emptySeat(room.initialOrder) };
  room.timer = { elapsedMs: 0, runningSince: null };
  room.revealAt = null;
  room.phase = "ready";
  return null;
}

export function hostAction(room: Room, action: HostAction, now: number): string | null {
  const round = room.roundId ? findRound(room.roundId) : undefined;
  if (!round) return "Aucune manche chargée.";
  switch (action) {
    case "start":
      if (room.phase !== "ready") return "La manche n'est pas prête.";
      room.phase = "playing";
      room.timer = { elapsedMs: 0, runningSince: now };
      return null;
    case "pause":
      if (room.phase !== "playing") return "La manche n'est pas en cours.";
      stopTimer(room, now);
      room.phase = "paused";
      return null;
    case "resume":
      if (room.phase !== "paused") return "La manche n'est pas en pause.";
      room.timer = { ...room.timer, runningSince: now };
      room.phase = "playing";
      return null;
    case "force-end":
      if (room.phase !== "playing" && room.phase !== "paused") return "Aucune manche à terminer.";
      stopTimer(room, now);
      room.phase = "locked";
      return null;
    case "reveal":
      if (room.phase !== "locked") return "Les deux joueurs n'ont pas encore validé.";
      room.phase = "countdown";
      room.revealAt = now + COUNTDOWN_MS;
      return null;
    case "next": {
      if (room.phase !== "revealing" && room.phase !== "complete") return "Révèle d'abord la manche en cours.";
      // Après la troisième manche, l'épreuve est finie : on reste sur les totaux
      const following = nextRound(round);
      room.phase = "complete";
      return following ? loadRound(room, following.id) : null;
    }
  }
}

/** Le compte à rebours se termine côté serveur : c'est lui qui ouvre la correction. */
export function tick(room: Room, now: number): boolean {
  if (room.phase === "countdown" && room.revealAt !== null && now >= room.revealAt) {
    room.phase = "revealing";
    // Les points de la manche rejoignent les totaux, une seule fois
    const round = room.roundId ? findRound(room.roundId) : undefined;
    if (round && !room.scored.includes(round.id)) {
      room.scored.push(round.id);
      for (const id of PLAYERS) room.scores[id] += roundPoints(round, validateOrder(round, room.seats[id].order));
    }
    return true;
  }
  return false;
}

export function move(room: Room, player: PlayerId, order: unknown): string | null {
  const round = room.roundId ? findRound(room.roundId) : undefined;
  if (!round || room.phase !== "playing") return "La manche n'est pas en cours.";
  const seat = room.seats[player];
  if (seat.submittedAt !== null) return "Ta réponse est verrouillée.";
  if (!isPermutation(round, order)) return "Ordre invalide.";
  // Seul un changement réel compte : une sélection ou un renvoi du même ordre n'est pas un mouvement
  if (order.join() !== seat.order.join()) {
    seat.order = [...order];
    seat.moveCount++;
  }
  return null;
}

export function submit(room: Room, player: PlayerId, now: number): string | null {
  if (room.phase !== "playing") return "La manche n'est pas en cours.";
  const seat = room.seats[player];
  if (seat.submittedAt !== null) return null;
  seat.submittedAt = now;
  seat.completionTime = elapsed(room.timer, now);
  if (PLAYERS.every(id => room.seats[id].submittedAt !== null)) {
    stopTimer(room, now);
    room.phase = "locked";
  }
  return null;
}

const publicRound = (round: AyanokojiRound): PublicRound => ({
  id: round.id, difficulty: round.difficulty, level: round.level, title: round.title,
  characters: round.characters,
  links: round.links.map(({ id, label, description, direction }) => ({ id, label, description, direction })),
});

function result(round: AyanokojiRound, seat: Seat): PlayerResult {
  const evaluation = validateOrder(round, seat.order);
  return { ...evaluation, points: roundPoints(round, evaluation), order: seat.order, moveCount: seat.moveCount, submittedAt: seat.submittedAt, completionTime: seat.completionTime };
}

/**
 * La vue envoyée à un client. C'est ici que se joue le secret de l'épreuve :
 * un joueur ne reçoit jamais le plateau adverse, et personne d'autre que le
 * présentateur ne reçoit la solution avant la révélation.
 */
export function viewFor(room: Room, role: Role, connected: Record<PlayerId, boolean>, now: number): RoomView {
  const round = room.roundId ? findRound(room.roundId) : undefined;
  const revealed = room.phase === "revealing" || room.phase === "complete";
  const base = {
    room: room.id, phase: room.phase, round: round ? publicRound(round) : null,
    initialOrder: room.initialOrder, timer: room.timer, serverNow: now, revealAt: room.revealAt, names: room.names,
    scores: room.scores, maxPoints: round ? maxRoundPoints(round) : 0, lastRound: round ? !nextRound(round) : false,
    seats: {
      player1: { connected: connected.player1, submitted: room.seats.player1.submittedAt !== null },
      player2: { connected: connected.player2, submitted: room.seats.player2.submittedAt !== null },
    },
  };
  const results = round && revealed ? { player1: result(round, room.seats.player1), player2: result(round, room.seats.player2) } : null;
  if (role === "player1" || role === "player2") {
    const seat = room.seats[role];
    const view: PlayerView = { ...base, role, order: seat.order, moveCount: seat.moveCount,
      result: results ? results[role] : null, solution: round && revealed ? round.solutionOrder : null };
    return view;
  }
  const orders = { player1: room.seats.player1.order, player2: room.seats.player2.order };
  const moveCounts = { player1: room.seats.player1.moveCount, player2: room.seats.player2.moveCount };
  if (role === "live") {
    const view: LiveView = { ...base, role, orders, moveCounts, results, solution: round && revealed ? round.solutionOrder : null };
    return view;
  }
  const view: HostView = { ...base, role, orders, moveCounts,
    results: round ? { player1: result(round, room.seats.player1), player2: result(round, room.seats.player2) } : null,
    solution: round?.solutionOrder ?? [],
    catalog: AYANOKOJI_ROUNDS.map(({ id, difficulty, level, title }) => ({ id, difficulty, level, title })) };
  return view;
}
