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
}

export function toCharacterSave(p: Persistable): CharacterSave {
  const inventory: Record<string, number> = {};
  p.inventory.forEach((v, k) => {
    inventory[k] = v.qty;
  });

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
  };
}

export function inventoryRecordToEntries(record: Record<string, number>): [string, number][] {
  return Object.entries(record);
}
