import { Schema, type } from "@colyseus/schema";

/** Atributos primarios asignables (Etapa 21), agrupados para liberar campos de PlayerState. */
export class AttributesState extends Schema {
  @type("number") str = 0;
  @type("number") agi = 0;
  @type("number") vit = 0;
  @type("number") ene = 0;
  @type("number") statPoints = 0;
}
