import type { EquipSlot, Rarity, StatBonuses } from "./equipment.js";
import { resolveItemInstance, type ItemOptions, type ItemQuality } from "./itemOptions.js";
import { CATALOG_ITEMS } from './catalog.js';

export interface ItemTemplate {
  id: string;
  name: string;
  type: "material" | "currency" | "consumable" | "equipment";
  stackable: boolean;
  heal?: number;
  ref_origen?: string;
  category?: string;
  subcategory?: string;
  classes?: string[];
  hands?: "1H" | "2H" | null;
  tier?: number;
  description?: string;
  allowedQualities?: ItemQuality[];
  requiredLevel?: number;
  setId?: string;
  mana?: number;
  useEffect?: string;
  learnSkill?: string;
  ammo?: "arrow" | "bolt";
  petEffect?: "guardian" | "imp" | "mount";
  options?: ItemOptions;
  baseId?: string;
  // Etapa 12 — sólo para type "equipment":
  slot?: EquipSlot;
  rarity?: Rarity;
  bonuses?: StatBonuses;
}

export const ITEM_TEMPLATES: Record<string, ItemTemplate> = {
  veil_charm: {id:'veil_charm',name:'Amuleto del Regreso',type:'equipment',stackable:false,slot:'accessory',rarity:'uncommon',requiredLevel:12,bonuses:{maxHp:50,pDef:4},description:'Boren lo entrega a quienes hacen posible el regreso de los viajeros.'},
  gallery_dagger: { id: 'gallery_dagger', name: 'Daga de la Galería', type: 'equipment', stackable: false, category: 'arma', subcategory: 'espada', classes: ['rogue'], hands: '1H', slot: 'weapon', rarity: 'uncommon', requiredLevel: 18, bonuses: { pAtk: 19 }, description: 'Forjada en la mina para trabajar en espacios estrechos. Brenna la guardaba para un aprendiz ágil.' },
  black_iron_fang: { id: 'black_iron_fang', name: 'Colmillo de Hierro Negro', type: 'equipment', stackable: false, category: 'arma', subcategory: 'espada', classes: ['rogue'], hands: '1H', slot: 'weapon', rarity: 'rare', requiredLevel: 21, bonuses: { pAtk: 21 }, description: 'La última hoja que Halden templó para un aprendiz. El filo guarda un brillo de fragua.' },
  anvil_staff: { id: 'anvil_staff', name: 'Báculo del Yunque', type: 'equipment', stackable: false, category: 'arma', subcategory: 'baston', classes: ['mage'], hands: '2H', slot: 'weapon', rarity: 'rare', requiredLevel: 21, bonuses: { pAtk: 21 }, description: 'Hierro negro coronado por una piedra de fragua. Halden lo usaba para medir el calor del metal.' },
  miner_amulet: { id: 'miner_amulet', name: 'Amuleto del Minero', type: 'equipment', stackable: false, slot: 'accessory', rarity: 'uncommon', requiredLevel: 15, bonuses: { maxHp: 80, pDef: 6 }, description: 'Cada minero de la cuadrilla de Tobías lleva uno. Dicen que avisa cuando el techo cede.' },
  memory_locket: { id:'memory_locket', name:'Relicario de los Nombres', type:'equipment', stackable:false, slot:'accessory', rarity:'rare', requiredLevel:15, bonuses:{pAtk:8,pDef:6,maxMp:65}, description:'Los recuerdos devueltos a los vivos. Recompensa de la Vigilia.' },
  ...CATALOG_ITEMS,
  gold: { id: "gold", name: "Oro", type: "currency", stackable: true },
  bone: { id: "bone", name: "Hueso", type: "material", stackable: true },
  health_potion: { id: "health_potion", name: "Poción de Vida", type: "consumable", stackable: true, heal: 60 },
  // Etapa 11: poción mayor (drop de zonas profundas / venta en tienda).
  greater_potion: { id: "greater_potion", name: "Poción Mayor", type: "consumable", stackable: true, heal: 150 },
  // Trofeos por zona (materiales coleccionables: prueban lo profundo que llegaste).
  ancient_relic: { id: "ancient_relic", name: "Reliquia Antigua", type: "material", stackable: true },
  ember_core: { id: "ember_core", name: "Núcleo de Brasa", type: "material", stackable: true },

  // ── Etapa 12: EQUIPO con rareza (drops por zona; equipar sube stats) ────────
  // Común (Bosque)
  worn_sword: { id: "worn_sword", name: "Espada Gastada", type: "equipment", stackable: false, slot: "weapon", rarity: "common", bonuses: { pAtk: 4 } },
  leather_vest: { id: "leather_vest", name: "Chaleco de Cuero", type: "equipment", stackable: false, slot: "armor", rarity: "common", bonuses: { pDef: 4, maxHp: 20 } },
  // Poco común (Bosque tardío / Ruinas)
  iron_sword: { id: "iron_sword", name: "Espada de Hierro", type: "equipment", stackable: false, slot: "weapon", rarity: "uncommon", bonuses: { pAtk: 9 } },
  iron_mail: { id: "iron_mail", name: "Cota de Malla", type: "equipment", stackable: false, slot: "armor", rarity: "uncommon", bonuses: { pDef: 8, maxHp: 45 } },
  hunter_charm: { id: "hunter_charm", name: "Amuleto del Cazador", type: "equipment", stackable: false, slot: "accessory", rarity: "uncommon", bonuses: { pAtk: 3, maxMp: 15 } },
  // Raro (Ruinas / mini-jefe)
  bone_blade: { id: "bone_blade", name: "Filo de Hueso", type: "equipment", stackable: false, slot: "weapon", rarity: "rare", bonuses: { pAtk: 15 } },
  crypt_plate: { id: "crypt_plate", name: "Coraza de la Cripta", type: "equipment", stackable: false, slot: "armor", rarity: "rare", bonuses: { pDef: 14, maxHp: 75 } },
  crypt_ring: { id: "crypt_ring", name: "Anillo de la Cripta", type: "equipment", stackable: false, slot: "accessory", rarity: "rare", bonuses: { pDef: 5, maxHp: 35, maxMp: 20 } },
  // Épico (Yermo)
  ember_axe: { id: "ember_axe", name: "Hacha de Brasa", type: "equipment", stackable: false, slot: "weapon", rarity: "epic", bonuses: { pAtk: 23 } },
  ash_guard: { id: "ash_guard", name: "Guarda de Ceniza", type: "equipment", stackable: false, slot: "armor", rarity: "epic", bonuses: { pDef: 21, maxHp: 120 } },
  ember_band: { id: "ember_band", name: "Brazal Ardiente", type: "equipment", stackable: false, slot: "accessory", rarity: "epic", bonuses: { pAtk: 11, maxMp: 30 } },
  // Legendario (Rey Nihil)
  crown_blade: { id: "crown_blade", name: "Espada Coronada", type: "equipment", stackable: false, slot: "weapon", rarity: "legendary", bonuses: { pAtk: 35 } },
  nihil_aegis: { id: "nihil_aegis", name: "Égida de Nihil", type: "equipment", stackable: false, slot: "armor", rarity: "legendary", bonuses: { pDef: 31, maxHp: 190 } },
  // La corona del jefe ahora es un accesorio legendario equipable (el gran trofeo).
  skull_crown: { id: "skull_crown", name: "Corona del Rey Nihil", type: "equipment", stackable: false, slot: "accessory", rarity: "legendary", bonuses: { pAtk: 12, pDef: 12, maxHp: 65 } },
};

