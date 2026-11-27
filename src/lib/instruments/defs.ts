/**
 * Definice nástrojů jako data. Nový nástroj = nová položka, ne nový kód.
 * Modální nástroje: sada módů [poměr k základu, amplituda, podíl doby dozvuku, rozladění v Hz].
 * Rozladění v Hz (ne v centech) dává u mís a zvonů stejně pomalé „vlnění“ v celém rozsahu.
 */
import { PRESETS, pitch, type Pitch, type TuningSystem } from '../tuning/systems';

export type InstrumentId =
  | 'handpan' | 'drums' | 'congas' | 'bongos' | 'cajon' | 'tibetan' | 'crystal' | 'gong' | 'kalimba' | 'bells'
  | 'piano' | 'flute' | 'synth' | 'custom';

export const INSTRUMENT_ORDER: InstrumentId[] = ['handpan', 'drums', 'congas', 'bongos', 'cajon', 'tibetan', 'crystal', 'gong', 'kalimba', 'bells', 'piano', 'flute', 'synth', 'custom'];

export type Surface = 'handpan' | 'drums' | 'congas' | 'bongos' | 'cajon' | 'bowls' | 'gong' | 'kalimba' | 'bells' | 'keys';

/** [poměr, amplituda, podíl dozvuku, rozladění Hz] */
export type Mode = [number, number, number, number];

export interface Excitation {
  /** délka úderového šumu (ms) */
  noiseMs: number;
  /** hlasitost úderu (0–1) */
  noiseGain: number;
  /** střed pásma šumu jako násobek základní frekvence */
  noiseAt: number;
  /** měkkost paličky 0 (tvrdá) – 1 (plstěná): tlumí vyšší módy a zpomaluje náběh */
  soft: number;
  /** „rozkvétání“: vyšší módy nabíhají pomaleji (s), typické pro gong */
  bloom?: number;
}

export interface ModalDef {
  kind: 'modal';
  modes: Mode[];
  excitation: Excitation;
  /** výchozí doba dozvuku základního módu (s, na −60 dB) */
  decay: number;
  /** lze třít (držet) – mísy */
  rub?: boolean;
  gain: number;
}

export interface PianoDef { kind: 'piano'; gain: number; decay: number; inharmonicity: number }
export interface FluteDef { kind: 'flute'; gain: number; decay: number }
export interface SynthDef { kind: 'synth'; gain: number; decay: number }
export type SoundDef = ModalDef | PianoDef | FluteDef | SynthDef;

export interface InstrumentDef {
  id: InstrumentId;
  surface: Surface;
  /** zvuk (handpan má vlastní engine v handpan/) */
  sound: SoundDef | null;
  /** výchozí oktáva sady tónů */
  octave: number;
  /** drží tón, dokud je prst na ploše */
  sustained: boolean;
}

