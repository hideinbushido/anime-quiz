/**
 * Serveur temps réel du Quiz'Animanga : les Liens d'Ayanokoji, les Pensées d'Anya et le Dossier de L.
 *
 *   npm run server            (port 8787, ou la variable PORT)
 *
 * Un WebSocket par client. Chaque client rejoint une room avec un rôle
 * (player1, player2, host, live) ; le serveur lui renvoie la vue à laquelle
 * il a droit à chaque changement. Les rooms vivent en mémoire et sont
 * recopiées sur disque : un rechargement de page, ou un redémarrage du
 * serveur, ne détruit pas la partie.
 */
import { createServer } from "node:http";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer, type WebSocket } from "ws";
import type { PlayerId } from "../src/types.ts";
import type { ClientMessage, Role, ServerMessage } from "../src/ayanokoji/types.ts";
import type { FeudClientMessage, FeudHostAction, FeudServerMessage } from "../src/feud/types.ts";
import { feudView, hostFeud, pressBuzzer, tickFeud } from "../src/feud/reducer.ts";
import type { DossierClientMessage, DossierHostAction, DossierServerMessage } from "../src/dossier/types.ts";
import { dossierRoster, dossierUniverse, dossierView, guessDossier, hostDossier } from "../src/dossier/reducer.ts";
import { DOSSIER_CONFIG } from "../src/dossier/data/universes.ts";
import type { DifficultyClass } from "../src/types.ts";
import type { IntroState, QuizClientMessage, QuizHostAction, QuizServerMessage, ShowState } from "../src/quiz/types.ts";
import type { RoomGame } from "../src/feud/types.ts";
import { createQuiz, hostQuiz, pressQuizBuzzer, quizView } from "../src/quiz/reducer.ts";
import { quizItems } from "./quizData.ts";
import { attachDossierImages } from "./dossierImages.ts";
import { claim, createRoom, hostAction, loadRound, move, rename, setAvatar, setIntro, setShow, submit, switchGame, tick, viewFor, type Room } from "./rooms.ts";

const ROLES: Role[] = ["player1", "player2", "host", "live"];
const ROOM_ID = /^[A-Za-z0-9_-]{1,24}$/;
const HOST_PASSWORD_ERROR = "Mot de passe de la régie incorrect.";

interface Client { socket: WebSocket; room: string; role: Role; /** L'heure de la dernière image de caméra relayée. */ camAt?: number; /** L'univers dont cet écran a déjà reçu le catalogue. */ roster?: string }

