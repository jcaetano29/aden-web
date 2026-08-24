import { describe, it, expect } from "vitest";
import {
  dayKey,
  previousDay,
  streakReward,
  STREAK_REWARD_CAP_DAYS,
  STREAK_REWARD_PER_DAY,
  DAILY_QUESTS,
  dailyQuestForDay,
  getDailyQuest,
  ACHIEVEMENTS,
  getAchievement,
  isAchievementMet,
  newlyUnlocked,
  isValidTitle,
  type PlayerProgressStats,
} from "./retention.js";
import { MOB_TEMPLATES } from "./mobs.js";

describe("día / racha", () => {
  it("dayKey da YYYY-MM-DD y previousDay resta un día (cruza meses)", () => {
    expect(dayKey(new Date("2026-08-24T15:00:00Z"))).toBe("2026-08-24");
    expect(previousDay("2026-08-01")).toBe("2026-07-31");
    expect(previousDay("2026-01-01")).toBe("2025-12-31");
  });

  it("streakReward escala y topea", () => {
    expect(streakReward(1)).toBe(STREAK_REWARD_PER_DAY);
    expect(streakReward(3)).toBe(3 * STREAK_REWARD_PER_DAY);
    expect(streakReward(99)).toBe(STREAK_REWARD_CAP_DAYS * STREAK_REWARD_PER_DAY);
  });
});

describe("misión diaria", () => {
  it("dailyQuestForDay es determinística y válida", () => {
    const a = dailyQuestForDay("2026-08-24");
    const b = dailyQuestForDay("2026-08-24");
    expect(a).toEqual(b);
    expect(DAILY_QUESTS).toContainEqual(a);
  });

  it("cada diaria apunta a '' (cualquiera) o a un template válido", () => {
    for (const d of DAILY_QUESTS) {
      if (d.mobTemplateId !== "") expect(MOB_TEMPLATES[d.mobTemplateId]).toBeDefined();
      expect(d.amount).toBeGreaterThan(0);
    }
    expect(getDailyQuest(DAILY_QUESTS[0].id)).toEqual(DAILY_QUESTS[0]);
    expect(() => getDailyQuest("nope")).toThrow();
  });
});

describe("logros", () => {
  const stats = (o: Partial<PlayerProgressStats> = {}): PlayerProgressStats => ({
    level: 1, totalKills: 0, bossKills: 0, pvpKills: 0, hasLegendary: false, ...o,
  });

  it("isAchievementMet evalúa cada tipo de condición", () => {
    expect(isAchievementMet(getAchievement("first_blood"), stats({ totalKills: 1 }))).toBe(true);
    expect(isAchievementMet(getAchievement("adventurer"), stats({ level: 5 }))).toBe(true);
    expect(isAchievementMet(getAchievement("adventurer"), stats({ level: 4 }))).toBe(false);
    expect(isAchievementMet(getAchievement("kingslayer"), stats({ bossKills: 1 }))).toBe(true);
    expect(isAchievementMet(getAchievement("duelist"), stats({ pvpKills: 10 }))).toBe(true);
    expect(isAchievementMet(getAchievement("legend_gear"), stats({ hasLegendary: true }))).toBe(true);
  });

  it("newlyUnlocked devuelve sólo los recién cumplidos (no los ya desbloqueados)", () => {
    const s = stats({ totalKills: 1, level: 5 });
    const first = newlyUnlocked([], s).map((a) => a.id);
    expect(first).toContain("first_blood");
    expect(first).toContain("adventurer");
    const second = newlyUnlocked(["first_blood"], s).map((a) => a.id);
    expect(second).not.toContain("first_blood");
    expect(second).toContain("adventurer");
  });

  it("todo logro con título expone un título no vacío; isValidTitle lo reconoce", () => {
    for (const a of ACHIEVEMENTS) {
      if (a.title) expect(isValidTitle(a.title)).toBe(true);
    }
    expect(isValidTitle("")).toBe(true);
    expect(isValidTitle("ReyDelUniverso")).toBe(false);
  });
});
