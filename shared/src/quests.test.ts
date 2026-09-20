import { describe, it, expect } from 'vitest';
import { getQuest, firstQuestId, nextQuestId, QUEST_ORDER, CAMPAIGN_COMPLETE } from './quests.js';
import { MOB_TEMPLATES } from './mobs.js';
import { getWorldObject } from './worldobjects.js';
import { getZone } from './world.js';
import { expToNextLevel, getMobExp } from './progression.js';
import { getItem } from './items.js';
import { questReward } from './adventure.js';

describe('campaña inicial', () => {
  it('conserva q1 y todos los IDs de personajes existentes', () => {
    expect(firstQuestId()).toBe('q1');
    expect(getQuest('q1')).toMatchObject({ title: 'Los primeros huesos', amount: 6, rewardExp: 60, rewardGold: 25, mobTemplateId: 'skeleton_minion' });
    for (let n=1;n<=6;n++) expect(QUEST_ORDER).toContain(`q${n}`);
    expect(()=>getQuest('nope')).toThrow();
  });
  it('termina sin reiniciar ni repartir nuevamente los premios', () => {
    expect(QUEST_ORDER).toHaveLength(12);
    expect(new Set(QUEST_ORDER).size).toBe(12);
    for (let n=0;n<QUEST_ORDER.length-1;n++) expect(nextQuestId(QUEST_ORDER[n])).toBe(QUEST_ORDER[n+1]);
    expect(nextQuestId('q6')).toBe(CAMPAIGN_COMPLETE);
    expect(nextQuestId(CAMPAIGN_COMPLETE)).toBe(CAMPAIGN_COMPLETE);
    expect(nextQuestId('unknown')).toBe('q1');
  });
  it('cada objetivo apunta a contenido existente y explica cómo encontrarlo', () => {
    for (const id of QUEST_ORDER) {
      const q=getQuest(id);
      expect(q.intro.length).toBeGreaterThan(10);
      expect(q.done.length).toBeGreaterThan(10);
      expect(q.hint!.length).toBeGreaterThan(10);
      expect(()=>getZone(q.mapId!)).not.toThrow();
      if(q.objective==='interact') expect(getWorldObject(q.targetId!).mapId).toBe(q.mapId);
      if(q.objective==='kill'||q.objective==='dungeon') expect(MOB_TEMPLATES[q.mobTemplateId]).toBeDefined();
    }
  });
  it('alcanza cada puerta sólo con objetivos obligatorios, y termina en nivel 10', () => {
    let xp=0,level=1;
    for(const id of QUEST_ORDER){
      const q=getQuest(id);
      expect(level, `entrada a ${id} / ${q.mapId}`).toBeGreaterThanOrEqual(getZone(q.mapId!).levelReq);
      if(id==='q6') expect(level).toBe(9);
      if(q.objective==='kill') xp+=getMobExp(q.mobTemplateId)*q.amount;
      if(q.objective==='dungeon') xp+=3*getMobExp('crypt_acolyte')+3*getMobExp('crypt_flameguard')+getMobExp('crypt_warden');
      xp+=q.rewardExp;
      while(xp>=expToNextLevel(level)){xp-=expToNextLevel(level);level++;}
      for(const cls of ['knight','mage','barbarian','rogue','ranger']){
        const reward=questReward(q,cls);if(!reward)continue;
        const item=getItem(reward);
        expect(item.requiredLevel??1).toBeLessThanOrEqual(level);
        if(item.classes)expect(item.classes).toContain(cls);
      }
    }
    expect(level).toBe(10);
  });
});
