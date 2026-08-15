import { Room, Client } from "colyseus";
import {
  MessageType,
  type MoveToMessage,
  MAP_BOUNDS,
  TICK_RATE,
  clampToBounds,
} from "@aden/shared";
import { GameState } from "../state/GameState.js";
import { PlayerState } from "../state/PlayerState.js";
import { advanceMovable } from "../systems/MovementSystem.js";

export class GameRoom extends Room<GameState> {
  onCreate() {
    this.setState(new GameState());

    this.onMessage(MessageType.MoveTo, (client, msg: MoveToMessage) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      const target = clampToBounds(msg.x, msg.z, MAP_BOUNDS);
      player.targetX = target.x;
      player.targetZ = target.z;
      player.moving = true;
    });

    const dt = 1 / TICK_RATE;
    this.setSimulationInterval(() => this.tick(dt), 1000 / TICK_RATE);
  }

  tick(dt: number) {
    this.state.players.forEach((p) => advanceMovable(p, dt));
  }

  onJoin(client: Client, options: { name?: string }) {
    const player = new PlayerState();
    player.name = options?.name ?? "Adventurer";
    this.state.players.set(client.sessionId, player);
  }

  onLeave(client: Client) {
    this.state.players.delete(client.sessionId);
  }
}
