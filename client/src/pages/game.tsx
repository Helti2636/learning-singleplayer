import { useState, type ReactNode } from "react";
import { useRoute } from "wouter";
import { useRoom } from "@/lib/useRoom";
import { RoomBar, Board, PersonaIntake, PersonaOverview } from "@/components/game-parts";
import { ROUNDS, PERSON_PRESETS, stepInfo } from "@shared/content";

// Presets that reveal a name field when picked (so the board shows a real name).
const COLLEAGUE = "Your most memorable colleague";
const DIRECT_PRESETS = PERSON_PRESETS.filter((p) => p !== COLLEAGUE); // no input needed

function perspectiveLabel(perspective: number, person: string, personaName: string): string {
  if (perspective === 0) return "As yourself";
  if (perspective === 1) return `As ${person || "someone else"}`;
  return `As ${personaName || "your persona"}`;
}

export default function Game() {
  const [, params] = useRoute("/game/:roomCode");
  const roomCode = params?.roomCode ?? "";
  const room = useRoom(roomCode, "participant");
  const { gameState, myId } = room;

  // Local input state for the "someone else" screen (participant owns this).
  const [inputMode, setInputMode] = useState<"" | "colleague" | "custom">("");
  const [nameText, setNameText] = useState("");
  const [seeded, setSeeded] = useState(false);

  if (!gameState) {
    return (
      <div className="tg-loading">
        <div style={{ textAlign: "center" }}>
          <div className="tg-spin" />
          {room.error ? room.error : "Joining the session…"}
        </div>
      </div>
    );
  }

  // Seed the "someone else" field from server state once (e.g. after a reload).
  if (!seeded && gameState.phase !== "waiting") {
    setSeeded(true);
    if (gameState.person && !DIRECT_PRESETS.includes(gameState.person)) {
      setInputMode("custom");
      setNameText(gameState.person);
    }
  }

  const { step } = gameState;
  const info = stepInfo(step);
  const goto = (s: number) => room.setStep(s);

  const bar = <RoomBar roleLabel="Participant" roomCode={roomCode} onLeave={room.leave} onCopy={room.copyCode} />;
  const shell = (children: ReactNode) => (
    <div className="tg-app"><div className="tg-wrap">{bar}{children}</div></div>
  );

  // ---- Waiting for the facilitator to start ----
  if (gameState.phase === "waiting") {
    return shell(
      <div className="tg-waiting">
        <span className="tg-eyebrow">You’re in</span>
        <p className="big tg-serif">Hi {room.name} — you’re ready.</p>
        <p className="sub">Your facilitator will begin the session in a moment.</p>
      </div>
    );
  }

  // ---- Board ----
  if (info.kind === "board") {
    return shell(
      <>
        <div className="tg-round-line"><span className="tg-eyebrow">Your three perspectives, side by side</span></div>
        <h1 className="tg-topic" style={{ marginBottom: "2rem" }}>How your answers compare</h1>
        <Board answers={gameState.answers} person={gameState.person} persona={gameState.persona} />
        <div className="tg-round-line" style={{ marginTop: "2.4rem" }}><span className="tg-eyebrow">Your learning persona</span></div>
        <h1 className="tg-topic" style={{ marginBottom: "1.4rem" }}>{gameState.persona.name || "Your persona"}</h1>
        <PersonaOverview persona={gameState.persona} />
        <div className="tg-controls">
          <div className="buttons">
            <button className="tg-btn ghost" onClick={() => goto(step - 1)}>← Back</button>
            <button className="tg-btn ghost" onClick={room.restart}>Start over</button>
          </div>
        </div>
      </>
    );
  }

  // ---- Intro ----
  if (info.kind === "intro") {
    return shell(
      <div className="tg-framing" style={{ textAlign: "left" }}>
        <span className="tg-eyebrow">Before we begin</span>
        <p className="intro tg-serif" style={{ margin: ".4rem 0 0" }}>
          You’ll answer the same three questions three times.
        </p>
        <p className="note" style={{ marginTop: "1rem" }}>
          First <strong>as yourself</strong>, then <strong>as someone else</strong>, and finally
          <strong> as a learning persona</strong> you’ll create. At the end you’ll see all three side by side —
          and how differently people hope to learn.
        </p>
        <div style={{ marginTop: "1.6rem" }}>
          <button className="tg-btn" onClick={() => goto(1)}>Begin →</button>
        </div>
      </div>
    );
  }

  // ---- Pick the "someone else" perspective ----
  if (info.kind === "person") {
    const canNext = gameState.person.trim() !== "";
    const showInput = inputMode === "colleague" || inputMode === "custom";
    return shell(
      <>
        <div className="tg-round-line"><span className="tg-eyebrow">Perspective 2 of 3</span></div>
        <h1 className="tg-topic">Now answer as someone else. Who comes to mind?</h1>
        <div className="tg-options">
          {PERSON_PRESETS.map((preset, i) => {
            if (preset === COLLEAGUE) {
              return (
                <button key={i} className={`tg-opt-card ${inputMode === "colleague" ? "sel" : ""}`}
                  onClick={() => { setInputMode("colleague"); room.setPerson(nameText.trim()); }}>
                  {preset}
                </button>
              );
            }
            const sel = inputMode === "" && gameState.person === preset;
            return (
              <button key={i} className={`tg-opt-card ${sel ? "sel" : ""}`}
                onClick={() => { setInputMode(""); setNameText(""); room.setPerson(preset); }}>
                {preset}
              </button>
            );
          })}
          <button className={`tg-opt-card ${inputMode === "custom" ? "sel" : ""}`}
            onClick={() => { setInputMode("custom"); room.setPerson(nameText.trim()); }}>
            Someone else…
          </button>
        </div>
        {showInput && (
          <div className="tg-field" style={{ marginTop: "1.2rem", maxWidth: "28rem" }}>
            <label className="tg-label" htmlFor="who">
              {inputMode === "colleague" ? "Your colleague’s name" : "Their name or role"}
            </label>
            <input id="who" className="tg-input" autoFocus
              placeholder={inputMode === "colleague" ? "e.g. Anna" : "e.g. my neighbour, my old teacher…"}
              value={nameText} maxLength={40}
              onChange={(e) => { setNameText(e.target.value); room.setPerson(e.target.value.trim()); }} />
          </div>
        )}
        <NavBar onBack={() => goto(step - 1)} onNext={() => goto(step + 1)} nextDisabled={!canNext} />
      </>
    );
  }

  // ---- Create the learning persona (name → 11 questions → comment) ----
  if (info.kind === "personaName" || info.kind === "personaQuestion" || info.kind === "personaComment") {
    const isController = myId === gameState.controllerId;
    const p = gameState.persona;
    const nextDisabled =
      info.kind === "personaName" ? p.name.trim() === ""
      : info.kind === "personaQuestion" ? (p.answers?.[info.personaIndex] ?? -1) < 0
      : false;
    const driverLabel = gameState.controllerId === gameState.facilitator?.id ? "Your facilitator" : "You";
    return shell(
      <>
        <PersonaIntake persona={p} kind={info.kind} personaIndex={info.personaIndex}
          isController={isController} driverLabel={driverLabel} onChange={room.setPersona} />
        <div className="tg-controls">
          <div className="buttons">
            {!isController && <button className="tg-btn ghost" onClick={room.takeControl}>Take control</button>}
            <button className="tg-btn ghost" onClick={() => goto(step - 1)}>← Back</button>
            <button className="tg-btn" onClick={() => goto(step + 1)} disabled={nextDisabled}>Next →</button>
          </div>
        </div>
      </>
    );
  }

  // ---- Meet your persona (a short break before answering as them) ----
  if (info.kind === "personaReveal") {
    return shell(
      <>
        <div className="tg-round-line"><span className="tg-eyebrow">Meet your learning persona</span></div>
        <h1 className="tg-topic" style={{ marginBottom: ".8rem" }}>{gameState.persona.name || "Your persona"}</h1>
        <p className="tg-standing" style={{ marginBottom: "1.6rem" }}>
          Take a moment — next you’ll answer the same three questions as {gameState.persona.name || "them"}.
        </p>
        <PersonaOverview persona={gameState.persona} />
        <NavBar onBack={() => goto(step - 1)} onNext={() => goto(step + 1)} nextDisabled={false} />
      </>
    );
  }

  // ---- A question (any perspective) ----
  const content = ROUNDS[info.question];
  const chosen = gameState.answers.find((a) => a.perspective === info.perspective && a.question === info.question);
  return shell(
    <>
      <div className="tg-round-line">
        <span className="tg-eyebrow">
          {perspectiveLabel(info.perspective, gameState.person, gameState.persona.name)} · Question {info.question + 1} of 3
        </span>
      </div>
      <h1 className="tg-topic">{content.topic}</h1>
      <div className="tg-options">
        {content.options.map((opt, i) => (
          <button key={i} className={`tg-opt-card ${chosen?.optionIndex === i ? "sel" : ""}`}
            onClick={() => room.setAnswer(info.perspective, info.question, i)}>
            {opt}
          </button>
        ))}
      </div>
      <NavBar onBack={() => goto(step - 1)} onNext={() => goto(step + 1)} nextDisabled={!chosen} />
    </>
  );
}

function NavBar({ onBack, onNext, nextDisabled }: { onBack: () => void; onNext: () => void; nextDisabled: boolean }) {
  return (
    <div className="tg-controls">
      <div className="buttons">
        <button className="tg-btn ghost" onClick={onBack}>← Back</button>
        <button className="tg-btn" onClick={onNext} disabled={nextDisabled}>Next →</button>
      </div>
    </div>
  );
}
