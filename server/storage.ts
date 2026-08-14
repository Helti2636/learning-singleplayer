import type { GameState } from "@shared/schema";
import { TOTAL_STEPS, BOARD_STEP, ROUNDS } from "@shared/content";

export function generateRoomCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
}

type JoinResult =
  | { ok: true; action: "joined" | "reconnected" | "already_member" }
  | { ok: false; reason: "not_found" | "taken" };

export class MemStorage {
  private rooms: Map<string, GameState> = new Map();

  createRoom(facilitatorId: string, facilitatorName: string): string {
    const roomCode = generateRoomCode();
    const state: GameState = {
      roomCode,
      phase: "waiting",
      facilitator: { id: facilitatorId, name: facilitatorName, isConnected: true },
      participant: null,
      step: 0,
      totalSteps: TOTAL_STEPS,
      person: "",
      persona: { name: "", description: "" },
      answers: [],
    };
    this.rooms.set(roomCode, state);
    return roomCode;
  }

  getRoom(roomCode: string): GameState | undefined {
    return this.rooms.get(roomCode);
  }

  joinFacilitator(roomCode: string, socketId: string, name: string): JoinResult {
    const room = this.rooms.get(roomCode);
    if (!room) return { ok: false, reason: "not_found" };
    const isReconnect = !!room.facilitator;
    room.facilitator = { id: socketId, name, isConnected: true };
    return { ok: true, action: isReconnect ? "reconnected" : "joined" };
  }

  /** Single participant seat: same name reclaims it; a different person is blocked. */
  joinParticipant(roomCode: string, socketId: string, name: string): JoinResult {
    const room = this.rooms.get(roomCode);
    if (!room) return { ok: false, reason: "not_found" };

    const p = room.participant;
    if (p) {
      if (p.id === socketId) {
        p.isConnected = true;
        return { ok: true, action: "already_member" };
      }
      if (p.name === name) {
        p.id = socketId;
        p.isConnected = true;
        return { ok: true, action: "reconnected" };
      }
      // A different person is already the participant.
      if (p.isConnected) return { ok: false, reason: "taken" };
      // Seat is free (previous participant left) — take it over.
      room.participant = { id: socketId, name, isConnected: true };
      return { ok: true, action: "joined" };
    }

    room.participant = { id: socketId, name, isConnected: true };
    return { ok: true, action: "joined" };
  }

  getRoomByAnyId(id: string): GameState | undefined {
    return Array.from(this.rooms.values()).find(
      (room) => room.facilitator?.id === id || room.participant?.id === id
    );
  }

  isFacilitator(room: GameState, id: string): boolean {
    return room.facilitator?.id === id;
  }
  isParticipant(room: GameState, id: string): boolean {
    return room.participant?.id === id;
  }

  setConnected(id: string, isConnected: boolean): GameState | undefined {
    const room = this.getRoomByAnyId(id);
    if (!room) return undefined;
    if (room.facilitator?.id === id) room.facilitator.isConnected = isConnected;
    if (room.participant?.id === id) room.participant.isConnected = isConnected;
    return room;
  }

  /** Facilitator starts once a participant is present. */
  start(roomCode: string, byId: string): boolean {
    const room = this.rooms.get(roomCode);
    if (!room || !this.isFacilitator(room, byId)) return false;
    if (!room.participant?.isConnected) return false;
    room.phase = "playing";
    room.step = 0;
    return true;
  }

  setStep(roomCode: string, byId: string, step: number): boolean {
    const room = this.rooms.get(roomCode);
    if (!room || !this.isParticipant(room, byId)) return false;
    if (room.phase === "waiting") return false;
    const clamped = Math.max(0, Math.min(BOARD_STEP, Math.floor(step)));
    room.step = clamped;
    room.phase = clamped >= BOARD_STEP ? "board" : "playing";
    return true;
  }

  setAnswer(
    roomCode: string,
    byId: string,
    perspective: number,
    question: number,
    optionIndex: number
  ): boolean {
    const room = this.rooms.get(roomCode);
    if (!room || !this.isParticipant(room, byId)) return false;
    if (perspective < 0 || perspective > 2 || question < 0 || question > 2) return false;
    const options = ROUNDS[question]?.options;
    if (!options || optionIndex < 0 || optionIndex >= options.length) return false;

    const existing = room.answers.find((a) => a.perspective === perspective && a.question === question);
    if (existing) existing.optionIndex = optionIndex;
    else room.answers.push({ perspective, question, optionIndex });
    return true;
  }

  setPerson(roomCode: string, byId: string, label: string): boolean {
    const room = this.rooms.get(roomCode);
    if (!room || !this.isParticipant(room, byId)) return false;
    room.person = label.slice(0, 60);
    return true;
  }

  setPersona(roomCode: string, byId: string, name: string, description: string): boolean {
    const room = this.rooms.get(roomCode);
    if (!room || !this.isParticipant(room, byId)) return false;
    room.persona = { name: name.slice(0, 60), description: description.slice(0, 600) };
    return true;
  }

  /** Either seat can restart a fresh run with the same pairing. */
  restart(roomCode: string, byId: string): boolean {
    const room = this.rooms.get(roomCode);
    if (!room) return false;
    if (!this.isFacilitator(room, byId) && !this.isParticipant(room, byId)) return false;
    room.phase = "playing";
    room.step = 0;
    room.person = "";
    room.persona = { name: "", description: "" };
    room.answers = [];
    return true;
  }
}

export const storage = new MemStorage();
