import { describe, it, expect } from "vitest";
import { getQuest, firstQuestId, nextQuestId, QUEST_ORDER, QUESTS } from "./quests.js";
import { LORE, ELDER_NAME } from "./story.js";

describe("getQuest", () => {
  it("retorna la quest q1 con valores correctos", () => {
    const q = getQuest("q1");
    expect(q.id).toBe("q1");
    expect(q.title).toBe("Los primeros huesos");
    expect(q.mobTemplateId).toBe("skeleton_minion");
    expect(q.amount).toBe(5);
    expect(q.rewardExp).toBe(50);
    expect(q.rewardGold).toBe(20);
  });

  it("retorna la quest q2 con valores correctos", () => {
    const q = getQuest("q2");
    expect(q.id).toBe("q2");
    expect(q.title).toBe("La marea crece");
    expect(q.mobTemplateId).toBe("skeleton_minion");
    expect(q.amount).toBe(8);
    expect(q.rewardExp).toBe(80);
    expect(q.rewardGold).toBe(40);
  });

  it("retorna la quest q3 con valores correctos", () => {
    const q = getQuest("q3");
    expect(q.id).toBe("q3");
    expect(q.title).toBe("Los guerreros caídos");
    expect(q.mobTemplateId).toBe("skeleton_warrior");
    expect(q.amount).toBe(5);
    expect(q.rewardExp).toBe(150);
    expect(q.rewardGold).toBe(80);
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
  it("retorna q2 cuando la quest actual es q1", () => {
    expect(nextQuestId("q1")).toBe("q2");
  });

  it("retorna q3 cuando la quest actual es q2", () => {
    expect(nextQuestId("q2")).toBe("q3");
  });

  it("retorna q4 cuando la quest actual es q3", () => {
    expect(nextQuestId("q3")).toBe("q4");
  });

  it("retorna q1 cuando la quest actual es q4 (loop)", () => {
    expect(nextQuestId("q4")).toBe("q1");
  });

  it("retorna q1 cuando la quest actual no existe (fallback)", () => {
    expect(nextQuestId("xxx")).toBe("q1");
  });
});

describe("QUEST_ORDER", () => {
  it("contiene las quests en orden correcto", () => {
    expect(QUEST_ORDER).toEqual(["q1", "q2", "q3", "q4"]);
  });
});

describe("getQuest q4", () => {
  it("retorna la quest q4 con valores correctos (Rey Esqueleto)", () => {
    const q = getQuest("q4");
    expect(q.id).toBe("q4");
    expect(q.title).toBe("El Rey Esqueleto");
    expect(q.mobTemplateId).toBe("skeleton_king");
    expect(q.amount).toBe(1);
    expect(q.rewardExp).toBe(400);
    expect(q.rewardGold).toBe(200);
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

  it("getQuest('q1').title es 'Los primeros huesos'", () => {
    expect(getQuest("q1").title).toBe("Los primeros huesos");
  });

  it("getQuest('q4').title es 'El Rey Esqueleto'", () => {
    expect(getQuest("q4").title).toBe("El Rey Esqueleto");
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
