import {
  INVADERS, INVASION_SPOTS, INVASION_WARNING_MS, INVASION_DURATION_MS, INVASION_RADIUS, MINOR_MIN_PLAYERS,
  getInvader, getTemplate, getZone, nextDailyInvasion, nextMinorInvasion, inInvasionArea, type InvaderDef,
} from '@aden/shared';
import type { GameState } from '../state/GameState.js';
import type { MobState } from '../state/MobState.js';

/** Lo que el sistema de eventos necesita del servidor de juego (inyectado: testeable sin sala). */
export interface EventHost {
  state: GameState;
  now(): number;
  rng(): number;
  announce(text: string): void;
  onlinePlayers(): number;
  spawnInvader(id: string, templateId: string, x: number, z: number, mapId: string): MobState;
  dropReserved(itemId: string, x: number, z: number, mapId: string, owner: { guildId: string; playerId: string; label: string }): void;
  reward(playerId: string, gold: number, exp: number, itemId?: string): void;
}

interface CurrentEvent { invader: InvaderDef; mapId: string; startsAt: number; endsAt: number; bossId: string; daily: boolean }

/** Invasiones programadas: anuncio → aparición → cierre (muerte o retirada). */
export class EventSystem {
  private nextDailyAt: number;
  private nextMinorAt: number;
  private current: CurrentEvent | null = null;
  private seq = 0;

  /** `scheduled: false` apaga la programación automática (tests y simulador); `startNow` sigue funcionando. */
  constructor(readonly host: EventHost, private readonly options: { scheduled?: boolean } = {}) {
    const now = host.now();
    this.nextDailyAt = nextDailyInvasion(now);
    this.nextMinorAt = nextMinorInvasion(now, () => host.rng());
  }

  tick(): void {
    const now = this.host.now();
    const cur = this.current;
    if (!cur) { if (this.options.scheduled !== false) this.maybeAnnounce(now); return; }
    if (this.host.state.worldEvent.phase === 'announced') {
      if (now >= cur.startsAt) this.spawn(cur);
      return;
    }
    const boss = this.host.state.mobs.get(cur.bossId);
    if (!boss || boss.dead) {
      this.host.announce(`⚔ ¡${getTemplate(cur.invader.templateId).name} cayó!`);
      this.close(now);
    } else if (now >= cur.endsAt) {
      this.host.announce(`⚔ ${cur.invader.retreat}`);
      this.close(now);
    }
  }

  /** Anuncia una invasión ya (tests y servidor semilla); `leadMs` es el aviso previo. */
  startNow(invaderId: string, mapId: string, leadMs = INVASION_WARNING_MS): void {
    if (this.current) return;
    const invader = getInvader(invaderId);
    this.announce(invader, mapId, this.host.now() + leadMs, false);
  }

  inArea(p: { mapId: string; x: number; z: number }): boolean {
    return inInvasionArea(this.host.state.worldEvent, p.mapId, p.x, p.z);
  }

  private maybeAnnounce(now: number): void {
    if (now >= this.nextDailyAt - INVASION_WARNING_MS) {
      const dragon = Object.values(INVADERS).find(i => i.kind === 'daily')!;
      this.announce(dragon, this.pick(dragon.maps), this.nextDailyAt, true);
      return;
    }
    if (now < this.nextMinorAt - INVASION_WARNING_MS) return;
    if (this.host.onlinePlayers() < MINOR_MIN_PLAYERS) { this.nextMinorAt = nextMinorInvasion(now, () => this.host.rng()); return; }
    const invader = this.pick(Object.values(INVADERS).filter(i => i.kind === 'minor'));
    this.announce(invader, this.pick(invader.maps), Math.max(this.nextMinorAt, now), false);
  }

  private announce(invader: InvaderDef, mapId: string, startsAt: number, daily: boolean): void {
    const spot = INVASION_SPOTS[mapId];
    this.current = { invader, mapId, startsAt, endsAt: startsAt + INVASION_DURATION_MS, bossId: `event_${invader.id}_${++this.seq}`, daily };
    const ev = this.host.state.worldEvent;
    ev.id = `${invader.id}_${startsAt}`; ev.invaderId = invader.id; ev.phase = 'announced'; ev.mapId = mapId;
    ev.x = spot.x; ev.z = spot.z; ev.radius = INVASION_RADIUS; ev.startsAt = startsAt; ev.endsAt = startsAt + INVASION_DURATION_MS;
    ev.bossId = ''; ev.ranking.clear();
    const minutes = Math.max(1, Math.round((startsAt - this.host.now()) / 60_000));
    this.host.announce(`⚔ ${invader.arrival.replace('{map}', getZone(mapId).name)}: la invasión empieza en ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}.`);
  }

  private spawn(cur: CurrentEvent): void {
    const spot = INVASION_SPOTS[cur.mapId];
    const boss = this.host.spawnInvader(cur.bossId, cur.invader.templateId, spot.x, spot.z, cur.mapId);
    const ev = this.host.state.worldEvent;
    ev.phase = 'active'; ev.bossId = cur.bossId; ev.x = boss.x; ev.z = boss.z;
    this.host.announce(`⚔ ¡${getTemplate(cur.invader.templateId).name} invade ${getZone(cur.mapId).name}! Tienen 20 minutos para derrotarlo.`);
  }

  private close(now: number): void {
    const cur = this.current!;
    this.host.state.mobs.delete(cur.bossId);
    const ev = this.host.state.worldEvent;
    ev.id = ''; ev.invaderId = ''; ev.phase = ''; ev.mapId = ''; ev.bossId = ''; ev.radius = 0; ev.startsAt = 0; ev.endsAt = 0;
    ev.ranking.clear();
    if (cur.daily) this.nextDailyAt = nextDailyInvasion(now);
    this.nextMinorAt = nextMinorInvasion(now, () => this.host.rng());
    this.current = null;
  }

  private pick<T>(list: readonly T[]): T {
    return list[Math.min(list.length - 1, Math.floor(this.host.rng() * list.length))];
  }
}
