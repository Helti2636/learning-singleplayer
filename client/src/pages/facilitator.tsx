import { useState, type ReactNode } from "react";
import { useRoute } from "wouter";
import { useRoom } from "@/lib/useRoom";
import { RoomBar, Board } from "@/components/game-parts";
import { FRAMING, stepInfo, ROUNDS } from "@shared/content";
import { printHtml, esc } from "@/lib/print";

function liveLabel(step: number, person: string, personaName: string): string {
  const info = stepInfo(step);
  if (info.kind === "intro") return "Reading the intro";
  if (info.kind === "person") return "Choosing a second perspective";
  if (info.kind === "persona") return "Creating a learning persona";
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

  const [pName, setPName] = useState("");
  const [pDesc, setPDesc] = useState("");
  const [seededFor, setSeededFor] = useState("");

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

  // ---- Persona step: participant holds the pen by default; the facilitator can take control ----
  if (gameState.phase === "playing" && stepInfo(gameState.step).kind === "persona") {
    const isController = myId === gameState.controllerId;
    if (isController && seededFor !== myId) {
      setSeededFor(myId);
      setPName(gameState.persona.name);
      setPDesc(gameState.persona.description);
    } else if (!isController && seededFor === myId) {
      setSeededFor("");
    }
    if (isController) {
      return shell(
        <>
          <div className="tg-round-line"><span className="tg-eyebrow">Creating the learning persona · you’re typing</span></div>
          <h1 className="tg-topic">Create a learning persona</h1>
          <p className="tg-standing" style={{ marginBottom: "1.6rem" }}>Your participant can see this live. They can take control back at any time.</p>
          <div className="tg-field" style={{ maxWidth: "34rem", marginBottom: "1rem" }}>
            <label className="tg-label" htmlFor="pname">Persona name</label>
            <input id="pname" className="tg-input" placeholder="e.g. Priya, the busy team lead"
              value={pName} maxLength={40}
              onChange={(e) => { setPName(e.target.value); room.setPersona(e.target.value, pDesc); }} />
          </div>
          <div className="tg-field" style={{ maxWidth: "34rem" }}>
            <label className="tg-label" htmlFor="pdesc">A few characteristics (optional)</label>
            <textarea id="pdesc" className="tg-input" rows={4} placeholder="Their role, goals, how they like to learn…"
              value={pDesc} maxLength={600}
              onChange={(e) => { setPDesc(e.target.value); room.setPersona(pName, e.target.value); }} />
          </div>
        </>
      );
    }
    return shell(
      <>
        <div className="tg-round-line"><span className="tg-eyebrow">Creating the learning persona</span></div>
        <h1 className="tg-topic">Following along</h1>
        <p className="tg-standing" style={{ marginBottom: "1.4rem" }}>Your participant is typing — you see it live. Take control to type it yourself.</p>
        <div className="ls-persona-live">
          <div className="live-name tg-serif">{gameState.persona.name || "…"}</div>
          {gameState.persona.description && <div className="live-desc">{gameState.persona.description}</div>}
        </div>
        <div className="tg-controls">
          <div className="buttons">
            <button className="tg-btn" onClick={room.takeControl}>Take control</button>
          </div>
        </div>
      </>
    );
  }

  // ---- Live mirror + board ----
  const onBoard = gameState.phase === "board";

  const personaDoc = () =>
    `<p class="k">Learning persona</p>
     <h1>${esc(gameState.persona.name || "—")}</h1>
     <p class="sub">A persona created in the reflection exercise</p>
     <p class="persona-desc">${esc(gameState.persona.description || "(no description)")}</p>
     <p class="foot">Saved ${esc(new Date().toLocaleString())}</p>`;

  const boardDoc = () => {
    const labels = ["You", gameState.person || "Someone else", "Persona"];
    const rows = ROUNDS.map((r, q) => {
      const cells = [0, 1, 2].map((p) => {
        const a = gameState.answers.find((x) => x.perspective === p && x.question === q);
        return a ? r.options[a.optionIndex] : "—";
      });
      return `<tr><td class="q">${esc(r.topic)}</td>${cells.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`;
    }).join("");
    return `<p class="k">Comparison board</p>
      <h1>How the answers compare</h1>
      <p class="sub">Persona: ${esc(gameState.persona.name || "—")}</p>
      <table><thead><tr><th></th>${labels.map((l) => `<th>${esc(l)}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table>
      <p class="foot">Saved ${esc(new Date().toLocaleString())}</p>`;
  };

  return shell(
    <>
      <div className="tg-round-line">
        <span className="tg-eyebrow">{onBoard ? "Complete" : "Live"} · {liveLabel(gameState.step, gameState.person, gameState.persona.name)}</span>
      </div>
      <h1 className="tg-topic" style={{ marginBottom: "1.6rem" }}>
        {onBoard ? "How their answers compare" : "Following along"}
      </h1>
      {gameState.persona.description && (
        <p className="tg-standing" style={{ marginBottom: "1.4rem" }}>
          Persona — {gameState.persona.name}: {gameState.persona.description}
        </p>
      )}
      <Board answers={gameState.answers} person={gameState.person} persona={gameState.persona} />
      {onBoard && (
        <div className="tg-controls">
          <div className="buttons">
            <button className="tg-btn ghost" onClick={() => printHtml("Learning persona", personaDoc())}>Save persona (PDF)</button>
            <button className="tg-btn ghost" onClick={() => printHtml("Comparison board", boardDoc())}>Save board (PDF)</button>
            <button className="tg-btn" onClick={room.restart}>Run it again</button>
          </div>
        </div>
      )}
    </>
  );
}
