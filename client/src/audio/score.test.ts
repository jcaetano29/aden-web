import { describe, expect, it } from 'vitest';
import { ZONES } from '@aden/shared';
import { buildScore, getSoundtrack, SOUNDTRACKS } from './score.js';

describe('map compositions', () => {
  it('gives every playable map its own named composition', () => {
    expect(Object.keys(SOUNDTRACKS).sort()).toEqual(ZONES.map(z => z.id).sort());
    expect(new Set(Object.values(SOUNDTRACKS).map(s => s.title)).size).toBe(ZONES.length);
    expect(getSoundtrack('unknown')).toBe(SOUNDTRACKS.pueblo);
  });

  for (const zone of ZONES) it(`${zone.id}: a repeatable, finite 32-bar arrangement with melody and accompaniment`, () => {
    const profile = getSoundtrack(zone.id);
    const score = buildScore(profile);
    expect(score).toEqual(buildScore(profile));
    expect(score.beats).toBe(32 * profile.meter);
    expect(score.beats * 60 / profile.bpm).toBeGreaterThan(65);
    expect(score.notes.length).toBeGreaterThan(100);
    expect(new Set(score.notes.map(n => n.voice)).size).toBeGreaterThanOrEqual(3);
    expect(new Set(score.notes.filter(n => n.voice === profile.lead).map(n => n.midi)).size).toBeGreaterThan(5);
    for (const note of score.notes) {
      expect(note.beat).toBeGreaterThanOrEqual(0);
      expect(note.beat).toBeLessThan(score.beats);
      expect(note.duration).toBeGreaterThan(0);
      expect(note.duration).toBeLessThanOrEqual(profile.meter * 2);
      expect(note.midi).toBeGreaterThanOrEqual(24);
      expect(note.midi).toBeLessThanOrEqual(96);
      expect(note.velocity).toBeGreaterThan(0);
      expect(note.velocity).toBeLessThanOrEqual(1);
    }
    expect(score.notes.map(n => n.beat)).toEqual(score.notes.map(n => n.beat).sort((a, b) => a - b));
  });
});
