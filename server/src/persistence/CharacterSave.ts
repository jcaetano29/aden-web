import { characterGender, type CharacterGender } from '@aden/shared';

export interface SideChainSave { id: string; progress: number }

/** Appearance shares the existing JSON column, including in Supabase: no migration required. */
export interface ProgressSave {
  /** Encargos opcionales por cadena; los campos de Varek y Boren se conservan para poder volver atrás. */
  sideChains?: Record<string, SideChainSave>;
  veilContractId?: string;
  veilContractProgress?: number;
  gender?: CharacterGender;
  learnedTomes?: string[];
  loginStreak: number;
  lastLoginDay: string;
  dailyQuestId: string;
  dailyProgress: number;
  dailyDone: boolean;
  totalKills: number;
  bossKills: number;
  title: string;
  achievements: string[];
  // Etapa 20: contrato activo del Capitán.
  bountyId: string;
  bountyProgress: number;
  // Etapa 21: atributos asignados + puntos sin gastar.
  str: number;
  agi: number;
  vit: number;
  ene: number;
  statPoints: number;
}

export interface CharacterSave {
  level: number;
  exp: number;
  pos_x: number;
  pos_z: number;
  /** Etapa 15: mapa actual (estilo Mu). */
  mapId: string;
  inventory: Record<string, number>;
  gold: number;
  questId: string;
  questProgress: number;
  className: string;
  pvpKills: number;
  guildId: string;
  guildName: string;
  guildTag: string;
  /** Etapa 12: equipo — slot → itemTemplateId. */
  equipment: Record<string, string>;
  /** Etapa 13: retención. */
  progress: ProgressSave;
}

export interface Persistable {
  gender?: CharacterGender;
  learnedTomes?: { forEach(cb: (v: string) => void): void };
  level: number;
  exp: number;
  x: number;
  z: number;
  mapId: string;
  inventory: { forEach(cb: (v: { qty: number }, k: string) => void): void };
  gold: number;
  questId: string;
  questProgress: number;
  className: string;
  pvpKills: number;
  guildId: string;
  guildName: string;
  guildTag: string;
  equipment: { forEach(cb: (v: string, k: string) => void): void };
  // Etapa 13: retención.
  retention: { loginStreak: number; dailyQuestId: string; dailyProgress: number; dailyDone: boolean; totalKills: number };
  lastLoginDay: string;
  bossKills: number;
  title: string;
  achievements: { forEach(cb: (v: string) => void): void };
  sideChains: { forEach(cb: (v: { id: string; progress: number }, k: string) => void): void };
  // Etapa 21: atributos asignados + puntos sin gastar.
  attributes: { str: number; agi: number; vit: number; ene: number; statPoints: number };
}

export function toCharacterSave(p: Persistable): CharacterSave {
  const inventory: Record<string, number> = {};
  p.inventory.forEach((v, k) => {
    inventory[k] = v.qty;
  });

  const equipment: Record<string, string> = {};
  p.equipment.forEach((v, k) => {
    if (v) equipment[k] = v;
  });

  const achievements: string[] = [];
  const learnedTomes: string[] = [];
  p.learnedTomes?.forEach(id=>learnedTomes.push(id));
  p.achievements.forEach((id) => achievements.push(id));
  const sideChains: Record<string, SideChainSave> = {};
  p.sideChains.forEach((v, k) => { if (v.id) sideChains[k] = { id: v.id, progress: v.progress }; });

  return {
    level: p.level,
    exp: p.exp,
    pos_x: p.x,
    pos_z: p.z,
    mapId: p.mapId,
    inventory,
    gold: p.gold,
    questId: p.questId,
    questProgress: p.questProgress,
    className: p.className,
    pvpKills: p.pvpKills,
    guildId: p.guildId,
    guildName: p.guildName,
    guildTag: p.guildTag,
    equipment,
    progress: {
      gender: characterGender(p.gender),
      ...(learnedTomes.length ? {learnedTomes} : {}),
      loginStreak: p.retention.loginStreak,
      lastLoginDay: p.lastLoginDay,
      dailyQuestId: p.retention.dailyQuestId,
      dailyProgress: p.retention.dailyProgress,
      dailyDone: p.retention.dailyDone,
      totalKills: p.retention.totalKills,
      bossKills: p.bossKills,
      title: p.title,
      achievements,
      // Campos viejos: se siguen escribiendo para poder volver a una versión anterior.
      bountyId: sideChains.varek?.id ?? "",
      bountyProgress: sideChains.varek?.progress ?? 0,
      ...(sideChains.boren ? { veilContractId: sideChains.boren.id, veilContractProgress: sideChains.boren.progress } : {}),
      ...(Object.keys(sideChains).length ? { sideChains } : {}),
      str: p.attributes.str,
      agi: p.attributes.agi,
      vit: p.attributes.vit,
      ene: p.attributes.ene,
      statPoints: p.attributes.statPoints,
    },
  };
}

/** Encargos guardados: formato nuevo si existe; si no, migra los campos de Varek y Boren. */
export function sideChainsFromSave(pr: Partial<ProgressSave>): Record<string, SideChainSave> {
  if (pr.sideChains) return { ...pr.sideChains };
  const out: Record<string, SideChainSave> = {};
  if (pr.bountyId) out.varek = { id: pr.bountyId, progress: pr.bountyProgress ?? 0 };
  if (pr.veilContractId) out.boren = { id: pr.veilContractId, progress: pr.veilContractProgress ?? 0 };
  return out;
}

export function inventoryRecordToEntries(record: Record<string, number>): [string, number][] {
  return Object.entries(record);
}

/** ProgressSave por defecto (personaje nuevo o save viejo sin la columna). */
export function emptyProgress(): ProgressSave {
  return {
    loginStreak: 0,
    lastLoginDay: "",
    dailyQuestId: "",
    dailyProgress: 0,
    dailyDone: false,
    totalKills: 0,
    bossKills: 0,
    title: "",
    achievements: [],
    bountyId: "",
    bountyProgress: 0,
    str: 0,
    agi: 0,
    vit: 0,
    ene: 0,
    statPoints: 0,
  };
}
