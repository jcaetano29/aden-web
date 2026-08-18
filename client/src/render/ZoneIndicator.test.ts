// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { ZoneIndicator } from "./ZoneIndicator.js";

describe("ZoneIndicator", () => {
  it("muestra 'Zona segura' cuando no está en PvP", () => {
    const zi = new ZoneIndicator();
    zi.update(false);
    expect(zi.el.textContent).toContain("segura");
  });
  it("muestra 'Zona PvP' cuando está en zona PvP", () => {
    const zi = new ZoneIndicator();
    zi.update(true);
    expect(zi.el.textContent).toContain("PvP");
  });
});
