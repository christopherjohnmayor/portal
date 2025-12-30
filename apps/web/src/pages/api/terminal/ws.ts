import type { NextApiRequest, NextApiResponse } from "next";
import { Server as SocketIOServer } from "socket.io";

function getOpenCodeServerUrl(serverUrl: string): string {
  if (!serverUrl) {
    return process.env.OPENCODE_SERVER_URL || "http://localhost:4000";
  }

  try {
    const url = new URL(serverUrl);
    return `${url.protocol === "https:" ? "wss:" : "ws:"}//${url.host}`;
  } catch (e) {
    console.warn("[Terminal] Invalid server URL, using default:", e);
    return process.env.OPENCODE_SERVER_URL || "http://localhost:4000";
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};

export default function handler(_req: NextApiRequest, res: any) {
  if (!res.socket.server.io) {
    console.log("[Terminal] Initializing Socket.IO server...");

    const io = new SocketIOServer(res.socket.server, {
      path: "/api/terminal/ws",
      addTrailingSlash: false,
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
    });

    io.on("connection", (socket) => {
      console.log("[Terminal] Client connected:", socket.id);

      const serverUrl = (socket.handshake.query.serverUrl as string) || null;
      const wsUrl = getOpenCodeServerUrl(serverUrl || "");

      console.log("[Terminal] Connecting to OpenCode WebSocket:", wsUrl);

      let openCodeWs: any = null;
      let reconnectAttempts = 0;
      const MAX_RECONNECT_ATTEMPTS = 3;

      const connectToOpenCode = () => {
        if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
          socket.emit("error", {
            message:
              "Failed to connect to OpenCode server after multiple attempts",
          });
          socket.disconnect();
          return;
        }

        reconnectAttempts++;

        try {
          openCodeWs = new WebSocket(wsUrl);

          openCodeWs.on("open", () => {
            console.log("[Terminal] Connected to OpenCode WebSocket");
            reconnectAttempts = 0;
            socket.emit("connected", { serverUrl });
          });

          openCodeWs.on("message", (data: any) => {
            socket.emit("output", data.toString());
          });

          openCodeWs.on("error", (err: Error) => {
            console.error("[Terminal] OpenCode WebSocket error:", err);
            socket.emit("error", {
              message: `WebSocket error: ${err.message}`,
            });
          });

          openCodeWs.on("close", (code: number, reason: string) => {
            console.log("[Terminal] OpenCode WebSocket closed:", code, reason);
            socket.emit("disconnected", { code, reason });
          });
        } catch (err) {
          console.error("[Terminal] Failed to connect:", err);
          if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            setTimeout(connectToOpenCode, 1000 * reconnectAttempts);
          }
        }
      };

      socket.on("input", (data: string) => {
        if (openCodeWs && openCodeWs.readyState === 1) {
          openCodeWs.send(data);
        }
      });

      socket.on("resize", (data: { cols: number; rows: number }) => {
        console.log(`[Terminal] Resize event: ${data.cols}x${data.rows}`);
        if (openCodeWs && openCodeWs.readyState === 1) {
          openCodeWs.send(
            JSON.stringify({
              type: "resize",
              cols: data.cols,
              rows: data.rows,
            }),
          );
        }
      });

      socket.on("disconnect", (reason) => {
        console.log("[Terminal] Client disconnected:", reason);
        if (openCodeWs) {
          openCodeWs.close();
          openCodeWs = null;
        }
      });

      connectToOpenCode();
    });

    res.socket.server.io = io;
    console.log("[Terminal] Socket.IO server initialized");
  }

  res.end();
}
