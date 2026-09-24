import {it,expect} from 'vitest';
import {VEIL_CONTRACTS,VEIL_CONTRACTS_COMPLETE,nextVeilContract} from './veilContracts.js';
import {getWorldObject} from './worldobjects.js';
import {getItem} from './items.js';
import {getZone} from './world.js';
import {findPath,isWalkable} from './navigation.js';
it('has three distinct reachable errands and ends without rotating rewards',()=>{
  expect(new Set(VEIL_CONTRACTS.map(c=>c.objectId)).size).toBe(3);
  for(const [i,c] of VEIL_CONTRACTS.entries()){
    const o=getWorldObject(c.objectId),zone=getZone(c.mapId);
    expect(o.mapId).toBe(c.mapId);expect(o.reusable).toBe(true);expect(isWalkable(zone.id,o)).toBe(true);
    expect(findPath(zone.id,zone.spawn,o).length).toBeGreaterThan(0);expect(getItem(c.rewardItemId)).toBeDefined();
    expect(nextVeilContract(c.id)).toBe(VEIL_CONTRACTS[i+1]?.id??VEIL_CONTRACTS_COMPLETE);
  }
  expect(nextVeilContract(VEIL_CONTRACTS_COMPLETE)).toBe(VEIL_CONTRACTS_COMPLETE);
});
