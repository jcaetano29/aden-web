import {it,expect} from 'vitest';
import {defaultAppearance} from '@aden/shared';
import {snapshotAppearance} from './NetworkClient.js';
it('normalizes legacy snapshots and copies every modern field',()=>{expect(snapshotAppearance({className:'mage',gender:'female'})).toEqual(defaultAppearance('mage','female'));const appearance={...defaultAppearance('ranger','male'),hairStyleId:'mane',markingId:'scar',facialHairId:'full'};const snap=snapshotAppearance({className:'ranger',appearance});expect(snap).toEqual(appearance);expect(snap).not.toBe(appearance);});