export function getItem(id: string): ItemTemplate {
  if (typeof id !== "string") throw new Error("getItem: id inválido");
  if (id.includes("~")) return resolveItemInstance(id, ITEM_TEMPLATES);
  const t = Object.hasOwn(ITEM_TEMPLATES,id) ? ITEM_TEMPLATES[id] : undefined;
  if (!t) throw new Error(`getItem: ítem desconocido ${id}`);
  return t;
}

export const SHOP_PRICES: Record<string, number> = {
  health_potion: 15,
  greater_potion: 60,
  // Etapa 12: equipo común a la venta → primera mejora garantizada con oro.
  worn_sword: 45,
  leather_vest: 45,
};

/** Stock del Mercader: consumibles + las dos piezas comunes de arranque. */
export const SHOP_STOCK: string[] = ["health_potion", "greater_potion", "worn_sword", "leather_vest"];

/** Etapa 20: stock del Herrero — equipo mejor por oro (progresión sin depender del loot). */
export const SMITH_STOCK: string[] = [
  "worn_sword", "leather_vest",
  "aden_punal_del_umbral", "aden_destral_del_lenador_gris", "aden_baston_del_huesero", "aden_arco_de_la_senda", "aden_rodela_del_recluta",
];

SHOP_STOCK.push('aden_astiles_del_bosque_gris', 'aden_virotes_de_la_vigilia', 'aden_vial_de_niebla_menor', 'aden_sal_de_purga', 'aden_sello_de_retorno');
// Toda base se conserva, pero sólo las provisiones y armas iniciales se venden.
for (const item of Object.values(CATALOG_ITEMS)) {
  if(item.type==='equipment') ITEM_TEMPLATES[item.id]={...item,rarity:'common'};
  if (SMITH_STOCK.includes(item.id) || SHOP_STOCK.includes(item.id))
    SHOP_PRICES[item.id] = item.category === 'municion' ? 1 : item.type === 'equipment' ? 50 : 15;
}

