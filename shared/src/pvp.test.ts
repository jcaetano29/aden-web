import { describe, it, expect } from "vitest";
import { applyPvpDeathPenalty, PVP_GOLD_LOSS_PCT, PVP_EXP_LOSS_PCT } from "./pvp.js";
import { expToNextLevel } from "./progression.js";

describe("applyPvpDeathPenalty", () => {
  it("descuenta 10% del oro (floor)", () => {
    expect(applyPvpDeathPenalty(105, 0, 1).gold).toBe(94); // floor(105*0.9)=94
  });

  it("descuenta 5% de la exp del nivel actual (floor), sin bajar de 0", () => {
    const lvl = 5;
    const band = expToNextLevel(lvl);
    const exp = Math.floor(band * 0.5);
    const loss = Math.floor(band * PVP_EXP_LOSS_PCT);
    expect(applyPvpDeathPenalty(0, exp, lvl).exp).toBe(exp - loss);
  });

  it("nunca deja la exp negativa (no delevel)", () => {
    expect(applyPvpDeathPenalty(0, 3, 1).exp).toBe(0);
  });

  it("con 0 oro y 0 exp queda en 0/0", () => {
    expect(applyPvpDeathPenalty(0, 0, 3)).toEqual({ gold: 0, exp: 0 });
  });

  it("las constantes tienen los valores del spec", () => {
    expect(PVP_GOLD_LOSS_PCT).toBe(0.10);
    expect(PVP_EXP_LOSS_PCT).toBe(0.05);
  });
});
