/** Original, deterministic chamber-fantasy scores. Times are in musical beats. */
export type Voice = 'strings' | 'harp' | 'flute' | 'bell' | 'choir' | 'horn' | 'bass' | 'drum';
export interface Note { beat: number; duration: number; midi: number; velocity: number; pan: number; voice: Voice; }
type Motif = readonly (readonly [beat: number, degree: number, duration: number])[];
export interface Soundtrack {
  id: string; title: string; description: string; bpm: number; meter: number;
  tonic: number; scale: readonly number[]; chords: readonly number[];
  lead: Voice; pad: Voice; pluck: Voice; motifs: readonly Motif[];
  reverb: number; wind: number; windHz: number; percussion: number;
}

export const SOUNDTRACKS: Record<string, Soundtrack> = {
  monasterio: {
    id: 'monasterio', title: 'La última vigilia', description: 'Coro, cuerdas y campanas del archivo perdido',
    bpm: 68, meter: 4, tonic: 45, scale: [0, 2, 3, 5, 7, 8, 11],
    chords: [0, 3, 5, 0, 4, 5, 3, 0], lead: 'bell', pad: 'choir', pluck: 'harp',
    motifs: [
      [[0, 0, 2], [3, 4, 1.5], [5, 3, 1.5], [7, 1, .8]],
      [[1, 2, 2], [4, 5, 1.5], [6, 4, 1.5]],
      [[0, 7, 2], [3, 5, 1.5], [5, 3, 2]],
      [[0, 4, 2], [3, 2, 1], [5, 1, 1], [7, 0, 1]],
    ], reverb: 3.8, wind: .18, windHz: 420, percussion: .1,
  },
  minas: {
    id: 'minas', title: 'Ecos del yunque', description: 'Trompas graves, tambores y cuerdas bajo la montaña',
    bpm: 72, meter: 4, tonic: 43, scale: [0, 2, 3, 5, 7, 8, 10],
    chords: [0, 5, 3, 4, 0, 6, 4, 0], lead: 'horn', pad: 'strings', pluck: 'bell',
    motifs: [
      [[0, 0, 1.5], [2, 3, 1], [3, 4, .8], [4, 3, 1.5], [6, 0, 1.5]],
      [[0, 4, 1], [1, 5, 1], [2, 7, 2], [5, 5, 1], [6, 4, 1.5]],
      [[.5, 3, 1.5], [2.5, 2, 1], [4, 0, 2], [7, -1, .8]],
      [[0, 0, 1], [1, 0, .5], [1.5, 3, 1.5], [4, 4, 1], [5, 2, 2]],
    ], reverb: 2.4, wind: .16, windHz: 380, percussion: .3,
  },
  marismas: {
    id: 'marismas', title: 'Nombres sobre el agua', description: 'Flauta y campanas entre juncos y recuerdos',
    bpm: 64, meter: 4, tonic: 46, scale: [0, 2, 3, 5, 7, 9, 10],
    chords: [0, 5, 3, 0, 6, 3, 4, 0], lead: 'flute', pad: 'strings', pluck: 'bell',
    motifs: [
      [[0, 0, 2], [3, 2, 1.2], [5, 4, 2], [7, 3, .8]],
      [[1, 2, 1.8], [4, 1, 1.5], [6, 0, 1.8]],
      [[0, 5, 2.2], [3, 4, 1.8], [6, 2, 1.4]],
      [[.5, 3, 1.8], [3, 1, 1], [5, -1, 1.5], [7, 0, .8]],
    ], reverb: 3.3, wind: .3, windHz: 700, percussion: .08,
  },
  pueblo: {
    id: 'pueblo', title: 'Lumbre del hogar', description: 'Arpa, flauta y cuerdas al abrigo de Aden',
    bpm: 78, meter: 3, tonic: 50, scale: [0, 2, 4, 5, 7, 9, 11],
    chords: [0, 4, 5, 2, 3, 0, 4, 0], lead: 'flute', pad: 'strings', pluck: 'harp',
    motifs: [
      [[0, 2, 1], [1, 4, .5], [1.5, 5, .5], [2, 4, 1.6], [4, 2, .5], [4.5, 1, .5], [5, 0, .8]],
      [[0, 2, 1.5], [1.5, 1, .5], [2, 0, 1], [3, 1, .5], [3.5, 2, .5], [4, 4, 1.5]],
      [[0, 5, 1], [1, 7, 1], [2, 6, .8], [3, 4, 1.5], [4.5, 2, .5], [5, 3, .8]],
      [[0, 4, 1], [1, 2, .5], [1.5, 1, .5], [2, 0, 1.5], [4, 1, .5], [4.5, -1, .5], [5, 0, .8]],
    ], reverb: 1.7, wind: .12, windHz: 650, percussion: 0,
  },
  bosque: {
    id: 'bosque', title: 'Susurros de Umbra', description: 'Flauta lejana, hojas y arpegios de madera',
    bpm: 68, meter: 4, tonic: 50, scale: [0, 2, 3, 5, 7, 9, 10],
    chords: [0, 3, 0, 6, 3, 5, 6, 0], lead: 'flute', pad: 'strings', pluck: 'harp',
    motifs: [
      [[.5, 0, 1.5], [2.5, 2, .8], [3.5, 4, 1.8], [6, 3, .8], [7, 1, .6]],
      [[0, 2, 2], [3, 1, .8], [4, 0, 1.4], [6, -1, .6], [7, 0, .7]],
      [[1, 4, 1.5], [3, 5, .7], [4, 7, 1.6], [6.5, 5, .6], [7.25, 4, .5]],
      [[.5, 3, 1.5], [2.5, 2, 1], [4, 1, 1.5], [6, 0, 1.6]],
    ], reverb: 2.8, wind: .24, windHz: 1100, percussion: 0,
  },
  ruinas: {
    id: 'ruinas', title: 'Memoria de la piedra', description: 'Campanas veladas entre muros olvidados',
    bpm: 62, meter: 4, tonic: 48, scale: [0, 2, 3, 5, 7, 8, 10],
    chords: [0, 5, 2, 6, 3, 0, 4, 0], lead: 'bell', pad: 'strings', pluck: 'harp',
    motifs: [
      [[0, 4, 2.3], [3, 2, 1.6], [5.5, 1, 1.8]],
      [[.5, 0, 2], [3.5, -1, 1.5], [6, 2, 1.5]],
      [[0, 5, 2], [2.5, 4, 1.8], [5, 7, 2.2]],
      [[1, 3, 1.8], [3.5, 1, 1.5], [6, 0, 1.8]],
    ], reverb: 3.8, wind: .25, windHz: 480, percussion: .12,
  },
  yermo: {
    id: 'yermo', title: 'Bajo la ceniza', description: 'Cuerdas graves, polvo y tambores de marcha',
    bpm: 76, meter: 4, tonic: 45, scale: [0, 1, 3, 5, 7, 8, 10],
    chords: [0, 1, 0, 6, 5, 1, 6, 0], lead: 'horn', pad: 'strings', pluck: 'harp',
    motifs: [
      [[0, 0, 1.5], [2, 1, .7], [3, 0, 1], [4.5, 4, 2.3]],
      [[.5, 3, 1], [2, 2, 1.2], [4, 1, 1.7], [6, 0, 1.5]],
      [[0, 4, 1.2], [2, 5, .8], [3, 4, 1.4], [5, 7, 2]],
      [[0, 6, 1.5], [2, 4, 1], [4, 1, 1], [6, 0, 1.5]],
    ], reverb: 2.3, wind: .42, windHz: 330, percussion: .55,
  },
  cripta: {
    id: 'cripta', title: 'Las dos llamas', description: 'Coro sin palabras, gotas y resonancias de piedra',
    bpm: 60, meter: 4, tonic: 47, scale: [0, 2, 3, 5, 7, 8, 10],
    chords: [0, 3, 5, 0, 2, 5, 4, 0], lead: 'bell', pad: 'choir', pluck: 'harp',
    motifs: [
      [[0, 0, 2.5], [4, 4, 2.2], [7, 2, .8]],
      [[1, 3, 2], [4.5, 1, 2], [7, 0, .8]],
      [[0, 5, 2], [3, 7, 2.3], [6, 4, 1.5]],
      [[1, 2, 1.8], [4, -1, 2], [6.5, 0, 1.2]],
    ], reverb: 4.5, wind: .18, windHz: 180, percussion: .17,
  },
  trono: {
    id: 'trono', title: 'Corona de sombras', description: 'Marcha de metales, coro y timbales ante Nihil',
    bpm: 72, meter: 4, tonic: 38, scale: [0, 2, 3, 5, 7, 8, 11],
    chords: [0, 5, 3, 4, 0, 2, 5, 4], lead: 'horn', pad: 'choir', pluck: 'bell',
    motifs: [
      [[0, 0, 1.5], [2, 4, .8], [3, 3, 1], [4.5, 2, 2.5]],
      [[0, 5, 1.5], [2, 4, 1], [4, 6, 1.7], [6, 4, 1.5]],
      [[0, 7, 2], [2.5, 6, .8], [4, 4, 1.2], [6, 5, 1.5]],
      [[0, 3, 1.2], [2, 2, 1.3], [4, -1, 1.2], [6, 0, 1.6]],
    ], reverb: 4, wind: .2, windHz: 230, percussion: .7,
  },
};

