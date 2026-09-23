import { CLASS_ORDER, getClass, statsForClass, attributeBonuses, equipmentBonuses, dungeonReward, createItemInstance, getItem, computeDamage, getMobCombat, QUEST_ORDER, getQuest, getMobExp, SPAWN_ZONES } from '../../shared/src/index.ts';
import { useInventoryItem } from '../../server/src/systems/ItemSystem.ts';
const profiles = CLASS_ORDER.map(cls => {
  const weapon = createItemInstance(getItem(dungeonReward(cls)), {quality:'magic',level:5,skill:true}, 'balance_probe');
  const equipment = {weapon,armor:'ash_guard',accessory:'hunter_charm',ring:'aden_sello_del_veneno_antiguo'};
  const base=statsForClass(cls,9),gear=equipmentBonuses(equipment),attr=attributeBonuses({str:8,agi:8,vit:8,ene:0});
  const hp=base.maxHp+gear.maxHp+attr.maxHp,mp=base.maxMp+gear.maxMp,pAtk=base.pAtk+gear.pAtk+attr.pAtk,pDef=base.pDef+gear.pDef+attr.pDef;
  const boss=getMobCombat('skeleton_king'),hit=computeDamage(boss.pAtk,pDef,1,1),out=computeDamage(pAtk,boss.pDef,1,1);
  return {cls,hp,mp,pAtk,pDef,nihilHit:hit,hitPercent:+(100*hit/hp).toFixed(1),hitsToDie:Math.ceil(hp/hit),autoHitsToKill:Math.ceil(boss.maxHp/out),autoSecondsWithFirstHitAtZero:+((Math.ceil(boss.maxHp/out)-1)*getClass(cls).base.attackCooldownMs/1000).toFixed(1),manaRegenPerSecond:+Math.max(2,mp*.04).toFixed(2)};
});
let questXp=0,killXp=0,kills=0;
for(const id of QUEST_ORDER){const q=getQuest(id);questXp+=q.rewardExp;if(q.objective==='kill'){kills+=q.amount;killXp+=q.amount*getMobExp(q.mobTemplateId);}if(q.objective==='dungeon'){for(const s of SPAWN_ZONES.filter(s=>s.mapId==='cripta')){kills+=s.count;killXp+=s.count*getMobExp(s.templateId);}}}
const potionUser={dead:false,className:'knight',level:9,hp:10,maxHp:400,inventory:new Map([['health_potion',{qty:10,itemTemplateId:'health_potion'}]])};
const potionUses=[1,2,3].map(()=>({ok:useInventoryItem(potionUser as any,'health_potion'),hp:potionUser.hp,remaining:potionUser.inventory.get('health_potion')!.qty}));
console.log(JSON.stringify({assumptions:'Nivel 9, 24 puntos repartidos 8 STR/8 AGI/8 VIT, solo equipo garantizado, varianza 1; ataques nominales sin habilidades, movimiento, criticos ni curas; no es una simulacion de partida.',profiles,campaign:{questXp,killXp,totalXp:questXp+killXp,mandatoryKills:kills},potionUses},null,2));
