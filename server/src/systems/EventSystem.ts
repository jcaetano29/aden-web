import {
  INVADERS, chooseInvasionSpawn, INVASION_WARNING_MS, INVASION_DURATION_MS, INVASION_RADIUS, MINOR_MIN_PLAYERS,
  PARTICIPATION_MIN_SHARE, PARTICIPATION_GEM_CHANCE, UPGRADE_GEMS, CHAOS_SEAL, INVASION_MIN_LEVEL,
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
  dropReserved(itemId: string, x: number, z: number, mapId: string, owner: { guildId: string; playerId: string; label: string; partyMembers?: readonly string[] }): void;
  reward(playerId: string, gold: number, exp: number, itemId?: string): void;
  dropPublic(itemId: string, qty: number, x: number, z: number, mapId: string): void;
}

interface CurrentEvent { invader: InvaderDef; mapId: string; startsAt: number; endsAt: number; bossId: string; daily: boolean }

/** Invasiones programadas: anuncio → aparición → cierre (muerte o retirada). */
export class EventSystem {
  private nextDailyAt: number;
  private nextMinorAt: number;
  private current: CurrentEvent | null = null;
  private seq = 0;
  /** Group and party identities are captured on first contribution for this encounter. */
  private readonly damage = new Map<string, number>();
  private readonly support = new Map<string, number>();
  private readonly groupOf = new Map<string, string>();
  private readonly partyOf = new Map<string, string>();
  private readonly partyParticipants = new Map<string, Set<string>>();
  private readonly labels = new Map<string, string>();
  private rankedAt = 0;

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
      this.resolve(cur, boss);
      this.close(now);
      return;
    }
    if (now - this.rankedAt >= 1000) {
      this.rankedAt = now;
      const ranking = this.host.state.worldEvent.ranking;
      ranking.clear();
      for (const s of this.standings().slice(0, 3)) ranking.push(`${s.label} · ${Math.round(s.share * 100)}%`);
    }
    if (now >= cur.endsAt) {
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

  /** Effective damage is validated by combat; captures guild, then party, then solo credit. */
  recordDamage(mobId: string, playerId: string, amount: number): void {
    const cur = this.current;
    if (!cur || !Number.isFinite(amount) || amount <= 0 || mobId !== cur.bossId || this.host.state.worldEvent.phase !== 'active') return;
    if (!this.captureGroup(playerId)) return;
    this.damage.set(playerId, (this.damage.get(playerId) ?? 0) + amount);
    this.capturePartyParticipant(playerId);
  }

  /** Accept ONLY actual allied healing/prevention/bonus/control validated by combat, never casts or overheal. */
  recordSupport(mobId: string, playerId: string, amount: number): void {
    const cur = this.current;
    if (!cur || !Number.isFinite(amount) || amount <= 0 || mobId !== cur.bossId ||
        this.host.state.worldEvent.phase !== 'active' || this.host.now() >= cur.endsAt) return;
    const boss = this.host.state.mobs.get(mobId);
    const player = this.eligibleParticipant(playerId);
    // Damage resolution subtracts HP before its support hook, then marks death synchronously.
    // Keep the lethal hit's effective bonus; reject all later calls once death is committed.
    if (!boss || boss.dead || !player) return;
    const ownDamage = this.damage.get(playerId) ?? 0;
    const partyId = this.partyOf.get(playerId) ?? player.partyId;
    const party = this.host.state.parties.get(partyId);
    let alliedDamage = 0;
    if (party && player.partyId === partyId && party.members.includes(playerId)) {
      for (const id of party.members) {
        const ally = this.eligibleParticipant(id);
        if (id !== playerId && ally?.partyId === partyId && this.partyOf.get(id) === partyId) {
          alliedDamage += this.damage.get(id) ?? 0;
        }
      }
    }
    // A pure healer needs a party that meaningfully engaged this boss. Excess is discarded,
    // so spamming now cannot buy contribution when somebody deals damage later.
    if (alliedDamage < Math.max(1, boss.maxHp * PARTICIPATION_MIN_SHARE)) alliedDamage = 0;
    const cap = ownDamage * 0.5 + alliedDamage * 0.2;
    const previous = this.support.get(playerId) ?? 0;
    const credited = Math.min(amount, Math.max(0, cap - previous));
    if (credited <= 0 || !this.captureGroup(playerId)) return;
    this.support.set(playerId, previous + credited);
    this.capturePartyParticipant(playerId);
  }

  private eligibleParticipant(id: string) {
    const player = this.host.state.players.get(id);
    return player?.loaded && !player.dead && player.hp > 0 && player.level >= INVASION_MIN_LEVEL && this.inArea(player)
      ? player : undefined;
  }

  private captureGroup(playerId: string): string | undefined {
    const captured = this.groupOf.get(playerId);
    if (captured) return captured;
    const player = this.host.state.players.get(playerId);
    if (!player) return undefined;
    const party = this.host.state.parties.get(player.partyId);
    const partyId = party?.members.includes(playerId) ? player.partyId : '';
    const key = player.guildId || (partyId ? `party:${partyId}` : `solo:${playerId}`);
    const leader = party && this.host.state.players.get(party.leaderId);
    const label = player.guildId ? player.guildTag || player.name : partyId ? `Party de ${leader?.name || player.name}` : player.name;
    this.groupOf.set(playerId, key);
    this.partyOf.set(playerId, partyId);
    if (!this.labels.has(key)) this.labels.set(key, label);
    return key;
  }

  private capturePartyParticipant(playerId: string): void {
    const key = this.groupOf.get(playerId);
    if (!key?.startsWith('party:') || !this.eligibleParticipant(playerId)) return;
    let members = this.partyParticipants.get(key);
    if (!members) { members = new Set(); this.partyParticipants.set(key, members); }
    members.add(playerId);
  }

  private contributions(): Map<string, number> {
    const result = new Map(this.damage);
    for (const [id, amount] of this.support) result.set(id, (result.get(id) ?? 0) + amount);
    return result;
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
    if (!invader.maps.includes(mapId)) throw new Error(`Mapa no permitido para ${invader.id}: ${mapId}`);
    const spot = chooseInvasionSpawn(mapId, () => this.host.rng());
    this.current = { invader, mapId, startsAt, endsAt: startsAt + INVASION_DURATION_MS, bossId: `event_${invader.id}_${++this.seq}`, daily };
    const ev = this.host.state.worldEvent;
    ev.id = `${invader.id}_${startsAt}`; ev.invaderId = invader.id; ev.phase = 'announced'; ev.mapId = mapId;
    ev.x = spot.x; ev.z = spot.z; ev.radius = INVASION_RADIUS; ev.startsAt = startsAt; ev.endsAt = startsAt + INVASION_DURATION_MS;
    ev.bossId = ''; ev.ranking.clear();
    const minutes = Math.max(1, Math.round((startsAt - this.host.now()) / 60_000));
    this.host.announce(`⚔ ${invader.arrival.replace('{map}', getZone(mapId).name)}: la invasión empieza en ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}.`);
  }

  private spawn(cur: CurrentEvent): void {
    const spot = this.host.state.worldEvent;
    const boss = this.host.spawnInvader(cur.bossId, cur.invader.templateId, spot.x, spot.z, cur.mapId);
    const ev = this.host.state.worldEvent;
    ev.phase = 'active'; ev.bossId = cur.bossId; ev.x = boss.x; ev.z = boss.z;
    this.host.announce(`⚔ ¡${getTemplate(cur.invader.templateId).name} invade ${getZone(cur.mapId).name}! Tienen 20 minutos para derrotarlo.`);
  }

  private standings(): { key: string; label: string; share: number }[] {
    const totals = new Map<string, number>();
    let all = 0;
    for (const [playerId, dmg] of this.contributions()) {
      const key = this.groupOf.get(playerId)!;
      totals.set(key, (totals.get(key) ?? 0) + dmg);
      all += dmg;
    }
    return [...totals.entries()]
      .map(([key, dmg]) => ({ key, label: this.labels.get(key) ?? '?', share: all ? dmg / all : 0 }))
      .sort((a, b) => b.share - a.share);
  }

  /** Unique loot goes to the leading contribution group; individual rewards require at least 1%. */
  private resolve(cur: CurrentEvent, boss: MobState | undefined): void {
    const name = getTemplate(cur.invader.templateId).name;
    const winner = this.standings()[0];
    if (!winner || !boss) { this.host.announce(`⚔ ¡${name} cayó!`); return; }
    const solo = winner.key.startsWith('solo:');
    const party = winner.key.startsWith('party:');
    const owner = {
      guildId: solo || party ? '' : winner.key,
      playerId: solo ? winner.key.slice(5) : '', label: winner.label,
      ...(party ? { partyMembers: [...(this.partyParticipants.get(winner.key) ?? [])] } : {}),
    };
    const unique = this.host.rng() < cur.invader.uniqueChance ? this.pick(cur.invader.uniqueLoot) : undefined;
    const loot = unique ? [unique] : [];
    if (cur.invader.guaranteedGem || !unique) loot.push(this.pick(UPGRADE_GEMS));
    for (const id of loot) this.host.dropReserved(id, boss.x, boss.z, cur.mapId, owner);
    this.host.dropPublic(CHAOS_SEAL, 2, boss.x, boss.z, cur.mapId); // dos Sellos del Caos para quien los alcance
    const contributions = this.contributions();
    const total = [...contributions.values()].reduce((a, b) => a + b, 0);
    for (const [playerId, dmg] of contributions) {
      if (dmg / total < PARTICIPATION_MIN_SHARE) continue;
      const gem = this.host.rng() < PARTICIPATION_GEM_CHANCE ? this.pick(UPGRADE_GEMS) : undefined;
      this.host.reward(playerId, cur.invader.rewardGold, cur.invader.rewardExp, gem);
    }
    this.host.announce(`⚔ ¡${name} cayó! El botín es de ${winner.label}.`);
  }

  private close(now: number): void {
    const cur = this.current!;
    this.host.state.mobs.delete(cur.bossId);
    const ev = this.host.state.worldEvent;
    ev.id = ''; ev.invaderId = ''; ev.phase = ''; ev.mapId = ''; ev.bossId = ''; ev.radius = 0; ev.startsAt = 0; ev.endsAt = 0;
    ev.ranking.clear();
    this.damage.clear(); this.support.clear(); this.groupOf.clear(); this.partyOf.clear();
    this.partyParticipants.clear(); this.labels.clear(); this.rankedAt = 0;
    if (cur.daily) this.nextDailyAt = nextDailyInvasion(now);
    this.nextMinorAt = nextMinorInvasion(now, () => this.host.rng());
    this.current = null;
  }

  private pick<T>(list: readonly T[]): T {
    return list[Math.min(list.length - 1, Math.floor(this.host.rng() * list.length))];
  }
}
