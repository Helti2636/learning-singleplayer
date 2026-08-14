// Static game content — shared by client (rendering) and server (validation).
// Three fixed rounds, always in this order, with a fixed pool of answers each.

export interface RoundContent {
  topic: string;
  options: string[];
}

// The umbrella framing that sits over all three rounds.
export const FRAMING = {
  intro: "You are about to enrol into a training: what do you hope to find?",
  note: "Keep one card per round — three rounds.",
  standing: "…what do you hope to find?",
};

export const ROUNDS: RoundContent[] = [
  {
    topic: "What learning activities matter most to you?",
    options: [
      "Practical exercises",
      "Expert knowledge",
      "Peer discussion",
      "Reflection time",
      "Job aids & resources",
    ],
  },
  {
    topic: "How long are you expecting the training to be, and how is that time distributed?",
    options: [
      "Short and efficient (one-timer)",
      "Deep and comprehensive (series of short sessions)",
      "Deep and comprehensive (one long immersive session)",
      "Short and self-paced",
      "Deep and comprehensive and self-paced",
      "Blended: self-learning objectives + in-person scheduled session",
    ],
  },
  {
    topic: "What would make this training a success?",
    options: [
      "Knowledge gained",
      "Behaviour change",
      "Team performance",
      "Learner satisfaction",
      "Organizational impact",
    ],
  },
];

export const TOTAL_ROUNDS = ROUNDS.length;

// ---------------------------------------------------------------------------
// Single-player: one participant answers the 3 questions from 3 perspectives.
// ---------------------------------------------------------------------------

// Preset choices offered in perspective 2 ("as someone else"), plus a custom option.
export const PERSON_PRESETS = [
  "Your supervisor",
  "Your most memorable colleague",
  "António Guterres",
];

// Step machine (single source of truth, shared by client + server):
// 0 intro · 1-3 perspective 1 · 4 pick person · 5-7 perspective 2 ·
// 8 create persona · 9-11 perspective 3 · 12 board
export const TOTAL_STEPS = 13;
export const BOARD_STEP = TOTAL_STEPS - 1;

export type StepKind = "intro" | "question" | "person" | "persona" | "board";

export function stepInfo(step: number): { kind: StepKind; perspective: number; question: number } {
  if (step <= 0) return { kind: "intro", perspective: -1, question: -1 };
  if (step >= BOARD_STEP) return { kind: "board", perspective: -1, question: -1 };
  if (step <= 3) return { kind: "question", perspective: 0, question: step - 1 };
  if (step === 4) return { kind: "person", perspective: 1, question: -1 };
  if (step <= 7) return { kind: "question", perspective: 1, question: step - 5 };
  if (step === 8) return { kind: "persona", perspective: 2, question: -1 };
  return { kind: "question", perspective: 2, question: step - 9 }; // 9-11
}