export function getSoundtrack(mapId: string): Soundtrack {
  return Object.hasOwn(SOUNDTRACKS, mapId) ? SOUNDTRACKS[mapId] : SOUNDTRACKS.pueblo;
}

function pitch(p: Soundtrack, degree: number): number {
  const octave = Math.floor(degree / p.scale.length);
  return p.tonic + p.scale[((degree % p.scale.length) + p.scale.length) % p.scale.length] + octave * 12;
}

export function buildScore(p: Soundtrack): { beats: number; notes: Note[] } {
  const notes: Note[] = [];
  const add = (voice: Voice, beat: number, midi: number, duration: number, velocity: number, pan = 0) => {
    notes.push({ voice, beat, midi, duration, velocity, pan });
  };
  for (let bar = 0; bar < 32; bar++) {
    const beat = bar * p.meter, section = Math.floor(bar / 8);
    const root = p.chords[bar % p.chords.length];
    const breath = section === 2;
    // Close-voiced harmony, lower bass, open stereo strings. The third section breathes.
    [0, 2, 4].forEach((d, i) => {
      let midi = pitch(p, root + d) + 12;
      while (midi > p.tonic + 23) midi -= 12;
      add(p.pad, beat, midi, p.meter * 1.2, breath ? .31 : .43, (i - 1) * .38);
    });
    add('bass', beat, Math.max(24, pitch(p, root) - 12), p.meter * .92, .6);
    const arpStep = p.id === 'pueblo' ? .5 : 1;
    for (let b = 0; b < p.meter; b += arpStep) {
      if ((breath && b % 2 !== 0) || (p.id === 'cripta' && b % 2 !== 0)) continue;
      const degree = [0, 4, 2, 4, 7, 4][Math.round(b / arpStep) % 6];
      add(p.pluck, beat + b + .025, pitch(p, root + degree) + 12, 1.4,
        p.pluck === 'bell' ? .18 : (breath ? .28 : .42), b % 2 === 0 ? -.27 : .27);
    }
    // A two-bar melodic phrase. Development changes register; the bridge leaves space.
    if (bar % 2 === 0 && (!breath || bar % 4 === 0)) {
      const motif = p.motifs[(bar / 2) % p.motifs.length];
      for (const [offset, degree, duration] of motif) {
        add(p.lead, beat + offset, pitch(p, degree) + 24 + (section === 1 ? (p.lead === 'flute' ? -12 : 12) : 0),
          duration, breath ? .44 : .63, -.08);
      }
    }
    if (p.percussion > 0) {
      add('drum', beat, 36, .8, p.percussion * (breath ? .35 : .8), -.15);
      if (!breath && bar % 2 === 1) add('drum', beat + 2.5, 43, .55, p.percussion * .5, .18);
      if (section === 3 && bar % 4 === 3) add('drum', beat + 3.5, 43, .4, p.percussion * .3, -.1);
    }
  }
  return { beats: 32 * p.meter, notes: notes.sort((a, b) => a.beat - b.beat) };
}
