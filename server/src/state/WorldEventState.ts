import { Schema, type, ArraySchema } from "@colyseus/schema";

/** Evento de mundo visible para todos (invasiones). `phase` vacía = no hay evento. */
export class WorldEventState extends Schema {
  @type("string") id = "";
  @type("string") invaderId = "";
  /** '' | 'announced' | 'active' */
  @type("string") phase = "";
  @type("string") mapId = "";
  @type("number") x = 0;
  @type("number") z = 0;
  @type("number") radius = 0;
  /** Epoch ms de aparición y de retirada. */
  @type("number") startsAt = 0;
  @type("number") endsAt = 0;
  @type("string") bossId = "";
  /** Top 3 de daño: "TAG · 45%". */
  @type(["string"]) ranking = new ArraySchema<string>();
}
