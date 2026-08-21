import { type ReactNode } from "react";
import { useRoute } from "wouter";
import { useRoom } from "@/lib/useRoom";
import { RoomBar, Board, PersonaIntake, PersonaOverview, BackpackScene, BackpackView } from "@/components/game-parts";
import { FRAMING, BACKPACK_FRAMING, ROUNDS, stepInfo, isPersonaStep, personaRows, ITEM_BY_ID } from "@shared/content";
import { printHtml, esc } from "@/lib/print";

export default function Facilitator() {
  const [, params] = useRoute("/facilitator/:roomCode");
  const roomCode = params?.roomCode ?? "";
  const room = useRoom(roomCode, "facilitator");
  const { gameState, myId } = room;

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
  const { step } = gameState;
  const info = stepInfo(step);

  const bar = <RoomBar roleLabel={`Facilitator · ${room.name}`} roomCode={roomCode} onLeave={room.leave} onCopy={room.copyCode} />;
  const shell = (children: ReactNode) => (
    <div className="tg-app"><div className="tg-wrap">{bar}{children}</div></div>
  );

  const answerCell = (perspective: number, q: number) => {
    const a = gameState.answers.find((x) => x.perspective === perspective && x.question === q);
    return a ? ROUNDS[q].options[a.optionIndex] : "—";
  };
  const nameList = (ids: string[]) => (ids.length ? ids.map((id) => ITEM_BY_ID[id]?.name ?? id).join(", ") : "—");

  // ---- Export documents ----
  const boardDoc = () => {
    const labels = ["You", persona.name || "Persona"];
    const rows = ROUNDS.map((r, q) => {
      const cells = [0, 1].map((p) => `<td>${esc(answerCell(p, q))}</td>`).join("");
      return `<tr><td class="q">${esc(r.topic)}</td>${cells}</tr>`;
    }).join("");
    return `<p class="k">Reflection</p><h1>You vs your persona</h1>
      <p class="sub">Persona: ${esc(persona.name || "—")}</p>
      <table><thead><tr><th></th>${labels.map((l) => `<th>${esc(l)}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table>
      <p class="foot">Saved ${esc(new Date().toLocaleString())}</p>`;
  };

  const backpackDoc = () =>
    `<p class="k">Backpacks</p><h1>What you packed</h1>
      <table><thead><tr><th>Who</th><th>Three things</th></tr></thead><tbody>
        <tr><td class="q">You</td><td>${esc(nameList(gameState.backpackSelf))}</td></tr>
        <tr><td class="q">${esc(persona.name || "Persona")}</td><td>${esc(nameList(gameState.backpackPersona))}</td></tr>
      </tbody></table>
      <p class="foot">Saved ${esc(new Date().toLocaleString())}</p>`;

  const personaCardDoc = () => {
    const rows = personaRows(persona);
    const colors = [["#f4ddd0", "#a6552f"], ["#f1e6c6", "#927016"], ["#dfe8d2", "#57703e"], ["#d8e3e9", "#456f80"], ["#e8dbe8", "#7a5578"], ["#d3e6df", "#3f7d6e"], ["#f1dad7", "#a8514c"]];
    const cards = rows.map((r, i) => {
      const [bg, ink] = colors[i % 7];
      return `<div style="background:${bg};border-radius:14px;padding:12px 14px;break-inside:avoid;">
        <div style="font:600 10px/1.2 ui-monospace,monospace;letter-spacing:.1em;text-transform:uppercase;color:${ink};margin-bottom:5px;">${esc(r.label)}</div>
        <div style="font:500 15px/1.25 Georgia,serif;color:#241d12;">${esc(r.value || "—")}</div></div>`;
    }).join("");
    const comment = persona.comment.trim()
      ? `<div style="margin-top:14px;background:#faf5ec;border:1px dashed #cbb99d;border-radius:14px;padding:14px 16px;break-inside:avoid;">
          <div style="font:600 10px/1.2 ui-monospace,monospace;letter-spacing:.1em;text-transform:uppercase;color:#6b5d4c;margin-bottom:5px;">Other comments</div>
          <div style="font:400 15px/1.4 Georgia,serif;color:#241d12;white-space:pre-wrap;">${esc(persona.comment)}</div></div>`
      : "";
    const avatar = `<svg width="120" height="120" viewBox="0 0 100 100" style="display:block;margin:0 auto;">
        <circle cx="50" cy="50" r="48" fill="#f6efe1" stroke="#d9c6a5" stroke-width="2"/>
        <circle cx="50" cy="40" r="17" fill="#b7a687"/>
        <path d="M22 82 C22 63 36 56 50 56 C64 56 78 63 78 82 Z" fill="#b7a687"/></svg>`;
    return `<div style="text-align:center;margin:2px 0 18px;">${avatar}
        <p class="k" style="margin-top:12px;">Learning persona</p>
        <h1 style="margin:2px 0 0;">${esc(persona.name || "—")}</h1></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">${cards}</div>
      ${comment}
      <p class="foot">Saved ${esc(new Date().toLocaleString())}</p>`;
  };

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
              <span className="av v0">{participant.name.charAt(0).toUpperCase()}</span>{participant.name}
            </span>
          </div>
        ) : (
          <p className="tg-empty">Waiting for your participant to join…</p>
        )}
        <div className="tg-controls"><div className="buttons">
          <button className="tg-btn" onClick={room.start} disabled={!ready}>
            {ready ? "Start the session →" : "Waiting for a participant"}
          </button>
        </div></div>
      </>
    );
  }

  // ---- End · exports ----
  if (gameState.phase === "board" || info.kind === "end") {
    return shell(
      <>
        <div className="tg-round-line"><span className="tg-eyebrow">Complete · {persona.name || "the persona"}</span></div>
        <h1 className="tg-topic" style={{ marginBottom: "1.4rem" }}>Session complete</h1>
        <PersonaOverview persona={persona} />
        <div className="tg-controls" style={{ marginTop: "1.6rem" }}>
          <div className="buttons">
            <button className="tg-btn ghost" onClick={() => printHtml("Learning persona", personaCardDoc())}>Save persona card (PDF)</button>
            <button className="tg-btn ghost" onClick={() => printHtml("Reflection", boardDoc())}>Save reflection (PDF)</button>
            <button className="tg-btn ghost" onClick={() => printHtml("Backpacks", backpackDoc())}>Save backpacks (PDF)</button>
            <button className="tg-btn" onClick={room.restart}>Run it again</button>
          </div>
        </div>
      </>
    );
  }

  // ---- Backpack demo: the facilitator packs an example ----
  if (info.kind === "backpackDemo") {
    return shell(
      <>
        <div className="tg-round-line"><span className="tg-eyebrow">Warm-up · your example (participant is watching)</span></div>
        <h1 className="tg-topic" style={{ marginBottom: ".6rem" }}>{BACKPACK_FRAMING.question}</h1>
        <BackpackScene packed={gameState.demo} maxItems={gameState.maxItems} onAdd={room.addItem} onRemove={room.removeItem} />
        <div className="tg-controls"><div className="buttons">
          <button className="tg-btn" onClick={() => room.setStep(step + 1)}>Next — participant packs →</button>
        </div></div>
      </>
    );
  }

  // ---- Persona intake: participant holds the pen; facilitator can take control + drives ----
  if (isPersonaStep(step)) {
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
        <div className="tg-controls"><div className="buttons">
          {!isController && <button className="tg-btn" onClick={room.takeControl}>Take control</button>}
          <button className="tg-btn ghost" onClick={() => room.setStep(step - 1)}>← Back</button>
          <button className="tg-btn" onClick={() => room.setStep(step + 1)} disabled={nextDisabled}>Next →</button>
        </div></div>
      </>
    );
  }

  // ---- Everything else: follow along (the participant drives) ----
  let label = "Following along";
  let body: ReactNode = null;
  if (info.kind === "reflectionQ") {
    label = `${info.perspective === 0 ? "As themselves" : `As ${persona.name || "the persona"}`} · Question ${info.question + 1} of ${ROUNDS.length}`;
    body = <Board answers={gameState.answers} persona={persona} />;
  } else if (info.kind === "selfRecap") {
    label = "Reviewing their own answers";
    body = (
      <div className="tg-recap">
        {ROUNDS.map((r, q) => (
          <div className="tg-recap-row" key={q}>
            <span className="tg-recap-q">{r.topic}</span>
            <span className="tg-recap-a tg-serif">{answerCell(0, q)}</span>
          </div>
        ))}
      </div>
    );
  } else if (info.kind === "backpackSelf") {
    label = "Packing their own backpack";
    body = <div className="bp-compare"><BackpackView title="Their backpack" items={gameState.backpackSelf} maxItems={gameState.maxItems} /></div>;
  } else if (info.kind === "personaReveal") {
    label = "Meeting the persona";
    body = <PersonaOverview persona={persona} />;
  } else if (info.kind === "reflectionCompare") {
    label = "Comparing you vs the persona";
    body = <Board answers={gameState.answers} persona={persona} />;
  } else if (info.kind === "backpackPersona") {
    label = `Packing ${persona.name || "the persona"}’s backpack`;
    body = <div className="bp-compare"><BackpackView title={`${persona.name || "Persona"}’s backpack`} items={gameState.backpackPersona} maxItems={gameState.maxItems} /></div>;
  } else if (info.kind === "backpackCompare") {
    label = "Comparing the two backpacks";
    body = (
      <div className="bp-compare">
        <BackpackView title="You" items={gameState.backpackSelf} maxItems={gameState.maxItems} />
        <BackpackView title={persona.name || "Persona"} items={gameState.backpackPersona} maxItems={gameState.maxItems} />
      </div>
    );
  }

  return shell(
    <>
      <div className="tg-round-line"><span className="tg-eyebrow">Live · {label}</span></div>
      <h1 className="tg-topic" style={{ marginBottom: "1.4rem" }}>Following along</h1>
      {body}
    </>
  );
}
