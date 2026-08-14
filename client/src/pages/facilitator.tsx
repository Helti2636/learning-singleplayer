import { type ReactNode } from "react";
import { useRoute } from "wouter";
import { useRoom } from "@/lib/useRoom";
import { RoomBar, Board } from "@/components/game-parts";
import { FRAMING, stepInfo } from "@shared/content";

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
  const { gameState } = room;

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

  // ---- Live mirror + board ----
  const onBoard = gameState.phase === "board";
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
            <button className="tg-btn" onClick={room.restart}>Run it again</button>
          </div>
        </div>
      )}
    </>
  );
}
