import { ArrowLeft, Check, Copy } from "lucide-react";
import { useState } from "react";
import type { Answer, Persona } from "@shared/schema";
import { ROUNDS, PERSONA_QUESTIONS, personaRows } from "@shared/content";

/** Column labels for the three perspectives. Third is the persona's name. */
export function perspectiveLabels(person: string, persona: Persona): string[] {
  return ["You", person || "Someone else", persona.name || "Persona"];
}

function setAt(arr: number[], i: number, v: number): number[] {
  const next = PERSONA_QUESTIONS.map((_, k) => arr?.[k] ?? -1);
  next[i] = v;
  return next;
}

/** The anonymous default-avatar head used on the persona overview. */
function AvatarHead() {
  return (
    <div className="lp-avatar">
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="37" r="20" fill="var(--lp-avatar-fill)" />
        <path d="M18 90 C18 68 34 60 50 60 C66 60 82 68 82 90 Z" fill="var(--lp-avatar-fill)" />
      </svg>
    </div>
  );
}

export function answerText(answers: Answer[], perspective: number, question: number): string | null {
  const a = answers.find((x) => x.perspective === perspective && x.question === question);
  return a ? ROUNDS[question].options[a.optionIndex] : null;
}

export function RoomBar({
  roleLabel,
  roomCode,
  onLeave,
  onCopy,
}: {
  roleLabel: string;
  roomCode: string;
  onLeave: () => void;
  onCopy: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };
  return (
    <div className="tg-bar">
      <div style={{ display: "flex", alignItems: "center", gap: ".7rem" }}>
        <button className="tg-btn ghost" onClick={onLeave} aria-label="Leave session" style={{ padding: ".5rem .6rem" }}>
          <ArrowLeft size={16} />
        </button>
        <div>
          <div className="brand">Imagine the perfect training exists</div>
          <div className="role">{roleLabel}</div>
        </div>
      </div>
      <div className="tg-bar-right">
        <button className="tg-code" onClick={copy} title="Copy room code">
          <small>Room</small> {roomCode} {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </div>
    </div>
  );
}

/** The 3×3 comparison board: three questions × three perspectives. */
export function Board({ answers, person, persona }: { answers: Answer[]; person: string; persona: Persona }) {
  const labels = perspectiveLabels(person, persona);
  return (
    <div className="tg-board">
      {ROUNDS.map((r, q) => (
        <div className="tg-board-row" key={q}>
          <div className="tg-board-qlabel">{r.topic}</div>
          <div className="tg-board-cells">
            {[0, 1, 2].map((p) => {
              const text = answerText(answers, p, q);
              return (
                <div className={`tg-board-cell col${p} ${text ? "" : "empty"}`} key={p}>
                  <span className="who">{labels[p]}</span>
                  <span className="ans tg-serif">{text ?? "—"}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * One screen of the persona intake (name / a single-choice question / the comment).
 * The controller edits a local buffer and pushes each change up; everyone else sees
 * the live server state. Navigation + the "Take control" button live in the page.
 */
export function PersonaIntake({
  persona,
  kind,
  personaIndex,
  isController,
  driverLabel,
  onChange,
}: {
  persona: Persona;
  kind: "personaName" | "personaQuestion" | "personaComment";
  personaIndex: number;
  isController: boolean;
  driverLabel?: string;
  onChange: (p: Persona) => void;
}) {
  const [buf, setBuf] = useState<Persona>(persona);
  const [seeded, setSeeded] = useState(false);
  // Seed the local buffer whenever this side (re)gains the pen; drop it when control leaves.
  if (isController && !seeded) {
    setSeeded(true);
    setBuf(persona);
  } else if (!isController && seeded) {
    setSeeded(false);
  }
  const view = isController ? buf : persona;
  const push = (next: Persona) => {
    setBuf(next);
    onChange(next);
  };

  const total = 1 + PERSONA_QUESTIONS.length + 1;
  const num = kind === "personaName" ? 1 : kind === "personaComment" ? total : 2 + personaIndex;
  const q = kind === "personaQuestion" ? PERSONA_QUESTIONS[personaIndex] : null;
  const eyebrow = `Learning persona · ${num} of ${total}${q ? ` · ${q.label}` : ""}`;
  const who = driverLabel || "Someone";

  const title =
    kind === "personaName" ? "Give your learning persona a name"
    : kind === "personaComment" ? "Anything else worth noting?"
    : q!.prompt;

  const liveNote = !isController && (
    <p className="tg-standing" style={{ marginBottom: "1.2rem" }}>
      <strong>{who}</strong> is filling this in — you see it live. Take control to type.
    </p>
  );

  return (
    <>
      <div className="tg-round-line"><span className="tg-eyebrow">{eyebrow}</span></div>
      <h1 className="tg-topic">{title}</h1>
      {kind === "personaName" && (
        <>
          {isController ? (
            <>
              <p className="tg-standing" style={{ marginBottom: "1.4rem" }}>A short handle you’ll recognise — the person your training is really for.</p>
              <div className="tg-field" style={{ maxWidth: "34rem" }}>
                <label className="tg-label" htmlFor="pn">Persona name</label>
                <input id="pn" className="tg-input" autoFocus placeholder="e.g. Amara" value={buf.name} maxLength={40}
                  onChange={(e) => push({ ...buf, name: e.target.value })} />
              </div>
            </>
          ) : (
            <>
              {liveNote}
              <div className="ls-persona-live"><div className="live-name tg-serif">{view.name || "…"}</div></div>
            </>
          )}
        </>
      )}

      {kind === "personaComment" && (
        <>
          {isController ? (
            <>
              <p className="tg-standing" style={{ marginBottom: "1.4rem" }}>Optional — any other detail about this persona.</p>
              <div className="tg-field" style={{ maxWidth: "34rem" }}>
                <label className="tg-label" htmlFor="pc">Other comments</label>
                <textarea id="pc" className="tg-input" rows={4} placeholder="Optional notes…" value={buf.comment} maxLength={600}
                  onChange={(e) => push({ ...buf, comment: e.target.value })} />
              </div>
            </>
          ) : (
            <>
              {liveNote}
              <div className="ls-persona-live"><div className="live-desc">{view.comment || "…"}</div></div>
            </>
          )}
        </>
      )}

      {kind === "personaQuestion" && q && (
        <>
          {liveNote}
          <div className="tg-options">
            {q.options.map((opt, i) => {
              const sel = (view.answers?.[personaIndex] ?? -1) === i;
              return (
                <button key={i} className={`tg-opt-card ${sel ? "sel" : ""} ${isController ? "" : "is-live"}`}
                  onClick={isController ? () => push({ ...buf, answers: setAt(buf.answers, personaIndex, i) }) : undefined}
                  aria-disabled={!isController}>
                  {opt}
                </button>
              );
            })}
          </div>
          {q.allowOther && q.options[(view.answers?.[personaIndex] ?? -1)] === "Other" && (
            isController ? (
              <div className="tg-field" style={{ marginTop: "1rem", maxWidth: "28rem" }}>
                <label className="tg-label" htmlFor="lo">Which language?</label>
                <input id="lo" className="tg-input" autoFocus placeholder="Type the language" value={buf.languageOther} maxLength={40}
                  onChange={(e) => push({ ...buf, languageOther: e.target.value })} />
              </div>
            ) : view.languageOther ? (
              <p className="tg-standing" style={{ marginTop: ".8rem" }}>Language: <strong>{view.languageOther}</strong></p>
            ) : null
          )}
        </>
      )}
    </>
  );
}

/** The pretty persona overview: anonymous avatar centred, answers as colourful cards. */
export function PersonaOverview({ persona }: { persona: Persona }) {
  const rows = personaRows(persona).map((r, i) => ({ ...r, color: `lp-c${(i % 7) + 1}` }));
  const left = rows.filter((_, i) => i % 2 === 0);
  const right = rows.filter((_, i) => i % 2 === 1);
  const card = (r: { label: string; value: string; color: string }, key: number) => (
    <div className={`lp-card ${r.color}`} key={key}>
      <span className="lp-k">{r.label}</span>
      <span className="lp-v">{r.value || "—"}</span>
    </div>
  );
  return (
    <div className="lp-overview">
      <div className="lp-layout">
        <div className="lp-col">{left.map(card)}</div>
        <div className="lp-avatar-block">
          <AvatarHead />
          <span className="tg-eyebrow" style={{ marginTop: "1rem" }}>Learning persona</span>
          <p className="lp-name tg-serif">{persona.name || "Persona"}</p>
        </div>
        <div className="lp-col">{right.map(card)}</div>
      </div>
      {persona.comment.trim() && (
        <div className="lp-comment">
          <span className="lp-k">Other comments</span>
          <span className="lp-v">{persona.comment}</span>
        </div>
      )}
    </div>
  );
}
