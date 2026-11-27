/**
 * Cajon: dřevěná bedna, hraje se rukama na přední desku (tapa). Za deskou mohou být struny (snare),
 * které při úderu bzučí. Zvuk je model (syntéza), ne nahrávka. Cajon nemá laděnou výšku.
 */
export type CajonStroke = 'slap' | 'tone' | 'bass' | 'ghost';
export type CajonPad = `cajon.${CajonStroke}`;
export type Hand = 'L' | 'R';

export const CAJON_STROKES: CajonStroke[] = ['slap', 'tone', 'bass', 'ghost'];
export const CAJON_PADS: CajonPad[] = CAJON_STROKES.map(s => `cajon.${s}` as CajonPad);
export const isCajonPad = (x: unknown): x is CajonPad => typeof x === 'string' && (CAJON_PADS as string[]).includes(x);
export const cajonStroke = (p: CajonPad) => p.split('.')[1] as CajonStroke;

/** Klávesové sloty: každý úder levou i pravou rukou (zrcadlově), bas i mezerníkem. */
export const CAJON_SLOTS = ['slap.L', 'tone.L', 'bass.L', 'ghost.L', 'ghost.R', 'bass.R', 'tone.R', 'slap.R', 'bass.S'] as const;
export type CajonSlot = (typeof CAJON_SLOTS)[number];
export const CAJON_CODES: Record<CajonSlot, string> = {
  'slap.L': 'KeyA', 'tone.L': 'KeyS', 'bass.L': 'KeyD', 'ghost.L': 'KeyF',
  'ghost.R': 'KeyJ', 'bass.R': 'KeyK', 'tone.R': 'KeyL', 'slap.R': 'Semicolon',
  'bass.S': 'Space'
};
export const slotStroke = (s: string) => s.split('.')[0] as CajonStroke;
export const slotHand = (s: string): Hand => (s.endsWith('.R') ? 'R' : 'L');

/** Zóny přední desky shora (podíl výšky): horní okraj = slap, pod ním tón, střed a níž = bas. */
export const ZONE_SLAP = 0.24;
export const ZONE_TONE = 0.5;
export function faceStroke(y: number): CajonStroke {
  return y < ZONE_SLAP ? 'slap' : y < ZONE_TONE ? 'tone' : 'bass';
}
