import {
  CASTLE_MAP, CASTLE_CENTER, CASTLE_CAPACITY, CASTLE_REGISTRATION_MS, CASTLE_DURATION_MS, CASTLE_BRACKETS, CHAOS_SEAL,
  CASTLE_PVP_FACTOR, CASTLE_POINTS_MONSTER, CASTLE_POINTS_PLAYER,
  TOWN_ZONE_ID, castleBracket, getZone, nextCastle, type CastleBracket,
} from '@aden/shared';
import type { GameState } from '../state/GameState.js';
import type { MobState } from '../state/MobState.js';
import type { PlayerState } from '../state/PlayerState.js';

/** Lo que el Castillo del Caos necesita del servidor de juego (inyectado: testeable sin sala). */
export interface CastleHost {
  state: GameState;
  now(): number;
  rng(): number;
  announce(text: string): void;
  notify(playerId: string, text: string, success?: boolean): void;
  isOnline(playerId: string): boolean;
  /** Mueve al jugador y lo deja vivo con la vida y el maná completos. */
  teleport(playerId: string, mapId: string, x: number, z: number): void;
  spawnGuard(id: string, templateId: string, x: number, z: number): MobState;
  takeSeal(playerId: string): boolean;
  giveItem(playerId: string, itemId: string, qty: number): void;
  reward(playerId: string, gold: number, exp: number, items: string[]): void;
}

interface Participant { id: string; name: string; alive: boolean; points: number }

/** Arena todos contra todos por horario: inscripción → partida → cierre. */
export class ChaosCastleSystem {
  private next: { startsAt: number; bracket: CastleBracket };
  private registered: string[] = [];
  private readonly participants = new Map<string, Participant>();
  private readonly guards = new Set<string>();
  private startedAt = 0;
  private guardSeq = 0;

  /** `scheduled: false` apaga la programación automática (tests y simulador); `openNow` sigue funcionando. */
  constructor(readonly host: CastleHost, private readonly options: { scheduled?: boolean } = {}) {
    this.next = nextCastle(host.now());
  }

  private get st() { return this.host.state.castle; }
  private get bracket() { return CASTLE_BRACKETS[this.st.bracket as CastleBracket]; }

  tick(): void {
    const now = this.host.now();
    if (this.st.phase === '') {
      if (this.options.scheduled !== false && now >= this.next.startsAt - CASTLE_REGISTRATION_MS) this.open(this.next.bracket, this.next.startsAt);
      return;
    }
    if (this.st.phase === 'registration') { if (now >= this.st.startsAt) this.start(now); return; }
    this.stepMatch(now);
  }

  /** Abre la inscripción ya (tests y servidor semilla); `leadMs` es lo que dura la inscripción. */
  openNow(bracket: CastleBracket, leadMs = CASTLE_REGISTRATION_MS): void {
    if (this.st.phase !== '') return;
    this.open(bracket, this.host.now() + leadMs);
  }

  /** Inscripción con el Custodio: tramo correcto, una sola vez y entregando un Sello del Caos. */
  register(playerId: string): { success: boolean; text: string } {
    const p = this.host.state.players.get(playerId);
    if (!p) return { success: false, text: 'No se pudo inscribir.' };
    if (this.st.phase !== 'registration') return { success: false, text: 'La inscripción al Castillo del Caos no está abierta ahora. Volvé cuando se anuncie.' };
    const b = this.bracket;
    if (castleBracket(p.level) !== this.st.bracket) return { success: false, text: `Este es el ${b.name}, para nivel ${b.minLevel}–${b.maxLevel}. Esperá el castillo de tu tramo.` };
    if (this.registered.includes(playerId)) return { success: false, text: `Ya estás inscripto en el ${b.name}.` };
    if (!this.host.takeSeal(playerId)) return { success: false, text: 'Necesitás un Sello del Caos para inscribirte.' };
    this.registered.push(playerId);
    this.st.registered = this.registered.length;
    return { success: true, text: `Quedaste inscripto en el ${b.name}. Estate conectado cuando empiece.` };
  }

  isParticipant(playerId: string): boolean {
    return this.st.phase === 'active' && this.participants.get(playerId)?.alive === true;
  }

  /** El mismo chequeo a partir del jugador (las reglas de combate reciben jugadores, no ids). */
  isParticipantPlayer(p: PlayerState): boolean {
    if (this.st.phase !== 'active') return false;
    for (const part of this.participants.values()) if (part.alive && this.host.state.players.get(part.id) === p) return true;
    return false;
  }

  /** Multiplicador del daño entre dos jugadores: 0,5 si ambos pelean adentro, null si no aplica. */
  pvpFactor(a: PlayerState, b: PlayerState): number | null {
    return this.isParticipantPlayer(a) && this.isParticipantPlayer(b) ? CASTLE_PVP_FACTOR : null;
  }

  /** Muerte adentro: punto para el que mató, eliminación sin penalidad. Devuelve true si la manejó. */
  onPlayerDeath(victimId: string, killerId?: string): boolean {
    if (!this.isParticipant(victimId)) return false;
    if (killerId && this.isParticipant(killerId)) this.addPoints(killerId, CASTLE_POINTS_PLAYER);
    this.eliminate(victimId, 'death');
    return true;
  }

