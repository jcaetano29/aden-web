import {describe,it,expect,beforeAll,afterAll,beforeEach,vi} from 'vitest';
import {boot,type ColyseusTestServer} from '@colyseus/testing';
import {defaultAppearance,statsForClass} from '@aden/shared';
import appConfig from '../testServer.js';
import {GameRoom} from './GameRoom.js';
import {toCharacterSave} from '../persistence/CharacterSave.js';
import {hashPassword} from '../auth/password.js';
describe('persistent character cosmetics over real connections',()=>{
 let server:ColyseusTestServer;
 beforeAll(async()=>{server=await boot(appConfig,2602);});afterAll(async()=>{await server.shutdown();});beforeEach(async()=>{await server.cleanup();});
 it('replicates, saves and restores identity while ignoring login cosmetics',async()=>{
  const room=await server.createRoom('game',{}) as GameRoom;const observer=await server.connectTo(room,{name:'CosmeticObserve'});
  const selected={...defaultAppearance('mage','female'),faceId:'noble',skinToneId:'ebony',hairStyleId:'ponytail',markingId:'paint'};
  const client=await server.connectTo(room,{name:'CosmeticHero',password:'test123',mode:'create',className:'mage',appearance:selected});
  await vi.waitFor(()=>{expect(observer.state.players.get(client.sessionId)?.appearance.toJSON()).toMatchObject(selected);expect(client.state.players.get(client.sessionId)?.appearance.toJSON()).toMatchObject(selected);});
  await client.leave();await vi.waitFor(()=>expect((GameRoom as any).activeAccounts.has('CosmeticHero')).toBe(false));
  const login=await server.connectTo(room,{name:'CosmeticHero',password:'test123',mode:'login',className:'knight',gender:'male',appearance:defaultAppearance('knight','male')});
  await vi.waitFor(()=>{const p=login.state.players.get(login.sessionId);expect(p?.appearance.toJSON()).toMatchObject(selected);expect(p?.className).toBe('mage');expect(p?.gender).toBe('female');expect(p?.pAtk).toBe(statsForClass('mage',1).pAtk);});
 });
 it.each([{faceId:'missing'},{version:2}])('rejects invalid creation without taking the account name %s',async invalid=>{
  const room=await server.createRoom('game',{}) as GameRoom;await server.connectTo(room,{name:'KeepRoom'});
  const options={name:'RejectCosmetic',password:'test123',mode:'create',className:'knight',appearance:{...defaultAppearance('knight','male'),...invalid}};
  await expect(server.connectTo(room,options)).rejects.toThrow();expect(await (room as any).persistence.loadAccount(options.name)).toBeNull();
  const fixed=await server.connectTo(room,{...options,appearance:defaultAppearance('knight','male')});expect(fixed.sessionId).toBeTruthy();
 });
 it('rejects a future save without overwriting it and releases its reservation',async()=>{
  const room=await server.createRoom('game',{}) as GameRoom;const keep=await server.connectTo(room,{name:'FutureObserve'});const p=room.state.players.get(keep.sessionId)!;
  const store=(room as any).persistence,save=toCharacterSave(p);save.progress.appearance={...defaultAppearance('knight','male'),version:2} as any;
  const {hash,salt}=hashPassword('test123');await store.saveAccount({name:'FutureHero',passwordHash:hash,passwordSalt:salt});await store.save('FutureHero',save);const write=vi.spyOn(store,'saveMany');
  await expect(server.connectTo(room,{name:'FutureHero',password:'test123',mode:'login'})).rejects.toThrow();
  expect((await store.load('FutureHero')).progress.appearance.version).toBe(2);expect(write).not.toHaveBeenCalled();expect((GameRoom as any).activeAccounts.has('FutureHero')).toBe(false);expect([...(room as any).accountNames.values()]).not.toContain('FutureHero');
  delete save.progress.appearance;save.progress.gender='female';await store.save('FutureHero',save);
  const recovered=await server.connectTo(room,{name:'FutureHero',password:'test123',mode:'login'});await vi.waitFor(()=>expect(recovered.state.players.get(recovered.sessionId)?.appearance.gender).toBe('female'));
 });
});
