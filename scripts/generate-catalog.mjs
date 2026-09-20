import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "..");
const sourcePath = process.argv[2] ?? resolve(process.env.USERPROFILE ?? "", "Downloads", "mu_online_99b_items.json");
const source = JSON.parse(readFileSync(sourcePath, "utf8")).items;

if (!Array.isArray(source) || source.length !== 208) {
  throw new Error(`Se esperaban 208 objetos en ${sourcePath}`);
}

const fixedNames = {
  kris: "Puñal del Umbral",
  short_sword: "Hoja del Primer Juramento",
  rapier: "Aguja de la Frontera",
  sword_of_assassin: "Filo del Verdugo",
  blade: "Espada del Vigía",
  gladius: "Gladio de las Cenizas",
  falchion: "Corvo de la Marca Gris",
  serpent_sword: "Hoja de la Sierpe Pálida",
  sword_of_salamander: "Filo de Brasa Viva",
  light_saber: "Sable del Astrónomo",
  legendary_sword: "Mandoble del Custodio",
  heliacal_sword: "Espada del Sol Herido",
  double_blade: "Gemela de los Caídos",
  lightning_sword: "Mandoble de la Tormenta",
  giant_sword: "Espadón de los Titanes",
  crystal_sword: "Hoja de Cristal Negro",
  small_axe: "Destral del Leñador Gris",
  hand_axe: "Hacha del Puño Rojo",
  double_axe: "Bifaz del Bastión",
  tomahawk: "Hacha de la Estepa",
  elven_axe: "Destral Silvano",
  battle_axe: "Hacha de Guerra de Aden",
  nikkea_axe: "Hacha del Rompefilas",
  larkan_axe: "Hacha del Juramento Roto",
  crescent_axe: "Hacha de la Media Luna",
  chaos_dragon_axe: "Hacha del Coloso",
  mace: "Maza del Peregrino",
  morning_star: "Estrella del Alba Muerta",
  flail: "Azote de los Encadenados",
  great_hammer: "Martillo del Rompemuros",
  crystal_morning_star: "Lucero de Obsidiana",
  light_spear: "Pica de la Guardia",
  spear: "Lanza del Camino Largo",
  dragon_lance: "Lanza de Sangre Antigua",
  giant_trident: "Tridente del Coloso Hundido",
  serpent_spear: "Pica de la Sierpe",
  double_poleaxe: "Asta de Doble Luna",
  halberd: "Alabarda del Bastión",
  berdysh: "Cuchilla de la Frontera",
  great_scythe: "Guadaña del Último Trigo",
  bill_of_balrog: "Pica del Señor de Brasa",
  short_bow: "Arco de la Senda",
  bow: "Arco del Fresno Gris",
  elven_bow: "Arco de la Arboleda Velada",
  battle_bow: "Arco del Batidor",
  tiger_bow: "Arco de la Fiera Moteada",
  silver_bow: "Arco de Luna Pálida",
  chaos_nature_bow: "Arco del Caos Silvestre",
  crossbow: "Ballesta del Vigía",
  golden_crossbow: "Ballesta del Sol Bajo",
  arquebus: "Trueno de la Frontera",
  light_crossbow: "Ballesta del Rayo Blanco",
  serpent_crossbow: "Ballesta de la Sierpe",
  bluewing_crossbow: "Ballesta del Ala Azul",
  aquagold_crossbow: "Ballesta de Marea Dorada",
  skull_staff: "Bastón del Huesero",
  angelic_staff: "Cayado del Heraldo",
  serpent_staff: "Vara de la Sierpe Sabia",
  thunder_staff: "Báculo de la Tormenta",
  gorgon_staff: "Vara de la Mirada Pétrea",
  legendary_staff: "Báculo del Arconte",
  staff_of_resurrection: "Cayado del Segundo Aliento",
  chaos_lightning_staff: "Báculo del Caos Fulminante",
  small_shield: "Rodela del Recluta",
  buckler: "Broquel de la Guardia Gris",
  horn_shield: "Escudo del Astado",
  kite_shield: "Escudo de la Cometa Negra",
  elven_shield: "Égida de la Arboleda",
  skull_shield: "Escudo de los Sepultados",
  large_round_shield: "Rodela del Círculo de Aden",
  spiked_shield: "Escudo del Cerco Espinado",
  plate_shield: "Pavés de la Muralla",
  serpent_shield: "Égida de la Sierpe",
  tower_shield: "Escudo de la Torre Vigía",
  dragon_slayer_shield: "Baluarte del Cazawyrms",
  legendary_shield: "Égida del Sabio Caído",
  crimson_glory: "Gloria del Juramento Carmesí",
  salamander_shield: "Baluarte de Brasa Viva",
  wings_of_elf: "Alas de la Vigilia",
  wings_of_heaven: "Alas del Firmamento Roto",
  wings_of_satan: "Alas del Exiliado",
  ring_of_ice: "Anillo de Escarcha Silente",
  ring_of_poison: "Sello del Veneno Antiguo",
  ring_of_fire: "Sortija de Brasa",
  ring_of_wind: "Anillo del Vendaval",
  ring_of_magic: "Sello del Éter",
  transformation_ring: "Sortija de la Otra Faz",
  pendant_of_lightning: "Colgante del Trueno Gris",
  pendant_of_fire: "Medallón de la Pira",
  pendant_of_ice: "Amuleto del Invierno",
  pendant_of_wind: "Colgante del Céfiro",
  pendant_of_ability: "Medallón de la Voluntad",
  jewel_of_bless: "Gema del Pacto",
  jewel_of_soul: "Gema del Azar",
  jewel_of_chaos: "Prisma del Caos",
  jewel_of_life: "Gema del Pulso",
  guardian_angel: "Lumen Custodio",
  imp: "Diablillo de Ceniza",
  horn_of_uniria: "Cuerno del Corcel Umbrío",
  apple: "Fruto Carmesí",
  small_healing_potion: "Frasco de Savia Menor",
  healing_potion: "Tónico de Sangre",
  large_healing_potion: "Elixir de Vida Plena",
  small_mana_potion: "Vial de Niebla Menor",
  mana_potion: "Tónico de Éter",
  large_mana_potion: "Elixir de Maná Pleno",
  antidote: "Sal de Purga",
  ale: "Malta del Caminante",
  town_portal_scroll: "Sello de Retorno",
  scroll_of_energy_ball: "Tomo del Orbe Arcano",
  scroll_of_fire_ball: "Tomo de la Esfera Ígnea",
  scroll_of_power_wave: "Tomo de la Onda Astral",
  scroll_of_lightning: "Tomo del Relámpago",
  scroll_of_meteorite: "Tomo del Meteoro",
  scroll_of_ice: "Tomo de Escarcha",
  scroll_of_poison: "Tomo del Tósigo",
  scroll_of_flame: "Tomo de la Llama",
  scroll_of_teleport: "Tomo del Paso Etéreo",
  scroll_of_twister: "Tomo del Torbellino",
  scroll_of_evil_spirit: "Tomo del Espectro Hostil",
  scroll_of_hellfire: "Tomo del Fuego Abisal",
  arrows: "Astiles del Bosque Gris",
  bolts: "Virotes de la Vigilia",
};

