import { describe, it, expect } from "vitest";
import { getQuest, firstQuestId, nextQuestId, QUEST_ORDER, QUESTS } from "./quests.js";
import { MOB_TEMPLATES } from "./mobs.js";
import { LORE, ELDER_NAME } from "./story.js";

describe("getQuest", () => {
  it("retorna la quest q1 con valores correctos (Bosque)", () => {
    const q = getQuest("q1");
    expect(q.id).toBe("q1");
    expect(q.title).toBe("Los primeros huesos");
    expect(q.mobTemplateId).toBe("skeleton_minion");
    expect(q.amount).toBe(6);
    expect(q.rewardExp).toBe(60);
    expect(q.rewardGold).toBe(25);
  });

  it("retorna la quest q3 con valores correctos (Ruinas)", () => {
    const q = getQuest("q3");
    expect(q.id).toBe("q3");
    expect(q.title).toBe("Bajo las Ruinas");
    expect(q.mobTemplateId).toBe("crypt_warrior");
    expect(q.amount).toBe(6);
  });

  it("retorna la quest q4 apuntando al mini-jefe (Centinela)", () => {
    const q = getQuest("q4");
    expect(q.title).toBe("El Centinela de Nihil");
    expect(q.mobTemplateId).toBe("crypt_sentinel");
    expect(q.amount).toBe(1);
  });

  it("lanza si la quest no existe", () => {
    expect(() => getQuest("nope")).toThrow();
  });
});

describe("firstQuestId", () => {
  it("retorna q1", () => {
    expect(firstQuestId()).toBe("q1");
  });
});

describe("nextQuestId", () => {
  it("avanza en cadena q1→q2→...→q6", () => {
    expect(nextQuestId("q1")).toBe("q2");
    expect(nextQuestId("q2")).toBe("q3");
    expect(nextQuestId("q3")).toBe("q4");
    expect(nextQuestId("q4")).toBe("q5");
    expect(nextQuestId("q5")).toBe("q6");
  });

  it("retorna q1 cuando la quest actual es q6 (loop)", () => {
    expect(nextQuestId("q6")).toBe("q1");
  });

  it("retorna q1 cuando la quest actual no existe (fallback)", () => {
    expect(nextQuestId("xxx")).toBe("q1");
  });
});

describe("QUEST_ORDER", () => {
  it("contiene las 6 quests en orden correcto", () => {
    expect(QUEST_ORDER).toEqual(["q1", "q2", "q3", "q4", "q5", "q6"]);
  });
});

describe("getQuest q6", () => {
  it("retorna la quest final con valores correctos (Rey Nihil)", () => {
    const q = getQuest("q6");
    expect(q.id).toBe("q6");
    expect(q.title).toBe("El Rey Nihil");
    expect(q.mobTemplateId).toBe("skeleton_king");
    expect(q.amount).toBe(1);
    expect(q.rewardExp).toBe(1500);
    expect(q.rewardGold).toBe(800);
  });
});

describe("Quest narrative fields", () => {
  it("todas las quests tienen intro y done no vacíos", () => {
    QUEST_ORDER.forEach((questId) => {
      const q = getQuest(questId);
      expect(q.intro).toBeDefined();
      expect(q.intro.length).toBeGreaterThan(0);
      expect(q.done).toBeDefined();
      expect(q.done.length).toBeGreaterThan(0);
    });
  });

  it("cada quest apunta a un template de mob válido", () => {
    QUEST_ORDER.forEach((questId) => {
      expect(MOB_TEMPLATES[getQuest(questId).mobTemplateId]).toBeDefined();
    });
  });

  it("las recompensas crecen con el avance de la cadena", () => {
    for (let i = 1; i < QUEST_ORDER.length; i++) {
      const prev = QUESTS[QUEST_ORDER[i - 1]];
      const cur = QUESTS[QUEST_ORDER[i]];
      expect(cur.rewardExp).toBeGreaterThan(prev.rewardExp);
      expect(cur.rewardGold).toBeGreaterThan(prev.rewardGold);
    }
  });
});

describe("Story (LORE and ELDER_NAME)", () => {
  it("LORE.title es 'El Asedio de Aden'", () => {
    expect(LORE.title).toBe("El Asedio de Aden");
  });

  it("LORE.body no está vacío", () => {
    expect(LORE.body).toBeDefined();
    expect(LORE.body.length).toBeGreaterThan(0);
  });

  it("ELDER_NAME es 'Anciano Rowan'", () => {
    expect(ELDER_NAME).toBe("Anciano Rowan");
  });
});