export const MODAL: Record<'tibetan' | 'crystal' | 'gong' | 'kalimba' | 'bells', ModalDef> = {
  // Kovová zpívající mísa: silně neharmonické módy, každý jako dvojice blízkých frekvencí (pomalé vlnění).
  tibetan: {
    kind: 'modal', decay: 28, rub: true, gain: 0.22,
    modes: [
      [1, 1, 1, 0], [1, 0.8, 1, 1.4],
      [2.71, 0.55, 0.55, 0], [2.71, 0.45, 0.55, 2.3],
      [5.15, 0.28, 0.3, 0], [5.15, 0.22, 0.3, 3.1],
      [8.27, 0.12, 0.17, 0], [12.0, 0.06, 0.1, 0]
    ],
    excitation: { noiseMs: 12, noiseGain: 0.12, noiseAt: 3, soft: 0.65 }
  },
  // Křišťálová (křemenná) mísa: téměř čistý základ, velmi dlouhý dozvuk, jemné vlnění.
  crystal: {
    kind: 'modal', decay: 40, rub: true, gain: 0.32,
    modes: [[1, 1, 1, 0], [1, 0.5, 1, 0.35], [2.76, 0.05, 0.35, 0], [5.4, 0.015, 0.15, 0]],
    excitation: { noiseMs: 8, noiseGain: 0.05, noiseAt: 4, soft: 0.85 }
  },
  // Gong: hustá neharmonická řada, vyšší módy „rozkvétají“ chvíli po úderu.
  gong: {
    kind: 'modal', decay: 22, gain: 0.2,
    modes: [
      [1, 1, 1, 0], [1.52, 0.7, 0.85, 0.8], [2.31, 0.6, 0.7, 0], [2.94, 0.5, 0.6, 1.1],
      [3.61, 0.45, 0.5, 0], [4.42, 0.4, 0.45, 0.6], [5.17, 0.35, 0.4, 0], [6.03, 0.3, 0.35, 1.7],
      [7.12, 0.26, 0.3, 0], [8.36, 0.22, 0.26, 0], [9.71, 0.18, 0.22, 2.2], [11.3, 0.15, 0.18, 0],
      [13.2, 0.12, 0.15, 0], [15.4, 0.09, 0.12, 0], [18.1, 0.07, 0.1, 0]
    ],
    excitation: { noiseMs: 25, noiseGain: 0.2, noiseAt: 6, soft: 0.8, bloom: 1.2 }
  },
  // Kalimba: kovový jazýček – základ a vzdálené neharmonické módy, krátký jasný úder.
  kalimba: {
    kind: 'modal', decay: 3.2, gain: 0.38,
    modes: [[1, 1, 1, 0], [2, 0.08, 0.4, 0], [5.93, 0.28, 0.12, 0], [11.7, 0.08, 0.05, 0], [19.3, 0.03, 0.03, 0]],
    excitation: { noiseMs: 6, noiseGain: 0.22, noiseAt: 7, soft: 0.1 }
  },
  // Zvon / zvonek: tradiční zvonové módy (hum, prima, tercie, kvinta, nominála…).
  bells: {
    kind: 'modal', decay: 9, gain: 0.24,
    modes: [
      [0.5, 0.35, 1.3, 0], [1, 1, 1, 0.5], [1.19, 0.45, 0.8, 0], [1.5, 0.3, 0.6, 0],
      [2, 0.6, 0.5, 0.9], [2.51, 0.25, 0.35, 0], [3.0, 0.16, 0.25, 0], [4.0, 0.1, 0.18, 0]
    ],
    excitation: { noiseMs: 5, noiseGain: 0.15, noiseAt: 5, soft: 0.15 }
  }
};

export const INSTRUMENTS: Record<InstrumentId, InstrumentDef> = {
  handpan: { id: 'handpan', surface: 'handpan', octave: 4, sustained: false, sound: null },
  drums: { id: 'drums', surface: 'drums', octave: 4, sustained: false, sound: null },
  congas: { id: 'congas', surface: 'congas', octave: 4, sustained: false, sound: null },
  bongos: { id: 'bongos', surface: 'bongos', octave: 4, sustained: false, sound: null },
  cajon: { id: 'cajon', surface: 'cajon', octave: 4, sustained: false, sound: null },
  tibetan: { id: 'tibetan', surface: 'bowls', octave: 4, sustained: false, sound: MODAL.tibetan },
  crystal: { id: 'crystal', surface: 'bowls', octave: 4, sustained: false, sound: MODAL.crystal },
  gong: { id: 'gong', surface: 'gong', octave: 2, sustained: false, sound: MODAL.gong },
  kalimba: { id: 'kalimba', surface: 'kalimba', octave: 4, sustained: false, sound: MODAL.kalimba },
  bells: { id: 'bells', surface: 'bells', octave: 5, sustained: false, sound: MODAL.bells },
  piano: { id: 'piano', surface: 'keys', octave: 4, sustained: true, sound: { kind: 'piano', gain: 0.5, decay: 9, inharmonicity: 0.00035 } },
  flute: { id: 'flute', surface: 'keys', octave: 5, sustained: true, sound: { kind: 'flute', gain: 0.45, decay: 0.15 } },
  synth: { id: 'synth', surface: 'keys', octave: 4, sustained: true, sound: { kind: 'synth', gain: 0.35, decay: 0.4 } },
  custom: { id: 'custom', surface: 'keys', octave: 4, sustained: false, sound: MODAL.bells }
};

