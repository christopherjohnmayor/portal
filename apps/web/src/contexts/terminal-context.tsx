"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { io, Socket } from "socket.io-client";
import { useServers } from "@/hooks/use-servers";

interface TerminalContextType {
  socket: Socket | null;
  isConnected: boolean;
  history: string;
  connect: () => void;
  logs: string[];
  addLog: (msg: string) => void;
}

const TerminalContext = createContext<TerminalContextType | null>(null);

export function useTerminal() {
  const context = useContext(TerminalContext);
  if (!context) {
    throw new Error("useTerminal must be used within a TerminalProvider");
  }
  return context;
}

export function TerminalProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const historyRef = useRef<string>("");
  const [logs, setLogs] = useState<string[]>([]);
  const { activeServer } = useServers();

  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toISOString().split("T")[1].split(".")[0];
    console.log("[TerminalContext]", message);
    setLogs((prev) => [...prev.slice(-50), `[${timestamp}] ${message}`]);
  }, []);

  const connect = useCallback(() => {
    if (socket) return;

    if (!activeServer) {
      addLog("No active server configured");
      return;
    }

    addLog(`Connecting to server: ${activeServer.name} (${activeServer.url})`);

    fetch("/api/terminal/ws")
      .then(() => {
        const newSocket = io(window.location.origin, {
          path: "/api/terminal/ws",
          transports: ["polling", "websocket"],
          timeout: 10000,
          query: {
            serverUrl: activeServer.url,
          },
        });

        newSocket.on("connect", () => {
          addLog(`Socket connected: ${newSocket.id}`);
          setIsConnected(true);
        });

        newSocket.on("disconnect", (reason) => {
          addLog(`Socket disconnected: ${reason}`);
          setIsConnected(false);
        });

        newSocket.on("output", (data: string) => {
          historyRef.current += data;
          if (historyRef.current.length > 1000000) {
            historyRef.current = historyRef.current.substring(
              historyRef.current.length - 1000000,
            );
          }
        });

        newSocket.on("error", (err: any) => {
          addLog(`Socket error: ${err.message || err}`);
        });

        setSocket(newSocket);
      })
      .catch((err) => {
        addLog(`Failed to init socket endpoint: ${err}`);
      });
  }, [socket, activeServer, addLog]);

  return (
    <TerminalContext.Provider
      value={{
        socket,
        isConnected,
        history: historyRef.current,
        connect,
        logs,
        addLog,
      }}
    >
      {children}
    </TerminalContext.Provider>
  );
}
