import { describe, it, expect } from 'vitest';
import { QUESTS, getItem, getClass, ammoSkillBlock, AMMO_SKILLS, SIDE_CHAINS } from './index.js';

describe('shooting skills and ranged weapons', () => {
  it('needs a weapon that fires ammunition and ammunition of its kind', () => {
    expect(ammoSkillBlock('aimed_shot', 'aden_destral_silvano', [])).toBe('weapon');
    expect(ammoSkillBlock('aimed_shot', undefined, [])).toBe('weapon');
    expect(ammoSkillBlock('aimed_shot', 'aden_arco_de_la_senda', [{ itemTemplateId: 'aden_virotes_de_la_vigilia', qty: 20 }])).toBe('ammo');
    expect(ammoSkillBlock('aimed_shot', 'aden_arco_de_la_senda', [{ itemTemplateId: 'aden_astiles_del_bosque_gris', qty: 0 }])).toBe('ammo');
    expect(ammoSkillBlock('aimed_shot', 'aden_arco_de_la_senda', [{ itemTemplateId: 'aden_astiles_del_bosque_gris', qty: 5 }])).toBeNull();
    expect(ammoSkillBlock('backstab', undefined, [])).toBeNull();
  });
  it('covers every ranger damage skill that fires a projectile', () => {
    const shots = getClass('ranger').skills.map(s => s.id).filter(id => ['aimed_shot', 'snaring_shot', 'piercing_shot'].includes(id));
    for (const id of shots) expect(AMMO_SKILLS).toContain(id);
  });
  it('gives the ranger an upgraded catalog crossbow at the foreman', () => {
    const item = getItem(QUESTS.f_foreman.rewardByClass!.ranger);
    expect(item).toMatchObject({ baseId: 'aden_trueno_de_la_frontera', ammo: 'bolt', name: 'Trueno de la Frontera +2 · Mágico' });
    expect(item.bonuses?.pAtk).toBe(20);
  });
  it('never rewards a ranger with a weapon that cannot fire their skills', () => {
    const rewards = [
      ...Object.values(QUESTS).flatMap(q => [q.rewardByClass?.ranger]),
      ...SIDE_CHAINS.flatMap(c => c.steps.map(s => s.rewardItemId)),
    ].filter((id): id is string => !!id);
    for (const id of rewards) {
      const item = getItem(id);
      if (item.category !== 'arma' || !(item.classes ?? []).includes('ranger')) continue;
      expect(item.ammo, `${id} (${item.name})`).toBeDefined();
    }
  });
});
