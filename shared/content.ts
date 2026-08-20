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

// ---------------------------------------------------------------------------
// Learning-persona intake: a short name, then 11 single-choice questions,
// then an open comment field. Shared by client (rendering) and server (validation).
// ---------------------------------------------------------------------------

export interface PersonaQuestion {
  label: string;   // short label (card + board)
  prompt: string;  // full question shown on the screen
  options: string[];
  allowOther?: boolean; // reveals a free-text field when "Other" is picked
}

export const PERSONA_QUESTIONS: PersonaQuestion[] = [
  {
    label: "Role & Level",
    prompt: "Which category best describes the learner?",
    options: [
      "General Service (GS)",
      "National Professional Officer (NPO)",
      "Professional (P1–P2)",
      "Professional (P3–P5)",
      "Director (D1–D2)",
      "Senior Leader (ASG/USG)",
      "Consultant / Individual Contractor",
      "UN Volunteer (UNV)",
    ],
  },
  {
    label: "Primary Responsibilities",
    prompt: "What do they spend most of their time doing?",
    options: [
      "Programme coordination",
      "Project management",
      "Team leadership",
      "Stakeholder engagement",
      "Policy development",
      "Technical advisory",
      "Data analysis and reporting",
      "Operations support",
      "Administrative support",
      "Capacity development and training",
      "Field operations",
    ],
  },
  {
    label: "Years of UN Experience",
    prompt: "How long have they worked in the UN system?",
    options: ["Less than 2 years", "2–5 years", "6–10 years", "11–20 years", "More than 20 years"],
  },
  {
    label: "Topic Expertise",
    prompt: "How familiar are they with the topic?",
    options: ["New to the topic", "Basic awareness", "Working knowledge", "Advanced practitioner", "Subject matter expert"],
  },
  {
    label: "This Learning…",
    prompt: "What value does this learning provide to the learner?",
    options: [
      "Improves job performance",
      "Solves a current work challenge",
      "Meets a compliance requirement",
      "Supports team effectiveness",
      "Prepares for greater responsibilities",
      "Advances career development",
      "Increases confidence on the topic",
      "Improves programme or operational results",
    ],
  },
  {
    label: "Work Setting",
    prompt: "Where do they typically work?",
    options: ["Headquarters", "Regional Office", "Country Office", "Field Duty Station", "Hybrid", "Fully remote", "Frequently travelling"],
  },
  {
    label: "Primary Language",
    prompt: "Which language are they most comfortable using?",
    options: ["English", "French", "Spanish", "Arabic", "Russian", "Chinese", "Other"],
    allowOther: true,
  },
  {
    label: "Internet Access",
    prompt: "What is their level of connectivity?",
    options: ["Fully connected", "Generally connected", "Occasionally disconnected", "Connectivity-constrained", "Mobile-first access"],
  },
  {
    label: "Learning Availability",
    prompt: "How much time can they realistically dedicate to learning?",
    options: [
      "Less than 30 minutes per week",
      "30–60 minutes per week",
      "1–2 hours per week",
      "2–4 hours per week",
      "More than 4 hours per week",
    ],
  },
  {
    label: "Biggest Challenge",
    prompt: "What is their biggest barrier to success?",
    options: [
      "Lacks time for learning",
      "Has competing priorities",
      "Has limited prior knowledge",
      "Lacks confidence on the topic",
      "Has unreliable internet access",
      "Receives limited manager support",
      "Struggles to apply learning to the job",
      "Feels overwhelmed by information",
    ],
  },
  {
    label: "Biggest Goal",
    prompt: "What are they trying to achieve?",
    options: [
      "Works more efficiently",
      "Delivers stronger programme results",
      "Builds professional expertise",
      "Gains confidence in their role",
      "Leads others more effectively",
      "Supports teams more effectively",
      "Advances their career",
      "Better serves partners and beneficiaries",
    ],
  },
];

// Structural persona shape (matches personaSchema in schema.ts).
export interface PersonaData {
  name: string;
  answers: number[];      // one option index per PERSONA_QUESTIONS entry; -1 = unanswered
  languageOther: string;  // free text when "Primary Language" = Other
  comment: string;        // 12th open field
}

