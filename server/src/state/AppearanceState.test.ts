import {it,expect} from 'vitest';
import {defaultAppearance} from '@aden/shared';
import {PlayerState} from './PlayerState.js';
import {toCharacterSave} from '../persistence/CharacterSave.js';
import {InMemoryPersistence} from '../persistence/PersistenceService.js';
it('round trips every cosmetic field and isolates save/load copies',async()=>{
 const player=new PlayerState();player.className='mage';
 const selected={...defaultAppearance('mage','male'),faceId:'broad',skinToneId:'ebony',hairStyleId:'topknot',hairColorId:'copper',eyeColorId:'blue',facialHairId:'goatee',markingId:'scar'};
 player.appearance.apply(selected);expect(player.appearance.toAppearance()).toEqual(selected);
 const save=toCharacterSave(player);expect(save.progress.appearance).toEqual(selected);expect(save.progress.gender).toBe('male');
 player.appearance.faceId='soft';expect(save.progress.appearance?.faceId).toBe('broad');
 const store=new InMemoryPersistence();await store.save('cosmetic',save);save.progress.appearance!.skinToneId='ivory';
 const loaded=(await store.load('cosmetic'))!;expect(loaded.progress.appearance?.skinToneId).toBe('ebony');loaded.progress.appearance!.hairColorId='raven';expect((await store.load('cosmetic'))?.progress.appearance?.hairColorId).toBe('copper');
});