/** Výchozí vlastní nástroj – uživatel upravuje módy, buzení a dozvuk. */
export function defaultCustom(): ModalDef {
  return {
    kind: 'modal', decay: 6, rub: false, gain: 0.3,
    modes: [[1, 1, 1, 0], [2, 0.4, 0.6, 0], [3, 0.2, 0.4, 0], [4.2, 0.08, 0.2, 0]],
    excitation: { noiseMs: 10, noiseGain: 0.12, noiseAt: 4, soft: 0.3 }
  };
}

/** Ověří a opraví vlastní definici (ochrana před nesmysly a přebuzením). */
export function sanitizeModal(d: ModalDef): ModalDef {
  const clamp = (v: number, lo: number, hi: number) => (Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : lo);
  const modes = d.modes
    .slice(0, 16)
    .map(([r, a, p, dt]) => [clamp(r, 0.1, 40), clamp(a, 0, 1), clamp(p, 0.01, 1.5), clamp(dt, -20, 20)] as Mode)
    .filter(m => m[1] > 0);
  return {
    kind: 'modal',
    modes: modes.length ? modes : [[1, 1, 1, 0]],
    decay: clamp(d.decay, 0.1, 60),
    rub: !!d.rub,
    gain: clamp(d.gain, 0.05, 1),
    excitation: {
      noiseMs: clamp(d.excitation.noiseMs, 0, 80),
      noiseGain: clamp(d.excitation.noiseGain, 0, 1),
      noiseAt: clamp(d.excitation.noiseAt, 0.5, 20),
      soft: clamp(d.excitation.soft, 0, 1),
      bloom: d.excitation.bloom ? clamp(d.excitation.bloom, 0, 5) : undefined
    }
  };
}

// --- sady tónů ---

export type ScaleChoice = 'image' | 'major';
export const SCALE_DEGREES: Record<ScaleChoice, string[]> = {
  image: ['C', 'D', 'E', 'F#', 'G', 'A', 'H'],   // stupnice z obrázku (C lydická)
  major: ['C', 'D', 'E', 'F', 'G', 'A', 'H']      // C dur
};

export type KeysTuning = 'pythagorean' | 'et432' | 'et440' | 'just';
export const KEY_TUNINGS: Record<KeysTuning, TuningSystem> = {
  pythagorean: PRESETS.pythagorean,
  et432: PRESETS.et432,
  et440: PRESETS.et440,
  just: PRESETS.just
};

/** Sedm tónů stupnice v jedné oktávě (mísy). */
export function scaleNotes(sys: TuningSystem, scale: ScaleChoice, octave: number): Pitch[] {
  return SCALE_DEGREES[scale].map(d => pitch(sys, d, octave));
}

/** Tóny stupnice vzestupně přes několik oktáv (zvonky, kalimba). */
export function scaleRun(sys: TuningSystem, scale: ScaleChoice, octave: number, count: number): Pitch[] {
  const degs = SCALE_DEGREES[scale];
  return Array.from({ length: count }, (_, i) => pitch(sys, degs[i % 7]!, octave + Math.floor(i / 7)));
}

/**
 * Pořadí jazýčků kalimby zleva doprava: nejnižší uprostřed, vyšší střídavě vpravo a vlevo.
 * Vrací indexy do vzestupné řady tónů.
 */
export function kalimbaOrder(count: number): number[] {
  const left: number[] = [];
  const right: number[] = [];
  for (let i = 1; i < count; i++) (i % 2 ? right : left).push(i);
  return [...left.reverse(), 0, ...right];
}

/** Délka jazýčku kalimby (0–1) podle výšky tónu – delší = hlubší. */
export function tineLength(hz: number, lowest: number): number {
  return Math.max(0.35, Math.min(1, 1 / Math.sqrt(hz / lowest)));
}

/** Chromatická klaviatura: 12·oktávy + 1 kláves od C dané oktávy. */
export const CHROMATIC_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'B', 'H'];
export function keyboardNotes(sys: TuningSystem, octave: number, octaves: number): Pitch[] {
  const out: Pitch[] = [];
  for (let o = 0; o < octaves; o++) for (const n of CHROMATIC_NAMES) out.push(pitch(sys, n, octave + o));
  out.push(pitch(sys, 'C', octave + octaves));
  return out;
}

export const isBlackKey = (name: string) => name.includes('#') || name === 'B';
