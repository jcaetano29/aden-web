import { describe, it, expect } from "vitest";
import { getQuest, firstQuestId, nextQuestId, QUEST_ORDER } from "./quests.js";

describe("getQuest", () => {
  it("retorna la quest q1 con valores correctos", () => {
    const q = getQuest("q1");
    expect(q.id).toBe("q1");
    expect(q.title).toBe("Limpieza de esqueletos");
    expect(q.mobTemplateId).toBe("skeleton_minion");
    expect(q.amount).toBe(5);
    expect(q.rewardExp).toBe(50);
    expect(q.rewardGold).toBe(20);
  });

  it("retorna la quest q2 con valores correctos", () => {
    const q = getQuest("q2");
    expect(q.id).toBe("q2");
    expect(q.title).toBe("Purga de las ruinas");
    expect(q.mobTemplateId).toBe("skeleton_minion");
    expect(q.amount).toBe(8);
    expect(q.rewardExp).toBe(80);
    expect(q.rewardGold).toBe(40);
  });

  it("retorna la quest q3 con valores correctos", () => {
    const q = getQuest("q3");
    expect(q.id).toBe("q3");
    expect(q.title).toBe("Cazador de guerreros");
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

  it("retorna q1 cuando la quest actual es q3 (loop)", () => {
    expect(nextQuestId("q3")).toBe("q1");
  });

  it("retorna q1 cuando la quest actual no existe (fallback)", () => {
    expect(nextQuestId("xxx")).toBe("q1");
  });
});

describe("QUEST_ORDER", () => {
  it("contiene las quests en orden correcto", () => {
    expect(QUEST_ORDER).toEqual(["q1", "q2", "q3"]);
  });
});