  onMobKilled(mobId: string, killerId?: string): void {
    if (!this.guards.has(mobId)) return;
    if (killerId && this.isParticipant(killerId)) this.addPoints(killerId, CASTLE_POINTS_MONSTER);
    this.syncCounts();
  }

  isGuard(mobId: string): boolean { return this.guards.has(mobId); }

  /** Sale de la partida (conserva sus puntos) y vuelve al pueblo. */
  eliminate(playerId: string, reason: 'fall' | 'left' | 'disconnect' | 'death'): void {
    const part = this.participants.get(playerId);
    if (!part?.alive || this.st.phase !== 'active') return;
    part.alive = false;
    this.sendHome(playerId);
    const texts = {
      death: `Quedaste eliminado del ${this.bracket.name}. Tus puntos: ${part.points}.`,
      fall: `Caíste al abismo: quedaste eliminado del ${this.bracket.name}. Tus puntos: ${part.points}.`,
      left: `Abandonaste el ${this.bracket.name}. Tus puntos: ${part.points}.`,
      disconnect: '',
    };
    if (texts[reason]) this.host.notify(playerId, texts[reason], false);
    this.syncCounts();
  }

  private addPoints(playerId: string, amount: number): void {
    const part = this.participants.get(playerId);
    if (!part) return;
    part.points += amount;
    this.st.points.set(playerId, part.points);
  }

  private open(bracket: CastleBracket, startsAt: number): void {
    const b = CASTLE_BRACKETS[bracket];
    this.st.phase = 'registration'; this.st.bracket = bracket; this.st.startsAt = startsAt; this.st.endsAt = startsAt + CASTLE_DURATION_MS;
    this.st.registered = 0; this.st.alive = 0; this.st.monsters = 0; this.st.ring = 0; this.st.collapseAt = 0; this.st.points.clear();
    this.registered = [];
    const minutes = Math.max(1, Math.round((startsAt - this.host.now()) / 60_000));
    this.host.announce(`⚔ Abrió la inscripción al ${b.name} (nivel ${b.minLevel}–${b.maxLevel}): entregá un Sello del Caos al Custodio en el pueblo. Empieza en ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}.`);
  }

  private start(now: number): void {
    const b = this.bracket;
    const entrants = this.registered.filter(id => this.host.isOnline(id) && this.host.state.players.has(id));
    if (entrants.length < 2) {
      for (const id of this.registered) this.host.giveItem(id, CHAOS_SEAL, 1);
      this.host.announce(`El ${b.name} se suspendió: no hubo suficientes inscriptos. Les devolvimos el sello.`);
      this.close(now);
      return;
    }
    this.st.phase = 'active'; this.startedAt = now; this.st.startsAt = now; this.st.endsAt = now + CASTLE_DURATION_MS;
    for (const id of entrants) {
      const spot = this.edgeSpot();
      this.host.teleport(id, CASTLE_MAP, spot.x, spot.z);
      this.participants.set(id, { id, name: this.host.state.players.get(id)!.name, alive: true, points: 0 });
      this.st.points.set(id, 0);
    }
    for (let i = entrants.length; i < CASTLE_CAPACITY; i++) {
      const spot = this.platformSpot(), id = `castle_guard_${++this.guardSeq}`;
      this.host.spawnGuard(id, b.guard, spot.x, spot.z);
      this.guards.add(id);
    }
    this.syncCounts();
    this.host.announce(`⚔ ¡Empezó el ${b.name}! Sólo puede quedar uno.`);
  }

  private stepMatch(now: number): void {
    this.syncCounts();
    if (now >= this.st.endsAt) this.finish(now);
  }

  private finish(now: number): void {
    for (const p of this.participants.values()) if (p.alive) this.sendHome(p.id);
    this.close(now);
  }

  private close(now: number): void {
    for (const id of this.guards) this.host.state.mobs.delete(id);
    const st = this.st;
    st.phase = ''; st.bracket = ''; st.startsAt = 0; st.endsAt = 0; st.registered = 0; st.alive = 0; st.monsters = 0; st.ring = 0; st.collapseAt = 0;
    st.points.clear();
    this.registered = []; this.participants.clear(); this.guards.clear();
    this.next = nextCastle(now);
  }

  private syncCounts(): void {
    this.st.alive = [...this.participants.values()].filter(p => p.alive).length;
    this.st.monsters = [...this.guards].filter(id => { const m = this.host.state.mobs.get(id); return m && !m.dead; }).length;
  }

  private sendHome(playerId: string): void {
    const spawn = getZone(TOWN_ZONE_ID).spawn;
    this.host.teleport(playerId, TOWN_ZONE_ID, spawn.x, spawn.z);
  }

  /** Punto al azar del anillo exterior (borde de la plataforma). */
  private edgeSpot(): { x: number; z: number } {
    const d = 22 + this.host.rng() * 6, along = (this.host.rng() * 2 - 1) * d, side = Math.floor(this.host.rng() * 4);
    const [dx, dz] = side === 0 ? [d, along] : side === 1 ? [-d, along] : side === 2 ? [along, d] : [along, -d];
    return { x: CASTLE_CENTER.x + dx, z: CASTLE_CENTER.z + dz };
  }

  /** Punto al azar sobre la plataforma. */
  private platformSpot(): { x: number; z: number } {
    return { x: CASTLE_CENTER.x + (this.host.rng() * 2 - 1) * 28, z: CASTLE_CENTER.z + (this.host.rng() * 2 - 1) * 28 };
  }
}
