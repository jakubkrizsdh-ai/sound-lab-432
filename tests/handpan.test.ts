import { describe, expect, it } from 'vitest';
import { buildFields, partialGain, SCALES } from '../src/lib/handpan/model';

describe('handpan', () => {
  it('stupnice z obrázku v pythagorejském ladění = přesné hodnoty obrázku', () => {
    const f = buildFields({ scale: 'image', tuning: 'pythagorean', layout: '9', bottom: true });
    expect(f.map(x => x.pitch.hz)).toEqual([128, 192, 216, 243, 256, 288, 324, 364.5, 384, 432, 512, 576]);
  });

  it('D Kurd: D3 = 144, B♭3 = 227,56, F4 = 341,33 Hz', () => {
    const f = buildFields({ scale: 'kurd', tuning: 'pythagorean', layout: '8', bottom: false });
    expect(f[0]!.pitch.hz).toBe(144);
    expect(f[2]!.pitch.hz).toBeCloseTo(227.556, 3);
    expect(f[6]!.pitch.hz).toBeCloseTo(341.333, 3);
  });

  it('rozložení 8 + Ding a 9 + Ding, spodní pole navíc', () => {
    expect(buildFields({ scale: 'image', tuning: 'et432', layout: '8', bottom: false })).toHaveLength(9);
    expect(buildFields({ scale: 'image', tuning: 'et432', layout: '9', bottom: true })).toHaveLength(12);
  });

  it('pole se nepřekrývají a leží na bubnu', () => {
    for (const layout of ['8', '9'] as const) {
      const f = buildFields({ scale: 'kurd', tuning: 'et440', layout, bottom: false });
      for (const a of f) {
        expect(Math.hypot(a.x - 0.5, a.y - 0.5) + Math.max(a.w, a.h) / 2).toBeLessThanOrEqual(0.5);
        for (const b of f) {
          if (a === b) continue;
          expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan((Math.min(a.w, a.h) + Math.min(b.w, b.h)) / 2);
        }
      }
    }
  });

  it('vlastní tón pole má přednost před stupnicí', () => {
    const f = buildFields({ scale: 'image', tuning: 'pythagorean', layout: '8', bottom: false, custom: { 3: ['F', 4] } });
    expect(f[3]!.note).toEqual(['F', 4]);
    expect(f[3]!.pitch.hz).toBeCloseTo(341.333, 3);
  });

  it('silnější úder = jasnější zvuk (vyšší módy rostou rychleji než základ)', () => {
    const soft = partialGain(0.26, 3, 0.3) / partialGain(1, 1, 0.3);
    const hard = partialGain(0.26, 3, 1) / partialGain(1, 1, 1);
    expect(hard).toBeGreaterThan(soft);
  });

  it('každá stupnice má 9 horních a 2 spodní tóny', () => {
    for (const s of Object.values(SCALES)) { expect(s.top).toHaveLength(9); expect(s.bottom).toHaveLength(2); }
  });
});
