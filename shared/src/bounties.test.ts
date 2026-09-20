import { describe, it, expect } from "vitest";
import { BOUNTIES, BOUNTY_ORDER, getBounty, firstBountyId, nextBountyId } from "./bounties.js";

describe("bounties", () => {
  it("getBounty devuelve el contrato y lanza para uno desconocido", () => {
    expect(getBounty("b_forest").mobTemplateId).toBe("skeleton_minion");
    expect(() => getBounty("nope")).toThrow();
  });

  it("firstBountyId es el primero del orden", () => {
    expect(firstBountyId()).toBe(BOUNTY_ORDER[0]);
  });

  it("nextBountyId rota en bucle (el último vuelve al primero)", () => {
    const last = BOUNTY_ORDER[BOUNTY_ORDER.length - 1];
    expect(nextBountyId(last)).toBe(BOUNTY_ORDER[0]);
    expect(nextBountyId(BOUNTY_ORDER[0])).toBe(BOUNTY_ORDER[1]);
  });

  it("nextBountyId de un id desconocido cae al primero", () => {
    expect(nextBountyId("nope")).toBe(BOUNTY_ORDER[0]);
  });

  it("todos los contratos del orden existen en el catálogo y tienen recompensa", () => {
    for (const id of BOUNTY_ORDER) {
      const b = BOUNTIES[id];
      expect(b).toBeDefined();
      expect(b.amount).toBeGreaterThan(0);
      expect(b.rewardExp).toBeGreaterThan(0);
      expect(b.rewardGold).toBeGreaterThan(0);
    }
  });
});
