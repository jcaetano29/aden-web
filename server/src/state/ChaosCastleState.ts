import { Schema, type, MapSchema } from "@colyseus/schema";

/** Castillo del Caos visible para todos. `phase` vacía = no hay inscripción ni partida. */
export class ChaosCastleState extends Schema {
  /** '' | 'registration' | 'active' */
  @type("string") phase = "";
  /** 'menor' | 'mayor' */
  @type("string") bracket = "";
  /** Epoch ms del inicio (fin de la inscripción) y del fin máximo de la partida. */
  @type("number") startsAt = 0;
  @type("number") endsAt = 0;
  @type("number") registered = 0;
  /** Jugadores vivos adentro y guardias vivos. */
  @type("number") alive = 0;
  @type("number") monsters = 0;
  /** Anillos derrumbados (0–2) y epoch del próximo derrumbe anunciado (0 = ninguno). */
  @type("number") ring = 0;
  @type("number") collapseAt = 0;
  /** sessionId → puntos de cada participante. */
  @type({ map: "number" }) points = new MapSchema<number>();
}
