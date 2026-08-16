export type ClipKind = "idle" | "walk" | "attack" | "hit" | "death";

interface ClipRule {
  include: string[];
  exclude?: string[];
}

// Reglas de selección por substring (case-insensitive) sobre el pool de 90+ clips
// de los personajes KayKit. Cada kind prueba sus reglas en orden hasta encontrar
// matches; dentro de los matches se prefiere el nombre más corto (variante base,
// p.ej. "Idle" sobre "2H_Melee_Idle", "Death_A" sobre "Death_A_Pose").
const RULES: Record<ClipKind, ClipRule[]> = {
  idle: [{ include: ["idle"] }, { include: ["wait"] }, { include: ["stand"] }],
  walk: [{ include: ["walk"] }, { include: ["run"] }, { include: ["jog"] }],
  // "block" se excluye para no resolver a "Block_Attack" (pose defensiva) en vez
  // de un golpe real.
  attack: [
    { include: ["melee_attack"], exclude: ["block"] },
    { include: ["attack"], exclude: ["block"] },
  ],
  // "Block_Hit" es una reacción de bloqueo, no un golpe recibido; se prefieren
  // "Hit_A"/"Hit_B".
  hit: [{ include: ["hit"], exclude: ["block"] }, { include: ["hit"] }],
  // "_Pose" son fotogramas estáticos (pose final sostenida) y "_Resurrect" es la
  // animación de reanimación, no la caída; se excluyen para quedarse con la
  // animación de muerte real (p.ej. "Death_A").
  death: [
    { include: ["death"], exclude: ["pose", "resurrect"] },
    { include: ["death"] },
  ],
};

/**
 * Resuelve el nombre de clip a reproducir para un `kind` dado, por coincidencia
 * de substring sobre `available` (nombres de clips del modelo cargado).
 * - "idle"/"walk": si ninguna regla matchea, cae a `available[0]` (siempre se
 *   necesita alguna animación de base).
 * - "attack"/"hit"/"death": si ninguna regla matchea, devuelve `null` (no-op
 *   gracioso — el llamador debe evitar reproducir nada).
 */
export function selectClip(available: string[], desired: ClipKind): string | null {
  if (available.length === 0) return null;
  for (const rule of RULES[desired]) {
    const matches = available.filter((n) => {
      const lower = n.toLowerCase();
      if (!rule.include.some((s) => lower.includes(s))) return false;
      if (rule.exclude?.some((s) => lower.includes(s))) return false;
      return true;
    });
    if (matches.length > 0) {
      return matches.reduce((a, b) => (b.length < a.length ? b : a));
    }
  }
  return desired === "idle" || desired === "walk" ? available[0] : null;
}
