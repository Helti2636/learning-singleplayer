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

// Every reflection question ends with an open "Other" choice that reveals a
// free-text field, so people can give an answer that isn't in the list.
for (const r of ROUNDS) {
  if (!r.options.includes("Other")) r.options = [...r.options, "Other"];
}

/** Display text for a reflection answer — the chosen option, or the free text when "Other". */
export function roundOptionText(question: number, optionIndex: number, otherText?: string): string | null {
  const opts = ROUNDS[question]?.options;
  if (!opts || optionIndex == null || optionIndex < 0 || optionIndex >= opts.length) return null;
  const opt = opts[optionIndex];
  if (opt === "Other") return (otherText ?? "").trim() || "Other";
  return opt;
}

export const TOTAL_ROUNDS = ROUNDS.length;

// ---------------------------------------------------------------------------
// Backpack task: a fixed pool of objects to pack (3 things for the journey).
// ---------------------------------------------------------------------------

export const BACKPACK_FRAMING = {
  intro: "Imagine you are going on a learning journey.",
  question: "What three things would you put in your backpack to ensure success?",
};

export interface BackpackItem {
  id: string;
  name: string;
}

export const ITEMS: BackpackItem[] = [
  { id: "map", name: "Map" },
  { id: "compass", name: "Compass" },
  { id: "flashlight", name: "Flashlight" },
  { id: "tent", name: "Tent" },
  { id: "notebook", name: "Notebook" },
  { id: "star", name: "North star" },
  { id: "firstaid", name: "First-aid kit" },
  { id: "binoculars", name: "Binoculars" },
  { id: "water", name: "Water bottle" },
  { id: "snacks", name: "Snacks" },
  { id: "matches", name: "Matches" },
  { id: "boots", name: "Boots" },
  { id: "powerbank", name: "Powerbank" },
  { id: "swissknife", name: "Swiss knife" },
  { id: "clock", name: "Clock" },
];

export const ITEM_BY_ID: Record<string, BackpackItem> = Object.fromEntries(ITEMS.map((i) => [i.id, i]));

// A packed slot can be a preset item id OR a free-text "something else" the
// person names themselves, stored as "custom:<their text>".
export const CUSTOM_PREFIX = "custom:";
export const CUSTOM_MAX_LEN = 40;
export function isCustomItem(id: string): boolean {
  return typeof id === "string" && id.startsWith(CUSTOM_PREFIX);
}
export function customItemText(id: string): string {
  return isCustomItem(id) ? id.slice(CUSTOM_PREFIX.length) : "";
}
/** Display name for any packed slot — preset or custom. */
export function itemName(id: string): string {
  if (isCustomItem(id)) return customItemText(id).trim() || "Something else";
  return ITEM_BY_ID[id]?.name ?? id;
}

export const MAX_ITEMS = 3;

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

// Every persona question ends with "N/A" (not applicable) and an open "Other"
// choice that reveals a free-text field.
for (const q of PERSONA_QUESTIONS) {
  const base = q.options.filter((o) => o !== "Other" && o !== "N/A");
  q.options = [...base, "N/A", "Other"];
  q.allowOther = true;
}

// Structural persona shape (matches personaSchema in schema.ts).
export interface PersonaData {
  name: string;
  answers: number[];      // one option index per PERSONA_QUESTIONS entry; -1 = unanswered
  otherTexts: string[];   // per-question free text, used when that question's answer is "Other"
  comment: string;        // 12th open field
}

export function emptyPersona(): PersonaData {
  return { name: "", answers: PERSONA_QUESTIONS.map(() => -1), otherTexts: PERSONA_QUESTIONS.map(() => ""), comment: "" };
}

