/**
 * Bicí souprava: seznam nástrojů, rozložení padů, ladění, ukázkové rytmy a časování kroků.
 * Čistá data a výpočty (testovatelné).
 */
export type DrumId =
  | 'kick' | 'snare' | 'rim' | 'clap'
  | 'hhClosed' | 'hhPedal' | 'hhOpen' | 'crash'
  | 'tomHi' | 'tomMid' | 'tomFloor' | 'ride'
  | 'rideBell' | 'splash' | 'cowbell' | 'tambourine';

/** Pady 4×4 zleva doprava, shora dolů (spodní řada = nejčastější: kopák, virbl…). */
export const PADS: DrumId[] = [
  'crash', 'splash', 'ride', 'rideBell',
  'hhOpen', 'tomHi', 'tomMid', 'tomFloor',
  'hhClosed', 'hhPedal', 'cowbell', 'tambourine',
  'kick', 'snare', 'rim', 'clap'
];

/** Klávesy počítače (fyzická poloha) – stejná mřížka 4×4 jako pady. */
export const PAD_CODES = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyZ', 'KeyX', 'KeyC', 'KeyV'];
export const PAD_LABELS = ['1', '2', '3', '4', 'Q', 'W', 'E', 'R', 'A', 'S', 'D', 'F', 'Z', 'X', 'C', 'V'];

export type DrumGroup = 'kick' | 'snare' | 'hat' | 'tom' | 'cymbal' | 'perc';
export const GROUP: Record<DrumId, DrumGroup> = {
  kick: 'kick', snare: 'snare', rim: 'snare', clap: 'snare',
  hhClosed: 'hat', hhPedal: 'hat', hhOpen: 'hat',
  crash: 'cymbal', splash: 'cymbal', ride: 'cymbal', rideBell: 'cymbal',
  tomHi: 'tom', tomMid: 'tom', tomFloor: 'tom',
  cowbell: 'perc', tambourine: 'perc'
};

/** Hi-hat se dusí: zavřený nebo šlapaný úder utne otevřený. */
export const CHOKES: Partial<Record<DrumId, DrumId[]>> = {
  hhClosed: ['hhOpen'], hhPedal: ['hhOpen']
};

export type KitId = 'acoustic' | 'electronic';

/** Výška bubnů v Hz. „Obrázek“ = tóny z obrázku 432 (G a D z pythagorejského ladění C = 256). */
export const TUNING = {
  natural: { kick: 55, kickE: 50, tomHi: 200, tomMid: 150, tomFloor: 105, snare: 190 },
  image: { kick: 64, kickE: 48, tomHi: 192, tomMid: 144, tomFloor: 96, snare: 192 }
} as const;
export type DrumTuning = keyof typeof TUNING;

/** Řádky sekvenceru (podmnožina padů v praktickém pořadí). */
export const SEQ_ROWS: DrumId[] = ['crash', 'ride', 'hhOpen', 'hhClosed', 'tomHi', 'tomMid', 'tomFloor', 'clap', 'rim', 'snare', 'kick', 'cowbell'];
export const STEPS = 16;

/** Krok: 0 = nic, 1 = úder, 2 = akcent. */
export type Pattern = Record<DrumId, number[]>;

export function emptyPattern(): Pattern {
  const p = {} as Pattern;
  for (const id of PADS) p[id] = Array(STEPS).fill(0);
  return p;
}

/** Zápis rytmu textem: „x“ úder, „X“ akcent, „.“ nic (16 znaků). */
function row(s: string): number[] {
  return [...s.replace(/\s/g, '')].slice(0, STEPS).map(c => (c === 'X' ? 2 : c === 'x' ? 1 : 0));
}

function pattern(rows: Partial<Record<DrumId, string>>): Pattern {
  const p = emptyPattern();
  for (const [k, v] of Object.entries(rows)) p[k as DrumId] = row(v!);
  return p;
}

export type PresetId = 'rock' | 'pop' | 'funk' | 'hiphop' | 'bossa' | 'meditative';
export const PRESETS: Record<PresetId, { bpm: number; swing: number; pattern: Pattern }> = {
  rock: { bpm: 110, swing: 0, pattern: pattern({
    hhClosed: 'X.x.X.x.X.x.X.x.', snare: '....X.......X...', kick: 'X.......X.x.....', crash: 'x...............' }) },
  pop: { bpm: 100, swing: 0, pattern: pattern({
    hhClosed: 'xxxxxxxxxxxxxxxx', snare: '....X.......X...', kick: 'X..x..x.X..x....', clap: '....x.......x...' }) },
  funk: { bpm: 96, swing: 0.15, pattern: pattern({
    hhClosed: 'X.xxX.x.X.xxX.x.', hhOpen: '.......x.......x', snare: '....X..x.x..X...', kick: 'X.x....x..X..x..' }) },
  hiphop: { bpm: 88, swing: 0.3, pattern: pattern({
    hhClosed: 'x.x.x.x.x.x.x.xx', snare: '....X.......X...', kick: 'X......x..X.....', rim: '..........x.....' }) },
  bossa: { bpm: 120, swing: 0, pattern: pattern({
    rim: 'x..x..x...x..x..', kick: 'x..xx..xx..xx..x', hhClosed: 'xxxxxxxxxxxxxxxx' }) },
  meditative: { bpm: 60, swing: 0, pattern: pattern({
    tomFloor: 'X.......x.......', tomMid: '......x.......x.', ride: 'x...x...x...x...', kick: 'x...............' }) }
};

/**
 * Čas začátku kroku (s) od začátku taktu. Krok = šestnáctina.
 * Swing posune sudé (druhé) šestnáctiny o podíl délky kroku (0–0,5 → až triolový pocit).
 */
export function stepTime(step: number, bpm: number, swing: number): number {
  const d = 60 / bpm / 4;
  const base = step * d;
  return step % 2 === 1 ? base + d * Math.min(0.5, Math.max(0, swing)) * 0.66 : base;
}

export function barDuration(bpm: number): number {
  return (60 / bpm) * 4;
}
