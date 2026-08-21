import { ArrowLeft, Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Answer, Persona } from "@shared/schema";
import { ROUNDS, PERSONA_QUESTIONS, personaRows, ITEMS, ITEM_BY_ID } from "@shared/content";
import { ItemIcon } from "@/components/item-icon";

/** Column labels for the two perspectives: you, then the persona. */
export function perspectiveLabels(persona: Persona): string[] {
  return ["You", persona.name || "Persona"];
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

/** The comparison board: three questions × two perspectives (you vs the persona). */
export function Board({ answers, persona }: { answers: Answer[]; persona: Persona }) {
  const labels = perspectiveLabels(persona);
  return (
    <div className="tg-board">
      {ROUNDS.map((r, q) => (
        <div className="tg-board-row" key={q}>
          <div className="tg-board-qlabel">{r.topic}</div>
          <div className="tg-board-cells">
            {[0, 1].map((p) => {
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

/** The pretty persona overview: anonymous avatar centred, answers as colourful cards.
 *  Six cards on the left, six on the right (the last being the open comment). */
export function PersonaOverview({ persona }: { persona: Persona }) {
  const rows = personaRows(persona).map((r, i) => ({ ...r, color: `lp-c${(i % 7) + 1}` }));
  const left = rows.slice(0, 6);
  const right = rows.slice(6); // the remaining five attributes
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
        <div className="lp-col">
          {right.map(card)}
          <div className="lp-card lp-comment-card">
            <span className="lp-k">Other comments</span>
            <span className="lp-v">{persona.comment.trim() || "—"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** The drawn backpack illustration (also the drop target). */
function BigBackpack() {
  return (
    <svg className="bp-illus" viewBox="0 0 240 236" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <ellipse cx="120" cy="216" rx="82" ry="13" fill="rgba(0,0,0,.13)" />
      <path d="M84 60 C 72 100, 72 160, 92 202" stroke="#a9773f" strokeWidth="11" />
      <path d="M156 60 C 168 100, 168 160, 148 202" stroke="#a9773f" strokeWidth="11" />
      <path d="M64 108 Q64 74 100 70 L140 70 Q176 74 176 108 L176 186 Q176 208 152 208 L88 208 Q64 208 64 186 Z" fill="#cf9a63" stroke="#4a3720" strokeWidth="4" />
      <path d="M106 72 Q106 54 120 54 Q134 54 134 72" stroke="#4a3720" strokeWidth="5" />
      <path d="M66 104 Q66 84 102 82 L138 82 Q174 84 174 104 L174 134 Q174 148 158 148 L82 148 Q66 148 66 134 Z" fill="#bd8850" stroke="#4a3720" strokeWidth="4" />
      <line x1="120" y1="130" x2="120" y2="140" stroke="#4a3720" strokeWidth="4" />
      <rect x="110" y="140" width="20" height="18" rx="4" fill="#9a6b38" stroke="#4a3720" strokeWidth="3" />
      <path d="M92 162 Q92 154 104 154 L136 154 Q148 154 148 162 L148 194 Q148 202 138 202 L102 202 Q92 202 92 194 Z" fill="#c9925a" stroke="#4a3720" strokeWidth="4" />
      <path d="M92 168 L148 168" stroke="#4a3720" strokeWidth="3" />
    </svg>
  );
}

function ItemCard({ id, dragging, onPointerDown }: { id: string; dragging?: boolean; onPointerDown?: (e: React.PointerEvent) => void }) {
  return (
    <div className={`bp-card ${dragging ? "is-dragging" : ""}`} onPointerDown={onPointerDown}>
      <ItemIcon id={id} />
      <span className="bp-name">{ITEM_BY_ID[id]?.name ?? id}</span>
    </div>
  );
}

type Drag = { id: string; from: "pool" | "pack"; x: number; y: number };

/** Interactive scene: drag pool cards onto the backpack (max N), drag packed ones off to remove. */
export function BackpackScene({
  packed,
  maxItems,
  onAdd,
  onRemove,
  readOnly = false,
}: {
  packed: string[];
  maxItems: number;
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
  readOnly?: boolean;
}) {
  const [drag, setDrag] = useState<Drag | null>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const pool = ITEMS.filter((i) => !packed.includes(i.id));
  const full = packed.length >= maxItems;

  useEffect(() => {
    if (!drag) return;
    const move = (e: PointerEvent) => setDrag((d) => (d ? { ...d, x: e.clientX, y: e.clientY } : d));
    const up = (e: PointerEvent) => {
      const r = dropRef.current?.getBoundingClientRect();
      const over = !!r && e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      if (drag.from === "pool" && over && !full && !packed.includes(drag.id)) onAdd(drag.id);
      if (drag.from === "pack" && !over) onRemove(drag.id);
      setDrag(null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [drag, full, packed, onAdd, onRemove]);

  const start = (id: string, from: "pool" | "pack") => (e: React.PointerEvent) => {
    if (readOnly) return;
    e.preventDefault();
    setDrag({ id, from, x: e.clientX, y: e.clientY });
  };

  return (
    <div className={`bp-scene ${readOnly ? "readonly" : ""}`}>
      <div className="bp-ground" />

      <div className="bp-center">
        <div className={`bp-drop ${drag?.from === "pool" && !full ? "armed" : ""}`} ref={dropRef}>
          <BigBackpack />
          <div className="bp-slots">
            {Array.from({ length: maxItems }).map((_, i) => {
              const id = packed[i];
              return id ? (
                <button key={id} className="bp-slot filled" onPointerDown={start(id, "pack")} title="Drag out to remove">
                  <ItemIcon id={id} size={30} />
                </button>
              ) : (
                <span key={`e${i}`} className="bp-slot empty">+</span>
              );
            })}
          </div>
        </div>
        <p className="bp-count">{packed.length} of {maxItems} packed{!readOnly && full ? " — drag one out to swap" : ""}</p>
      </div>

      <div className="bp-tray">
        {pool.map((it) => (
          <ItemCard key={it.id} id={it.id} dragging={drag?.id === it.id} onPointerDown={start(it.id, "pool")} />
        ))}
      </div>

      {drag && (
        <div className="bp-ghost" style={{ left: drag.x, top: drag.y }}>
          <ItemCard id={drag.id} />
        </div>
      )}
    </div>
  );
}

/** Read-only view of a packed backpack (recap + comparison). */
export function BackpackView({ title, items, maxItems }: { title: string; items: string[]; maxItems: number }) {
  return (
    <div className="bp-view">
      <div className="bp-view-title">{title}</div>
      <div className="bp-view-items">
        {Array.from({ length: maxItems }).map((_, i) => {
          const id = items[i];
          return (
            <div key={i} className={`bp-view-item ${id ? "" : "empty"}`}>
              {id ? <ItemIcon id={id} size={34} /> : <span className="bp-view-dash">—</span>}
              <span className="bp-view-name">{id ? ITEM_BY_ID[id]?.name : ""}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
