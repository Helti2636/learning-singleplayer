import { z } from "zod";

// A participant who picks one card per round.
export const playerSchema = z.object({
  id: z.string(),
  name: z.string(),
  isConnected: z.boolean(),
});
export type Player = z.infer<typeof playerSchema>;

// The facilitator: creates the room, steers the session, does NOT pick cards.
export const facilitatorSchema = z.object({
  id: z.string(),
  name: z.string(),
  isConnected: z.boolean(),
});
export type Facilitator = z.infer<typeof facilitatorSchema>;

// One player's pick for the CURRENT round (index into that round's options).
export const choiceSchema = z.object({
  playerId: z.string(),
  optionIndex: z.number(),
});
export type Choice = z.infer<typeof choiceSchema>;

export type GamePhase =
  | "waiting"    // Lobby: waiting for players, facilitator can start
  | "selecting"  // Everyone picks one card (in private)
  | "revealing"  // Picks are shown; the group discusses
  | "ended";     // All rounds done — closing summary

export type Role = "player" | "facilitator";

// Complete game state broadcast to everyone in a room.
export const gameStateSchema = z.object({
  roomCode: z.string(),
  phase: z.string() as z.ZodType<GamePhase>,
  players: z.array(playerSchema),
  facilitator: facilitatorSchema.nullable(),
  round: z.number(),          // 0 in the lobby, 1..totalRounds during play
  totalRounds: z.number(),
  choices: z.array(choiceSchema), // picks for the CURRENT round only
  maxPlayers: z.number(),
});
export type GameState = z.infer<typeof gameStateSchema>;

// ---- Socket.IO event contracts (imported by both server and client) ----
export interface ServerToClientEvents {
  game_state: (state: GameState) => void;
  error: (message: string) => void;
  player_joined: (name: string) => void;
  player_left: (name: string) => void;
}
export interface ClientToServerEvents {
  create_room: (name: string, callback: (roomCode: string) => void) => void;
  join_room: (
    roomCode: string,
    name: string,
    role: Role,
    callback: (success: boolean, error?: string) => void
  ) => void;
  start_game: () => void;
  choose: (optionIndex: number) => void;
  reveal_now: () => void;
  next_round: () => void;
  restart: () => void;
}
