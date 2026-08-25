import { Schema, type } from "@colyseus/schema";

/**
 * Objeto de mundo interactivo (Etapa 16): cofre / barril rompible / santuario.
 * Sincronizado al cliente para renderizarlo y mostrar su estado (activo vs.
 * abierto/roto/en cooldown). La definición (loot/buff) vive en shared/worldobjects.ts;
 * acá sólo el estado dinámico. `respawnMs` es server-only (cuenta atrás para reactivar).
 */
export class WorldObjectState extends Schema {
  @type("string") id = "";
  @type("string") kind = "";
  @type("string") mapId = "";
  @type("number") x = 0;
  @type("number") z = 0;
  /** true = cofre cerrado / barril intacto / santuario listo. false = usado. */
  @type("boolean") active = true;

  // server-only (NO @type)
  respawnMs = 0;
}
