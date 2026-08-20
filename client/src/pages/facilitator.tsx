import { useState, type ReactNode } from "react";
import { useRoute } from "wouter";
import { useRoom } from "@/lib/useRoom";
import { RoomBar, Board, PersonaIntake, PersonaOverview } from "@/components/game-parts";
import { FRAMING, stepInfo, ROUNDS, isPersonaStep, personaRows, personaPlainText } from "@shared/content";
import { printHtml, esc } from "@/lib/print";

function liveLabel(step: number, person: string, personaName: string): string {
  const info = stepInfo(step);
  if (info.kind === "intro") return "Reading the intro";
  if (info.kind === "person") return "Choosing a second perspective";
  if (info.kind === "board") return "Reviewing the board";
  const persp =
    info.perspective === 0 ? "As themselves" : info.perspective === 1 ? `As ${person || "someone else"}` : `As ${personaName || "the persona"}`;
  return `${persp} · Question ${info.question + 1} of 3`;
}

export default function Facilitator() {
  const [, params] = useRoute("/facilitator/:roomCode");
  const roomCode = params?.roomCode ?? "";
  const room = useRoom(roomCode, "facilitator");
  const { gameState, myId } = room;

  const [copied, setCopied] = useState(false);

  if (!gameState) {
    return (
      <div className="tg-loading">
        <div style={{ textAlign: "center" }}>
          <div className="tg-spin" />
          {room.error ? room.error : "Opening your session…"}
        </div>
      </div>
    );
  }

  const participant = gameState.participant;
  const ready = !!participant?.isConnected;
  const persona = gameState.persona;

  const bar = (
    <RoomBar roleLabel={`Facilitator · ${room.name}`} roomCode={roomCode} onLeave={room.leave} onCopy={room.copyCode} />
  );
  const shell = (children: ReactNode) => (
    <div className="tg-app"><div className="tg-wrap">{bar}{children}</div></div>
  );

  // ---- Lobby ----
  if (gameState.phase === "waiting") {
    return shell(
      <>
        <div className="tg-framing">
          <span className="tg-eyebrow">Before we begin</span>
          <p className="intro tg-serif">{FRAMING.intro}</p>
          <p className="note">Share the room code <strong>{roomCode}</strong> — your participant joins from the home page.</p>
        </div>
        <div className="tg-section-label"><span className="tg-eyebrow">Participant</span></div>
        {participant ? (
          <div className="tg-roster">
            <span className={`tg-pchip ${!participant.isConnected ? "off" : ""}`}>
              <span className="av v0">{participant.name.charAt(0).toUpperCase()}</span>
              {participant.name}
            </span>
          </div>
        ) : (
          <p className="tg-empty">Waiting for your participant to join…</p>
        )}
        <div className="tg-controls">
          <div className="buttons">
            <button className="tg-btn" onClick={room.start} disabled={!ready}>
              {ready ? "Start the session →" : "Waiting for a participant"}
            </button>
          </div>
        </div>
      </>
    );
  }

  // ---- Persona intake (name → 11 questions → comment); facilitator can take control ----
  if (gameState.phase === "playing" && isPersonaStep(gameState.step)) {
    const info = stepInfo(gameState.step);
    const isController = myId === gameState.controllerId;
    const nextDisabled =
      info.kind === "personaName" ? persona.name.trim() === ""
      : info.kind === "personaQuestion" ? (persona.answers?.[info.personaIndex] ?? -1) < 0
      : false;
    const driverLabel = participant?.name || "Your participant";
    return shell(
      <>
        <PersonaIntake persona={persona} kind={info.kind as "personaName" | "personaQuestion" | "personaComment"}
          personaIndex={info.personaIndex} isController={isController} driverLabel={driverLabel} onChange={room.setPersona} />
        <div className="tg-controls">
          <div className="buttons">
            {!isController && <button className="tg-btn" onClick={room.takeControl}>Take control</button>}
            <button className="tg-btn ghost" onClick={() => room.setStep(gameState.step - 1)}>← Back</button>
            <button className="tg-btn" onClick={() => room.setStep(gameState.step + 1)} disabled={nextDisabled}>Next →</button>
          </div>
        </div>
      </>
    );
  }

  // ---- Meet the persona (break card; facilitator mirrors it) ----
  if (gameState.phase === "playing" && stepInfo(gameState.step).kind === "personaReveal") {
    return shell(
      <>
        <div className="tg-round-line"><span className="tg-eyebrow">Meet the learning persona</span></div>
        <h1 className="tg-topic" style={{ marginBottom: "1.4rem" }}>{persona.name || "The learning persona"}</h1>
        <PersonaOverview persona={persona} />
      </>
    );
  }

  // ---- Live mirror + board ----
  const onBoard = gameState.phase === "board";

  const personaDoc = () => {
    const rows = personaRows(persona)
      .map((r) => `<tr><td class="q">${esc(r.label)}</td><td>${esc(r.value || "—")}</td></tr>`)
      .join("");
    const comment = persona.comment.trim() ? `<tr><td class="q">Other comments</td><td>${esc(persona.comment)}</td></tr>` : "";
    return `<p class="k">Learning persona</p><h1>${esc(persona.name || "—")}</h1>
      <p class="sub">A persona created in the reflection exercise</p>
      <table><tbody>${rows}${comment}</tbody></table>
      <p class="foot">Saved ${esc(new Date().toLocaleString())}</p>`;
  };

  const boardDoc = () => {
    const labels = ["You", gameState.person || "Someone else", persona.name || "Persona"];
    const rows = ROUNDS.map((r, q) => {
      const cells = [0, 1, 2].map((p) => {
        const a = gameState.answers.find((x) => x.perspective === p && x.question === q);
        return a ? r.options[a.optionIndex] : "—";
      });
      return `<tr><td class="q">${esc(r.topic)}</td>${cells.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`;
    }).join("");
    return `<p class="k">Comparison board</p>
      <h1>How the answers compare</h1>
      <p class="sub">Persona: ${esc(persona.name || "—")}</p>
      <table><thead><tr><th></th>${labels.map((l) => `<th>${esc(l)}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table>
      <p class="foot">Saved ${esc(new Date().toLocaleString())}</p>`;
  };

  const copyPersona = async () => {
    try {
      await navigator.clipboard.writeText(personaPlainText(persona));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — ignore */
    }
  };

  return shell(
    <>
      <div className="tg-round-line">
        <span className="tg-eyebrow">{onBoard ? "Complete" : "Live"} · {liveLabel(gameState.step, gameState.person, persona.name)}</span>
      </div>

      {onBoard ? (
        <>
          <h1 className="tg-topic" style={{ marginBottom: "1.4rem" }}>How their answers compare</h1>
          <Board answers={gameState.answers} person={gameState.person} persona={persona} />
          <div className="tg-round-line" style={{ marginTop: "2.4rem" }}><span className="tg-eyebrow">The learning persona</span></div>
          <h1 className="tg-topic" style={{ marginBottom: "1.4rem" }}>{persona.name || "The learning persona"}</h1>
          <PersonaOverview persona={persona} />
          <div className="tg-controls">
            <div className="buttons">
              <button className="tg-btn" onClick={copyPersona}>{copied ? "Copied ✓" : "Copy persona"}</button>
              <button className="tg-btn ghost" onClick={() => printHtml("Learning persona", personaDoc())}>Save persona (PDF)</button>
              <button className="tg-btn ghost" onClick={() => printHtml("Comparison board", boardDoc())}>Save board (PDF)</button>
              <button className="tg-btn ghost" onClick={room.restart}>Run it again</button>
            </div>
          </div>
        </>
      ) : (
        <>
          <h1 className="tg-topic" style={{ marginBottom: "1.6rem" }}>Following along</h1>
          <Board answers={gameState.answers} person={gameState.person} persona={persona} />
        </>
      )}
    </>
  );
}
