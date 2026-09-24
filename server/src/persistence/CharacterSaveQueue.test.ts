import { describe,it,expect } from 'vitest';
import { CharacterSaveQueue } from './CharacterSaveQueue.js';
import { InMemoryPersistence } from './PersistenceService.js';
import { toCharacterSave } from './CharacterSave.js';
import { PlayerState } from '../state/PlayerState.js';

const save=(gold:number)=>toCharacterSave(Object.assign(new PlayerState(),{gold}));
describe('character save ordering',()=>{
  it('keeps both sides of a failed trade pending when a later leave saves only one player',async()=>{
    const persistence=new InMemoryPersistence();await persistence.save('a',save(100));await persistence.save('b',save(100));
    let fail=true;
    const queue=new CharacterSaveQueue(async rows=>{if(fail)throw Error('offline');await persistence.saveMany(rows);});
    await expect(queue.save([{name:'a',data:save(70)},{name:'b',data:save(130)}])).rejects.toThrow('offline');
    expect((await persistence.load('a'))!.gold).toBe(100);expect((await persistence.load('b'))!.gold).toBe(100);
    fail=false;await queue.save([{name:'a',data:save(65)}]);
    expect((await persistence.load('a'))!.gold).toBe(65);expect((await persistence.load('b'))!.gold).toBe(130);
  });
  it('never lets an older slow save overwrite a later transfer',async()=>{
    const persistence=new InMemoryPersistence();let release!:()=>void;let started!:()=>void;
    const waiting=new Promise<void>(resolve=>{release=resolve;}),began=new Promise<void>(resolve=>{started=resolve;});let calls=0;
    const queue=new CharacterSaveQueue(async rows=>{calls++;if(calls===1){started();await waiting;}await persistence.saveMany(rows);});
    const old=queue.save([{name:'a',data:save(100)}]);await began;
    const trade=queue.save([{name:'a',data:save(70)},{name:'b',data:save(130)}]);expect(calls).toBe(1);release();await old;await trade;
    expect((await persistence.load('a'))!.gold).toBe(70);expect((await persistence.load('b'))!.gold).toBe(130);
  });
});
