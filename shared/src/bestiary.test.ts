import { describe, it, expect } from "vitest";
import { MOB_TEMPLATES, SPAWN_ZONES } from "./mobs.js";
import { getMobCombat } from "./combat.js";
import { getMobExp } from "./progression.js";
import { rollDrops } from "./items.js";
import { getZone } from "./world.js";

describe("expanded bestiary", () => {
  const additions = ["umbra_orc", "forest_troll", "crypt_wraith", "bone_warden", "infernal_demon", "ancient_drake"];
  it("gives all six new enemies models, combat stats, XP, loot and real spawn locations", () => {
    for (const id of additions) {
      expect(MOB_TEMPLATES[id]?.model).toBeTruthy();
      expect(getMobCombat(id).maxHp).toBeGreaterThan(0);
      expect(getMobExp(id)).toBeGreaterThan(0);
      expect(rollDrops(id,()=>0).length).toBeGreaterThan(0);
      expect(SPAWN_ZONES.some(s=>s.templateId===id)).toBe(true);
    }
    expect(new Set(Object.values(MOB_TEMPLATES).map(t=>t.model)).size).toBeGreaterThanOrEqual(8);
  });
  it("keeps new spawn circles inside their maps and away from arrivals", () => {
    for (const s of SPAWN_ZONES.filter(s=>additions.includes(s.templateId))) {
      const zone=getZone(s.mapId);
      expect(s.centerX-s.radius).toBeGreaterThan(zone.bounds.minX);
      expect(s.centerX+s.radius).toBeLessThan(zone.bounds.maxX);
      expect(s.centerZ-s.radius).toBeGreaterThan(zone.bounds.minZ);
      expect(s.centerZ+s.radius).toBeLessThan(zone.bounds.maxZ);
      expect(Math.hypot(s.centerX-zone.spawn.x,s.centerZ-zone.spawn.z)-s.radius).toBeGreaterThan(10);
    }
  });
});
