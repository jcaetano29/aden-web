export const EXP_BASE = 100;
export const EXP_POW = 1.5;

export function expToNextLevel(level: number): number {
  return Math.round(EXP_BASE * Math.pow(level, EXP_POW));
}

export const LEVEL_GROWTH = { hp: 20, mp: 5, pAtk: 3, pDef: 2 } as const;

export const MOB_EXP: Record<string, number> = {
  skeleton_minion: 15,
  skeleton_warrior: 40,
};
export function getMobExp(templateId: string): number {
  return MOB_EXP[templateId] ?? 0;
}

export interface Leveled {
  exp: number;
  level: number;
  maxHp: number;
  maxMp: number;
  pAtk: number;
  pDef: number;
  hp: number;
  mp: number;
}

export function gainExp(p: Leveled, amount: number): number {
  p.exp += amount;
  let gained = 0;
  while (p.exp >= expToNextLevel(p.level)) {
    p.exp -= expToNextLevel(p.level);
    p.level += 1;
    p.maxHp += LEVEL_GROWTH.hp;
    p.maxMp += LEVEL_GROWTH.mp;
    p.pAtk += LEVEL_GROWTH.pAtk;
    p.pDef += LEVEL_GROWTH.pDef;
    gained += 1;
  }
  if (gained > 0) {
    p.hp = p.maxHp;
    p.mp = p.maxMp;
  }
  return gained;
}
