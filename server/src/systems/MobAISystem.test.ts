import { describe, it, expect } from "vitest";
import { stepMobAI, type AIMob } from "./MobAISystem.js";
import { AI_CONFIG } from "@aden/shared";

function mob(over: Partial<AIMob> = {}): AIMob {
  return {
    x: 0, z: 0, targetX: 0, targetZ: 0, moving: false, aiState: "wander",
    homeX: 0, homeZ: 0, wanderCooldownMs: 0, aggroTargetId: "", ...over,
  };
}

describe("stepMobAI — aggro", () => {
  it("entra en chase y apunta al jugador dentro de aggroRadius", () => {
    const m = mob();
    stepMobAI(m, [{ id: "p1", x: 3, z: 0 }], AI_CONFIG, () => 0.5, 16);
    expect(m.aiState).toBe("chase");
    expect(m.aggroTargetId).toBe("p1");
    expect(m.targetX).toBeCloseTo(3);
    expect(m.moving).toBe(true);
  });

  it("ignora jugadores fuera de aggroRadius", () => {
    const m = mob();
    stepMobAI(m, [{ id: "p1", x: 100, z: 0 }], AI_CONFIG, () => 0.5, 16);
    expect(m.aiState).toBe("wander");
    expect(m.aggroTargetId).toBe("");
  });
});

describe("stepMobAI — leash", () => {
  it("suelta aggro y vuelve al home si el mob supera leashRadius del home", () => {
    const m = mob({ aiState: "chase", aggroTargetId: "p1", x: AI_CONFIG.leashRadius + 5, z: 0, homeX: 0, homeZ: 0 });
    stepMobAI(m, [{ id: "p1", x: AI_CONFIG.leashRadius + 6, z: 0 }], AI_CONFIG, () => 0.5, 16);
    expect(m.aiState).toBe("wander");
    expect(m.aggroTargetId).toBe("");
    expect(m.targetX).toBeCloseTo(0); // home
  });

  it("suelta aggro si el jugador desaparece", () => {
    const m = mob({ aiState: "chase", aggroTargetId: "p1", x: 2, z: 0 });
    stepMobAI(m, [], AI_CONFIG, () => 0.5, 16);
    expect(m.aiState).toBe("wander");
    expect(m.aggroTargetId).toBe("");
  });
});

describe("stepMobAI — wander", () => {
  it("tras el cooldown elige un nuevo target dentro de wanderRadius del home", () => {
    const m = mob({ moving: false, wanderCooldownMs: 0, homeX: 10, homeZ: 10, x: 10, z: 10 });
    stepMobAI(m, [], AI_CONFIG, () => 0.5, 16);
    expect(m.moving).toBe(true);
    const dx = m.targetX - 10, dz = m.targetZ - 10;
    expect(Math.sqrt(dx * dx + dz * dz)).toBeLessThanOrEqual(AI_CONFIG.wanderRadius + 1e-9);
    expect(m.wanderCooldownMs).toBeGreaterThan(0);
  });

  it("mientras el cooldown corre, descuenta dtMs y no se mueve", () => {
    const m = mob({ moving: false, wanderCooldownMs: 1000, homeX: 0, homeZ: 0 });
    stepMobAI(m, [], AI_CONFIG, () => 0.5, 16);
    expect(m.wanderCooldownMs).toBeCloseTo(984);
    expect(m.moving).toBe(false);
  });
});
