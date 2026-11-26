import { describe, expect, it } from 'vitest';
import {
  INSTRUMENTS, INSTRUMENT_ORDER, MODAL, KEY_TUNINGS, defaultCustom, isBlackKey,
  kalimbaOrder, keyboardNotes, sanitizeModal, scaleNotes, scaleRun, tineLength
} from '../src/lib/instruments/defs';

describe('definice nástrojů', () => {
  it('všech 10 nástrojů má definici', () => {
    expect(INSTRUMENT_ORDER).toHaveLength(10);
    for (const id of INSTRUMENT_ORDER) expect(INSTRUMENTS[id].id).toBe(id);
  });
  it('modální nástroje: tón s poměrem 1 má plnou amplitudu, amplitudy 0–1, poměry kladné', () => {
    for (const d of Object.values(MODAL)) {
      expect(d.modes.some(([r, a]) => r === 1 && a === 1)).toBe(true);
      for (const [r, a, p] of d.modes) {
        expect(r).toBeGreaterThan(0);
        expect(a).toBeGreaterThan(0);
        expect(a).toBeLessThanOrEqual(1);
        expect(p).toBeGreaterThan(0);
      }
    }
  });
  it('mísy jdou třít, gong a kalimba ne', () => {
    expect(MODAL.tibetan.rub).toBe(true);
    expect(MODAL.crystal.rub).toBe(true);
    expect(MODAL.gong.rub).toBeFalsy();
  });
});

describe('sady tónů', () => {
  it('mísy ve stupnici z obrázku = přesné hodnoty obrázku (střední řada)', () => {
    expect(scaleNotes(KEY_TUNINGS.pythagorean, 'image', 4).map(p => p.hz)).toEqual([256, 288, 324, 364.5, 384, 432, 486]);
    expect(scaleNotes(KEY_TUNINGS.pythagorean, 'image', 3).map(p => p.hz)).toEqual([128, 144, 162, 182.25, 192, 216, 243]);
  });
  it('C dur má F místo F#', () => {
    expect(scaleNotes(KEY_TUNINGS.pythagorean, 'major', 4)[3]!.source.degree).toBe('F');
  });
  it('řada přes oktávy pokračuje do vyšší oktávy', () => {
    const r = scaleRun(KEY_TUNINGS.pythagorean, 'image', 4, 9);
    expect(r[7]!.hz).toBe(512);
    expect(r[8]!.hz).toBe(576);
  });
  it('kalimba: nejnižší jazýček uprostřed, střídavě doprava a doleva', () => {
    expect(kalimbaOrder(5)).toEqual([4, 2, 0, 1, 3]);
    const o = kalimbaOrder(17);
    expect(o[8]).toBe(0);
    expect([...o].sort((a, b) => a - b)).toEqual(Array.from({ length: 17 }, (_, i) => i));
  });
  it('delší jazýček = hlubší tón', () => {
    expect(tineLength(256, 256)).toBe(1);
    expect(tineLength(1024, 256)).toBeLessThan(tineLength(512, 256));
  });
  it('klaviatura: 2 oktávy = 25 kláves, B a krížky jsou černé', () => {
    const k = keyboardNotes(KEY_TUNINGS.et440, 4, 2);
    expect(k).toHaveLength(25);
    expect(k[9]!.hz).toBe(440);
    expect(k.filter(p => isBlackKey(p.source.degree))).toHaveLength(10);
  });
});

describe('vlastní nástroj', () => {
  it('nesmysly se opraví a omezí', () => {
    const d = sanitizeModal({ ...defaultCustom(), decay: 999, modes: [[0, 2, 5, 100], [2, 0, 1, 0]] });
    expect(d.decay).toBe(60);
    expect(d.modes).toEqual([[0.1, 1, 1.5, 20]]);
  });
  it('prázdná sada módů dostane základ', () => {
    expect(sanitizeModal({ ...defaultCustom(), modes: [] }).modes).toEqual([[1, 1, 1, 0]]);
  });
});
