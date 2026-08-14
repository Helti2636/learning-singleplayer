import { ArrowLeft, Check, Copy } from "lucide-react";
import { useState } from "react";
import type { Answer, Persona } from "@shared/schema";
import { ROUNDS } from "@shared/content";

/** Column labels for the three perspectives, using the participant's own inputs. */
export function perspectiveLabels(person: string, persona: Persona): string[] {
  return ["You", person || "Someone else", persona.name || "Your persona"];
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
        <div className="tg-board-q" key={q}>
          <div className="tg-board-qtitle tg-serif">{r.topic}</div>
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