export function getShopPrice(id: string): number {
  const price = Object.hasOwn(SHOP_PRICES, id) && (SHOP_STOCK.includes(id) || SMITH_STOCK.includes(id)) ? SHOP_PRICES[id] : undefined;
  if (price === undefined) throw new Error(`getShopPrice: ítem no a la venta ${id}`);
  return price;
}

export interface DropEntry {
  itemTemplateId: string;
  chance: number;
  qtyMin: number;
  qtyMax: number;
}

// Etapa 11: el loot mejora con la profundidad (más oro, mejores pociones y trofeos
// de zona). El jefe final es el premio grande. Refuerza el loop peligro → recompensa.
export const DROP_TABLES: Record<string, DropEntry[]> = {
  umbra_alpha: [
    { itemTemplateId: 'gold', chance: 1, qtyMin: 25, qtyMax: 40 },
    { itemTemplateId: 'health_potion', chance: 1, qtyMin: 2, qtyMax: 3 },
  ],
  crypt_acolyte: [
    { itemTemplateId: 'gold', chance: 1, qtyMin: 8, qtyMax: 15 },
    { itemTemplateId: 'aden_vial_de_niebla_menor', chance: .4, qtyMin: 1, qtyMax: 1 },
  ],
  crypt_stalker: [
    { itemTemplateId: 'gold', chance: 1, qtyMin: 5, qtyMax: 10 },
    { itemTemplateId: 'health_potion', chance: .3, qtyMin: 1, qtyMax: 1 },
  ],
  crypt_emberbeast: [
    { itemTemplateId: 'gold', chance: 1, qtyMin: 8, qtyMax: 15 },
    { itemTemplateId: 'aden_vial_de_niebla_menor', chance: .4, qtyMin: 1, qtyMax: 1 },
  ],
  crypt_behemoth: [
    { itemTemplateId: 'gold', chance: 1, qtyMin: 15, qtyMax: 25 },
    { itemTemplateId: 'health_potion', chance: 1, qtyMin: 1, qtyMax: 2 },
  ],
  crypt_flameguard: [
    { itemTemplateId: 'gold', chance: 1, qtyMin: 12, qtyMax: 22 },
    { itemTemplateId: 'health_potion', chance: .4, qtyMin: 1, qtyMax: 1 },
  ],
  crypt_warden: [
    { itemTemplateId: 'gold', chance: 1, qtyMin: 60, qtyMax: 90 },
    { itemTemplateId: 'greater_potion', chance: 1, qtyMin: 2, qtyMax: 2 },
  ],
  umbra_orc: [
    { itemTemplateId: "gold", chance: 1, qtyMin: 5, qtyMax: 12 },
    { itemTemplateId: "iron_sword", chance: 0.1, qtyMin: 1, qtyMax: 1 },
  ],
  forest_troll: [
    { itemTemplateId: "gold", chance: 1, qtyMin: 10, qtyMax: 20 },
    { itemTemplateId: "health_potion", chance: 0.4, qtyMin: 1, qtyMax: 2 },
  ],
  crypt_wraith: [
    { itemTemplateId: "gold", chance: 1, qtyMin: 12, qtyMax: 25 },
    { itemTemplateId: "ancient_relic", chance: 0.25, qtyMin: 1, qtyMax: 1 },
  ],
  bone_warden: [
    { itemTemplateId: "gold", chance: 1, qtyMin: 25, qtyMax: 45 },
    { itemTemplateId: "crypt_plate", chance: 0.18, qtyMin: 1, qtyMax: 1 },
  ],
  infernal_demon: [
    { itemTemplateId: "gold", chance: 1, qtyMin: 35, qtyMax: 60 },
    { itemTemplateId: "ember_core", chance: 0.5, qtyMin: 1, qtyMax: 2 },
    { itemTemplateId: "ember_axe", chance: 0.15, qtyMin: 1, qtyMax: 1 },
  ],
  ancient_drake: [
    { itemTemplateId: "gold", chance: 1, qtyMin: 80, qtyMax: 130 },
    { itemTemplateId: "greater_potion", chance: 1, qtyMin: 2, qtyMax: 3 },
    { itemTemplateId: "ember_core", chance: 1, qtyMin: 2, qtyMax: 3 },
    { itemTemplateId: "ash_guard", chance: 0.4, qtyMin: 1, qtyMax: 1 },
  ],
  // Bosque de Umbra — equipo común (raro)
  skeleton_minion: [
    { itemTemplateId: "gold", chance: 0.8, qtyMin: 1, qtyMax: 5 },
    { itemTemplateId: "bone", chance: 0.5, qtyMin: 1, qtyMax: 2 },
    { itemTemplateId: "worn_sword", chance: 0.10, qtyMin: 1, qtyMax: 1 },
    { itemTemplateId: "leather_vest", chance: 0.10, qtyMin: 1, qtyMax: 1 },
  ],
  skeleton_warrior: [
    { itemTemplateId: "gold", chance: 1.0, qtyMin: 3, qtyMax: 10 },
    { itemTemplateId: "bone", chance: 0.7, qtyMin: 1, qtyMax: 3 },
    { itemTemplateId: "health_potion", chance: 0.15, qtyMin: 1, qtyMax: 1 },
    { itemTemplateId: "leather_vest", chance: 0.14, qtyMin: 1, qtyMax: 1 },
    { itemTemplateId: "iron_sword", chance: 0.09, qtyMin: 1, qtyMax: 1 },
  ],
  // Ruinas de Nihil — poco común / raro
  crypt_minion: [
    { itemTemplateId: "gold", chance: 0.9, qtyMin: 5, qtyMax: 14 },
    { itemTemplateId: "bone", chance: 0.6, qtyMin: 1, qtyMax: 3 },
    { itemTemplateId: "ancient_relic", chance: 0.12, qtyMin: 1, qtyMax: 1 },
    { itemTemplateId: "iron_sword", chance: 0.12, qtyMin: 1, qtyMax: 1 },
    { itemTemplateId: "iron_mail", chance: 0.12, qtyMin: 1, qtyMax: 1 },
    { itemTemplateId: "hunter_charm", chance: 0.10, qtyMin: 1, qtyMax: 1 },
  ],
  crypt_warrior: [
    { itemTemplateId: "gold", chance: 1.0, qtyMin: 10, qtyMax: 24 },
    { itemTemplateId: "health_potion", chance: 0.25, qtyMin: 1, qtyMax: 2 },
    { itemTemplateId: "ancient_relic", chance: 0.25, qtyMin: 1, qtyMax: 1 },
    { itemTemplateId: "bone_blade", chance: 0.11, qtyMin: 1, qtyMax: 1 },
    { itemTemplateId: "crypt_plate", chance: 0.11, qtyMin: 1, qtyMax: 1 },
    { itemTemplateId: "crypt_ring", chance: 0.10, qtyMin: 1, qtyMax: 1 },
  ],
  crypt_sentinel: [
    { itemTemplateId: "gold", chance: 1.0, qtyMin: 40, qtyMax: 75 },
    { itemTemplateId: "greater_potion", chance: 1.0, qtyMin: 1, qtyMax: 2 },
    { itemTemplateId: "health_potion", chance: 1.0, qtyMin: 2, qtyMax: 3 },
    { itemTemplateId: "ancient_relic", chance: 1.0, qtyMin: 1, qtyMax: 2 },
    // Mini-jefe: botín raro casi garantizado (motiva farmearlo).
    { itemTemplateId: "bone_blade", chance: 0.5, qtyMin: 1, qtyMax: 1 },
    { itemTemplateId: "crypt_plate", chance: 0.5, qtyMin: 1, qtyMax: 1 },
    { itemTemplateId: "crypt_ring", chance: 0.35, qtyMin: 1, qtyMax: 1 },
  ],
  // Yermo Ceniciento — raro / épico
  ash_minion: [
    { itemTemplateId: "gold", chance: 1.0, qtyMin: 12, qtyMax: 26 },
    { itemTemplateId: "ember_core", chance: 0.18, qtyMin: 1, qtyMax: 1 },
    { itemTemplateId: "health_potion", chance: 0.2, qtyMin: 1, qtyMax: 2 },
    { itemTemplateId: "bone_blade", chance: 0.12, qtyMin: 1, qtyMax: 1 },
    { itemTemplateId: "ember_band", chance: 0.10, qtyMin: 1, qtyMax: 1 },
  ],
  ash_warrior: [
    { itemTemplateId: "gold", chance: 1.0, qtyMin: 20, qtyMax: 42 },
    { itemTemplateId: "ember_core", chance: 0.35, qtyMin: 1, qtyMax: 2 },
    { itemTemplateId: "greater_potion", chance: 0.3, qtyMin: 1, qtyMax: 1 },
    { itemTemplateId: "ember_axe", chance: 0.13, qtyMin: 1, qtyMax: 1 },
    { itemTemplateId: "ash_guard", chance: 0.14, qtyMin: 1, qtyMax: 1 },
    { itemTemplateId: "ember_band", chance: 0.11, qtyMin: 1, qtyMax: 1 },
  ],
  // Trono del Rey Nihil — botín de jefe (legendarios como cima del chase)
  veil_raider: [
    { itemTemplateId: 'gold', chance: 1, qtyMin: 25, qtyMax: 45 },
    { itemTemplateId: 'greater_potion', chance: .3, qtyMin: 1, qtyMax: 1 },
  ],
  mine_digger: [{ itemTemplateId: 'gold', chance: 1, qtyMin: 40, qtyMax: 60 }],
  mine_armor: [{ itemTemplateId: 'gold', chance: 1, qtyMin: 45, qtyMax: 70 }, { itemTemplateId: 'health_potion', chance: 0.15, qtyMin: 1, qtyMax: 1 }],
  cave_troll: [{ itemTemplateId: 'gold', chance: 1, qtyMin: 55, qtyMax: 85 }, { itemTemplateId: 'greater_potion', chance: 0.12, qtyMin: 1, qtyMax: 1 }],
  mine_foreman: [{ itemTemplateId: 'gold', chance: 1, qtyMin: 150, qtyMax: 240 }, { itemTemplateId: 'greater_potion', chance: 1, qtyMin: 1, qtyMax: 2 }],
  halden: [{ itemTemplateId: 'gold', chance: 1, qtyMin: 260, qtyMax: 400 }, { itemTemplateId: 'greater_potion', chance: 1, qtyMin: 2, qtyMax: 3 }, { itemTemplateId: 'ancient_relic', chance: 1, qtyMin: 2, qtyMax: 4 }],
  iron_colossus: [{ itemTemplateId: 'gold', chance: 1, qtyMin: 220, qtyMax: 340 }, { itemTemplateId: 'greater_potion', chance: 1, qtyMin: 2, qtyMax: 3 }],
  chest_minas: [{ itemTemplateId: 'gold', chance: 1, qtyMin: 120, qtyMax: 200 }, { itemTemplateId: 'greater_potion', chance: 1, qtyMin: 1, qtyMax: 2 }],
  memory_guard: [{ itemTemplateId:'gold', chance:1, qtyMin:35, qtyMax:55 }],
  memory_jailer: [{ itemTemplateId:'gold', chance:1, qtyMin:120, qtyMax:200 }, { itemTemplateId:'greater_potion', chance:1, qtyMin:2, qtyMax:3 }],
  memory_prior: [{ itemTemplateId:'gold', chance:1, qtyMin:200, qtyMax:320 }, { itemTemplateId:'ancient_relic', chance:1, qtyMin:3, qtyMax:5 }],
  veil_guardian: [
    { itemTemplateId: 'gold', chance: 1, qtyMin: 100, qtyMax: 180 },
    { itemTemplateId: 'greater_potion', chance: 1, qtyMin: 2, qtyMax: 3 },
  ],
  skeleton_king: [
    { itemTemplateId: "gold", chance: 1.0, qtyMin: 120, qtyMax: 220 },
    { itemTemplateId: "greater_potion", chance: 1.0, qtyMin: 3, qtyMax: 4 },
    { itemTemplateId: "skull_crown", chance: 1.0, qtyMin: 1, qtyMax: 1 },
    { itemTemplateId: "ancient_relic", chance: 1.0, qtyMin: 2, qtyMax: 3 },
    { itemTemplateId: "ember_core", chance: 1.0, qtyMin: 2, qtyMax: 3 },
    { itemTemplateId: "crown_blade", chance: 0.5, qtyMin: 1, qtyMax: 1 },
    { itemTemplateId: "nihil_aegis", chance: 0.5, qtyMin: 1, qtyMax: 1 },
    { itemTemplateId: "ember_axe", chance: 0.4, qtyMin: 1, qtyMax: 1 },
  ],

  // ── Etapa 16: objetos de mundo ──
  // Barril/urna rompible (piñata de loot menor, igual en todos los mapas).
  breakable: [
    { itemTemplateId: "gold", chance: 0.85, qtyMin: 2, qtyMax: 12 },
    { itemTemplateId: "bone", chance: 0.35, qtyMin: 1, qtyMax: 2 },
    { itemTemplateId: "health_potion", chance: 0.06, qtyMin: 1, qtyMax: 1 },
  ],
  // Cofres por mapa (recompensa a explorar; chance de gear acorde al mapa).
  chest_pueblo: [
    { itemTemplateId: "gold", chance: 1.0, qtyMin: 15, qtyMax: 30 },
    { itemTemplateId: "health_potion", chance: 0.6, qtyMin: 1, qtyMax: 2 },
    { itemTemplateId: "worn_sword", chance: 0.15, qtyMin: 1, qtyMax: 1 },
  ],
  chest_bosque: [
    { itemTemplateId: "gold", chance: 1.0, qtyMin: 20, qtyMax: 45 },
    { itemTemplateId: "health_potion", chance: 0.7, qtyMin: 1, qtyMax: 2 },
    { itemTemplateId: "leather_vest", chance: 0.2, qtyMin: 1, qtyMax: 1 },
    { itemTemplateId: "iron_sword", chance: 0.1, qtyMin: 1, qtyMax: 1 },
  ],
  chest_ruinas: [
    { itemTemplateId: "gold", chance: 1.0, qtyMin: 40, qtyMax: 80 },
    { itemTemplateId: "greater_potion", chance: 0.6, qtyMin: 1, qtyMax: 1 },
    { itemTemplateId: "ancient_relic", chance: 0.35, qtyMin: 1, qtyMax: 1 },
    { itemTemplateId: "bone_blade", chance: 0.14, qtyMin: 1, qtyMax: 1 },
    { itemTemplateId: "crypt_plate", chance: 0.14, qtyMin: 1, qtyMax: 1 },
    { itemTemplateId: "crypt_ring", chance: 0.1, qtyMin: 1, qtyMax: 1 },
  ],
  chest_yermo: [
    { itemTemplateId: "gold", chance: 1.0, qtyMin: 70, qtyMax: 130 },
    { itemTemplateId: "greater_potion", chance: 0.8, qtyMin: 1, qtyMax: 2 },
    { itemTemplateId: "ember_core", chance: 0.4, qtyMin: 1, qtyMax: 2 },
    { itemTemplateId: "ember_axe", chance: 0.14, qtyMin: 1, qtyMax: 1 },
    { itemTemplateId: "ash_guard", chance: 0.14, qtyMin: 1, qtyMax: 1 },
    { itemTemplateId: "ember_band", chance: 0.12, qtyMin: 1, qtyMax: 1 },
  ],
  chest_trono: [
    { itemTemplateId: "gold", chance: 1.0, qtyMin: 120, qtyMax: 200 },
    { itemTemplateId: "greater_potion", chance: 1.0, qtyMin: 1, qtyMax: 2 },
    { itemTemplateId: "crown_blade", chance: 0.15, qtyMin: 1, qtyMax: 1 },
    { itemTemplateId: "nihil_aegis", chance: 0.15, qtyMin: 1, qtyMax: 1 },
    { itemTemplateId: "skull_crown", chance: 0.05, qtyMin: 1, qtyMax: 1 },
  ],
};

export interface DropResult {
  itemTemplateId: string;
  qty: number;
}

export function rollDrops(templateId: string, rng: () => number): DropResult[] {
  const table = DROP_TABLES[templateId];
  if (!table) return [];
  const out: DropResult[] = [];
  for (const e of table) {
    if (rng() < e.chance) {
      const qty = e.qtyMin + Math.floor(rng() * (e.qtyMax - e.qtyMin + 1));
      out.push({ itemTemplateId: e.itemTemplateId, qty });
    }
  }
  return out;
}

export function addToInventory(inv: Map<string, number>, itemTemplateId: string, qty: number): void {
  inv.set(itemTemplateId, (inv.get(itemTemplateId) ?? 0) + qty);
}

export const PICKUP_RANGE = 2.5;
export const DROP_DESPAWN_MS = 60000;
// Delay antes de que un ítem del piso pueda levantarse: como el rango de pickup
// es igual al de ataque, sin esto el loot se recogía en el mismo tick que caía
// (el jugador mata al mob parado encima) y nunca se veía. Con el delay, aterriza
// y queda visible ~1.5s antes de vacuumearse.
export const PICKUP_DELAY_MS = 1500;
