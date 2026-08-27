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
    pingInterval: 25000,
    pingTimeout: 40000,
  });

  function emit(roomCode: string): void {
    const state = storage.getRoom(roomCode);
    if (state) io.to(roomCode).emit("game_state", state);
  }

  io.on("connection", (socket: TypedSocket) => {
    socket.on("create_room", (name: string, callback: (roomCode: string) => void) => {
      try {
        const roomCode = storage.createRoom(socket.id, name.trim() || "Facilitator");
        socket.join(roomCode);
        callback(roomCode);
        emit(roomCode);
      } catch (error) {
        console.error("[Socket.IO] create_room error:", error);
        socket.emit("error", "Failed to create room");
      }
    });

    socket.on(
      "join_room",
      (roomCode: string, name: string, role: Role, callback: (ok: boolean, err?: string) => void) => {
        try {
          const room = storage.getRoom(roomCode);
          if (!room) return callback(false, "Room not found");
          socket.join(roomCode);

          const res =
            role === "facilitator"
              ? storage.joinFacilitator(roomCode, socket.id, name.trim() || "Facilitator")
              : storage.joinParticipant(roomCode, socket.id, name.trim());

          if (!res.ok) {
            socket.leave(roomCode);
            if (res.reason === "not_found") return callback(false, "Room not found");
            if (res.reason === "taken") return callback(false, "This session already has a participant.");
            return callback(false, "Unable to join the session.");
          }

          callback(true);
          emit(roomCode);
        } catch (error) {
          console.error("[Socket.IO] join_room error:", error);
          callback(false, "An error occurred while joining the session");
        }
      }
    );

    socket.on("start", () => {
      const room = storage.getRoomByAnyId(socket.id);
      if (!room) return socket.emit("error", "You are not in a session");
      if (!storage.start(room.roomCode, socket.id)) {
        return socket.emit("error", "Can't start yet — waiting for a participant to join.");
      }
      emit(room.roomCode);
    });

    socket.on("set_step", (step: number) => {
      const room = storage.getRoomByAnyId(socket.id);
      if (room && storage.setStep(room.roomCode, socket.id, step)) emit(room.roomCode);
    });

    socket.on("set_answer", (perspective: number, question: number, optionIndex: number, otherText?: string) => {
      const room = storage.getRoomByAnyId(socket.id);
      if (room && storage.setAnswer(room.roomCode, socket.id, perspective, question, optionIndex, otherText)) {
        emit(room.roomCode);
      }
    });

    socket.on("set_persona", (persona) => {
      const room = storage.getRoomByAnyId(socket.id);
      if (room && storage.setPersona(room.roomCode, socket.id, persona)) emit(room.roomCode);
    });

    socket.on("take_control", () => {
      const room = storage.getRoomByAnyId(socket.id);
      if (room && storage.takeControl(room.roomCode, socket.id)) emit(room.roomCode);
    });

    socket.on("add_item", (itemId: string) => {
      const room = storage.getRoomByAnyId(socket.id);
      if (room && storage.addItem(room.roomCode, socket.id, itemId)) emit(room.roomCode);
    });

    socket.on("skip", () => {
      const room = storage.getRoomByAnyId(socket.id);
      if (room && storage.skip(room.roomCode, socket.id)) emit(room.roomCode);
    });

    socket.on("remove_item", (itemId: string) => {
      const room = storage.getRoomByAnyId(socket.id);
      if (room && storage.removeItem(room.roomCode, socket.id, itemId)) emit(room.roomCode);
    });

    socket.on("restart", () => {
      const room = storage.getRoomByAnyId(socket.id);
      if (room && storage.restart(room.roomCode, socket.id)) emit(room.roomCode);
    });

    socket.on("disconnect", () => {
      try {
        const room = storage.setConnected(socket.id, false);
        if (room) emit(room.roomCode);
      } catch (error) {
        console.error("[Socket.IO] disconnect error:", error);
      }
    });
  });

  return httpServer;
}