/** Resolve one question's chosen value to display text ("" if unanswered). */
export function personaValue(p: PersonaData, i: number): string {
  const q = PERSONA_QUESTIONS[i];
  const idx = p.answers?.[i];
  if (idx == null || idx < 0 || idx >= q.options.length) return "";
  const opt = q.options[idx];
  if (opt === "Other") return (p.otherTexts?.[i] ?? "").trim() || "Other";
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
// ---------------------------------------------------------------------------
// Merged single-player step machine (one game: reflection + backpack, self then
// persona). Perspective 0 = "yourself", 1 = "the persona".
//
//  0                         intro
//  1..TOTAL_ROUNDS           reflection · yourself
//  SELF_RECAP                your answers so far (recap)
//  BACKPACK_DEMO             facilitator packs an example
//  BACKPACK_SELF             pack your own backpack
//  PERSONA_NAME              persona name
//  PERSONA_Q_START..         persona questions (11)
//  PERSONA_COMMENT           persona comment
//  PERSONA_REVEAL            the persona card
//  REFLECT_PERSONA_START..   reflection · as the persona
//  REFLECT_COMPARE           reflection: you vs the persona
//  BACKPACK_PERSONA          pack the persona's backpack
//  BACKPACK_COMPARE          backpacks: you vs the persona
//  END                       exports
// ---------------------------------------------------------------------------
const PQ = PERSONA_QUESTIONS.length;
export const SELF_RECAP_STEP = TOTAL_ROUNDS + 1;                 // 4
export const BACKPACK_DEMO_STEP = SELF_RECAP_STEP + 1;           // 5
export const BACKPACK_SELF_STEP = BACKPACK_DEMO_STEP + 1;        // 6
export const PERSONA_NAME_STEP = BACKPACK_SELF_STEP + 1;         // 7
export const PERSONA_Q_START = PERSONA_NAME_STEP + 1;            // 8
export const PERSONA_COMMENT_STEP = PERSONA_Q_START + PQ;        // 19
export const PERSONA_REVEAL_STEP = PERSONA_COMMENT_STEP + 1;     // 20
export const REFLECT_PERSONA_START = PERSONA_REVEAL_STEP + 1;    // 21
export const REFLECT_COMPARE_STEP = REFLECT_PERSONA_START + TOTAL_ROUNDS; // 24
export const BACKPACK_PERSONA_STEP = REFLECT_COMPARE_STEP + 1;   // 25
export const BACKPACK_COMPARE_STEP = BACKPACK_PERSONA_STEP + 1;  // 26
export const END_STEP = BACKPACK_COMPARE_STEP + 1;               // 27
export const TOTAL_STEPS = END_STEP + 1;                         // 28

export type StepKind =
  | "intro"
  | "reflectionQ"
  | "selfRecap"
  | "backpackDemo"
  | "backpackSelf"
  | "personaName"
  | "personaQuestion"
  | "personaComment"
  | "personaReveal"
  | "reflectionCompare"
  | "backpackPersona"
  | "backpackCompare"
  | "end";

export function stepInfo(step: number): { kind: StepKind; perspective: number; question: number; personaIndex: number } {
  const base = { perspective: -1, question: -1, personaIndex: -1 };
  if (step <= 0) return { kind: "intro", ...base };
  if (step >= END_STEP) return { kind: "end", ...base };
  if (step <= TOTAL_ROUNDS) return { kind: "reflectionQ", perspective: 0, question: step - 1, personaIndex: -1 };
  if (step === SELF_RECAP_STEP) return { kind: "selfRecap", ...base };
  if (step === BACKPACK_DEMO_STEP) return { kind: "backpackDemo", ...base };
  if (step === BACKPACK_SELF_STEP) return { kind: "backpackSelf", ...base };
  if (step === PERSONA_NAME_STEP) return { kind: "personaName", ...base };
  if (step < PERSONA_COMMENT_STEP) return { kind: "personaQuestion", perspective: -1, question: -1, personaIndex: step - PERSONA_Q_START };
  if (step === PERSONA_COMMENT_STEP) return { kind: "personaComment", ...base };
  if (step === PERSONA_REVEAL_STEP) return { kind: "personaReveal", ...base };
  if (step < REFLECT_COMPARE_STEP) return { kind: "reflectionQ", perspective: 1, question: step - REFLECT_PERSONA_START, personaIndex: -1 };
  if (step === REFLECT_COMPARE_STEP) return { kind: "reflectionCompare", ...base };
  if (step === BACKPACK_PERSONA_STEP) return { kind: "backpackPersona", ...base };
  return { kind: "backpackCompare", ...base }; // BACKPACK_COMPARE_STEP
}

/** True for any of the persona-intake screens (name / questions / comment). */
export function isPersonaStep(step: number): boolean {
  const k = stepInfo(step).kind;
  return k === "personaName" || k === "personaQuestion" || k === "personaComment";
}

/** Steps the facilitator is actively driving (so they may also navigate). */
export function isFacilitatorStep(step: number): boolean {
  return stepInfo(step).kind === "backpackDemo";
}

/**
 * If the facilitator may skip the current block, the step to jump to (the next
 * activity, past the block's own review). Persona creation is never skippable.
 * null → no skip available on this step.
 */
export function skipTarget(step: number): number | null {
  if (step >= 1 && step <= TOTAL_ROUNDS) return BACKPACK_DEMO_STEP;                         // reflection · yourself
  if (step === BACKPACK_DEMO_STEP || step === BACKPACK_SELF_STEP) return PERSONA_NAME_STEP; // backpack · yourself
  if (step >= REFLECT_PERSONA_START && step < REFLECT_COMPARE_STEP) return BACKPACK_PERSONA_STEP; // reflection · persona
  if (step === BACKPACK_PERSONA_STEP) return END_STEP;                                      // backpack · persona
  return null;
}

/** A short label for what the skip lands on, for the button. */
export function skipLabel(step: number): string {
  if (step >= 1 && step <= TOTAL_ROUNDS) return "Skip the reflection →";
  if (step === BACKPACK_DEMO_STEP || step === BACKPACK_SELF_STEP) return "Skip the backpack →";
  if (step >= REFLECT_PERSONA_START && step < REFLECT_COMPARE_STEP) return "Skip the reflection →";
  if (step === BACKPACK_PERSONA_STEP) return "Skip the backpack →";
  return "Skip →";
}
