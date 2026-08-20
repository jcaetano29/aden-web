export const GUILD_TAG_MIN = 2;
export const GUILD_TAG_MAX = 4;
export const GUILD_NAME_MAX = 24;

const TAG_RE = /^[A-Z0-9]{2,4}$/;

/** Tag de guild: 2–4 caracteres, solo A–Z y 0–9 (ya en mayúsculas). */
export function isValidGuildTag(tag: string): boolean {
  return TAG_RE.test(tag);
}

/** Nombre de guild: 1–24 caracteres tras trim, no vacío. */
export function isValidGuildName(name: string): boolean {
  const t = name.trim();
  return t.length >= 1 && t.length <= GUILD_NAME_MAX;
}
