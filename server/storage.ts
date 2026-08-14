import type { GameState } from "@shared/schema";
import { TOTAL_ROUNDS, ROUNDS } from "@shared/content";

const MAX_PLAYERS = 5;
const MIN_PLAYERS = 2;

export function generateRoomCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

type JoinResult =
  | { ok: true; action: "joined" | "reconnected" | "already_member" }
  | { ok: false; reason: "not_found" | "full" | "not_waiting" | "duplicate_name" };

export class MemStorage {
  private rooms: Map<string, GameState> = new Map();

  /** The facilitator creates the room and holds the facilitator seat. */
  createRoom(facilitatorId: string, facilitatorName: string): string {
    const roomCode = generateRoomCode();
    const state: GameState = {
      roomCode,
      phase: "waiting",
      players: [],
      facilitator: { id: facilitatorId, name: facilitatorName, isConnected: true },
      round: 0,
      totalRounds: TOTAL_ROUNDS,
      choices: [],
      maxPlayers: MAX_PLAYERS,
    };
    this.rooms.set(roomCode, state);
    return roomCode;
  }

  getRoom(roomCode: string): GameState | undefined {
    return this.rooms.get(roomCode);
  }

  /**
   * Claim (or reclaim, on reconnect) the single facilitator seat. Because only
   * the room creator ever navigates to the facilitator view, we simply hand the
   * seat to whoever joins as facilitator and update the socket id.
   */
  joinFacilitator(roomCode: string, socketId: string, name: string): JoinResult {
    const room = this.rooms.get(roomCode);
    if (!room) return { ok: false, reason: "not_found" };
    const isReconnect = !!room.facilitator;
    room.facilitator = { id: socketId, name, isConnected: true };
    return { ok: true, action: isReconnect ? "reconnected" : "joined" };
  }

  /**
   * Add a new player or reconnect an existing one (matched by name), updating
   * their socket id. Same-name returners always reclaim their seat once the game
   * has started; a name clash is only blocked between two different people who
   * are both present in the lobby.
   */
  addOrReconnectPlayer(roomCode: string, socketId: string, name: string): JoinResult {
    const room = this.rooms.get(roomCode);
    if (!room) return { ok: false, reason: "not_found" };

    const byId = room.players.find((p) => p.id === socketId);
    if (byId) {
      byId.isConnected = true;
      return { ok: true, action: "already_member" };
    }

    const byName = room.players.find((p) => p.name === name);
    if (byName) {
      if (byName.isConnected && room.phase === "waiting") {
        return { ok: false, reason: "duplicate_name" };
      }
      byName.id = socketId;
      byName.isConnected = true;
      return { ok: true, action: "reconnected" };
    }

    if (room.players.length >= room.maxPlayers) return { ok: false, reason: "full" };
    if (room.phase !== "waiting") return { ok: false, reason: "not_waiting" };

    room.players.push({ id: socketId, name, isConnected: true });
    return { ok: true, action: "joined" };
  }

  /** Find a room where this socket is a player. */
  getRoomByPlayerId(playerId: string): GameState | undefined {
    return Array.from(this.rooms.values()).find((room) =>
      room.players.some((p) => p.id === playerId)
    );
  }

  /** Find a room where this socket is a player OR the facilitator. */
  getRoomByAnyId(id: string): GameState | undefined {
    return Array.from(this.rooms.values()).find(
      (room) => room.facilitator?.id === id || room.players.some((p) => p.id === id)
    );
  }

  isFacilitator(roomCode: string, id: string): boolean {
    const room = this.rooms.get(roomCode);
    return !!room && room.facilitator?.id === id;
  }

  /** Mark a socket (player or facilitator) connected/disconnected. */
  setConnected(id: string, isConnected: boolean): GameState | undefined {
    const room = this.getRoomByAnyId(id);
    if (!room) return undefined;
    if (room.facilitator?.id === id) room.facilitator.isConnected = isConnected;
    const player = room.players.find((p) => p.id === id);
    if (player) player.isConnected = isConnected;
    return room;
  }

  /** Facilitator starts the game from the lobby. Needs >= MIN_PLAYERS connected. */
  startGame(roomCode: string, byId: string): boolean {
    const room = this.rooms.get(roomCode);
    if (!room || room.phase !== "waiting") return false;
    if (room.facilitator?.id !== byId) return false;
    const connected = room.players.filter((p) => p.isConnected).length;
    if (connected < MIN_PLAYERS) return false;
    room.phase = "selecting";
    room.round = 1;
    room.choices = [];
    return true;
  }

  /** A player picks one option this round. Auto-reveals once everyone has picked. */
  choose(roomCode: string, playerId: string, optionIndex: number): boolean {
    const room = this.rooms.get(roomCode);
    if (!room || room.phase !== "selecting") return false;

    const player = room.players.find((p) => p.id === playerId);
    if (!player) return false; // facilitator (or stranger) can't pick

    const options = ROUNDS[room.round - 1]?.options;
    if (!options || optionIndex < 0 || optionIndex >= options.length) return false;

    const existing = room.choices.find((c) => c.playerId === playerId);
    if (existing) existing.optionIndex = optionIndex;
    else room.choices.push({ playerId, optionIndex });

    // Reveal automatically once every connected player has locked in a pick.
    const connected = room.players.filter((p) => p.isConnected);
    const chosen = connected.filter((p) => room.choices.some((c) => c.playerId === p.id));
    if (connected.length > 0 && chosen.length === connected.length) {
      room.phase = "revealing";
    }
    return true;
  }

  /** Facilitator fallback: reveal even if someone hasn't picked (e.g. dropped off). */
  revealNow(roomCode: string, byId: string): boolean {
    const room = this.rooms.get(roomCode);
    if (!room || room.phase !== "selecting") return false;
    if (room.facilitator?.id !== byId) return false;
    room.phase = "revealing";
    return true;
  }

  /** Facilitator moves on: next round, or ends the session after the last one. */
  nextRound(roomCode: string, byId: string): boolean {
    const room = this.rooms.get(roomCode);
    if (!room || room.phase !== "revealing") return false;
    if (room.facilitator?.id !== byId) return false;
    if (room.round < room.totalRounds) {
      room.round += 1;
      room.choices = [];
      room.phase = "selecting";
    } else {
      room.phase = "ended";
    }
    return true;
  }

  /** Facilitator can run the session again with the same group. */
  restart(roomCode: string, byId: string): boolean {
    const room = this.rooms.get(roomCode);
    if (!room || room.facilitator?.id !== byId) return false;
    room.phase = "waiting";
    room.round = 0;
    room.choices = [];
    return true;
  }
}

export const storage = new MemStorage();
