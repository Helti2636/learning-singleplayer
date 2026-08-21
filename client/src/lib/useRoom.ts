import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { getSocket, connectSocket, disconnectSocket } from "@/lib/socket";
import type { GameState, Role, Persona } from "@shared/schema";

/**
 * Shared room connection for the participant and the (observing) facilitator.
 * Keeps the same name across reconnects so the returning person reclaims their seat.
 */
export function useRoom(roomCode: string, role: Role) {
  const [, setLocation] = useLocation();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [myId, setMyId] = useState("");
  const [error, setError] = useState("");

  const search = new URLSearchParams(window.location.search);
  const rawName = (search.get("name") || "").trim();
  const nameKey = `ls_name_${roomCode}`;
  const storedName =
    typeof sessionStorage !== "undefined" ? (sessionStorage.getItem(nameKey) || "").trim() : "";
  const name = rawName || storedName || (role === "facilitator" ? "Facilitator" : "");

  useEffect(() => {
    if (!roomCode) {
      setLocation("/");
      return;
    }
    if (role === "participant" && !name) {
      setLocation(`/?code=${roomCode}`);
      return;
    }

    connectSocket();
    const socket = getSocket();

    const onState = (state: GameState) => setGameState(state);
    const onError = (message: string) => setError(message);
    socket.on("game_state", onState);
    socket.on("error", onError);

    const doJoin = () => {
      setMyId(socket.id ?? "");
      socket.emit("join_room", roomCode, name, role, (ok: boolean, err?: string) => {
        if (!ok) {
          setError(err || "Unable to join the session.");
          setTimeout(() => setLocation("/"), 1800);
        }
      });
    };

    if (socket.connected) doJoin();
    else socket.once("connect", doJoin);
    socket.io.on("reconnect", doJoin);

    return () => {
      socket.off("game_state", onState);
      socket.off("error", onError);
      socket.off("connect", doJoin);
      socket.io.off("reconnect", doJoin);
      disconnectSocket();
    };
  }, [roomCode, role, name, setLocation]);

  useEffect(() => {
    if (roomCode && name) {
      try {
        sessionStorage.setItem(nameKey, name);
      } catch {
        /* ignore */
      }
    }
  }, [roomCode, name, nameKey]);

  const socket = getSocket();
  return {
    gameState,
    myId,
    name,
    error,
    start: () => socket.emit("start"),
    setStep: (step: number) => socket.emit("set_step", step),
    setAnswer: (perspective: number, question: number, optionIndex: number) =>
      socket.emit("set_answer", perspective, question, optionIndex),
    setPersona: (persona: Persona) => socket.emit("set_persona", persona),
    takeControl: () => socket.emit("take_control"),
    addItem: (id: string) => socket.emit("add_item", id),
    removeItem: (id: string) => socket.emit("remove_item", id),
    skip: () => socket.emit("skip"),
    restart: () => socket.emit("restart"),
    leave: () => setLocation("/"),
    copyCode: () => {
      try {
        navigator.clipboard?.writeText(roomCode);
      } catch {
        /* ignore */
      }
    },
  };
}
