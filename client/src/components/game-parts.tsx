import { ArrowLeft, Check, Copy } from "lucide-react";
import { useState } from "react";
import type { Player, Choice } from "@shared/schema";
import { ROUNDS } from "@shared/content";

export function initials(name: string): string {
  const n = (name || "").trim();
  return n ? n[0].toUpperCase() : "?";
}

export function Avatar({ name, index }: { name: string; index: number }) {
  return <span className={`av v${index % 2}`} aria-hidden="true">{initials(name)}</span>;
}

/** Top bar shown inside a room. */
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

export function Pips({ round, total }: { round: number; total: number }) {
  return (
    <span className="tg-pips" aria-label={`Round ${round} of ${total}`}>
      {Array.from({ length: total }).map((_, i) => (
        <span key={i} className={`tg-pip ${i < round ? "on" : ""}`} />
      ))}
    </span>
  );
}

/** The roster of players; optionally marks who has locked in a pick this round. */
export function Roster({
  players,
  choices,
  showChoiceState = false,
}: {
  players: Player[];
  choices?: Choice[];
  showChoiceState?: boolean;
}) {
  if (players.length === 0) {
    return <p className="tg-empty">No players yet — share the room code to invite them.</p>;
  }
  return (
    <div className="tg-roster">
      {players.map((p, i) => {
        const chosen = showChoiceState && choices?.some((c) => c.playerId === p.id);
        return (
          <span key={p.id} className={`tg-pchip ${!p.isConnected ? "off" : ""} ${chosen ? "done" : ""}`}>
            <Avatar name={p.name} index={i} />
            {p.name}
            {showChoiceState && (
              <span className="state" title={chosen ? "Locked in" : "Still choosing"}>
                {chosen ? "✓" : "…"}
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}

/** The shared reveal "stage": each option with the players who chose it. */
export function Reveal({
  round,
  players,
  choices,
}: {
  round: number;
  players: Player[];
  choices: Choice[];
}) {
  const content = ROUNDS[round - 1];
  if (!content) return null;
  const indexOf = new Map(players.map((p, i) => [p.id, i]));
  // Only count choices that map to a current player (guards against stale ids).
  const valid = choices.filter((c) => indexOf.has(c.playerId));

  return (
    <div>
      <div className="tg-reveal-head">
        <h2 className="tg-serif">{content.topic}</h2>
        <span className="tg-count">{valid.length} of {players.length} chosen</span>
      </div>
      {content.options
        .map((opt, i) => ({ opt, i, pickers: valid.filter((c) => c.optionIndex === i) }))
        // Chosen options rise to the top, unchosen sink to the bottom. Stable
        // sort keeps each group in its original order (no implied 1-2-3 ranking).
        .sort((a, b) => (a.pickers.length > 0 ? 0 : 1) - (b.pickers.length > 0 ? 0 : 1))
        .map(({ opt, i, pickers }) => {
          const hot = pickers.length > 0;
          return (
          <div key={i} className={`tg-opt ${hot ? "hot" : "empty"}`}>
            <span className="name">{opt}</span>
            <span className="tg-chips">
              {pickers.map((c) => {
                const p = players.find((pp) => pp.id === c.playerId)!;
                const idx = indexOf.get(c.playerId) ?? 0;
                return (
                  <span key={c.playerId} className="tg-chip">
                    <Avatar name={p.name} index={idx} />
                    {p.name}
                  </span>
                );
              })}
            </span>
          </div>
        );
      })}
    </div>
  );
}
