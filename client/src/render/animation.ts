export function selectClip(available: string[], desired: "idle" | "walk"): string | null {
  if (available.length === 0) return null;
  const lower = available.map((n) => n.toLowerCase());
  const findBy = (subs: string[]): string | null => {
    for (const sub of subs) {
      const i = lower.findIndex((n) => n.includes(sub));
      if (i !== -1) return available[i];
    }
    return null;
  };
  if (desired === "walk") return findBy(["walk", "run", "jog"]) ?? available[0];
  return findBy(["idle", "wait", "stand"]) ?? available[0];
}
