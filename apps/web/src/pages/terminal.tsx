import { useRef, useEffect, useState } from "react";
import { useTerminal } from "@/contexts/terminal-context";
import AppLayout from "@/layouts/app-layout";
import "@xterm/xterm/css/xterm.css";

type TerminalStatus = "connecting" | "connected" | "disconnected" | "error";

export default function TerminalPage() {
  const { socket, isConnected, history, connect, logs: contextLogs, addLog } = useTerminal();
  const [logs, setLogs] = useState<string[]>([]);

  // Sync context logs to local logs for display
  useEffect(() => {
    setLogs(contextLogs);
  }, [contextLogs]);

  // Connect on mount
  useEffect(() => {
    connect();
  }, [connect]);

  return (
    <AppLayout disableScroll>
      <div className="flex h-full flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-4 py-2">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold">Terminal</h1>
            <StatusIndicator status={isConnected ? "connected" : "connecting"} />
          </div>
          {(!isConnected) && (
            <button
              type="button"
              onClick={() => connect()}
              className="rounded bg-primary px-3 py-1 text-sm text-primary-fg hover:bg-primary/90"
            >
              Reconnect
            </button>
          )}
        </div>

        <div className="flex-1 bg-[#0a0a0a] min-h-0 relative">
          <TerminalInstance
            socket={socket}
            history={history}
            onInput={(data) => socket?.emit("input", data)}
            addLog={addLog}
          />
        </div>

        {/* Debug logs panel */}
        <div className="border-t border-border bg-muted/30 max-h-48 overflow-auto flex-none">
          <div className="px-4 py-2 text-xs font-semibold text-muted-fg border-b border-border flex justify-between items-center">
            <span>Debug Logs ({logs.length})</span>
            <button
              type="button"
              onClick={() => setLogs([])}
              className="text-xs text-muted-fg hover:text-foreground"
            >
              Clear
            </button>
          </div>
          <div className="p-2 font-mono text-xs text-muted-fg space-y-0.5">
            {logs.map((log, i) => (
              <div key={`${i}-${log}`} className="whitespace-pre-wrap">
                {log}
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

// Separate component for XTerm to handle lifecycle cleanly
function TerminalInstance({
  socket,
  history,
  onInput,
  addLog
}: {
  socket: any,
  history: string,
  onInput: (d: string) => void,
  addLog: (m: string) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<import("@xterm/xterm").Terminal | null>(null);
  const fitAddonRef = useRef<any>(null);
  // Use a ref to access socket inside resize handler without making it a dependency
  const socketRef = useRef<any>(null);
  // Use state to track when xterm is ready - this triggers effect re-runs
  const [isXtermReady, setIsXtermReady] = useState(false);

  // Keep socketRef in sync
  useEffect(() => {
    socketRef.current = socket;
  }, [socket]);

  // Helper to emit resize to backend
  const emitResize = (cols: number, rows: number) => {
    if (socketRef.current && cols > 0 && rows > 0) {
      console.log(`[Terminal] Emitting resize: ${cols}x${rows}`);
      socketRef.current.emit("resize", { cols, rows });
    }
  };

  // Initialize Xterm
  useEffect(() => {
    if (!containerRef.current) return;

    // Use AbortController pattern for proper cleanup handling
    let aborted = false;

    const init = async () => {
      const { Terminal } = await import("@xterm/xterm");
      const { FitAddon } = await import("@xterm/addon-fit");
      const { WebLinksAddon } = await import("@xterm/addon-web-links");

      // Check if we were aborted during async import
      if (aborted) return;

      const term = new Terminal({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
        theme: {
          background: "#0a0a0a",
          foreground: "#d4d4d4",
          cursor: "#d4d4d4",
        },
      });

      const fit = new FitAddon();
      const webLinks = new WebLinksAddon();

      term.loadAddon(fit);
      term.loadAddon(webLinks);
      term.open(containerRef.current!);

      // Listen for terminal resize events and emit to backend
      term.onResize(({ cols, rows }) => {
        emitResize(cols, rows);
      });

      // Initial fit
      try {
        fit.fit();
      } catch (e) {
        console.warn("Initial fit failed", e);
      }

      term.onData(onInput);

      xtermRef.current = term;
      fitAddonRef.current = fit;
      setIsXtermReady(true);

      // Robust resize handling
      const resizeObserver = new ResizeObserver(() => {
        // Debounce slightly to avoid thrashing
        requestAnimationFrame(() => {
          try {
            fit.fit();
            // After fitting, emit the new size
            if (xtermRef.current) {
              emitResize(xtermRef.current.cols, xtermRef.current.rows);
            }
          } catch (e) {
            // ignore
          }
        });
      });
      resizeObserver.observe(containerRef.current!);

      // Force a re-fit after a short delay to ensure layout and fonts are settled
      setTimeout(() => {
        try {
          fit.fit();
          // Emit resize after delayed fit
          if (xtermRef.current) {
            emitResize(xtermRef.current.cols, xtermRef.current.rows);
          }
        } catch (e) { }
      }, 100);

      // Restore Initial History
      if (history) {
        term.write(history);
      }

      // Store observer for cleanup
      (term as any)._resizeObserver = resizeObserver;
    };
    init();

    return () => {
      aborted = true;
      setIsXtermReady(false);
      if (xtermRef.current) {
        (xtermRef.current as any)._resizeObserver?.disconnect();
        xtermRef.current.dispose();
        xtermRef.current = null;
      }
    };
  }, []); // Run once per mount

  // Handle Socket Output - re-runs when xterm becomes ready or socket changes
  useEffect(() => {
    if (!socket || !isXtermReady || !xtermRef.current) return;

    const handleOutput = (data: string) => {
      xtermRef.current?.write(data);
    };

    socket.on("output", handleOutput);

    // When socket connects and xterm is ready, emit current size
    if (xtermRef.current) {
      emitResize(xtermRef.current.cols, xtermRef.current.rows);
    }

    return () => {
      socket.off("output", handleOutput);
    };
  }, [socket, isXtermReady]); // Use state instead of ref for proper reactivity

  return <div ref={containerRef} className="h-full w-full" />;
}

function StatusIndicator({ status }: { status: string }) {
  const colors: Record<string, string> = {
    connecting: "bg-yellow-500",
    connected: "bg-green-500",
    disconnected: "bg-gray-500",
    error: "bg-red-500",
  };
  return (
    <div className="flex items-center gap-1.5 text-sm text-muted-fg">
      <span className={`size-2 rounded-full ${colors[status] || "bg-gray-500"}`} />
      <span className="capitalize">{status}</span>
    </div>
  );
}
