import { describe, expect, it } from "vitest";
import { CATALOG_ITEMS } from "./catalog.js";

const SOURCE_IDS = `
kris short_sword rapier sword_of_assassin blade gladius falchion serpent_sword
sword_of_salamander light_saber legendary_sword heliacal_sword double_blade
lightning_sword giant_sword crystal_sword small_axe hand_axe double_axe tomahawk
elven_axe battle_axe nikkea_axe larkan_axe crescent_axe chaos_dragon_axe mace
morning_star flail great_hammer crystal_morning_star light_spear spear dragon_lance
giant_trident serpent_spear double_poleaxe halberd berdysh great_scythe bill_of_balrog
short_bow bow elven_bow battle_bow tiger_bow silver_bow chaos_nature_bow crossbow
golden_crossbow arquebus light_crossbow serpent_crossbow bluewing_crossbow
aquagold_crossbow skull_staff angelic_staff serpent_staff thunder_staff gorgon_staff
legendary_staff staff_of_resurrection chaos_lightning_staff small_shield buckler
horn_shield kite_shield elven_shield skull_shield large_round_shield spiked_shield
plate_shield serpent_shield tower_shield dragon_slayer_shield legendary_shield
crimson_glory salamander_shield leather_helm leather_armor leather_pants leather_gloves
leather_boots bronze_helm bronze_armor bronze_pants bronze_gloves bronze_boots scale_helm
scale_armor scale_pants scale_gloves scale_boots brass_helm brass_armor brass_pants
brass_gloves brass_boots plate_helm plate_armor plate_pants plate_gloves plate_boots
dragon_helm dragon_armor dragon_pants dragon_gloves dragon_boots black_dragon_helm
black_dragon_armor black_dragon_pants black_dragon_gloves black_dragon_boots pad_helm
pad_armor pad_pants pad_gloves pad_boots bone_helm bone_armor bone_pants bone_gloves
bone_boots sphinx_helm sphinx_armor sphinx_pants sphinx_gloves sphinx_boots legendary_helm
legendary_armor legendary_pants legendary_gloves legendary_boots grand_soul_helm
grand_soul_armor grand_soul_pants grand_soul_gloves grand_soul_boots vine_helm vine_armor
vine_pants vine_gloves vine_boots silk_helm silk_armor silk_pants silk_gloves silk_boots
wind_helm wind_armor wind_pants wind_gloves wind_boots spirit_helm spirit_armor
spirit_pants spirit_gloves spirit_boots guardian_helm guardian_armor guardian_pants
guardian_gloves guardian_boots wings_of_elf wings_of_heaven wings_of_satan ring_of_ice
ring_of_poison ring_of_fire ring_of_wind ring_of_magic transformation_ring
pendant_of_lightning pendant_of_fire pendant_of_ice pendant_of_wind pendant_of_ability
jewel_of_bless jewel_of_soul jewel_of_chaos jewel_of_life guardian_angel imp
horn_of_uniria apple small_healing_potion healing_potion large_healing_potion
small_mana_potion mana_potion large_mana_potion antidote ale town_portal_scroll
scroll_of_energy_ball scroll_of_fire_ball scroll_of_power_wave scroll_of_lightning
scroll_of_meteorite scroll_of_ice scroll_of_poison scroll_of_flame scroll_of_teleport
scroll_of_twister scroll_of_evil_spirit scroll_of_hellfire arrows bolts
`.trim().split(/\s+/);

const ALL_CLASSES = ["knight", "mage", "barbarian", "rogue", "ranger"];

function groupBy<T>(values: T[], keyFor: (value: T) => string): Record<string, T[]> {
  return values.reduce<Record<string, T[]>>((groups, value) => {
    const key = keyFor(value);
    (groups[key] ??= []).push(value);
    return groups;
  }, {});
}