export function startServer({ port = Number(process.env.PORT) || 8787, hostPassword = process.env.HOST_PASSWORD ?? "", storeFile = process.env.ROOMS_FILE ?? join(dirname(fileURLToPath(import.meta.url)), "data", "rooms.json") } = {}) {
  // Les portraits déposés dans public/dossier/ rejoignent les fiches des personnages
  attachDossierImages(DOSSIER_CONFIG);
  const rooms = new Map<string, Room>();
  const clients = new Set<Client>();

  // ── Sauvegarde sur disque ──
  try {
    for (const room of JSON.parse(readFileSync(storeFile, "utf8")) as Room[]) rooms.set(room.id, { ...createRoom(room.id), ...room });
  } catch { /* premier lancement, ou fichier illisible : on repart de rooms vides */ }
  let saving: NodeJS.Timeout | null = null;
  const save = () => {
    saving ??= setTimeout(() => {
      saving = null;
      try {
        mkdirSync(dirname(storeFile), { recursive: true });
        writeFileSync(storeFile, JSON.stringify([...rooms.values()]));
      } catch (error) { console.error("Sauvegarde des rooms impossible :", error); }
    }, 150);
  };

  /** Ce que tout écran sait de la room, quelle que soit l'épreuve : laquelle se joue, qui est là, où en est l'émission. */
  type ShowMessage = { type: "show:state"; game: RoomGame; show: ShowState | null; intro: IntroState | null; serverNow: number; names: Room["names"]; avatars: Room["avatars"]; connected: Record<PlayerId, boolean> };
  type CamMessage = { type: "room:cam"; player: PlayerId; image: string | null };
  const send = (socket: WebSocket, message: ServerMessage | FeudServerMessage | DossierServerMessage | QuizServerMessage | ShowMessage | CamMessage) => { if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(message)); };
  const connected = (roomId: string): Record<PlayerId, boolean> => {
    const here = (role: Role) => [...clients].some(client => client.room === roomId && client.role === role);
    return { player1: here("player1"), player2: here("player2") };
  };
  /** L'image de la caméra d'un joueur part vers le live et la régie ; elle n'est jamais gardée. */
  const relayCam = (roomId: string, player: PlayerId, image: string | null) => {
    for (const other of clients) if (other.room === roomId && (other.role === "live" || other.role === "host")) send(other.socket, { type: "room:cam", player, image });
  };
  /** Chaque client reçoit sa propre vue : c'est ce qui garde le plateau adverse et la solution secrets. */
  const broadcast = (room: Room) => {
    const now = Date.now();
    const present = connected(room.id);
    for (const client of clients) {
      if (client.room !== room.id) continue;
      // Un seul état part vers chaque écran : celui de l'épreuve en cours, taillé pour son rôle
      const context = { room: room.id, names: room.names, avatars: room.avatars, connected: present, now };
      send(client.socket, { type: "show:state", game: room.game, show: room.show, intro: room.intro, serverNow: now, names: room.names, avatars: room.avatars, connected: present });
      if (room.game === "lobby") continue;
      if ((room.game === "beats" || room.game === "citations") && room.quiz) {
        send(client.socket, { type: "quiz:state", view: quizView(room.quiz, client.role, context, quizItems(room.quiz.kind, room.quiz.difficulty)) });
        continue;
      }
      if (room.game === "dossier" && room.dossier) {
        // Le catalogue part une fois par écran et par univers, avant l'état qui s'en sert
        const universe = dossierUniverse(room.dossier).id;
        if (client.role !== "live" && client.roster !== universe) {
          client.roster = universe;
          send(client.socket, { type: "dossier:roster", universe, roster: dossierRoster(room.dossier) });
        }
        send(client.socket, { type: "dossier:state", view: dossierView(room.dossier, client.role, context) });
      }
      else if (room.game === "feud" && room.feud) send(client.socket, { type: "feud:state", view: feudView(room.feud, client.role, context) });
      else send(client.socket, { type: "room:state", view: viewFor(room, client.role, present, now) });
    }
    save();
  };

  const http = createServer((request, response) => {
    // Sonde de santé, utile à l'hébergeur
    response.writeHead(request.url === "/health" ? 200 : 404, { "content-type": "text/plain" }).end(request.url === "/health" ? "ok" : "");
  });
  const wss = new WebSocketServer({ server: http });

  wss.on("connection", socket => {
    let client: Client | null = null;
    socket.on("message", raw => {
      let message: ClientMessage | FeudClientMessage | DossierClientMessage | QuizClientMessage;
      try { message = JSON.parse(String(raw)) as ClientMessage | FeudClientMessage | DossierClientMessage | QuizClientMessage; } catch { return; }
      if (!message || typeof message.type !== "string") return;

      if (message.type === "room:join") {
        if (typeof message.room !== "string" || !ROOM_ID.test(message.room) || !ROLES.includes(message.role)) {
          return send(socket, { type: "room:error", message: "Room ou rôle invalide." });
        }
        // La régie est gardée par un mot de passe quand le serveur en a un (variable HOST_PASSWORD)
        if (message.role === "host" && hostPassword && message.password !== hostPassword) {
          return send(socket, { type: "room:error", message: HOST_PASSWORD_ERROR });
        }
        const room = rooms.get(message.room) ?? createRoom(message.room);
        rooms.set(room.id, room);
        const seat = claim(room, message.role, message.token);
        if ("error" in seat) return send(socket, { type: "room:error", message: seat.error });
        // Les pseudos viennent du joueur lui-même, ou du présentateur pour les deux
        if (message.role === "player1" || message.role === "player2") rename(room, message.role, message.name);
        if (message.role === "host") for (const id of ["player1", "player2"] as const) rename(room, id, message.names?.[id]);
        if (client) clients.delete(client);
        client = { socket, room: room.id, role: message.role };
        clients.add(client);
        send(socket, { type: "room:joined", token: seat.token });
        return broadcast(room);
      }

      // Tout le reste exige d'avoir rejoint une room : le rôle vient du serveur, jamais du message
      if (!client) return send(socket, { type: "room:error", message: "Rejoins d'abord une room." });
      const room = rooms.get(client.room);
      if (!room) return;
      const now = Date.now();
      const isPlayer = client.role === "player1" || client.role === "player2";
      if (message.type === "room:cam") {
        // Plusieurs images par seconde : elles sont relayées sans toucher à l'état de la room
        if (!isPlayer) return;
        const image = message.image === null ? null : typeof message.image === "string" && message.image.startsWith("data:image/jpeg;base64,") && message.image.length <= 60000 ? message.image : undefined;
        if (image === undefined || (image && now - (client.camAt ?? 0) < 60)) return;
        client.camAt = now;
        return relayCam(client.room, client.role as PlayerId, image);
      }
      let error: string | null = "Action non autorisée.";
      if (message.type === "room:avatar") {
        // Un joueur ne change que sa photo ; le présentateur peut poser celle de l'un ou de l'autre
        const target = isPlayer ? client.role as PlayerId : client.role === "host" && (message.player === "player1" || message.player === "player2") ? message.player : null;
        if (target) error = setAvatar(room, target, message.image);
      }
      else if (message.type === "room:game") error = client.role === "host" ? switchGame(room, message.game) : error;
      else if (message.type === "show:intro") error = client.role === "host" ? setIntro(room, message.src, now) : error;
      else if (message.type === "show:update") error = client.role === "host" ? setShow(room, message.show) : error;
      else if (message.type === "quiz:start") {
        // Une épreuve au buzzer repart toujours de sa première question
        if (client.role === "host" && (message.kind === "beats" || message.kind === "citations")) {
          const difficulty = (["D", "C", "B", "A"] as const).find(level => level === message.difficulty) ?? (message.kind === "beats" ? "D" : null);
          room.quiz = createQuiz(message.kind, difficulty as DifficultyClass | null);
          room.game = message.kind;
          error = null;
        }
      }
      else if (message.type.startsWith("quiz:")) {
        if (!room.quiz || (room.game !== "beats" && room.game !== "citations")) error = "Cette épreuve n'est pas ouverte.";
        else if (client.role === "host") error = hostQuiz(room.quiz, message as Exclude<QuizHostAction, { type: "quiz:start" }>, now, quizItems(room.quiz.kind, room.quiz.difficulty)) ?? null;
      }
      else if (message.type === "buzzer:press" && (room.game === "beats" || room.game === "citations")) {
        error = !room.quiz ? "Cette épreuve n'est pas ouverte." : isPlayer ? pressQuizBuzzer(room.quiz, client.role as PlayerId, now) : error;
      }
      else if (message.type.startsWith("dossier:")) {
        // Le Dossier de L : un joueur n'envoie que l'identifiant de sa proposition, le serveur corrige
        if (room.game !== "dossier" || !room.dossier) error = "Cette épreuve n'est pas ouverte.";
        else if (message.type === "dossier:guess") error = isPlayer ? guessDossier(room.dossier, client.role as PlayerId, message.characterId, now) : error;
        else if (client.role === "host") error = hostDossier(room.dossier, message as DossierHostAction, now) ?? null;
      }
      else if (message.type === "buzzer:press" || message.type.startsWith("feud:")) {
        // Le buzzer et la régie des Pensées d'Anya : le rôle vient de la connexion, jamais du message
        if (room.game !== "feud" || !room.feud) error = "Cette épreuve n'est pas ouverte.";
        else if (message.type === "buzzer:press") error = isPlayer ? pressBuzzer(room.feud, client.role as PlayerId) : error;
        else if (client.role === "host") error = hostFeud(room.feud, message as FeudHostAction, now) ?? null;
      }
      else if (message.type === "ayanokoji:move" && isPlayer) error = move(room, client.role as PlayerId, message.order);
      else if (message.type === "ayanokoji:submit" && isPlayer) error = submit(room, client.role as PlayerId, now);
      else if (client.role === "host") {
        if (message.type === "ayanokoji:load") error = loadRound(room, message.roundId);
        else if (message.type.startsWith("ayanokoji:")) {
          const action = message.type.slice("ayanokoji:".length);
          if (["start", "pause", "resume", "force-end", "reveal", "next"].includes(action)) error = hostAction(room, action as Parameters<typeof hostAction>[1], now);
        }
      }
      if (error) send(socket, { type: "room:error", message: error });
      broadcast(room);
    });
    socket.on("close", () => {
      if (!client) return;
      clients.delete(client);
      if (client.role === "player1" || client.role === "player2") relayCam(client.room, client.role, null);
      const room = rooms.get(client.room);
      if (room) broadcast(room);
    });
  });

  // Le compte à rebours 3-2-1 se termine ici, pas chez les clients
  const clock = setInterval(() => {
    const now = Date.now();
    for (const room of rooms.values()) {
      const moved = tick(room, now);
      if ((room.feud && tickFeud(room.feud, now)) || moved) broadcast(room);
    }
  }, 100);

  http.listen(port);
  return {
    port,
    close: () => new Promise<void>(resolve => {
      clearInterval(clock);
      if (saving) clearTimeout(saving);
      // tous les sockets, y compris ceux qui n'ont jamais rejoint de room
      for (const socket of wss.clients) socket.terminate();
      wss.close(() => http.close(() => resolve()));
    }),
  };
}

// Lancé directement (et non importé par un test) : on démarre.
// (sous Windows, la casse de la lettre de lecteur peut différer entre les deux chemins)
if (process.argv[1] && resolve(fileURLToPath(import.meta.url)).toLowerCase() === resolve(process.argv[1]).toLowerCase()) {
  const { port } = startServer();
  console.log(`Quiz'Animanga — serveur temps réel sur ws://localhost:${port}`);
}
