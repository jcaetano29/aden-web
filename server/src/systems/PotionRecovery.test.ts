import { describe, it, expect } from 'vitest';
import { PotionRecovery } from './PotionRecovery.js';

describe('account potion recovery', () => {
  it('shares a clock across sessions, keeps HP and MP independent and expires exactly', () => {
    let now=1000; const recovery=new PotionRecovery(()=>now);
    expect(recovery.remaining('account','hp')).toBe(0);
    recovery.start('account','hp'); now+=1250;
    expect(recovery.remaining('account','hp')).toBe(6750);
    expect(recovery.remaining('account','mp')).toBe(0);
    expect(recovery.remaining('different','hp')).toBe(0);
    recovery.start('account','mp'); now+=6750;
    expect(recovery.remaining('account','hp')).toBe(0);
    expect(recovery.remaining('account','mp')).toBe(1250);
    now+=1250; expect(recovery.remaining('account','mp')).toBe(0);
  });
});
