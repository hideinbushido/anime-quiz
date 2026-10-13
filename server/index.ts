/**
 * Serveur temps réel du Quiz'Animanga : les Liens d'Ayanokoji et les Pensées d'Anya.
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
import { claim, createRoom, hostAction, loadRound, move, rename, submit, switchGame, tick, viewFor, type Room } from "./rooms.ts";

const ROLES: Role[] = ["player1", "player2", "host", "live"];
const ROOM_ID = /^[A-Za-z0-9_-]{1,24}$/;

interface Client { socket: WebSocket; room: string; role: Role }

export function startServer({ port = Number(process.env.PORT) || 8787, storeFile = process.env.ROOMS_FILE ?? join(dirname(fileURLToPath(import.meta.url)), "data", "rooms.json") } = {}) {
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

  const send = (socket: WebSocket, message: ServerMessage | FeudServerMessage) => { if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(message)); };
  const connected = (roomId: string): Record<PlayerId, boolean> => {
    const here = (role: Role) => [...clients].some(client => client.room === roomId && client.role === role);
    return { player1: here("player1"), player2: here("player2") };
  };
  /** Chaque client reçoit sa propre vue : c'est ce qui garde le plateau adverse et la solution secrets. */
  const broadcast = (room: Room) => {
    const now = Date.now();
    const present = connected(room.id);
    for (const client of clients) {
      if (client.room !== room.id) continue;
      // Un seul état part vers chaque écran : celui de l'épreuve en cours, taillé pour son rôle
      if (room.game === "feud" && room.feud) send(client.socket, { type: "feud:state", view: feudView(room.feud, client.role, { room: room.id, names: room.names, connected: present, now }) });
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
      let message: ClientMessage | FeudClientMessage;
      try { message = JSON.parse(String(raw)) as ClientMessage | FeudClientMessage; } catch { return; }
      if (!message || typeof message.type !== "string") return;

      if (message.type === "room:join") {
        if (typeof message.room !== "string" || !ROOM_ID.test(message.room) || !ROLES.includes(message.role)) {
          return send(socket, { type: "room:error", message: "Room ou rôle invalide." });
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
      let error: string | null = "Action non autorisée.";
      if (message.type === "room:game") error = client.role === "host" ? switchGame(room, message.game) : error;
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
