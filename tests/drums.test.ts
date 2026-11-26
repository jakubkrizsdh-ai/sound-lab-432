import { describe, expect, it } from 'vitest';
import { PADS, PAD_CODES, PRESETS, SEQ_ROWS, STEPS, TUNING, CHOKES, barDuration, emptyPattern, stepTime } from '../src/lib/drums/kit';

describe('bicí souprava', () => {
  it('16 různých padů, 16 kláves', () => {
    expect(new Set(PADS).size).toBe(16);
    expect(PAD_CODES).toHaveLength(16);
  });
  it('řádky sekvenceru jsou pady', () => {
    for (const r of SEQ_ROWS) expect(PADS).toContain(r);
  });
  it('zavřený a šlapaný hi-hat dusí otevřený', () => {
    expect(CHOKES.hhClosed).toContain('hhOpen');
    expect(CHOKES.hhPedal).toContain('hhOpen');
  });
  it('ladění podle obrázku používá tóny obrázku (G3 192, D3 144, G2 96, C2 64)', () => {
    expect([TUNING.image.tomHi, TUNING.image.tomMid, TUNING.image.tomFloor, TUNING.image.kick]).toEqual([192, 144, 96, 64]);
  });
  it('každý ukázkový rytmus má 16 kroků pro každý pad', () => {
    for (const p of Object.values(PRESETS)) {
      for (const id of PADS) expect(p.pattern[id]).toHaveLength(STEPS);
      expect(p.bpm).toBeGreaterThanOrEqual(40);
    }
    expect(PRESETS.rock.pattern.snare[4]).toBe(2);
  });
  it('prázdný vzor má samé nuly', () => {
    expect(Object.values(emptyPattern()).flat().every(v => v === 0)).toBe(true);
  });
});

describe('časování', () => {
  it('120 BPM: takt 2 s, šestnáctina 0,125 s', () => {
    expect(barDuration(120)).toBe(2);
    expect(stepTime(4, 120, 0)).toBe(0.5);
    expect(stepTime(1, 120, 0)).toBe(0.125);
  });
  it('swing posouvá jen sudé šestnáctiny a nikdy za další krok', () => {
    expect(stepTime(2, 100, 0.5)).toBe(stepTime(2, 100, 0));
    expect(stepTime(3, 100, 0.5)).toBeGreaterThan(stepTime(3, 100, 0));
    expect(stepTime(3, 100, 0.5)).toBeLessThan(stepTime(4, 100, 0));
  });
});

describe('2D pohled na soupravu', () => {
  it('každý z 16 zvuků má na obrázku klikací místo', async () => {
    const { KIT_HOTSPOTS } = await import('../src/lib/drums/kit');
    expect(new Set(KIT_HOTSPOTS.map(h => h.id))).toEqual(new Set(PADS));
  });
  it('typická místa vedou na správný zvuk', async () => {
    const { hotspotAt } = await import('../src/lib/drums/kit');
    expect(hotspotAt(385, 565)).toBe('snare');      // blána virblu
    expect(hotspotAt(300, 680)).toBe('rim');        // tělo virblu
    expect(hotspotAt(615, 860)).toBe('kick');       // šlapka kopáku
    expect(hotspotAt(640, 640)).toBe('kick');       // přední blána kopáku
    expect(hotspotAt(922, 196)).toBe('rideBell');   // kopule ridu
    expect(hotspotAt(1050, 240)).toBe('ride');
    expect(hotspotAt(163, 420)).toBe('hhOpen');
    expect(hotspotAt(163, 485)).toBe('hhClosed');
    expect(hotspotAt(215, 990)).toBe('hhPedal');
    expect(hotspotAt(1120, 480)).toBe('clap');      // elektronický pad
    expect(hotspotAt(925, 650)).toBe('tomFloor');
    expect(hotspotAt(455, 340)).toBe('tomHi');
    expect(hotspotAt(870, 420)).toBe('cowbell');
    expect(hotspotAt(780, 1150)).toBeNull();        // stolička
  });
});
