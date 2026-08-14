import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { useRoom } from "@/lib/useRoom";
import { RoomBar, Roster, Reveal, Pips } from "@/components/game-parts";
import { FRAMING, ROUNDS } from "@shared/content";

export default function Game() {
  const [, params] = useRoute("/game/:roomCode");
  const roomCode = params?.roomCode ?? "";
  const room = useRoom(roomCode, "player");
  const { gameState, myId } = room;

  const [pending, setPending] = useState<number | null>(null);

  // Reset the local selection whenever a new round begins.
  useEffect(() => {
    setPending(null);
  }, [gameState?.round, gameState?.phase]);

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

  const connected = gameState.players.filter((p) => p.isConnected).length;
  const myChoice = gameState.choices.find((c) => c.playerId === myId);
  const locked = !!myChoice;
  const content = ROUNDS[gameState.round - 1];

  return (
    <div className="tg-app">
      <div className="tg-wrap">
        <RoomBar roleLabel="Player" roomCode={roomCode} onLeave={room.leave} onCopy={room.copyCode} />

        {/* Lobby */}
        {gameState.phase === "waiting" && (
          <>
            <div className="tg-framing">
              <span className="tg-eyebrow">Before we begin</span>
              <p className="intro tg-serif">{FRAMING.intro}</p>
              <p className="note">{FRAMING.note}</p>
            </div>
            <div className="tg-section-label"><span className="tg-eyebrow">In the room</span></div>
            <Roster players={gameState.players} />
          </>
        )}

        {/* Picking */}
        {gameState.phase === "selecting" && content && (
          <>
            <div className="tg-round-line">
              <span className="tg-eyebrow">Round {gameState.round} of {gameState.totalRounds}</span>
              <Pips round={gameState.round} total={gameState.totalRounds} />
            </div>
            <p className="tg-standing">{FRAMING.standing}</p>
            <h1 className="tg-topic">{content.topic}</h1>

            <div className="tg-options">
              {content.options.map((opt, i) => {
                const isSel = locked ? myChoice!.optionIndex === i : pending === i;
                return (
                  <button
                    key={i}
                    className={`tg-opt-card ${isSel ? "sel" : ""} ${locked ? "locked" : ""}`}
                    onClick={() => !locked && setPending(i)}
                    disabled={locked}
                    aria-pressed={isSel}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>

            <div className="tg-lockbar">
              {locked ? (
                <>
                  <span className="tg-hint"><span className="tg-dot-sage" /> Locked in — waiting for the others</span>
                  <span className="tg-progress">{gameState.choices.length} of {connected} locked in</span>
                </>
              ) : (
                <>
                  <span className="tg-hint"><span className="tg-dot-sage" /> Hidden until everyone has chosen</span>
                  <button className="tg-btn" onClick={() => pending !== null && room.choose(pending)} disabled={pending === null}>
                    Lock in my choice
                  </button>
                </>
              )}
            </div>
          </>
        )}

        {/* Reveal */}
        {gameState.phase === "revealing" && (
          <>
            <div className="tg-round-line">
              <span className="tg-eyebrow">Round {gameState.round} of {gameState.totalRounds} · Reveal</span>
              <Pips round={gameState.round} total={gameState.totalRounds} />
            </div>
            <Reveal round={gameState.round} players={gameState.players} choices={gameState.choices} />
          </>
        )}

        {/* Ended */}
        {gameState.phase === "ended" && (
          <div className="tg-ended">
            <span className="tg-eyebrow">That’s a wrap</span>
            <h2 className="tg-serif">Thanks for reflecting together.</h2>
            <p>You’ve shared what you each hope to find. Carry that into the training that follows.</p>
            <button className="tg-btn ghost" onClick={room.leave}>Leave session</button>
          </div>
        )}
      </div>
    </div>
  );
}
