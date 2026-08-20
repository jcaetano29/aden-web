import { describe, it, expect } from "vitest";
import { isValidGuildTag, isValidGuildName } from "./guilds.js";

describe("isValidGuildTag", () => {
  it("acepta 2–4 alfanuméricos en mayúscula", () => {
    expect(isValidGuildTag("AB")).toBe(true);
    expect(isValidGuildTag("WOLF")).toBe(true);
    expect(isValidGuildTag("X9")).toBe(true);
  });
  it("rechaza vacío, muy corto, muy largo, o con símbolos/minúsculas", () => {
    expect(isValidGuildTag("")).toBe(false);
    expect(isValidGuildTag("A")).toBe(false);
    expect(isValidGuildTag("TOOLONG")).toBe(false);
    expect(isValidGuildTag("ab")).toBe(false);      // minúsculas
    expect(isValidGuildTag("A-B")).toBe(false);      // símbolo
  });
});

describe("isValidGuildName", () => {
  it("acepta 1–24 chars tras trim", () => {
    expect(isValidGuildName("Los Lobos")).toBe(true);
    expect(isValidGuildName("x")).toBe(true);
  });
  it("rechaza vacío/espacios o >24", () => {
    expect(isValidGuildName("   ")).toBe(false);
    expect(isValidGuildName("a".repeat(25))).toBe(false);
  });
});
