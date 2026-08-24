/**
 * Sistemas de retención (Etapa 13): lo que da razones para volver mañana y metas
 * de largo plazo. Tres piezas puras y testeables:
 *  - Racha de login (streak) + recompensa diaria por entrar.
 *  - Misión diaria rotativa (determinística por día).
 *  - Logros con títulos que se muestran en el nameplate.
 * El server aplica/persiste; este módulo sólo define catálogos y lógica pura.
 */

/** Clave de día en UTC (YYYY-MM-DD). Se pasa el Date para poder testear. */
export function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** El día anterior a `day` (YYYY-MM-DD) — para detectar rachas consecutivas. */
export function previousDay(day: string): string {
  const d = new Date(`${day}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return dayKey(d);
}

// ── Racha de login ──────────────────────────────────────────────────────────
export const STREAK_REWARD_PER_DAY = 20;
export const STREAK_REWARD_CAP_DAYS = 7;

/** Oro por entrar en un día nuevo, escala con la racha hasta un tope. */
export function streakReward(streak: number): number {
  return Math.min(Math.max(streak, 1), STREAK_REWARD_CAP_DAYS) * STREAK_REWARD_PER_DAY;
}

// ── Misión diaria ───────────────────────────────────────────────────────────
export interface DailyQuest {
  id: string;
  desc: string;
  /** "" = cualquier enemigo cuenta; si no, sólo ese templateId. */
  mobTemplateId: string;
  amount: number;
  rewardGold: number;
  rewardExp: number;
}

export const DAILY_QUESTS: DailyQuest[] = [
  { id: "d_hunt", desc: "Caza del día: derrotá 12 enemigos", mobTemplateId: "", amount: 12, rewardGold: 70, rewardExp: 140 },
  { id: "d_forest", desc: "Patrulla del Bosque: derrotá 10 Guerreros Musgosos", mobTemplateId: "skeleton_warrior", amount: 10, rewardGold: 80, rewardExp: 180 },
  { id: "d_crypt", desc: "Purga en las Ruinas: derrotá 8 Guardianes de la Cripta", mobTemplateId: "crypt_warrior", amount: 8, rewardGold: 140, rewardExp: 340 },
  { id: "d_ash", desc: "Fuego contra fuego: derrotá 6 Verdugos Ardientes", mobTemplateId: "ash_warrior", amount: 6, rewardGold: 200, rewardExp: 500 },
];

export function getDailyQuest(id: string): DailyQuest {
  const q = DAILY_QUESTS.find((d) => d.id === id);
  if (!q) throw new Error(`getDailyQuest: diaria desconocida ${id}`);
  return q;
}

/** Elige la misión diaria de un día de forma determinística (todos ven la misma). */
export function dailyQuestForDay(day: string): DailyQuest {
  let h = 0;
  for (let i = 0; i < day.length; i++) h = (h * 31 + day.charCodeAt(i)) >>> 0;
  return DAILY_QUESTS[h % DAILY_QUESTS.length];
}

// ── Logros y títulos ────────────────────────────────────────────────────────
export type AchievementKind = "level" | "kills" | "boss" | "pvp" | "legendary";

export interface Achievement {
  id: string;
  name: string;
  desc: string;
  kind: AchievementKind;
  threshold: number;
  /** Título que otorga (se puede lucir en el nameplate). "" = no da título. */
  title: string;
  rewardGold: number;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: "first_blood", name: "Primera Sangre", desc: "Derrotá a tu primer enemigo", kind: "kills", threshold: 1, title: "Novato", rewardGold: 0 },
  { id: "adventurer", name: "Aventurero", desc: "Alcanzá el nivel 5", kind: "level", threshold: 5, title: "Aventurero", rewardGold: 50 },
  { id: "hunter", name: "Cazador", desc: "Derrotá 100 enemigos", kind: "kills", threshold: 100, title: "Cazador", rewardGold: 100 },
  { id: "veteran", name: "Veterano", desc: "Alcanzá el nivel 10", kind: "level", threshold: 10, title: "Veterano", rewardGold: 150 },
  { id: "duelist", name: "Duelista", desc: "Conseguí 10 bajas en PvP", kind: "pvp", threshold: 10, title: "Duelista", rewardGold: 100 },
  { id: "legend_gear", name: "Portador de Leyendas", desc: "Conseguí un objeto legendario", kind: "legendary", threshold: 1, title: "Legendario", rewardGold: 200 },
  { id: "kingslayer", name: "Matarreyes", desc: "Abatí al Rey Nihil", kind: "boss", threshold: 1, title: "Matarreyes", rewardGold: 500 },
  { id: "exterminator", name: "Exterminador", desc: "Derrotá 500 enemigos", kind: "kills", threshold: 500, title: "Exterminador", rewardGold: 500 },
];

export function getAchievement(id: string): Achievement {
  const a = ACHIEVEMENTS.find((x) => x.id === id);
  if (!a) throw new Error(`getAchievement: logro desconocido ${id}`);
  return a;
}

/** Stats del jugador contra los que se evalúan los logros. */
export interface PlayerProgressStats {
  level: number;
  totalKills: number;
  bossKills: number;
  pvpKills: number;
  hasLegendary: boolean;
}

export function isAchievementMet(a: Achievement, s: PlayerProgressStats): boolean {
  switch (a.kind) {
    case "level": return s.level >= a.threshold;
    case "kills": return s.totalKills >= a.threshold;
    case "boss": return s.bossKills >= a.threshold;
    case "pvp": return s.pvpKills >= a.threshold;
    case "legendary": return s.hasLegendary;
  }
}

/** Logros recién cumplidos (cumplen la condición y no están todavía en `unlocked`). */
export function newlyUnlocked(unlocked: readonly string[], s: PlayerProgressStats): Achievement[] {
  const have = new Set(unlocked);
  return ACHIEVEMENTS.filter((a) => !have.has(a.id) && isAchievementMet(a, s));
}

/** ¿Es `title` un título que otorga alguno de los logros? (para validar SetTitle). */
export function isValidTitle(title: string): boolean {
  return title === "" || ACHIEVEMENTS.some((a) => a.title === title);
}
