import http from "node:http";
import { WebSocketServer } from "ws";
import type { SavanaEvent } from "../../src/lib/savana/types";
import type { SavanaConfig } from "./config";
import { openDatabase } from "./db";
import { createApiHandler } from "./http";
import { OfficeGateway } from "./officeGateway";
import { createRuntime } from "./runtime";
import { SavanaService } from "./service";

export const createSavanaApp = (config: SavanaConfig, options: { dbPath?: string } = {}) => {
  const db = openDatabase(options.dbPath ?? config.dbPath);
  const service = new SavanaService(db);
  const runtime = createRuntime(service, config);
  const office = new OfficeGateway(service);
  const api = createApiHandler(service);

  const server = http.createServer((req, res) => {
    void api(req, res);
  });

  const realtime = new WebSocketServer({ noServer: true, maxPayload: 16 * 1024 });
  const gateway = new WebSocketServer({ noServer: true, maxPayload: 256 * 1024 });

  realtime.on("connection", (ws) => {
    const send = (event: SavanaEvent) => {
      if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(event));
    };
    send({ type: "hello", runtime: service.getRuntimeInfo() });
    const listener = (event: SavanaEvent) => send(event);
    service.on("event", listener);
    ws.on("close", () => service.off("event", listener));
    ws.on("error", () => service.off("event", listener));
    // Realtime channel is push-only; clients write through the HTTP API.
    ws.on("message", () => undefined);
  });
  gateway.on("connection", (ws) => office.attach(ws));

  server.on("upgrade", (req, socket, head) => {
    const pathname = new URL(req.url ?? "/", "http://savana.local").pathname;
    const origin = req.headers.origin;
    if (origin && !config.allowedOrigins.includes(origin)) {
      socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
      socket.destroy();
      return;
    }
    if (pathname === "/ws" || pathname === "/api/savana/ws") {
      realtime.handleUpgrade(req, socket, head, (ws) => realtime.emit("connection", ws, req));
      return;
    }
    if (pathname === "/gateway") {
      gateway.handleUpgrade(req, socket, head, (ws) => gateway.emit("connection", ws, req));
      return;
    }
    socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
    socket.destroy();
  });

  // Lets `concluido`/`falhou` agent states decay back to `disponivel`.
  const decay = setInterval(() => service.refreshAgents(), 60_000);
  decay.unref();

  const close = async () => {
    clearInterval(decay);
    runtime.dispose();
    for (const client of realtime.clients) client.terminate();
    for (const client of gateway.clients) client.terminate();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    db.close();
  };

  return { server, service, runtime, close };
};
