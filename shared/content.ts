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
