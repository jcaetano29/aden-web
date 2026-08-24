// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { ZoneBanner } from "./ZoneBanner.js";

describe("ZoneBanner", () => {
  it("no anuncia la zona de spawn (primer setZone) pero sí el primer cruce", () => {
    const banner = new ZoneBanner();
    banner.mount(document.body);
    // La zona inicial (spawn) no dispara cartel.
    banner.setZone("pueblo");
    // Cruzar al bosque sí lo dispara: título = nombre de la zona.
    banner.setZone("bosque");
    expect(document.body.textContent).toContain("Bosque de Umbra");
    expect(document.body.textContent).toContain("Nivel recomendado 1–3");
  });

  it("re-setear la misma zona no re-dispara (idempotente)", () => {
    const banner = new ZoneBanner();
    banner.mount(document.body);
    banner.setZone("pueblo");
    banner.setZone("ruinas");
    const before = document.body.textContent;
    banner.setZone("ruinas");
    expect(document.body.textContent).toBe(before);
  });
});
