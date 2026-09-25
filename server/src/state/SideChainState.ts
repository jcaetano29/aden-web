import { Schema, type } from "@colyseus/schema";

/** Paso activo de un encargo opcional (clave del mapa = id de la cadena). */
export class SideChainState extends Schema {
  @type("string") id = "";
  @type("number") progress = 0;
}
