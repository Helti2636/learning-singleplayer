import type { Express } from "express";
import { createServer, type Server } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { storage } from "./storage";
import type { ServerToClientEvents, ClientToServerEvents, Role } from "@shared/schema";

type TypedServer = SocketIOServer<ClientToServerEvents, ServerToClientEvents>;
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  const io: TypedServer = new SocketIOServer(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    // Tolerate short network hiccups before flipping a client "offline".
    pingInterval: 25000,
    pingTimeout: 40000,
  });

  function emitGameState(roomCode: string): void {
    const state = storage.getRoom(roomCode);
    if (state) io.to(roomCode).emit("game_state", state);
  }

  io.on("connection", (socket: TypedSocket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    // Facilitator creates a room.
    socket.on("create_room", (name: string, callback: (roomCode: string) => void) => {
      try {
        const roomCode = storage.createRoom(socket.id, name.trim() || "Facilitator");
        socket.join(roomCode);
        console.log(`[Socket.IO] Room ${roomCode} created by facilitator ${name}`);
        callback(roomCode);
        emitGameState(roomCode);
      } catch (error) {
        console.error("[Socket.IO] create_room error:", error);
        socket.emit("error", "Failed to create room");
      }
    });

    // Player or facilitator joins an existing room.
    socket.on(
      "join_room",
      (roomCode: string, name: string, role: Role, callback: (success: boolean, error?: string) => void) => {
        try {
          const room = storage.getRoom(roomCode);
          if (!room) return callback(false, "Room not found");

          socket.join(roomCode);

          const res =
            role === "facilitator"
              ? storage.joinFacilitator(roomCode, socket.id, name.trim() || "Facilitator")
              : storage.addOrReconnectPlayer(roomCode, socket.id, name.trim());

          if (!res.ok) {
            socket.leave(roomCode);
            switch (res.reason) {
              case "not_found":
                return callback(false, "Room not found");
              case "full":
                return callback(false, "This session is full (up to 5 players).");
              case "not_waiting":
                return callback(false, "The session has already started.");
              case "duplicate_name":
                return callback(false, "That name is already taken — please pick another.");
              default:
                return callback(false, "Unable to join the session.");
            }
          }

          if (res.action === "joined" && role === "player") {
            socket.to(roomCode).emit("player_joined", name.trim());
          }

          callback(true);
          emitGameState(roomCode);
        } catch (error) {
          console.error("[Socket.IO] join_room error:", error);
          callback(false, "An error occurred while joining the session");
        }
      }
    );

    // Facilitator starts the game.
    socket.on("start_game", () => {
      const room = storage.getRoomByAnyId(socket.id);
      if (!room) return socket.emit("error", "You are not in a session");
      if (!storage.startGame(room.roomCode, socket.id)) {
        return socket.emit("error", "Can't start yet — you need at least 2 players.");
      }
      emitGameState(room.roomCode);
    });

    // A player locks in their pick for the round.
    socket.on("choose", (optionIndex: number) => {
      const room = storage.getRoomByPlayerId(socket.id);
      if (!room) return socket.emit("error", "You are not in a session");
      if (!storage.choose(room.roomCode, socket.id, optionIndex)) {
        return socket.emit("error", "Couldn't record your choice.");
      }
      emitGameState(room.roomCode);
    });

    // Facilitator reveals early (fallback if someone is stuck / offline).
    socket.on("reveal_now", () => {
      const room = storage.getRoomByAnyId(socket.id);
      if (!room) return;
      if (storage.revealNow(room.roomCode, socket.id)) emitGameState(room.roomCode);
    });

    // Facilitator advances to the next round (or ends the session).
    socket.on("next_round", () => {
      const room = storage.getRoomByAnyId(socket.id);
      if (!room) return;
      if (storage.nextRound(room.roomCode, socket.id)) emitGameState(room.roomCode);
    });

    // Facilitator runs it again with the same group.
    socket.on("restart", () => {
      const room = storage.getRoomByAnyId(socket.id);
      if (!room) return;
      if (storage.restart(room.roomCode, socket.id)) emitGameState(room.roomCode);
    });

    socket.on("disconnect", () => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
      try {
        const room = storage.setConnected(socket.id, false);
        if (room) {
          const player = room.players.find((p) => p.id === socket.id);
          if (player) socket.to(room.roomCode).emit("player_left", player.name);
          emitGameState(room.roomCode);
        }
      } catch (error) {
        console.error("[Socket.IO] disconnect error:", error);
      }
    });
  });

  return httpServer;
}
