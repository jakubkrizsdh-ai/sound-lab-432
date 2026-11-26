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

// --- 2D pohled na soupravu (obrázek 1254 × 1254 px) ---

export const KIT_SIZE = 1254;

export type Hotspot =
  | { id: DrumId; shape: 'ellipse'; cx: number; cy: number; rx: number; ry: number; label: [number, number] }
  | { id: DrumId; shape: 'rect'; x0: number; y0: number; x1: number; y1: number; label: [number, number] };

/**
 * Klikací místa na obrázku soupravy. Pořadí = priorita (co je vpředu nebo menší, je dřív).
 * Hi-hat: horní činel = otevřený, spodní = zavřený, pedál = šlapaný. Elektronický pad = tlesk.
 */
export const KIT_HOTSPOTS: Hotspot[] = [
  { id: 'rideBell', shape: 'ellipse', cx: 922, cy: 196, rx: 48, ry: 28, label: [922, 150] },
  { id: 'splash', shape: 'ellipse', cx: 558, cy: 188, rx: 78, ry: 32, label: [558, 130] },
  { id: 'tambourine', shape: 'ellipse', cx: 1100, cy: 355, rx: 100, ry: 48, label: [1100, 300] },
  { id: 'clap', shape: 'rect', x0: 1035, y0: 438, x1: 1215, y1: 528, label: [1125, 560] },
  { id: 'cowbell', shape: 'rect', x0: 800, y0: 372, x1: 940, y1: 470, label: [870, 490] },
  { id: 'hhOpen', shape: 'ellipse', cx: 163, cy: 430, rx: 130, ry: 30, label: [163, 385] },
  { id: 'hhClosed', shape: 'ellipse', cx: 163, cy: 478, rx: 130, ry: 30, label: [163, 535] },
  { id: 'hhPedal', shape: 'rect', x0: 135, y0: 875, x1: 290, y1: 1080, label: [215, 1100] },
  { id: 'ride', shape: 'ellipse', cx: 935, cy: 225, rx: 196, ry: 112, label: [1010, 260] },
  { id: 'crash', shape: 'ellipse', cx: 285, cy: 178, rx: 170, ry: 90, label: [285, 120] },
  { id: 'snare', shape: 'ellipse', cx: 385, cy: 570, rx: 134, ry: 62, label: [385, 570] },
  { id: 'rim', shape: 'rect', x0: 246, y0: 600, x1: 524, y1: 748, label: [385, 690] },
  { id: 'tomHi', shape: 'rect', x0: 352, y0: 278, x1: 552, y1: 508, label: [455, 340] },
  { id: 'tomMid', shape: 'rect', x0: 558, y0: 272, x1: 768, y1: 502, label: [662, 335] },
  { id: 'tomFloor', shape: 'rect', x0: 788, y0: 498, x1: 1060, y1: 842, label: [925, 570] },
  { id: 'kick', shape: 'rect', x0: 568, y0: 760, x1: 668, y1: 968, label: [615, 935] },
  { id: 'kick', shape: 'ellipse', cx: 615, cy: 690, rx: 172, ry: 168, label: [615, 600] }
];

export function hotspotAt(x: number, y: number): DrumId | null {
  for (const h of KIT_HOTSPOTS) {
    if (h.shape === 'ellipse') {
      if (((x - h.cx) / h.rx) ** 2 + ((y - h.cy) / h.ry) ** 2 <= 1) return h.id;
    } else if (x >= h.x0 && x <= h.x1 && y >= h.y0 && y <= h.y1) {
      return h.id;
    }
  }
  return null;
}
