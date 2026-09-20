import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "./password.js";

describe("password", () => {
  it("hashPassword produce hash+salt y verifyPassword acepta la correcta", () => {
    const { hash, salt } = hashPassword("secreto123");
    expect(hash.length).toBeGreaterThan(0);
    expect(salt.length).toBeGreaterThan(0);
    expect(verifyPassword("secreto123", hash, salt)).toBe(true);
  });

  it("verifyPassword rechaza la contraseña incorrecta", () => {
    const { hash, salt } = hashPassword("secreto123");
    expect(verifyPassword("otra", hash, salt)).toBe(false);
  });

  it("dos hashes de la misma contraseña usan salts distintos", () => {
    const a = hashPassword("misma");
    const b = hashPassword("misma");
    expect(a.salt).not.toBe(b.salt);
    expect(a.hash).not.toBe(b.hash);
    expect(verifyPassword("misma", a.hash, a.salt)).toBe(true);
    expect(verifyPassword("misma", b.hash, b.salt)).toBe(true);
  });

  it("verifyPassword no explota con hash/salt vacíos o inválidos", () => {
    expect(verifyPassword("x", "", "")).toBe(false);
    expect(verifyPassword("x", "zz", "salt")).toBe(false);
  });
});
