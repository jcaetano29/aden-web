import { describe, it, expect } from "vitest";
import { MODEL_NAMES, modelUrl, pickModelForSession, MOB_MODEL_NAMES, modelForTemplate } from "./manifest.js";

describe("modelUrl", () => {
  it("resuelve la ruta pública del GLB", () => {
    expect(modelUrl("Knight")).toBe("/models/Knight.glb");
  });
});

describe("pickModelForSession", () => {
  it("es determinístico para el mismo sessionId", () => {
    const a = pickModelForSession("abc123", MODEL_NAMES);
    const b = pickModelForSession("abc123", MODEL_NAMES);
    expect(a).toBe(b);
  });

  it("siempre devuelve un modelo de la lista", () => {
    for (const id of ["x", "player-1", "ZZZ", "9"]) {
      expect(MODEL_NAMES).toContain(pickModelForSession(id, MODEL_NAMES));
    }
  });

  it("distribuye entre los modelos disponibles (no siempre el mismo)", () => {
    const seen = new Set(
      ["a", "b", "c", "d", "e", "f", "g", "h"].map((id) => pickModelForSession(id, MODEL_NAMES)),
    );
    expect(seen.size).toBeGreaterThan(1);
  });

  it("lanza error si la lista de modelos está vacía", () => {
    expect(() => pickModelForSession("abc", [])).toThrow();
  });
});

describe("mobs", () => {
  it("MOB_MODEL_NAMES incluye los esqueletos", () => {
    expect(MOB_MODEL_NAMES).toContain("Skeleton_Minion");
    expect(MOB_MODEL_NAMES).toContain("Skeleton_Warrior");
  });
  it("modelForTemplate mapea el templateId a su modelo", () => {
    expect(modelForTemplate("skeleton_minion")).toBe("Skeleton_Minion");
    expect(modelForTemplate("skeleton_warrior")).toBe("Skeleton_Warrior");
  });
});
