import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/**
 * Hash de contraseñas para las cuentas (Etapa 21). Usa scrypt de node:crypto
 * (sin dependencias): salt aleatorio por cuenta + derivación de 64 bytes, y
 * comparación en tiempo constante para no filtrar información por timing.
 * NUNCA se guarda ni loguea la contraseña en claro.
 */

const KEYLEN = 64;

export interface PasswordHash {
  hash: string; // hex
  salt: string; // hex
}

export function hashPassword(password: string): PasswordHash {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, KEYLEN).toString("hex");
  return { hash, salt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  if (!hash || !salt) return false;
  let expected: Buffer;
  try {
    expected = Buffer.from(hash, "hex");
  } catch {
    return false;
  }
  if (expected.length !== KEYLEN) return false;
  const actual = scryptSync(password, salt, KEYLEN);
  return timingSafeEqual(expected, actual);
}
