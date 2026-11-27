import { describe, expect, it } from 'vitest';
import { BONGO_PADS, BONGO_TUNING, BONGO_CODES, isBongoPad, isCongaPad, isHandPad, zoneStroke } from '../src/lib/congas/kit';
import { CAJON_PADS, CAJON_CODES, CAJON_SLOTS, faceStroke, isCajonPad, slotHand, slotStroke, ZONE_SLAP, ZONE_TONE } from '../src/lib/cajon/kit';
import { emptySong, sanitizeSong, isPercussion } from '../src/lib/song/model';

describe('bonga', () => {
  it('2 bubny × 4 údery, unikátní klávesy', () => {
    expect(BONGO_PADS).toHaveLength(8);
    expect(new Set(BONGO_PADS.map(p => BONGO_CODES[p])).size).toBe(8);
  });
  it('ladění obrázku: hembra A4 = 432 (27/16), macho D5 = 576 (9/4), čistá kvarta', () => {
    expect(BONGO_TUNING.image.hembra).toBe(256 * 27 / 16);
    expect(BONGO_TUNING.image.macho).toBe(256 * 9 / 4);
    expect(BONGO_TUNING.image.macho / BONGO_TUNING.image.hembra).toBeCloseTo(4 / 3, 12);
  });
  it('střed hlavy bonga = palec, conga = bas', () => {
    expect(zoneStroke(0.1, 'thumb')).toBe('thumb');
    expect(zoneStroke(0.1)).toBe('bass');
  });
  it('rozlišení úderů conga / bonga', () => {
    expect(isBongoPad('macho.thumb')).toBe(true);
    expect(isCongaPad('macho.thumb')).toBe(false);
    expect(isHandPad('tumba.open')).toBe(true);
  });
});

describe('cajon', () => {
  it('4 údery, 9 klávesových slotů (levá, pravá, mezerník), unikátní klávesy', () => {
    expect(CAJON_PADS).toHaveLength(4);
    expect(CAJON_SLOTS).toHaveLength(9);
    expect(new Set(CAJON_SLOTS.map(s => CAJON_CODES[s])).size).toBe(9);
    expect(slotStroke('slap.R')).toBe('slap');
    expect(slotHand('slap.R')).toBe('R');
    expect(isCajonPad('cajon.bass')).toBe(true);
  });
  it('zóny přední desky shora: slap, tón, bas', () => {
    expect(faceStroke(0)).toBe('slap');
    expect(faceStroke(ZONE_SLAP + 0.01)).toBe('tone');
    expect(faceStroke(ZONE_TONE + 0.01)).toBe('bass');
    expect(faceStroke(0.99)).toBe('bass');
  });
});

describe('studio', () => {
  it('bonga a cajon jsou bicí nástroje (řádky = údery)', () => {
    expect(isPercussion('bongos')).toBe(true);
    expect(isPercussion('cajon')).toBe(true);
    expect(isPercussion('piano')).toBe(false);
  });
  it('skladba s bongy a cajonem projde JSON beze ztráty', () => {
    const s = emptySong();
    s.tracks.push(
      { id: 'b', name: 'Bonga', sound: { instrument: 'bongos', congaTuning: 'image' }, volumeDb: 0, pan: 0, reverb: 0.12, mute: false, solo: false,
        clips: [{ id: 'c1', start: 0, len: 4, repeat: 1, notes: [{ id: 'n1', t: 0, d: 0.25, v: 0.8, drum: 'macho.thumb' }] }] },
      { id: 'c', name: 'Cajon', sound: { instrument: 'cajon', cajonWires: false }, volumeDb: 0, pan: 0, reverb: 0.12, mute: false, solo: false,
        clips: [{ id: 'c2', start: 0, len: 4, repeat: 1, notes: [{ id: 'n2', t: 0, d: 0.25, v: 0.8, drum: 'cajon.slap' }] }] });
    const back = sanitizeSong(JSON.parse(JSON.stringify(s)));
    expect(back?.tracks[0]?.clips[0]?.notes[0]?.drum).toBe('macho.thumb');
    expect(back?.tracks[1]?.sound.cajonWires).toBe(false);
    expect(back?.tracks[1]?.clips[0]?.notes[0]?.drum).toBe('cajon.slap');
  });
});
