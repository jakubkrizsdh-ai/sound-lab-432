/**
 * Handpan: stupnice, ladění a rozložení tónových polí. Čistá data a výpočty (testovatelné).
 */
import { PRESETS, pitch, type Pitch, type TuningSystem } from '../tuning/systems';

export type ScaleId = 'image' | 'kurd';
export type HandpanTuning = 'pythagorean' | 'et432' | 'et440' | 'just';
export type LayoutId = '8' | '9';

/** Tón jako [stupeň, oktáva], např. ['F#', 4]. */
export type NoteRef = [string, number];

export interface HandpanScale {
  id: ScaleId;
  ding: NoteRef;
  /** horní pole vzestupně (pro 9 polí se použije všech 9, pro 8 prvních 8) */
  top: NoteRef[];
  /** dvě pole na spodní straně */
  bottom: NoteRef[];
  /** symbolické přiřazení z obrázku (jen pro stupnici z obrázku) */
  symbolic?: boolean;
}

export const SCALES: Record<ScaleId, HandpanScale> = {
  // C lydická z obrázku: všechny tóny jsou přesně hodnoty z obrázku (128–576 Hz)
  image: {
    id: 'image',
    ding: ['C', 3],
    top: [['G', 3], ['A', 3], ['H', 3], ['C', 4], ['D', 4], ['E', 4], ['F#', 4], ['G', 4], ['A', 4]],
    bottom: [['C', 5], ['D', 5]],
    symbolic: true
  },
  // D Kurd (D | A B C D E F G A C) – B = B♭
  kurd: {
    id: 'kurd',
    ding: ['D', 3],
    top: [['A', 3], ['B', 3], ['C', 4], ['D', 4], ['E', 4], ['F', 4], ['G', 4], ['A', 4], ['C', 5]],
    bottom: [['D', 5], ['E', 5]]
  }
};

export const TUNINGS: Record<HandpanTuning, TuningSystem> = {
  pythagorean: PRESETS.pythagorean, // C4 = 256 Hz → shodné s obrázkem
  et432: PRESETS.et432,
  et440: PRESETS.et440,
  just: PRESETS.just
};

/** Symbolické přiřazení tónů čakrám podle obrázku (vrstva „Symbolické“). */
export const CHAKRA_BY_NOTE: Record<string, string> = {
  C: 'Muladhara', D: 'Svadhisthana', E: 'Manipura', 'F#': 'Anahata', G: 'Vishuddha', A: 'Ajna', H: 'Sahasrara'
};

export interface Field {
  /** 0 = Ding, 1…9 horní pole, 10–11 spodní pole */
  index: number;
  kind: 'ding' | 'top' | 'bottom';
  note: NoteRef;
  pitch: Pitch;
  /** střed pole v poměru k velikosti bubnu (0–1) */
  x: number;
  y: number;
  /** šířka a výška pole v poměru k velikosti bubnu */
  w: number;
  h: number;
  /** natočení oválu (stupně) – pole míří ke středu */
  rot: number;
}

const ANGLES: Record<LayoutId, number[]> = {
  // vzestupně „cik-cak“ zdola nahoru, 0° = vpravo, osa y dolů
  '8': [112, 68, 152, 28, 196, -16, 240, 300],
  '9': [112, 68, 150, 30, 188, -8, 228, 312, 270]
};

export interface HandpanConfig {
  scale: ScaleId;
  tuning: HandpanTuning;
  layout: LayoutId;
  bottom: boolean;
  /** vlastní tóny polí: index pole → tón */
  custom?: Record<number, NoteRef>;
}

export function buildFields(cfg: HandpanConfig): Field[] {
  const sc = SCALES[cfg.scale];
  const sys = TUNINGS[cfg.tuning];
  const n = cfg.layout === '9' ? 9 : 8;
  const note = (i: number, def: NoteRef): NoteRef => cfg.custom?.[i] ?? def;
  const mk = (index: number, kind: Field['kind'], ref: NoteRef, x: number, y: number, w: number, h: number, rot: number): Field =>
    ({ index, kind, note: ref, pitch: pitch(sys, ref[0], ref[1]), x, y, w, h, rot });

  const out: Field[] = [mk(0, 'ding', note(0, sc.ding), 0.5, 0.5, 0.27, 0.27, 0)];
  const R = 0.345;
  ANGLES[cfg.layout].slice(0, n).forEach((deg, i) => {
    const a = (deg * Math.PI) / 180;
    out.push(mk(i + 1, 'top', note(i + 1, sc.top[i]!), 0.5 + R * Math.cos(a), 0.5 + R * Math.sin(a), n === 9 ? 0.185 : 0.2, n === 9 ? 0.15 : 0.16, deg + 90));
  });
  if (cfg.bottom) {
    // spodní pole: vykreslena mimo buben vlevo a vpravo dole (na nástroji jsou zespodu)
    sc.bottom.forEach((ref, i) => out.push(mk(10 + i, 'bottom', note(10 + i, ref), i === 0 ? 0.1 : 0.9, 0.9, 0.17, 0.13, 0)));
  }
  return out;
}

/** Kmitočtové složky modálního modelu pole: [poměr, amplituda, podíl dozvuku, rozladění v centech]. */
export const PARTIALS: [number, number, number, number][] = [
  [1, 1, 1, 0],
  [1, 0.28, 0.9, 1.3],      // dvojice módů → jemné pomalé rázy
  [2, 0.5, 0.6, 0],         // oktáva
  [2, 0.12, 0.55, -1.8],
  [3, 0.26, 0.35, 0],       // duodecima
  [4.07, 0.035, 0.12, 0],   // slabé neharmonické módy – kovový nádech
  [5.36, 0.025, 0.08, 0],
  [6.93, 0.012, 0.05, 0]
];

/** Amplituda složky podle síly úderu – silnější úder rozezní víc vyšších módů. */
export function partialGain(amp: number, ratio: number, velocity: number): number {
  const v = Math.min(1, Math.max(0, velocity));
  const brightness = ratio <= 1.01 ? 1 : v ** (0.6 + 0.35 * Math.log2(ratio));
  return amp * v * brightness;
}
