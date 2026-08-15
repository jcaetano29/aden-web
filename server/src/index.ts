import { createServer } from "http";
// Ver nota en rooms/GameRoom.ts: default import por interop CJS/ESM del paquete "colyseus".
import colyseusPkg from "colyseus";
const { Server } = colyseusPkg;
import { WebSocketTransport } from "@colyseus/ws-transport";
import { GameRoom } from "./rooms/GameRoom.js";

const port = Number(process.env.PORT ?? 2567);

const gameServer = new Server({
  transport: new WebSocketTransport({ server: createServer() }),
});

gameServer.define("game", GameRoom);
gameServer.listen(port);
console.log(`[aden] game server escuchando en ws://localhost:${port}`);
