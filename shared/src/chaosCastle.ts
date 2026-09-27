import type { LootSource } from './lootPools.js';

/** Castillo del Caos: arena todos contra todos por horario (reglas puras; el servidor aporta reloj y azar). */
export type CastleBracket = 'menor' | 'mayor';

export const CASTLE_MAP = 'castillo';
export const CASTLE_CENTER = { x: 900, z: 300 } as const;
export const CASTLE_CAPACITY = 16;
export const CASTLE_PVP_FACTOR = 0.5;
export const CASTLE_POINTS_MONSTER = 2;
export const CASTLE_POINTS_PLAYER = 1;
export const CASTLE_REGISTRATION_MS = 300_000;
export const CASTLE_DURATION_MS = 600_000;
export const CASTLE_COLLAPSE_WARNING_MS = 5_000;
/** Cada derrumbe: cuando quedan tantos participantes vivos o a tantos ms de partida, lo que pase primero. */
export const CASTLE_COLLAPSES: readonly { alive: number; atMs: number }[] = [{ alive: 12, atMs: 150_000 }, { alive: 8, atMs: 300_000 }];
/** Distancia Chebyshev al centro donde termina cada anillo: borde, medio, centro. */
const RING_OUTER = 30, RING_MIDDLE = 20, RING_CENTER = 10;

export const CASTLE_BRACKETS: Record<CastleBracket, { name: string; minLevel: number; maxLevel: number; guard: string; gold: number; expPerPoint: number }> = {
  menor: { name: 'Castillo del Caos Menor', minLevel: 10, maxLevel: 19, guard: 'chaos_guard_minor', gold: 1500, expPerPoint: 120 },
  mayor: { name: 'Castillo del Caos Mayor', minLevel: 20, maxLevel: 40, guard: 'chaos_guard_major', gold: 4000, expPerPoint: 400 },
};

export const CHAOS_SEAL = 'chaos_seal';
/** Tirada extra del Sello del Caos por fuente (aparte del botín del catálogo). */
export const CHAOS_SEAL_CHANCE: Record<LootSource, number> = { normal: 0.005, elite: 0.03, chest: 0.03, boss: 0.1 };

const HOUR = 3_600_000;
/** 00:30 Argentina (UTC−3) = 03:30 UTC; se repite cada 2 horas. */
const ANCHOR = 3.5 * HOUR, PERIOD = 2 * HOUR;

/** Próximo castillo estrictamente después de `now`: Menor a las 00, 04, 08…; Mayor a las 02, 06, 10… (y media, Argentina). */
export function nextCastle(now: number): { startsAt: number; bracket: CastleBracket } {
  let startsAt = Math.floor((now - ANCHOR) / PERIOD) * PERIOD + ANCHOR;
  if (startsAt <= now) startsAt += PERIOD;
  const argentinaHour = (new Date(startsAt).getUTCHours() - 3 + 24) % 24;
  return { startsAt, bracket: argentinaHour % 4 === 0 ? 'menor' : 'mayor' };
}

export function castleBracket(level: number): CastleBracket | null {
  if (level < CASTLE_BRACKETS.menor.minLevel) return null;
  return level <= CASTLE_BRACKETS.menor.maxLevel ? 'menor' : 'mayor';
}

/** 0 = abismo, 1 = borde, 2 = anillo medio, 3 = centro. */
export function ringAt(x: number, z: number): 0 | 1 | 2 | 3 {
  const d = Math.max(Math.abs(x - CASTLE_CENTER.x), Math.abs(z - CASTLE_CENTER.z));
  if (d > RING_OUTER) return 0;
  if (d > RING_MIDDLE) return 1;
  if (d > RING_CENTER) return 2;
  return 3;
}

/** ¿Cae al abismo quien está acá con `collapsed` anillos derrumbados? */
export function fallsAt(x: number, z: number, collapsed: number): boolean {
  const ring = ringAt(x, z);
  return ring === 0 || ring <= collapsed;
}

/** Castillo tal como lo ve el cliente. */
export interface CastleView {
  phase: 'registration' | 'active';
  bracket: CastleBracket;
  startsAt: number;
  endsAt: number;
  registered: number;
  alive: number;
  monsters: number;
  ring: number;
  collapseAt: number;
  /** Puntos del jugador local si participa (null si no). */
  myPoints: number | null;
}