export function emptyPersona(): PersonaData {
  return { name: "", answers: PERSONA_QUESTIONS.map(() => -1), languageOther: "", comment: "" };
}

/** Resolve one question's chosen value to display text ("" if unanswered). */
export function personaValue(p: PersonaData, i: number): string {
  const q = PERSONA_QUESTIONS[i];
  const idx = p.answers?.[i];
  if (idx == null || idx < 0 || idx >= q.options.length) return "";
  const opt = q.options[idx];
  if (q.allowOther && opt === "Other" && p.languageOther.trim()) return p.languageOther.trim();
  return opt;
}

export function personaRows(p: PersonaData): { label: string; value: string }[] {
  return PERSONA_QUESTIONS.map((q, i) => ({ label: q.label, value: personaValue(p, i) }));
}

/** Name + every question answered (the comment stays optional). */
export function personaComplete(p: PersonaData): boolean {
  return p.name.trim() !== "" && PERSONA_QUESTIONS.every((_, i) => (p.answers?.[i] ?? -1) >= 0);
}

/** Plain-text version for the clipboard / PDF and for pasting into the backpack. */
export function personaPlainText(p: PersonaData): string {
  const lines = [`Learning persona — ${p.name || "—"}`];
  personaRows(p).forEach((r) => lines.push(`${r.label}: ${r.value || "—"}`));
  if (p.comment.trim()) lines.push(`Other comments: ${p.comment.trim()}`);
  return lines.join("\n");
}

// Step machine (single source of truth, shared by client + server):
// 0 intro · 1-3 perspective 1 (you) · 4 pick person · 5-7 perspective 2 (someone) ·
// 8 persona name · 9..19 persona questions (11) · 20 persona comment ·
// 21-23 perspective 3 (persona) · 24 board
const PQ = PERSONA_QUESTIONS.length;
export const PERSONA_NAME_STEP = 8;
export const PERSONA_Q_START = 9;
export const PERSONA_COMMENT_STEP = PERSONA_Q_START + PQ;    // 20
export const PERSONA_REVEAL_STEP = PERSONA_COMMENT_STEP + 1; // 21 — "meet your persona" break card
const PERSPECTIVE2_START = PERSONA_REVEAL_STEP + 1;          // 22
export const TOTAL_STEPS = PERSPECTIVE2_START + TOTAL_ROUNDS + 1; // 26
export const BOARD_STEP = TOTAL_STEPS - 1;                        // 25

export type StepKind =
  | "intro"
  | "question"
  | "person"
  | "personaName"
  | "personaQuestion"
  | "personaComment"
  | "personaReveal"
  | "board";

export function stepInfo(step: number): { kind: StepKind; perspective: number; question: number; personaIndex: number } {
  if (step <= 0) return { kind: "intro", perspective: -1, question: -1, personaIndex: -1 };
  if (step >= BOARD_STEP) return { kind: "board", perspective: -1, question: -1, personaIndex: -1 };
  if (step <= 3) return { kind: "question", perspective: 0, question: step - 1, personaIndex: -1 };
  if (step === 4) return { kind: "person", perspective: 1, question: -1, personaIndex: -1 };
  if (step <= 7) return { kind: "question", perspective: 1, question: step - 5, personaIndex: -1 };
  if (step === PERSONA_NAME_STEP) return { kind: "personaName", perspective: 2, question: -1, personaIndex: -1 };
  if (step < PERSONA_COMMENT_STEP) return { kind: "personaQuestion", perspective: 2, question: -1, personaIndex: step - PERSONA_Q_START };
  if (step === PERSONA_COMMENT_STEP) return { kind: "personaComment", perspective: 2, question: -1, personaIndex: -1 };
  if (step === PERSONA_REVEAL_STEP) return { kind: "personaReveal", perspective: 2, question: -1, personaIndex: -1 };
  return { kind: "question", perspective: 2, question: step - PERSPECTIVE2_START, personaIndex: -1 }; // 22-24
}

/** True for any of the persona-intake screens (name / questions / comment). */
export function isPersonaStep(step: number): boolean {
  const k = stepInfo(step).kind;
  return k === "personaName" || k === "personaQuestion" || k === "personaComment";
}
