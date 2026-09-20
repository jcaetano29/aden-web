import type { ItemTemplate } from "./items.js";

export type ItemQuality = "normal" | "magic" | "excellent";
export interface ItemOptions {
  quality: ItemQuality;
  level: number;
  luck: boolean;
  skill: boolean;
  additional: number;
  excellent: number[];
}
export const QUALITY_LABELS = { normal: "Normal", magic: "Mágico", excellent: "Excelente" };
export const EXCELLENT_LABELS = {
  offensive: ["Golpe excelente +10%", "Ataque +nivel/20", "Ataque +2%", "Velocidad de ataque +7%", "Vida por baja +1/8", "Maná por baja +1/8"],
  defensive: ["Vida máxima +4%", "Maná máximo +4%", "Esquive +10%", "Reducción de daño +4%", "Reflejo +5%", "Oro de monstruos +30%"],
};
export function offensiveOptions(item: ItemTemplate): boolean { return item.category === "arma"; }
export function defaultOptions(): ItemOptions { return { quality:"normal",level:0,luck:false,skill:false,additional:0,excellent:[] }; }

function validate(base: ItemTemplate, o: ItemOptions): void {
  if (base.type !== "equipment" || !base.allowedQualities?.includes(o.quality)) throw new Error("Calidad no permitida");
  if (!Number.isInteger(o.level) || o.level < 0 || o.level > 9) throw new Error("Mejora inválida");
  if (!Number.isInteger(o.additional) || o.additional < 0 || o.additional > 28 || o.additional % 4 !== 0) throw new Error("Opción inválida");
  if (typeof o.luck !== "boolean" || typeof o.skill !== "boolean" || !Array.isArray(o.excellent)) throw new Error("Opciones inválidas");
  if (o.excellent.length > 6 || new Set(o.excellent).size !== o.excellent.length || o.excellent.some(n => !Number.isInteger(n) || n < 0 || n > 5)) throw new Error("Excellent inválido");
  if ((o.quality === "excellent") !== (o.excellent.length > 0)) throw new Error("Excellent requiere opciones");
  if (o.quality === "normal" && (o.luck || o.skill || o.additional)) throw new Error("Normal sin opciones");
  if (o.quality === "magic" && !o.level && !o.luck && !o.skill && !o.additional) throw new Error("Mágico requiere modificadores");
  if ((o.level || o.luck) && !["arma","armadura","escudo","alas"].includes(base.category ?? "")) throw new Error("Mejora no aplicable");
  if (o.skill && base.category !== "arma") throw new Error("Skill sólo en armas");
  if (o.additional && !["arma","armadura","escudo"].includes(base.category ?? "")) throw new Error("Opción adicional no aplicable");
}

/** Versión 1: datos autocontenidos para los mapas JSON y Colyseus ya existentes.
 * El servidor crea el nonce y valida posesión antes de aceptar cualquier operación. */
export function createItemInstance(base: ItemTemplate, input: Partial<ItemOptions>, nonce: string): string {
  const o = { ...defaultOptions(), ...input };
  validate(base, o);
  if (!/^[a-zA-Z0-9_-]{1,48}$/.test(nonce)) throw new Error("Identificador inválido");
  const mask = o.excellent.reduce((m,n) => m | (1 << n), 0);
  return `${base.baseId ?? base.id}~1~${o.quality}~${o.level}~${+o.luck}~${+o.skill}~${o.additional}~${mask}~${nonce}`;
}

export function resolveItemInstance(id: string, templates: Record<string, ItemTemplate>): ItemTemplate {
  if (id.length > 240) throw new Error("ID demasiado largo");
  const [baseId, version, quality, level, luck, skill, additional, mask, nonce, extra] = id.split("~");
  const base = Object.hasOwn(templates, baseId) ? templates[baseId] : undefined;
  if (!base || version !== "1" || extra !== undefined || !nonce || !/^[a-zA-Z0-9_-]{1,48}$/.test(nonce) || !/^[01]$/.test(luck) || !/^[01]$/.test(skill) || !/^\d+$/.test(mask) || +mask > 63 || !/^\d+$/.test(level) || !/^\d+$/.test(additional)) throw new Error("Ejemplar inválido");
  const o: ItemOptions = { quality:quality as ItemQuality,level:+level,luck:luck==='1',skill:skill==='1',additional:+additional,excellent:[0,1,2,3,4,5].filter(n => (+mask & (1<<n)) !== 0) };
  validate(base,o);
  const bonuses = { ...base.bonuses };
  const stat = base.category === "arma" ? "pAtk" : "pDef";
  bonuses[stat] = (bonuses[stat] ?? 0) + o.level * 2 + o.additional;
  return { ...base, id, baseId, options:o, bonuses, rarity: o.quality === "excellent" ? "excellent" : o.quality === "magic" ? "magic" : "common", name: `${base.name}${o.level ? ` +${o.level}` : ''}${o.quality !== 'normal' ? ` · ${QUALITY_LABELS[o.quality]}` : ''}` };
}

