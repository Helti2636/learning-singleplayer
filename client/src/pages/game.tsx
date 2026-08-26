import { type ReactNode } from "react";
import { useRoute } from "wouter";
import { useRoom } from "@/lib/useRoom";
import { RoomBar, Board, PersonaIntake, PersonaOverview, BackpackScene, BackpackView } from "@/components/game-parts";
import { ROUNDS, BACKPACK_FRAMING, stepInfo } from "@shared/content";

function reflectionHeader(perspective: number, personaName: string): string {
  return perspective === 0 ? "As yourself" : `As ${personaName || "your persona"}`;
}

export default function Game() {
  const [, params] = useRoute("/game/:roomCode");
  const roomCode = params?.roomCode ?? "";
  const room = useRoom(roomCode, "participant");
  const { gameState, myId } = room;

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

  const { step, persona } = gameState;
  const info = stepInfo(step);
  const goto = (s: number) => room.setStep(s);

  const bar = <RoomBar roleLabel="Participant" roomCode={roomCode} onLeave={room.leave} onCopy={room.copyCode} />;
  const shell = (children: ReactNode) => (
    <div className="tg-app"><div className="tg-wrap">{bar}{children}</div></div>
  );

  const answerText = (perspective: number, q: number): string | null => {
    const a = gameState.answers.find((x) => x.perspective === perspective && x.question === q);
    return a ? ROUNDS[q].options[a.optionIndex] : null;
  };

  // ---- Waiting ----
  if (gameState.phase === "waiting") {
    return shell(
      <div className="tg-waiting">
        <span className="tg-eyebrow">You’re in</span>
        <p className="big tg-serif">Hi {room.name} — you’re ready.</p>
        <p className="sub">Your facilitator will begin the session in a moment.</p>
      </div>
    );
  }

  // ---- End (wrap-up: full comparison, mirrors the multiplayer end card) ----
  if (gameState.phase === "board" || info.kind === "end") {
    const personaLabel = persona.name || "your persona";
    return shell(
      <>
        <div className="tg-round-line"><span className="tg-eyebrow">That’s a wrap · thank you</span></div>
        <h1 className="tg-topic" style={{ marginBottom: "1.4rem" }}>Session complete</h1>

        {/* Reflection: you ↔ the persona */}
        <div className="tg-round-line"><span className="tg-eyebrow">Reflection · you ↔ {personaLabel}</span></div>
        <h1 className="tg-topic" style={{ marginBottom: "1.4rem" }}>How your answers compare</h1>
        <Board answers={gameState.answers} persona={persona} />

        {/* Backpacks: you ↔ the persona */}
        <div className="tg-round-line" style={{ marginTop: "2.4rem" }}><span className="tg-eyebrow">Backpacks · you ↔ {personaLabel}</span></div>
        <h1 className="tg-topic" style={{ marginBottom: "1.4rem" }}>What you’d pack vs. what your persona needs</h1>
        <div className="bp-compare">
          <BackpackView title="You" items={gameState.backpackSelf} maxItems={gameState.maxItems} />
          <BackpackView title={persona.name || "Your persona"} items={gameState.backpackPersona} maxItems={gameState.maxItems} />
        </div>

        {/* The persona card */}
        <div className="tg-round-line" style={{ marginTop: "2.4rem" }}><span className="tg-eyebrow">Your learning persona</span></div>
        <h1 className="tg-topic" style={{ marginBottom: "1.4rem" }}>{persona.name || "Your persona"}</h1>
        <PersonaOverview persona={persona} />

        <div className="tg-controls" style={{ marginTop: "1.6rem" }}><div className="buttons">
          <button className="tg-btn ghost" onClick={() => goto(step - 1)}>← Back</button>
          <button className="tg-btn ghost" onClick={room.leave}>Leave session</button>
        </div></div>
      </>
    );
  }

  // ---- Intro (kept general — no spoilers) ----
  if (info.kind === "intro") {
    return shell(
      <div className="tg-framing" style={{ textAlign: "left" }}>
        <span className="tg-eyebrow">Before we begin</span>
        <p className="intro tg-serif" style={{ margin: ".4rem 0 0" }}>
          A short reflection on how you like to learn.
        </p>
        <p className="note" style={{ marginTop: "1rem" }}>
          Answer honestly — there are no wrong answers. Take it one step at a time; your facilitator is with you.
        </p>
        <div style={{ marginTop: "1.6rem" }}>
          <button className="tg-btn" onClick={() => goto(1)}>Begin →</button>
        </div>
      </div>
    );
  }

  // ---- Reflection question (yourself / persona) ----
  if (info.kind === "reflectionQ") {
    const content = ROUNDS[info.question];
    const chosen = gameState.answers.find((a) => a.perspective === info.perspective && a.question === info.question);
    return shell(
      <>
        <div className="tg-round-line">
          <span className="tg-eyebrow">{reflectionHeader(info.perspective, persona.name)} · Question {info.question + 1} of {ROUNDS.length}</span>
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

  // ---- Recap of your own reflection answers ----
  if (info.kind === "selfRecap") {
    return shell(
      <>
        <div className="tg-round-line"><span className="tg-eyebrow">Your answers so far</span></div>
        <h1 className="tg-topic" style={{ marginBottom: "1.4rem" }}>How you answered</h1>
        <div className="tg-recap">
          {ROUNDS.map((r, q) => (
            <div className="tg-recap-row" key={q}>
              <span className="tg-recap-q">{r.topic}</span>
              <span className="tg-recap-a tg-serif">{answerText(0, q) ?? "—"}</span>
            </div>
          ))}
        </div>
        <NavBar onBack={() => goto(step - 1)} onNext={() => goto(step + 1)} nextDisabled={false} />
      </>
    );
  }

  // ---- Backpack demo (facilitator packs; participant watches) ----
  if (info.kind === "backpackDemo") {
    return shell(
      <>
        <div className="tg-round-line"><span className="tg-eyebrow">Warm-up · watch the example</span></div>
        <h1 className="tg-topic" style={{ marginBottom: ".8rem" }}>{BACKPACK_FRAMING.intro}</h1>
        <p className="tg-standing" style={{ marginBottom: "1.4rem" }}>Your facilitator is packing an example — you’ll pack your own next.</p>
        <BackpackScene packed={gameState.demo} maxItems={gameState.maxItems} onAdd={() => {}} onRemove={() => {}} readOnly />
      </>
    );
  }

  // ---- Backpack: your own / the persona's ----
  if (info.kind === "backpackSelf" || info.kind === "backpackPersona") {
    const isPersona = info.kind === "backpackPersona";
    const packed = isPersona ? gameState.backpackPersona : gameState.backpackSelf;
    const done = packed.length >= gameState.maxItems;
    return shell(
      <>
        <div className="tg-round-line">
          <span className="tg-eyebrow">{isPersona ? `${persona.name || "The persona"}’s backpack` : "Your own backpack"}</span>
        </div>
        <h1 className="tg-topic" style={{ marginBottom: ".6rem" }}>{BACKPACK_FRAMING.question}</h1>
        {isPersona && <p className="tg-standing" style={{ marginBottom: ".4rem" }}>Pack it the way <strong>{persona.name || "your persona"}</strong> would.</p>}
        <BackpackScene packed={packed} maxItems={gameState.maxItems} onAdd={room.addItem} onRemove={room.removeItem} />
        <NavBar onBack={() => goto(step - 1)} onNext={() => goto(step + 1)} nextDisabled={!done} />
      </>
    );
  }

  // ---- Persona intake ----
  if (info.kind === "personaName" || info.kind === "personaQuestion" || info.kind === "personaComment") {
    const isController = myId === gameState.controllerId;
    const nextDisabled =
      info.kind === "personaName" ? persona.name.trim() === ""
      : info.kind === "personaQuestion" ? (persona.answers?.[info.personaIndex] ?? -1) < 0
      : false;
    const driverLabel = gameState.controllerId === gameState.facilitator?.id ? "Your facilitator" : "You";
    return shell(
      <>
        <PersonaIntake persona={persona} kind={info.kind} personaIndex={info.personaIndex}
          isController={isController} driverLabel={driverLabel} onChange={room.setPersona} />
        <div className="tg-controls"><div className="buttons">
          {!isController && <button className="tg-btn ghost" onClick={room.takeControl}>Take control</button>}
          <button className="tg-btn ghost" onClick={() => goto(step - 1)}>← Back</button>
          <button className="tg-btn" onClick={() => goto(step + 1)} disabled={nextDisabled}>Next →</button>
        </div></div>
      </>
    );
  }

  // ---- Meet your persona (break card) ----
  if (info.kind === "personaReveal") {
    return shell(
      <>
        <div className="tg-round-line"><span className="tg-eyebrow">Meet your learning persona</span></div>
        <h1 className="tg-topic" style={{ marginBottom: ".8rem" }}>{persona.name || "Your persona"}</h1>
        <p className="tg-standing" style={{ marginBottom: "1.6rem" }}>
          Take a moment — next you’ll go through the same steps as {persona.name || "them"}.
        </p>
        <PersonaOverview persona={persona} />
        <NavBar onBack={() => goto(step - 1)} onNext={() => goto(step + 1)} nextDisabled={false} />
      </>
    );
  }

  // ---- Reflection comparison (you vs the persona) ----
  if (info.kind === "reflectionCompare") {
    return shell(
      <>
        <div className="tg-round-line"><span className="tg-eyebrow">You ↔ {persona.name || "your persona"}</span></div>
        <h1 className="tg-topic" style={{ marginBottom: "1.4rem" }}>How your answers compare</h1>
        <Board answers={gameState.answers} persona={persona} />
        <NavBar onBack={() => goto(step - 1)} onNext={() => goto(step + 1)} nextDisabled={false} />
      </>
    );
  }

  // ---- Backpack comparison (you vs the persona) ----
  if (info.kind === "backpackCompare") {
    return shell(
      <>
        <div className="tg-round-line"><span className="tg-eyebrow">Your two backpacks, side by side</span></div>
        <h1 className="tg-topic" style={{ marginBottom: "1.6rem" }}>What you’d pack vs. what your persona needs</h1>
        <div className="bp-compare">
          <BackpackView title="You" items={gameState.backpackSelf} maxItems={gameState.maxItems} />
          <BackpackView title={persona.name || "Your persona"} items={gameState.backpackPersona} maxItems={gameState.maxItems} />
        </div>
        <NavBar onBack={() => goto(step - 1)} onNext={() => goto(step + 1)} nextDisabled={false} />
      </>
    );
  }

  return shell(<div className="tg-waiting"><p className="sub">…</p></div>);
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
