import { Schema, type } from "@colyseus/schema";

/** Puntos invertidos sobre la base 100; se guardan así para conservar el progreso anterior. */
export class AttributesState extends Schema {
  @type("number") str = 0;
  @type("number") agi = 0;
  @type("number") vit = 0;
  @type("number") ene = 0;
  @type("number") statPoints = 0;
  /** Rapidez efectiva (atributos + equipo), replicada para el panel. */
  @type("number") attackSpeed = 0;
  /** Compensación de un solo uso para guardados anteriores al cambio de reglas. */
  @type("boolean") resetAvailable = false;
}