export interface EquipmentEffects {
  critChance:number; excellentChance:number; levelAttack:number; attackPct:number; attackSpeed:number;
  hpOnKill:number; mpOnKill:number; hpPct:number; mpPct:number; dodge:number; reduction:number; reflect:number; goldPct:number; moveSpeed:number; regen:number;
  fireResist:number; iceResist:number; poisonResist:number; windResist:number; lightningResist:number; manaRegen:number;
}
export function emptyEffects(): EquipmentEffects { return {critChance:0,excellentChance:0,levelAttack:0,attackPct:0,attackSpeed:0,hpOnKill:0,mpOnKill:0,hpPct:0,mpPct:0,dodge:0,reduction:0,reflect:0,goldPct:0,moveSpeed:0,regen:0,fireResist:0,iceResist:0,poisonResist:0,windResist:0,lightningResist:0,manaRegen:0}; }
export function optionEffects(item: ItemTemplate): EquipmentEffects {
  const e = emptyEffects();
  if (item.options?.luck) e.critChance = 0.05;
  for (const option of item.options?.excellent ?? []) {
    if (offensiveOptions(item)) {
      if (option===0) e.excellentChance += .1;
      if (option===1) e.levelAttack += 1/20;
      if (option===2) e.attackPct += .02;
      if (option===3) e.attackSpeed += .07;
      if (option===4) e.hpOnKill += 1/8;
      if (option===5) e.mpOnKill += 1/8;
    } else {
      if (option===0) e.hpPct += .04;
      if (option===1) e.mpPct += .04;
      if (option===2) e.dodge += .1;
      if (option===3) e.reduction += .04;
      if (option===4) e.reflect += .05;
      if (option===5) e.goldPct += .3;
    }
  }
  if (item.category === "alas") { e.attackPct += .03; e.reduction += .03; e.moveSpeed += .05; }
  if (item.petEffect === "guardian") { e.reduction += .08; e.regen += .01; }
  if (item.petEffect === "imp") e.attackPct += .08;
  if (item.petEffect === "mount") e.moveSpeed += .2;
  const ref=item.ref_origen??'';
  if(['ring_of_fire','pendant_of_fire'].includes(ref))e.fireResist=.2;
  if(['ring_of_ice','pendant_of_ice'].includes(ref))e.iceResist=.2;
  if(ref==='ring_of_poison')e.poisonResist=.2;
  if(['ring_of_wind','pendant_of_wind'].includes(ref)){e.windResist=.2;e.lightningResist=.2;}
  if(ref==='pendant_of_lightning')e.lightningResist=.2;
  if(ref==='pendant_of_ability')e.manaRegen=.01;
  return e;
}

/** null = opération inapplicable, aucune joya consumida. Fallar resta un nivel, nunca destruye. */
export function upgradeItem(item: ItemTemplate, effect: string, rng: () => number): ItemOptions | null {
  const o = { ...(item.options ?? defaultOptions()), excellent:[...(item.options?.excellent ?? [])] };
  const upgradeable = ["arma","armadura","escudo","alas"].includes(item.category ?? "");
  if (effect === 'upgrade_safe' || effect === 'upgrade_risky') {
    if (!upgradeable || o.level >= (effect === 'upgrade_safe' ? 6 : 9)) return null;
    o.level = effect === 'upgrade_safe' || rng() < .5 + (o.luck ? .25 : 0) ? o.level+1 : Math.max(0,o.level-1);
    if(effect==='upgrade_risky' && o.level>(item.options?.level??0) && item.allowedQualities?.includes('magic') && rng()<.1)o.luck=true;
  } else if (effect === 'add_option') {
    if (!["arma","armadura","escudo"].includes(item.category ?? '') || o.additional >= 28) return null;
    if (rng() < .65) o.additional += 4;
  } else if (effect === 'chaos') {
    if (item.category !== 'arma' || o.skill) return null;
    o.skill = true;
  } else return null;
  if (o.quality !== 'excellent') o.quality = o.luck || o.skill || o.additional ? 'magic' : 'normal';
  try { validate(item,o); } catch { return null; }
  return o;
}

export function rollItemOptions(item: ItemTemplate, rng: () => number, maxExcellent=2): ItemOptions {
  const o = defaultOptions();
  const roll = rng();
  if (item.allowedQualities?.includes('excellent') && roll < .04) {
    o.quality = 'excellent';
    o.excellent = [Math.min(5,Math.floor(rng()*6))];
    while(o.excellent.length<Math.min(6,Math.max(1,maxExcellent)) && rng()<.2){
      const remaining=[0,1,2,3,4,5].filter(n=>!o.excellent.includes(n));
      o.excellent.push(remaining[Math.min(remaining.length-1,Math.floor(rng()*remaining.length))]);
    }
  } else if (item.allowedQualities?.includes('magic') && roll < .25 && ['arma','armadura','escudo','alas'].includes(item.category ?? '')) {
    o.quality = 'magic'; o.luck = true;
  }
  if (['arma','armadura','escudo','alas'].includes(item.category ?? '') && rng() < .2) o.level = 1+Math.min(2,Math.floor(rng()*3));
  if(item.category==='arma' && item.allowedQualities?.includes('magic') && rng()<.1){o.skill=true;if(o.quality==='normal')o.quality='magic';}
  return o;
}