const armorFamilies = {
  set_leather: ["la Senda del Alba", "knight", "barbarian"],
  set_bronze: ["el Juramento de Aden", "knight", "barbarian"],
  set_scale: ["la Escama de Brasa", "knight", "barbarian"],
  set_brass: ["el Bastión de Ceniza", "knight", "barbarian"],
  set_plate: ["la Vigilia de Hierro", "knight", "barbarian"],
  set_dragon: ["la Sangre del Wyrm", "knight", "barbarian"],
  set_black_dragon: ["la Sombra de Nihil", "knight", "barbarian"],
  set_pad: ["el Acólito del Velo", "mage"],
  set_bone: ["el Oráculo de Hueso", "mage"],
  set_sphinx: ["el Enigma de Umbra", "mage"],
  set_legendary: ["el Arconte de Aden", "mage"],
  set_grand_soul: ["el Alma Primordial", "mage"],
  set_vine: ["la Raíz Errante", "ranger", "rogue"],
  set_silk: ["la Bruma Silvana", "ranger", "rogue"],
  set_wind: ["el Vendaval Gris", "ranger", "rogue"],
  set_spirit: ["el Eco Ancestral", "ranger", "rogue"],
  set_guardian: ["el Juramento Verde", "ranger", "rogue"],
};

const pieceNames = {
  helm: ["Yelmo", "helmet"],
  armor: ["Coraza", "armor"],
  pants: ["Grebas", "pants"],
  gloves: ["Guantes", "gloves"],
  boots: ["Botas", "boots"],
};

