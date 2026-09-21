import { describe, it, expect } from "vitest";
import { MODEL_HEIGHTS, MODEL_NAMES, modelUrl, pickModelForSession, MOB_MODEL_NAMES, modelForTemplate, modelForClass } from "./manifest.js";

describe("modelUrl", () => {
  it.each([['knight', 'Knight'], ['mage', 'Mage'], ['barbarian', 'Barbarian'], ['rogue', 'Rogue'], ['ranger', 'Ranger']])("resuelve ambas apariencias de %s con recursos precargados", (id, base) => {
    expect(modelForClass(id, 'male')).toBe(base);
    expect(modelForClass(id, 'female')).toBe(`${base}_Female`);
    expect(MODEL_NAMES).toContain(modelForClass(id, 'female'));
    expect(modelUrl(`${base}_Female`)).toBe(`/models/${base === 'Ranger' ? 'Rogue' : base}.glb`);
    expect(modelForClass(id)).toBe(base);
  });
  it("resuelve la ruta pública del GLB", () => {
    expect(modelUrl("Knight")).toBe("/models/Knight.glb");
  });

  it("reutiliza el GLB de Rogue para el modelo lógico Ranger", () => {
    expect(MODEL_NAMES).toContain("Ranger");
    expect(modelUrl("Ranger")).toBe("/models/Rogue.glb");
    expect(MODEL_HEIGHTS.Ranger).toBe(2.4);
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
    expect(MOB_MODEL_NAMES).toContain("DreadStalker");
    expect(MOB_MODEL_NAMES).toContain("DreadKnight");
  });
  it("modelForTemplate mapea el templateId a su modelo", () => {
    expect(modelForTemplate("skeleton_minion")).toBe("DreadStalker");
    expect(modelForTemplate("skeleton_warrior")).toBe("DreadKnight");
  });
});
