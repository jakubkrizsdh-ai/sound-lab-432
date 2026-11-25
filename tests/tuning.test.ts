import { describe, expect, it } from 'vitest';
import { cents, parseRatio, format, ratio } from '../src/lib/tuning/ratio';
import { PRESETS, compare, customScale, pitch, tonicHz, withReference } from '../src/lib/tuning/systems';

const IMG = PRESETS.image432;

// Přesné hodnoty z referenčního obrázku (nízká / střední / vysoká řada).
const IMAGE_TABLE: [string, number, number, number][] = [
  ['C', 128, 256, 512],
  ['D', 144, 288, 576],
  ['E', 162, 324, 648],
  ['F#', 182.25, 364.5, 729],
  ['G', 192, 384, 768],
  ['A', 216, 432, 864],
  ['H', 243, 486, 972]
];

describe('preset Obrázek 432', () => {
  it.each(IMAGE_TABLE)('%s: %f / %f / %f Hz přesně', (deg, low, mid, high) => {
    expect(pitch(IMG, deg, 3).hz).toBe(low);
    expect(pitch(IMG, deg, 4).hz).toBe(mid);
    expect(pitch(IMG, deg, 5).hz).toBe(high);
  });

  it('ukládá přesný poměr k C4', () => {
    expect(pitch(IMG, 'F#', 4).source.ratio).toBe('729/512');
    expect(pitch(IMG, 'F#', 3).source.ratio).toBe('729/1024');
    expect(pitch(IMG, 'H', 5).source.ratio).toBe('243/64');
  });

  it('je zamčený proti změně reference', () => {
    expect(() => withReference(IMG, { degree: 'A', octave: 4, hz: 440 })).toThrow();
  });

  it('A4 = 432 Hz a C4 = 256 Hz', () => {
    expect(tonicHz(IMG)).toBe(256);
    expect(pitch(IMG, 'A', 4).hz).toBe(432);
  });
});

describe('porovnání s rovnoměrně temperovaným laděním (centy z návrhu)', () => {
  const expected432: Record<string, number> = { C: -5.9, D: -2.0, E: 2.0, 'F#': 5.9, G: -3.9, A: 0, H: 3.9 };
  const expected440: Record<string, number> = { C: -37.6, D: -33.7, E: -29.8, 'F#': -25.9, G: -35.7, A: -31.8, H: -27.9 };

  it('obrázek proti ET A = 432', () => {
    for (const row of compare(IMG, PRESETS.et432)) expect(row.diffCents).toBeCloseTo(expected432[row.degree]!, 1);
  });
  it('obrázek proti ET A = 440', () => {
    for (const row of compare(IMG, PRESETS.et440)) expect(row.diffCents).toBeCloseTo(expected440[row.degree]!, 1);
  });
  it('ET A = 432 dává C4 = 256,87 Hz (jiný preset než obrázek)', () => {
    expect(pitch(PRESETS.et432, 'C', 4).hz).toBeCloseTo(256.87, 2);
    expect(pitch(PRESETS.et440, 'A', 4).hz).toBe(440);
  });
});

describe('pythagorejské a čisté ladění', () => {
  it('pythagorejské od C4 = 256 se shoduje s obrázkem ve všech jeho tónech', () => {
    for (const row of compare(IMG, PRESETS.pythagorean)) expect(row.diffHz).toBe(0);
  });
  it('čisté E, F#, A, H jsou o syntonické koma (21,5 c) níž než obrázek', () => {
    const r = Object.fromEntries(compare(IMG, PRESETS.just).map(x => [x.degree, x.diffCents]));
    for (const d of ['E', 'F#', 'A', 'H']) expect(r[d]).toBeCloseTo(21.506, 2);
    for (const d of ['C', 'D', 'G']) expect(r[d]).toBeCloseTo(0, 9);
  });
  it('vlastní reference: pythagorejské od A4 = 440', () => {
    const p440 = withReference(PRESETS.pythagorean, { degree: 'A', octave: 4, hz: 440 });
    expect(pitch(p440, 'A', 4).hz).toBe(440);
    expect(pitch(p440, 'E', 5).hz).toBeCloseTo(660, 9); // čistá kvinta nad A4
  });
  it('vlastní stupnice z poměrů', () => {
    const s = customScale([{ name: 'X', ratio: ratio(1) }, { name: 'Y', ratio: ratio(7, 4) }], { degree: 'X', octave: 4, hz: 100 });
    expect(pitch(s, 'Y', 4).hz).toBe(175);
    expect(pitch(s, 'Y', 5).hz).toBe(350);
  });
  it('neznámý tón a nesmyslná reference se odmítnou', () => {
    expect(() => pitch(IMG, 'F', 4)).toThrow();
    expect(() => withReference(PRESETS.et440, { degree: 'A', octave: 4, hz: 0 })).toThrow();
  });
});

describe('poměry a centy', () => {
  it('zápis poměru se načte a zkrátí', () => {
    expect(format(parseRatio('18/16'))).toBe('9/8');
    expect(format(parseRatio(' 2 '))).toBe('2');
    expect(() => parseRatio('abc')).toThrow();
  });
  it('oktáva = 1200 c, kvinta 3/2 ≈ 701,955 c', () => {
    expect(cents(512, 256)).toBe(1200);
    expect(cents(3, 2)).toBeCloseTo(701.955, 3);
  });
});
