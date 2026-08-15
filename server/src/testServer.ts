import type { ConfigOptions } from "@colyseus/tools";
import { GameRoom } from "./rooms/GameRoom.js";

export default {
  initializeGameServer: (gameServer) => {
    gameServer.define("game", GameRoom);
  },
} satisfies ConfigOptions;
