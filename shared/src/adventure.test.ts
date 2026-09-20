import { describe, expect, it } from 'vitest';
import { catalogDropPool, dungeonObjective, dungeonReward, questReward } from './adventure.js';
import { getQuest } from './quests.js';
import { getItem, getShopPrice, SHOP_STOCK, SMITH_STOCK, DROP_TABLES } from './items.js';
import { CATALOG_ITEMS } from './catalog.js';
import { SPAWN_ZONES } from './mobs.js';
import { WORLD_OBJECTS } from './worldobjects.js';
import { getZone } from './world.js';

describe('fuentes de recompensas',()=>{
  it('tiendas sólo venden básicos y rechazan compras ocultas',()=>{
    for(const id of [...SHOP_STOCK,...SMITH_STOCK]){
      expect(getShopPrice(id)).toBeGreaterThan(0);
      expect(getItem(id).requiredLevel??1).toBeLessThanOrEqual(1);
      expect(['joya','alas','mascota']).not.toContain(getItem(id).category);
    }
    for(const id of ['bone_blade','crypt_plate','aden_gema_del_pacto','aden_filo_del_verdugo','toString'])expect(()=>getShopPrice(id)).toThrow();
    expect(Object.keys(CATALOG_ITEMS)).toHaveLength(208);
  });
  it('fuentes tienen selección acotada y equipable antes de nivel 11',()=>{
    for(const source of [...SPAWN_ZONES.map(s=>({mapId:s.mapId,lootId:s.templateId})),...WORLD_OBJECTS]){
      const pool=catalogDropPool(source.mapId,source.lootId??'');
      expect(pool.length).toBeLessThanOrEqual(5);
      for(const id of pool){
        const item=getItem(id);
        expect(item.requiredLevel??1).toBeLessThanOrEqual(10);
        expect(['alas','mascota']).not.toContain(item.category);
        if(item.category==='joya')expect(['crypt_warden','skeleton_king']).toContain(source.lootId);
      }
    }
    expect(catalogDropPool('pueblo','chest_pueblo')).toEqual([]);
    expect(catalogDropPool('bosque','breakable')).toEqual([]);
    expect(catalogDropPool('trono','chest_trono')).toEqual([]);
    expect(catalogDropPool('bosque','skeleton_king')).toEqual([]);
    expect(catalogDropPool('bosque','umbra_alpha')).not.toEqual(catalogDropPool('bosque','skeleton_minion'));
  });
  it('cada clase recibe arma válida y mejora tangible en q2',()=>{
    for(const cls of ['knight','mage','barbarian','rogue','ranger']){
      const base=getItem(dungeonReward(cls)), reward=getItem(questReward(getQuest('q2'),cls)!);
      expect(base.classes).toContain(cls);
      expect(base.requiredLevel).toBeLessThanOrEqual(5);
      expect(reward.options?.level).toBe(2);
      expect(reward.bonuses!.pAtk).toBeGreaterThan(base.bonuses!.pAtk!);
      if(cls==='ranger')expect(reward.ammo).toBe('arrow');
    }
  });
});

describe('Cripta de las Dos Llamas',()=>{
  it('tiene suficientes enemigos dentro de límites',()=>{
    const zone=getZone('cripta');
    for(const template of ['crypt_acolyte','crypt_flameguard'])expect(SPAWN_ZONES.filter(s=>s.templateId===template).reduce((n,s)=>n+s.count,0)).toBeGreaterThanOrEqual(3);
    for(const s of SPAWN_ZONES.filter(s=>s.mapId==='cripta')){
      expect(s.centerX-s.radius).toBeGreaterThanOrEqual(zone.bounds.minX);
      expect(s.centerX+s.radius).toBeLessThanOrEqual(zone.bounds.maxX);
      expect(s.centerZ-s.radius).toBeGreaterThanOrEqual(zone.bounds.minZ);
      expect(s.centerZ+s.radius).toBeLessThanOrEqual(zone.bounds.maxZ);
      expect(DROP_TABLES[s.templateId]).toBeDefined();
    }
    expect(WORLD_OBJECTS.filter(s=>s.mapId==='cripta'&&s.kind==='shrine').map(s=>s.id)).toEqual(['crypt_seal_1','crypt_seal_2']);
  });
  it('describe cada etapa y limita contador',()=>{
    expect(dungeonObjective(0,1)).toContain('1/3');
    expect(dungeonObjective(0,99)).toContain('3/3');
    expect(dungeonObjective(1,0)).toContain('primer sello');
    expect(dungeonObjective(2,2)).toContain('2/3');
    expect(dungeonObjective(3,0)).toContain('segundo sello');
    expect(dungeonObjective(4,0)).toContain('círculo');
    expect(dungeonObjective(5,0)).toContain('completada');
  });
});
