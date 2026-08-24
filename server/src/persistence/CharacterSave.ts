/** Etapa 13: estado de retención (racha, diaria, logros) persistido como un solo blob. */
export interface ProgressSave {
  loginStreak: number;
  lastLoginDay: string;
  dailyQuestId: string;
  dailyProgress: number;
  dailyDone: boolean;
  totalKills: number;
  bossKills: number;
  title: string;
  achievements: string[];
}

export interface CharacterSave {
  level: number;
  exp: number;
  pos_x: number;
  pos_z: number;
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
  level: number;
  exp: number;
  x: number;
  z: number;
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
  loginStreak: number;
  lastLoginDay: string;
  dailyQuestId: string;
  dailyProgress: number;
  dailyDone: boolean;
  totalKills: number;
  bossKills: number;
  title: string;
  achievements: { forEach(cb: (v: string) => void): void };
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
  p.achievements.forEach((id) => achievements.push(id));

  return {
    level: p.level,
    exp: p.exp,
    pos_x: p.x,
    pos_z: p.z,
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
      loginStreak: p.loginStreak,
      lastLoginDay: p.lastLoginDay,
      dailyQuestId: p.dailyQuestId,
      dailyProgress: p.dailyProgress,
      dailyDone: p.dailyDone,
      totalKills: p.totalKills,
      bossKills: p.bossKills,
      title: p.title,
      achievements,
    },
  };
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
  };
}
