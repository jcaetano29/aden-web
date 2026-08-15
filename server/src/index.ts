import { createServer } from "http";
import { Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { GameRoom } from "./rooms/GameRoom.js";

const port = Number(process.env.PORT ?? 2567);

const gameServer = new Server({
  transport: new WebSocketTransport({ server: createServer() }),
});

gameServer.define("game", GameRoom);
gameServer.listen(port);
console.log(`[aden] game server escuchando en ws://localhost:${port}`);
