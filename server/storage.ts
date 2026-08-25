import type { GameState, Persona } from "@shared/schema";
import {
  TOTAL_STEPS, END_STEP, ROUNDS, isPersonaStep, isFacilitatorStep, stepInfo, skipTarget,
  emptyPersona, PERSONA_QUESTIONS, ITEM_BY_ID, MAX_ITEMS,
  isCustomItem, customItemText, CUSTOM_PREFIX, CUSTOM_MAX_LEN,
} from "@shared/content";

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
      persona: emptyPersona(),
      controllerId: "",
      answers: [],
      demo: [],
      backpackSelf: [],
      backpackPersona: [],
      maxItems: MAX_ITEMS,
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
        if (room.controllerId === p.id) room.controllerId = socketId; // keep the pen after a reconnect
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
    room.controllerId = room.participant.id; // participant holds the pen by default
    return true;
  }

  setStep(roomCode: string, byId: string, step: number): boolean {
    const room = this.rooms.get(roomCode);
    if (!room || room.phase === "waiting") return false;
    const clamped = Math.max(0, Math.min(END_STEP, Math.floor(step)));
    const fromIntake = isPersonaStep(room.step);
    const toIntake = isPersonaStep(clamped);
    // The participant always drives navigation; on facilitator-active steps (the
    // demo) and the persona intake, the facilitator may also step through.
    const facActive = fromIntake || toIntake || isFacilitatorStep(room.step) || isFacilitatorStep(clamped);
    const canNavigate = this.isParticipant(room, byId) || (this.isFacilitator(room, byId) && facActive);
    if (!canNavigate) return false;
    room.step = clamped;
    room.phase = clamped >= END_STEP ? "board" : "playing";
    // Controller lifecycle: the participant holds the pen by default. Keep whoever
    // holds it while moving between intake screens; reset to the participant otherwise.
    if (toIntake) {
      if (!fromIntake) room.controllerId = room.participant?.id ?? "";
    } else {
      room.controllerId = room.participant?.id ?? "";
    }
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
    if (perspective < 0 || perspective > 1 || question < 0 || question > 2) return false;
    const options = ROUNDS[question]?.options;
    if (!options || optionIndex < 0 || optionIndex >= options.length) return false;

    const existing = room.answers.find((a) => a.perspective === perspective && a.question === question);
    if (existing) existing.optionIndex = optionIndex;
    else room.answers.push({ perspective, question, optionIndex });
    return true;
  }

  /** Which backpack the current step edits, and who may edit it. */
  private backpackTarget(room: GameState, byId: string): string[] | null {
    const kind = stepInfo(room.step).kind;
    if (kind === "backpackDemo") return this.isFacilitator(room, byId) ? room.demo : null;
    if (kind === "backpackSelf") return this.isParticipant(room, byId) ? room.backpackSelf : null;
    if (kind === "backpackPersona") return this.isParticipant(room, byId) ? room.backpackPersona : null;
    return null;
  }

  addItem(roomCode: string, byId: string, itemId: string): boolean {
    const room = this.rooms.get(roomCode);
    if (!room) return false;
    let id = itemId;
    if (isCustomItem(itemId)) {
      const text = customItemText(itemId).trim().slice(0, CUSTOM_MAX_LEN);
      if (!text) return false;
      id = CUSTOM_PREFIX + text;
    } else if (!ITEM_BY_ID[itemId]) {
      return false;
    }
    const target = this.backpackTarget(room, byId);
    if (!target) return false;
    if (target.includes(id) || target.length >= room.maxItems) return false;
    target.push(id);
    return true;
  }

  removeItem(roomCode: string, byId: string, itemId: string): boolean {
    const room = this.rooms.get(roomCode);
    if (!room) return false;
    const target = this.backpackTarget(room, byId);
    if (!target) return false;
    const i = target.indexOf(itemId);
    if (i === -1) return false;
    target.splice(i, 1);
    return true;
  }

  setPersona(roomCode: string, byId: string, persona: Persona): boolean {
    const room = this.rooms.get(roomCode);
    if (!room) return false;
    // Only the current controller may edit (participant by default, or the facilitator after take control).
    const controller = room.controllerId || room.participant?.id;
    if (byId !== controller) return false;
    // Validate & clamp against the question set.
    const answers = PERSONA_QUESTIONS.map((q, i) => {
      const v = Math.floor(Number(persona?.answers?.[i]));
      return Number.isFinite(v) && v >= 0 && v < q.options.length ? v : -1;
    });
    const otherTexts = PERSONA_QUESTIONS.map((_, i) => String(persona?.otherTexts?.[i] ?? "").slice(0, 120));
    room.persona = {
      name: String(persona?.name ?? "").slice(0, 60),
      answers,
      otherTexts,
      comment: String(persona?.comment ?? "").slice(0, 600),
    };
    return true;
  }

  /** Facilitator jumps past the current block to the next activity (persona is never skippable). */
  skip(roomCode: string, byId: string): boolean {
    const room = this.rooms.get(roomCode);
    if (!room || !this.isFacilitator(room, byId)) return false;
    const target = skipTarget(room.step);
    if (target == null) return false;
    room.step = target;
    room.phase = target >= END_STEP ? "board" : "playing";
    room.controllerId = room.participant?.id ?? ""; // targets are never mid-intake
    return true;
  }

  /** Persona intake only: grab the pen — either the participant or the facilitator. */
  takeControl(roomCode: string, id: string): boolean {
    const room = this.rooms.get(roomCode);
    if (!room || !isPersonaStep(room.step)) return false;
    if (!this.isFacilitator(room, id) && !this.isParticipant(room, id)) return false;
    room.controllerId = id;
    return true;
  }

  /** Either seat can restart a fresh run with the same pairing. */
  restart(roomCode: string, byId: string): boolean {
    const room = this.rooms.get(roomCode);
    if (!room) return false;
    if (!this.isFacilitator(room, byId) && !this.isParticipant(room, byId)) return false;
    room.phase = "playing";
    room.step = 0;
    room.persona = emptyPersona();
    room.controllerId = room.participant?.id ?? "";
    room.answers = [];
    room.demo = [];
    room.backpackSelf = [];
    room.backpackPersona = [];
    return true;
  }
}

export const storage = new MemStorage();
