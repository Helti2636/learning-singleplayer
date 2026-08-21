import { useState } from "react";
import { useLocation } from "wouter";
import { getSocket, connectSocket } from "@/lib/socket";
import { FRAMING } from "@shared/content";

export default function Home() {
  const [, setLocation] = useLocation();
  const initialCode = (new URLSearchParams(window.location.search).get("code") || "").toUpperCase();

  const [name, setName] = useState("");
  const [code, setCode] = useState(initialCode);
  const [busy, setBusy] = useState<"" | "create" | "join">("");
  const [error, setError] = useState("");

  const rememberName = (roomCode: string) => {
    try {
      sessionStorage.setItem(`ls_name_${roomCode}`, name.trim());
    } catch {
      /* ignore */
    }
  };

  const handleStart = () => {
    if (!name.trim()) return setError("Please enter your name first.");
    setError("");
    setBusy("create");
    connectSocket();
    getSocket().emit("create_room", name.trim(), (roomCode: string) => {
      rememberName(roomCode);
      setLocation(`/facilitator/${roomCode}`);
    });
  };

  const handleJoin = () => {
    if (!name.trim()) return setError("Please enter your name first.");
    if (!code.trim()) return setError("Please enter the room code your facilitator shared.");
    setError("");
    setBusy("join");
    const room = code.trim().toUpperCase();
    connectSocket();
    getSocket().emit("join_room", room, name.trim(), "participant", (ok: boolean, err?: string) => {
      setBusy("");
      if (ok) {
        rememberName(room);
        setLocation(`/game/${room}`);
      } else {
        setError(err || "Unable to join the session.");
      }
    });
  };

  return (
    <div className="tg-app">
      <div className="tg-wrap">
        <header className="tg-hero">
          <div className="tg-tags">
            <span className="tg-tag">A reflection warm-up</span>
            <span className="tg-tag">Solo · with a facilitator</span>
          </div>
          <h1>Imagine the perfect training exists</h1>
          <blockquote className="tg-quote">
            <em>“{FRAMING.intro}”</em>
            <span>A short, guided reflection on how you like to learn — one step at a time.</span>
          </blockquote>
        </header>

        <div className="tg-field" style={{ marginBottom: "1.6rem" }}>
          <label className="tg-label" htmlFor="name">Your name</label>
          <input
            id="name"
            className="tg-input"
            placeholder="Enter your name…"
            value={name}
            maxLength={24}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="tg-doors">
          <section className="tg-door primary">
            <span className="tg-eyebrow">For the facilitator</span>
            <h2>Start a session</h2>
            <p>Create the room, share the code, and follow along live as your participant answers.</p>
            <button className="tg-btn block" onClick={handleStart} disabled={busy !== ""}>
              {busy === "create" ? "Creating…" : "Start a session →"}
            </button>
          </section>

          <section className="tg-door">
            <span className="tg-eyebrow">For the participant</span>
            <h2>Join a session</h2>
            <p>Enter the code your facilitator shared, add your name, and you’re in.</p>
            <div className="tg-field">
              <label className="tg-label" htmlFor="code">Room code</label>
              <input
                id="code"
                className="tg-input code"
                placeholder="E.G. 7F2K9Q"
                value={code}
                maxLength={6}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && handleJoin()}
              />
            </div>
            <button className="tg-btn ghost block" onClick={handleJoin} disabled={busy !== ""}>
              {busy === "join" ? "Joining…" : "Join session"}
            </button>
          </section>
        </div>

        {error && (
          <p style={{ marginTop: "1.2rem", color: "var(--tg-accent)", fontSize: ".9rem", textAlign: "center" }}>
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
