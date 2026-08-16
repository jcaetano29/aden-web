export function selectClip(available: string[], desired: "idle" | "walk"): string | null {
  if (available.length === 0) return null;
  const subs = desired === "walk" ? ["walk", "run", "jog"] : ["idle", "wait", "stand"];
  for (const sub of subs) {
    const matches = available.filter((n) => n.toLowerCase().includes(sub));
    if (matches.length > 0) {
      // preferir el nombre más corto: la variante base/neutra (p.ej. "Idle" sobre "2H_Melee_Idle")
      return matches.reduce((a, b) => (b.length < a.length ? b : a));
    }
  }
  return available[0];
}