describe("CATALOG_ITEMS", () => {
  const items = Object.values(CATALOG_ITEMS);

  it("covers each of the 208 source records exactly once", () => {
    expect(items).toHaveLength(208);
    expect(new Set(items.map((item) => item.ref_origen))).toEqual(new Set(SOURCE_IDS));
    expect(new Set(items.map((item) => item.ref_origen))).toHaveLength(208);
  });

  it("uses unique Aden identifiers and original names", () => {
    expect(new Set(items.map((item) => item.id))).toHaveLength(208);
    expect(new Set(items.map((item) => item.name))).toHaveLength(208);
    for (const [key, item] of Object.entries(CATALOG_ITEMS)) {
      expect(key).toBe(item.id);
      expect(item.id).toMatch(/^aden_[a-z0-9]+(?:_[a-z0-9]+)*$/);
      expect(item.id).not.toBe(item.ref_origen);
      expect(item.name.trim().length).toBeGreaterThan(2);
      expect(item.description.trim().length).toBeGreaterThan(8);
    }
    expect(CATALOG_ITEMS.aden_punal_del_umbral.name).toBe("Puñal del Umbral");
    expect(CATALOG_ITEMS.aden_alas_de_la_vigilia.name).toBe("Alas de la Vigilia");
  });

  it("keeps the source category distribution and valid shared fields", () => {
    const counts = groupBy(items, (item) => item.category);
    expect(counts.arma).toHaveLength(63);
    expect(counts.escudo).toHaveLength(15);
    expect(counts.armadura).toHaveLength(85);
    expect(counts.alas).toHaveLength(3);
    expect(counts.anillo).toHaveLength(6);
    expect(counts.pendant).toHaveLength(5);
    expect(counts.joya).toHaveLength(4);
    expect(counts.mascota).toHaveLength(3);
    expect(counts.consumible).toHaveLength(22);
    expect(counts.municion).toHaveLength(2);

    for (const item of items) {
      expect(Number.isInteger(item.tier)).toBe(true);
      expect(item.tier).toBeGreaterThanOrEqual(1);
      expect(item.classes.length).toBeGreaterThan(0);
      expect(item.classes.every((classId) => ALL_CLASSES.includes(classId))).toBe(true);
      expect(item.allowedQualities.every((quality) => ["normal", "magic", "excellent"].includes(quality))).toBe(true);
    }
  });

  it("expands TODAS and assigns class identities without legacy abbreviations", () => {
    expect(CATALOG_ITEMS.aden_punal_del_umbral.classes).toEqual(ALL_CLASSES);
    expect(CATALOG_ITEMS.aden_baston_del_huesero.classes).toEqual(["mage"]);
    expect(CATALOG_ITEMS.aden_arco_de_la_senda.classes).toEqual(["ranger"]);
    expect(CATALOG_ITEMS.aden_filo_del_verdugo.classes).toContain("rogue");
    expect(CATALOG_ITEMS.aden_hacha_del_coloso.classes).toContain("barbarian");
    expect(items.flatMap((item) => item.classes)).not.toEqual(expect.arrayContaining(["DK", "DW", "ELF", "TODAS"]));
  });

  it("maps equipment hands, slots, qualities, levels, and bounded base stats", () => {
    const equipment = items.filter((item) => item.type === "equipment");
    expect(equipment.length).toBeGreaterThan(150);
    for (const item of equipment) {
      expect(item.stackable).toBe(false);
      expect(item.slot).toBeDefined();
      expect(item.requiredLevel).toBeGreaterThanOrEqual(1);
      expect(item.requiredLevel).toBeLessThanOrEqual(40);
    }

    const weapons = items.filter((item) => item.category === "arma");
    for (const item of weapons) {
      expect(item.slot).toBe("weapon");
      expect(item.hands === "1H" || item.hands === "2H").toBe(true);
      expect(item.bonuses?.pAtk).toBeGreaterThanOrEqual(4);
      expect(item.bonuses?.pAtk).toBeLessThanOrEqual(35);
      expect(item.allowedQualities).toEqual(["normal", "magic", "excellent"]);
    }

    for (const item of items.filter((candidate) => candidate.category === "escudo")) {
      expect(item.slot).toBe("shield");
      expect(item.hands).toBe("1H");
      expect(item.bonuses?.pDef).toBeGreaterThan(0);
    }
  });

  it("builds seventeen five-piece armor families with distributed defense", () => {
    const armor = items.filter((item) => item.category === "armadura");
    const families = groupBy(armor, (item) => item.setId ?? "missing");
    expect(Object.keys(families)).toHaveLength(17);
    for (const family of Object.values(families)) {
      expect(family).toHaveLength(5);
      expect(new Set(family?.map((item) => item.slot))).toEqual(
        new Set(["helmet", "armor", "pants", "gloves", "boots"]),
      );
      const totalDefense = family?.reduce((total, item) => total + (item.bonuses?.pDef ?? 0), 0) ?? 0;
      expect(totalDefense).toBeGreaterThanOrEqual(8);
      expect(totalDefense).toBeLessThanOrEqual(70);
    }
    expect(armor.every((item) => item.allowedQualities.join(",") === "normal,magic,excellent")).toBe(true);
  });

  it("models jewels, consumables, scrolls, ammunition, wings, and pets", () => {
    const noQuality = items.filter((item) => ["joya", "consumible", "municion"].includes(item.category));
    expect(noQuality.every((item) => item.allowedQualities.length === 0)).toBe(true);

    const jewels = Object.fromEntries(items.filter((item) => item.category === "joya").map((item) => [item.ref_origen, item]));
    expect(jewels.jewel_of_bless.useEffect).toBe("upgrade_safe");
    expect(jewels.jewel_of_soul.useEffect).toBe("upgrade_risky");
    expect(jewels.jewel_of_life.useEffect).toBe("add_option");
    expect(jewels.jewel_of_chaos.useEffect).toBe("chaos");

    const scrolls = items.filter((item) => item.subcategory === "pergamino_hechizo");
    expect(scrolls).toHaveLength(12);
    for (const scroll of scrolls) {
      expect(scroll.useEffect).toBe("learn_skill");
      expect(scroll.learnSkill).toBe(`tome_${scroll.ref_origen.replace("scroll_of_", "")}`);
    }

    const ammo = items.filter((item) => item.category === "municion");
    expect(ammo.map((item) => item.ammo)).toEqual(["arrow", "bolt"]);
    expect(ammo.every((item) => item.type === "material" && item.stackable)).toBe(true);
    expect(items.filter((item) => item.subcategory === "arco").every((item) => item.ammo === "arrow")).toBe(true);
    expect(items.filter((item) => item.subcategory === "ballesta").every((item) => item.ammo === "bolt")).toBe(true);

    const pets = items.filter((item) => item.category === "mascota");
    expect(pets.map((item) => item.petEffect)).toEqual(["guardian", "imp", "mount"]);
    expect(pets.every((item) => item.type === "equipment" && item.slot === "pet")).toBe(true);
    expect(items.filter((item) => item.category === "alas").every((item) => item.slot === "wings")).toBe(true);
  });
});
