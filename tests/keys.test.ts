import { describe, expect, it } from 'vitest';
import { handpanCodes, KALIMBA_CODES, PIANO_CODES, defaultLabel } from '../src/lib/keys/layouts';
import { buildFields } from '../src/lib/handpan/model';

const codesFor = (layout: '8' | '9', bottom: boolean) => {
  const f = buildFields({ scale: 'image', tuning: 'pythagorean', layout, bottom });
  const c = handpanCodes(f);
  return Object.fromEntries(f.map(x => [`${x.note[0]}${x.note[1]}`, c[x.index]]));
};

describe('handpan – klávesy podle polohy', () => {
  it('8 + Ding: levá strana A S D F = F#4 D4 H3 G3, pravá H J K L = G4 E4 C4 A3, Ding mezerník', () => {
    const m = codesFor('8', false);
    expect([m['F#4'], m['D4'], m['H3'], m['G3']]).toEqual(['KeyA', 'KeyS', 'KeyD', 'KeyF']);
    expect([m['G4'], m['E4'], m['C4'], m['A3']]).toEqual(['KeyH', 'KeyJ', 'KeyK', 'KeyL']);
    expect(m['C3']).toBe('Space');
  });
  it('spodní pole C5 = V, D5 = B; 9. pole nahoře uprostřed = G', () => {
    const m = codesFor('9', true);
    expect(m['C5']).toBe('KeyV');
    expect(m['D5']).toBe('KeyB');
    expect(m['A4']).toBe('KeyG');
  });
  it('žádná klávesa dvakrát', () => {
    const vals = Object.values(codesFor('9', true));
    expect(new Set(vals).size).toBe(vals.length);
  });
});

describe('kalimba a klavír', () => {
  it('kalimba: A–L, pak Q–P (19 kláves)', () => {
    expect(KALIMBA_CODES.slice(0, 9).map(defaultLabel).join('')).toBe('ASDFGHJKL');
    expect(KALIMBA_CODES.slice(9).map(defaultLabel).join('')).toBe('QWERTYUIOP');
  });
  it('klavír: bílé na Q–P, půltóny na číslech', () => {
    const lbl = PIANO_CODES.map(defaultLabel);
    expect([lbl[0], lbl[2], lbl[4], lbl[5], lbl[7], lbl[9], lbl[11], lbl[12]]).toEqual(['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I']);
    expect([lbl[1], lbl[3], lbl[6], lbl[8], lbl[10]]).toEqual(['2', '3', '5', '6', '7']);
    expect(new Set(PIANO_CODES).size).toBe(PIANO_CODES.length);
  });
});

describe('přemapování', () => {
  it('nová klávesa se uloží, prohodí s původním slotem a jde vrátit', async () => {
    const { bind, resolve, resetBindings } = await import('../src/lib/keys/bindings.svelte');
    const def = { a: 'KeyA', b: 'KeyB', c: 'KeyC' };
    bind('test', def, 'a', 'KeyB');
    let r = resolve('test', def);
    expect(r.bySlot.a).toBe('KeyB');
    expect(r.bySlot.b).toBe('KeyA');
    expect(r.byCode.KeyB).toBe('a');
    bind('test', def, 'c', 'Space');
    expect(resolve('test', def).byCode.Space).toBe('c');
    resetBindings('test');
    r = resolve('test', def);
    expect(r.bySlot).toEqual(def);
  });
});
