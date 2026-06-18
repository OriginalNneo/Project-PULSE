import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import { createServiceLogger } from "../shared/logger.js";

const log = createServiceLogger("ws");

export type WsEventName =
  | "new_queue_entry"
  | "queue_updated"
  | "officer_assigned"
  | "case_resolved"
  | "officer_status_change"
  | "user_message"
  | "officer_message"
  | "emotion_update";   // fired per inbound message with live emotion score

export interface WsMessage {
  event: WsEventName;
  payload: Record<string, unknown>;
  ts: string;
}

export let wss: WebSocketServer;

export function attachWebSocket(server: Server): void {
  wss = new WebSocketServer({ server, path: "/dashboard/ws" });

  wss.on("connection", (socket) => {
    log.info("Dashboard client connected");

    socket.on("close", () => {
      log.info("Dashboard client disconnected");
    });

    socket.on("error", (err) => {
      log.error(err, "WebSocket client error");
    });
  });

  log.info("WebSocket server attached at /dashboard/ws");
}

export function broadcast(event: WsEventName, payload: Record<string, unknown>): void {
  if (!wss) return;
  const message: WsMessage = { event, payload, ts: new Date().toISOString() };
  const data = JSON.stringify(message);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}
