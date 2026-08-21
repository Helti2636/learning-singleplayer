import { z } from "zod";

// A seat in the room: either the facilitator or the single participant.
export const seatSchema = z.object({
  id: z.string(),
  name: z.string(),
  isConnected: z.boolean(),
});
export type Seat = z.infer<typeof seatSchema>;

// One reflection answer: which perspective (0 = yourself, 1 = the persona),
// which question (0-2), and the chosen option.
export const answerSchema = z.object({
  perspective: z.number(),
  question: z.number(),
  optionIndex: z.number(),
});
export type Answer = z.infer<typeof answerSchema>;

export const personaSchema = z.object({
  name: z.string(),
  answers: z.array(z.number()),  // one option index per persona question; -1 = unanswered
  languageOther: z.string(),     // free text when "Primary Language" = Other
  comment: z.string(),           // 12th open field
});
export type Persona = z.infer<typeof personaSchema>;

export type Phase = "waiting" | "playing" | "board";
export type Role = "facilitator" | "participant";

// Full room state, broadcast to the participant and the (observing) facilitator.
export const gameStateSchema = z.object({
  roomCode: z.string(),
  phase: z.string() as z.ZodType<Phase>,
  facilitator: seatSchema.nullable(),
  participant: seatSchema.nullable(),
  step: z.number(),        // 0..TOTAL_STEPS-1 — where the participant currently is
  totalSteps: z.number(),
  persona: personaSchema,  // the learning persona built mid-game
  controllerId: z.string(),// during the persona intake: who holds the pen (participant by default, or facilitator)
  answers: z.array(answerSchema),  // reflection answers (perspective 0 = you, 1 = persona)
  // ---- Backpack task ----
  demo: z.array(z.string()),           // the facilitator's demo backpack (item ids)
  backpackSelf: z.array(z.string()),   // your own backpack (round 1)
  backpackPersona: z.array(z.string()),// the persona's backpack (round 2)
  maxItems: z.number(),
});
export type GameState = z.infer<typeof gameStateSchema>;

export interface ServerToClientEvents {
  game_state: (state: GameState) => void;
  error: (message: string) => void;
}
export interface ClientToServerEvents {
  create_room: (name: string, callback: (roomCode: string) => void) => void;
  join_room: (
    roomCode: string,
    name: string,
    role: Role,
    callback: (success: boolean, error?: string) => void
  ) => void;
  start: () => void;                                    // facilitator begins the session
  set_step: (step: number) => void;                     // navigate
  set_answer: (perspective: number, question: number, optionIndex: number) => void;
  set_persona: (persona: Persona) => void;   // whole persona object (name, answers, languageOther, comment)
  take_control: () => void;   // during the persona intake: grab the pen (participant or facilitator)
  add_item: (itemId: string) => void;        // pack an item into the current backpack (or the demo)
  remove_item: (itemId: string) => void;     // take an item back out
  restart: () => void;
}