const allClasses = ["knight", "mage", "barbarian", "rogue", "ranger"];
const categoryIndices = new Map();
const familyIndices = new Map();

function slug(text) {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function nextIndex(group) {
  const value = (categoryIndices.get(group) ?? 0) + 1;
  categoryIndices.set(group, value);
  return value;
}

function classesFor(item) {
  if (item.clases === "TODAS") return allClasses;
  if (item.categoria === "armadura") return armorFamilies[item.subcategoria].slice(1);
  if (item.clases === "DW") return ["mage"];
  if (item.clases === "ELF") return item.categoria === "arma" || item.categoria === "municion" ? ["ranger"] : ["ranger", "rogue"];
  if (item.clases === "DK/ELF") return ["knight", "rogue", "ranger"];
  if (item.subcategoria === "espada") return item.manos === "2H" ? ["knight", "barbarian"] : ["knight"];
  if (["hacha", "maza", "lanza"].includes(item.subcategoria)) return ["barbarian", "knight"];
  return ["knight", "barbarian"];
}

function nameFor(item) {
  if (item.categoria !== "armadura") return fixedNames[item.id];
  const suffix = Object.keys(pieceNames).find((candidate) => item.id.endsWith(`_${candidate}`));
  const [piece] = pieceNames[suffix];
  return `${piece} de ${armorFamilies[item.subcategoria][0]}`;
}

function tierFor(item) {
  if (item.categoria === "armadura") {
    if (!familyIndices.has(item.subcategoria)) {
      const classKey = item.clases;
      familyIndices.set(item.subcategoria, nextIndex(`armor:${classKey}`));
    }
    return familyIndices.get(item.subcategoria);
  }
  return nextIndex(`${item.categoria}:${item.subcategoria}`);
}

function qualityFor(item) {
  if (item.rarezas_posibles.includes("no_aplica")) return [];
  const qualities = [];
  if (item.rarezas_posibles.includes("normal")) qualities.push("normal");
  if (item.rarezas_posibles.includes("adicional")) qualities.push("magic");
  if (item.rarezas_posibles.includes("excellent")) qualities.push("excellent");
  return qualities;
}

function weaponAttack(subcategory, tier, count) {
  const minimums = { espada: 4, hacha: 6, maza: 5, lanza: 7, arco: 5, ballesta: 6, baston: 5 };
  const minimum = minimums[subcategory];
  return minimum + Math.round(((tier - 1) / Math.max(1, count - 1)) * (35 - minimum));
}

function armorDefense(tier, slot) {
  const totalsByClass = {
    DK: [10, 17, 25, 34, 44, 56, 68],
    DW: [8, 16, 26, 39, 55],
    ELF: [8, 15, 24, 35, 50],
  };
  const weights = { helmet: 0.2, armor: 0.3, pants: 0.2, gloves: 0.14, boots: 0.16 };
  return { totalsByClass, weights };
}

const subcategoryCounts = Object.fromEntries(Object.entries(Object.groupBy(source, (item) => item.subcategoria)).map(([key, values]) => [key, values.length]));
const armorPieces = new Map();

for (const item of source.filter((candidate) => candidate.categoria === "armadura")) {
  const suffix = Object.keys(pieceNames).find((candidate) => item.id.endsWith(`_${candidate}`));
  const slot = pieceNames[suffix][1];
  const tier = tierFor(item);
  const { totalsByClass, weights } = armorDefense(tier, slot);
  const total = totalsByClass[item.clases][tier - 1];
  const familyItems = source.filter((candidate) => candidate.subcategoria === item.subcategoria);
  const raw = familyItems.map((candidate) => {
    const candidateSuffix = Object.keys(pieceNames).find((value) => candidate.id.endsWith(`_${value}`));
    return Math.max(1, Math.round(total * weights[pieceNames[candidateSuffix][1]]));
  });
  raw[1] += total - raw.reduce((sum, value) => sum + value, 0);
  armorPieces.set(item.id, { slot, pDef: raw[familyItems.findIndex((candidate) => candidate.id === item.id)], tier });
}

categoryIndices.clear();
familyIndices.clear();

function descriptionFor(item, name, tier) {
  const specific = {
    jewel_of_bless: 'Mejora un objeto un nivel de forma segura, hasta +6.',
    jewel_of_soul: 'Mejora hasta +9: 50% de éxito, o 75% con Suerte. El fallo resta un nivel; el éxito puede otorgar Suerte.',
    jewel_of_life: '65% de agregar +4 de ataque o defensa, hasta +28; el fallo conserva las opciones.',
    jewel_of_chaos: 'Otorga una habilidad a un arma. Con un arma +6 de tier 3 o más y 500 de oro, forja un arma ritual; con un arma ritual +9 y nivel 40, forja alas.',
    guardian_angel: 'Compañero guardián: reduce el daño recibido un 8% y regenera 1% de vida por segundo.',
    imp: 'Compañero ofensivo: aumenta el ataque un 8%.',
    horn_of_uniria: 'Montura espiritual: aumenta la velocidad de movimiento un 20%.',
    ring_of_ice: 'Reduce 20% del daño de hielo y la duración de raíces gélidas.',
    ring_of_poison: 'Reduce 20% del daño de veneno.',
    ring_of_fire: 'Reduce 20% del daño de fuego.',
    ring_of_wind: 'Reduce 20% del daño de viento y relámpagos.',
    ring_of_magic: 'Aumenta el maná máximo en 20.',
    transformation_ring: 'Reliquia de metamorfosis: cambia la apariencia del portador a un espectro mientras está equipada.',
    pendant_of_lightning: 'Reduce 20% del daño de relámpagos.',
    pendant_of_fire: 'Reduce 20% del daño de fuego.',
    pendant_of_ice: 'Reduce 20% del daño de hielo y la duración de raíces gélidas.',
    pendant_of_wind: 'Reduce 20% del daño de viento y relámpagos.',
    pendant_of_ability: 'Aumenta el maná máximo en 25 y su regeneración en 1% por segundo.',
    antidote:'Elimina el veneno activo. No se consume si no estás envenenado.',
    ale:'Bebida de campaña: aumenta el ataque un 5% durante 15 segundos.',
    town_portal_scroll:'Te devuelve al pueblo, fuera del combate; no se consume si ya estás allí.',
  };
  if(specific[item.id])return specific[item.id];
  if(item.categoria==='alas')return 'Alas rituales de nivel 40: +3% de ataque y absorción de daño, +5% de movimiento; no permiten atravesar los límites del mapa.';
  if(item.categoria==='arma') {
    let text=item.descripcion;
    for(const original of [...source].sort((a,b)=>b.nombre.length-a.nombre.length))text=text.replaceAll(original.nombre,nameFor(original));
    return text.replaceAll('Dark Knight','Caballero o Bárbaro').replaceAll('Dark Wizard','Mago').replaceAll('Elf','Explorador').replaceAll('Chaos Machine','Fragua de Dorne');
  }
  const hand = item.manos === "2H" ? "a dos manos" : "a una mano";
  if (item.categoria === "arma") return `${name} es un arma ${hand} de tier ${tier}, ajustada al arsenal de Aden sin perder la progresión de su linaje.`;
  if (item.categoria === "escudo") return `${name} ofrece defensa de tier ${tier} y ocupa la mano secundaria.`;
  if (item.categoria === "armadura") return `${name} es una pieza de tier ${tier}; su defensa forma parte del total equilibrado del conjunto.`;
  if (item.categoria === "alas") return `${name} permite el vuelo y refuerza la afinidad de su clase.`;
  if (item.categoria === "anillo" || item.categoria === "pendant") return `${name} conserva la resistencia o afinidad descrita por la reliquia de origen.`;
  if (item.categoria === "joya") return `${name} se consume para aplicar su ritual de mejora sobre otro objeto.`;
  if (item.categoria === "mascota") return `${name} acompaña al personaje desde la ranura de mascota y concede su efecto característico.`;
  if (item.subcategoria === "pergamino_hechizo") return `${name} enseña de forma permanente el hechizo asociado a este tomo.`;
  if (item.categoria === "consumible") return `${name} se consume para activar su efecto de ${item.subcategoria === "pergamino" ? "retorno" : "recuperación o utilidad"}.`;
  return `${name} es munición apilable preparada para armas de proyectiles.`;
}

const healValues = { apple: 12, small_healing_potion: 35, healing_potion: 70, large_healing_potion: 130 };
const manaValues = { small_mana_potion: 30, mana_potion: 65, large_mana_potion: 125 };
const jewelEffects = { jewel_of_bless: "upgrade_safe", jewel_of_soul: "upgrade_risky", jewel_of_chaos: "chaos", jewel_of_life: "add_option" };
const simpleEffects = { antidote: "antidote", ale: "ale", town_portal_scroll: "town_portal" };
const petEffects = { guardian_angel: "guardian", imp: "imp", horn_of_uniria: "mount" };

const items = source.map((item) => {
  const name = nameFor(item);
  if (!name) throw new Error(`Falta nombre adaptado para ${item.id}`);
  const id = `aden_${slug(name)}`;
  const tier = item.categoria === "armadura" ? armorPieces.get(item.id).tier : tierFor(item);
  const result = {
    id,
    name,
    type: item.categoria === "municion" ? "material" : ["joya", "consumible"].includes(item.categoria) ? "consumable" : "equipment",
    stackable: ["joya", "consumible", "municion"].includes(item.categoria),
    ref_origen: item.id,
    category: item.categoria,
    subcategory: item.subcategoria,
    classes: classesFor(item),
    hands: item.manos ?? null,
    tier,
    description: descriptionFor(item, name, tier),
    allowedQualities: qualityFor(item),
  };

  if (result.type === "equipment") {
    const count=item.categoria==='armadura'?(item.clases==='DK'?7:5):subcategoryCounts[item.subcategoria];
    result.requiredLevel=['arma','armadura','escudo'].includes(item.categoria)?1+Math.round((tier-1)/Math.max(1,count-1)*39):item.categoria==='alas'?40:1;
  }
  if (item.categoria === "arma") {
    result.slot = "weapon";
    result.bonuses = { pAtk: weaponAttack(item.subcategoria, tier, subcategoryCounts[item.subcategoria]) };
    if (item.subcategoria === "arco") result.ammo = "arrow";
    if (item.subcategoria === "ballesta") result.ammo = "bolt";
  } else if (item.categoria === "escudo") {
    result.slot = "shield";
    result.bonuses = { pDef: 2 + Math.round(((tier - 1) / 14) * 18) };
  } else if (item.categoria === "armadura") {
    const piece = armorPieces.get(item.id);
    result.slot = piece.slot;
    result.bonuses = { pDef: piece.pDef };
    if (piece.slot === "armor") result.bonuses.maxHp = 5 + tier * 5;
    result.setId = `aden_${slug(armorFamilies[item.subcategoria][0])}`;
  } else if (item.categoria === "alas") {
    result.slot = "wings";
    result.bonuses = item.clases === "DW" ? { pDef: 4, maxMp: 30 } : { pAtk: 4, pDef: 4, maxHp: 20 };
  } else if (item.categoria === "anillo") {
    result.slot = "ring";
    result.bonuses = item.id === "ring_of_magic" ? { maxMp: 20 } : { pDef: 2 };
  } else if (item.categoria === "pendant") {
    result.slot = "accessory";
    result.bonuses = item.id === "pendant_of_ability" ? { maxMp: 25 } : { pDef: 2 };
  } else if (item.categoria === "mascota") {
    result.slot = "pet";
    result.petEffect = petEffects[item.id];
  }

  if (healValues[item.id]) {
    result.heal = healValues[item.id];
    result.useEffect = "heal";
  } else if (manaValues[item.id]) {
    result.mana = manaValues[item.id];
    result.useEffect = "mana";
  } else if (jewelEffects[item.id]) {
    result.useEffect = jewelEffects[item.id];
  } else if (simpleEffects[item.id]) {
    result.useEffect = simpleEffects[item.id];
  } else if (item.subcategoria === "pergamino_hechizo") {
    result.useEffect = "learn_skill";
    result.learnSkill = `tome_${item.id.replace("scroll_of_", "")}`;
  } else if (item.categoria === "municion") {
    result.ammo = item.id === "arrows" ? "arrow" : "bolt";
  }

  return result;
});

const ids = new Set(items.map((item) => item.id));
const names = new Set(items.map((item) => item.name));
if (ids.size !== 208 || names.size !== 208) throw new Error("IDs o nombres adaptados duplicados");
const copiedNames = items.filter((item) => {
  const original = source.find((candidate) => candidate.id === item.ref_origen);
  return [original.nombre, original.nombre_es].filter(Boolean).some((label) => slug(label) === slug(item.name));
});
if (copiedNames.length > 0) {
  throw new Error(`Los nombres deben ser propios de Aden: ${copiedNames.map((item) => item.ref_origen).join(", ")}`);
}

const interfaceText = `export interface CatalogItem {
  id: string;
  name: string;
  type: "equipment" | "consumable" | "material";
  stackable: boolean;
  ref_origen: string;
  category: string;
  subcategory: string;
  classes: string[];
  hands: "1H" | "2H" | null;
  tier: number;
  description: string;
  allowedQualities: ("normal" | "magic" | "excellent")[];
  requiredLevel?: number;
  slot?: "weapon" | "armor" | "accessory" | "shield" | "helmet" | "gloves" | "pants" | "boots" | "wings" | "ring" | "pet";
  bonuses?: { pAtk?: number; pDef?: number; maxHp?: number; maxMp?: number };
  setId?: string;
  heal?: number;
  mana?: number;
  useEffect?: string;
  learnSkill?: string;
  ammo?: "arrow" | "bolt";
  petEffect?: "guardian" | "imp" | "mount";
}
`;

const catalogText = `${interfaceText}\nconst ITEMS: CatalogItem[] = ${JSON.stringify(items, null, 2)};\n\nexport const CATALOG_ITEMS: Record<string, CatalogItem> = Object.fromEntries(\n  ITEMS.map((item) => [item.id, item]),\n);\n`;
writeFileSync(resolve(repo, "shared", "src", "catalog.ts"), catalogText);

const tableRows = items.map((item) => `| ${source.find(s=>s.id===item.ref_origen).nombre} | \`${item.ref_origen}\` | \`${item.id}\` | ${item.name} | ${item.classes.join(", ")} | ${item.tier} |`);
const docsText = `# Catálogo de objetos de Aden\n\nEste catálogo adapta los 208 registros de referencia al mundo de Aden. \`ref_origen\` conserva la trazabilidad; los IDs y nombres de juego son propios. Las clases son las cinco identidades actuales: \`knight\`, \`mage\`, \`barbarian\`, \`rogue\` y \`ranger\`.\n\nLas calidades \`normal\`, \`magic\` y \`excellent\` corresponden a las posibilidades funcionales del origen. La rareza \`set\` se modela con \`setId\`, no como calidad individual. Joyas, consumibles y munición no tienen calidad.\n\n| Nombre original | ID de origen | ID de Aden | Nombre de Aden | Clases | Tier |\n|---|---|---|---|---|---:|\n${tableRows.join("\n")}\n`;
writeFileSync(resolve(repo, "docs", "catalogo-items.md"), docsText);

console.log(`Generados ${items.length} objetos y ${tableRows.length} filas de trazabilidad.`);
