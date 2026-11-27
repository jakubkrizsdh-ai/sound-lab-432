/**
 * Bubny na ruce s kulatou hlavou: conga set (quinto, conga, tumba) a bonga (macho, hembra).
 * Výška otevřeného tónu je „Vypočteno“ z ladění; zvuk je model (syntéza), ne nahrávka.
 */

export type HandSet = 'congas' | 'bongos';
export type CongaDrum = 'quinto' | 'conga' | 'tumba';
export type BongoDrum = 'macho' | 'hembra';
export type HandDrum = CongaDrum | BongoDrum;
/** open = otevřený tón (prsty u okraje), slap = ostrý plesk, mute = tlumený (prsty zůstanou na bláně),
 *  bass = dlaň do středu (conga), thumb = palec do středu (bonga) */
export type CongaStroke = 'slap' | 'open' | 'mute' | 'bass';
export type BongoStroke = 'slap' | 'open' | 'mute' | 'thumb';
export type HandStroke = CongaStroke | BongoStroke;
export type CongaPad = `${CongaDrum}.${CongaStroke}`;
export type BongoPad = `${BongoDrum}.${BongoStroke}`;
export type HandPad = CongaPad | BongoPad;
export type CongaTuning = 'natural' | 'image';

/** zleva doprava jako u hráče pravou rukou: nejmenší vlevo */
export const CONGA_DRUMS: CongaDrum[] = ['quinto', 'conga', 'tumba'];
export const STROKES: CongaStroke[] = ['slap', 'open', 'mute', 'bass'];
export const CONGA_PADS: CongaPad[] = CONGA_DRUMS.flatMap(d => STROKES.map(s => `${d}.${s}` as CongaPad));
export const BONGO_DRUMS: BongoDrum[] = ['macho', 'hembra'];
export const BONGO_STROKES: BongoStroke[] = ['slap', 'open', 'mute', 'thumb'];
export const BONGO_PADS: BongoPad[] = BONGO_DRUMS.flatMap(d => BONGO_STROKES.map(s => `${d}.${s}` as BongoPad));

export const padDrum = (p: HandPad) => p.split('.')[0] as HandDrum;
export const padStroke = (p: HandPad) => p.split('.')[1] as HandStroke;
export const isCongaPad = (x: unknown): x is CongaPad => typeof x === 'string' && (CONGA_PADS as string[]).includes(x);
export const isBongoPad = (x: unknown): x is BongoPad => typeof x === 'string' && (BONGO_PADS as string[]).includes(x);
export const isHandPad = (x: unknown): x is HandPad => isCongaPad(x) || isBongoPad(x);

/**
 * Výška otevřeného tónu (Hz).
 * natural: běžné ladění souprav. image: tóny obrázku (pythagorejské C = 256 Hz).
 * conga: A3 = 216 (27/32), D4 = 288 (9/8), G4 = 384 (3/2); bonga: A4 = 432 (27/16), D5 = 576 (9/4).
 */
export const CONGA_TUNING: Record<CongaTuning, Record<CongaDrum, number>> = {
  natural: { quinto: 370, conga: 290, tumba: 220 },
  image: { quinto: 384, conga: 288, tumba: 216 }
};
export const BONGO_TUNING: Record<CongaTuning, Record<BongoDrum, number>> = {
  natural: { macho: 620, hembra: 410 },
  image: { macho: 576, hembra: 432 }
};
export function handFreq(tuning: CongaTuning, drum: HandDrum): number {
  return drum === 'macho' || drum === 'hembra' ? BONGO_TUNING[tuning][drum] : CONGA_TUNING[tuning][drum];
}
export const IMAGE_NOTES: Record<HandDrum, { name: string; ratio: string }> = {
  quinto: { name: 'G4', ratio: '3/2' },
  conga: { name: 'D4', ratio: '9/8' },
  tumba: { name: 'A3', ratio: '27/32' },
  macho: { name: 'D5', ratio: '9/4' },
  hembra: { name: 'A4', ratio: '27/16' }
};

/** relativní velikost hlavy v sadě (conga: quinto ~ 9¾″, conga ~ 11″, tumba ~ 12″; bonga: macho ~ 7″, hembra ~ 8½″) */
export const DRUM_SIZE: Record<HandDrum, number> = { quinto: 0.82, conga: 0.92, tumba: 1, macho: 0.82, hembra: 1 };

/**
 * Výchozí klávesy (fyzické kódy): každý buben dva sloupce.
 * horní řada slap · tlumený, prostřední řada otevřený · bas/palec.
 */
export const CONGA_CODES: Record<CongaPad, string> = {
  'quinto.slap': 'KeyQ', 'quinto.mute': 'KeyW', 'quinto.open': 'KeyA', 'quinto.bass': 'KeyS',
  'conga.slap': 'KeyE', 'conga.mute': 'KeyR', 'conga.open': 'KeyD', 'conga.bass': 'KeyF',
  'tumba.slap': 'KeyT', 'tumba.mute': 'KeyY', 'tumba.open': 'KeyG', 'tumba.bass': 'KeyH'
};
export const BONGO_CODES: Record<BongoPad, string> = {
  'macho.slap': 'KeyQ', 'macho.mute': 'KeyW', 'macho.open': 'KeyA', 'macho.thumb': 'KeyS',
  'hembra.slap': 'KeyE', 'hembra.mute': 'KeyR', 'hembra.open': 'KeyD', 'hembra.thumb': 'KeyF'
};

/** Popis sady pro obrazovku a studio. */
export interface SetDef {
  drums: HandDrum[];
  pads: HandPad[];
  /** úder do středu hlavy */
  center: 'bass' | 'thumb';
  codes: Record<string, string>;
}
export const SETS: Record<HandSet, SetDef> = {
  congas: { drums: CONGA_DRUMS, pads: CONGA_PADS, center: 'bass', codes: CONGA_CODES },
  bongos: { drums: BONGO_DRUMS, pads: BONGO_PADS, center: 'thumb', codes: BONGO_CODES }
};

/** zóny hlavy (poloměr 0–1): střed = bas/palec, kruh = otevřený, okraj = slap */
export const ZONE_BASS = 0.42;
export const ZONE_OPEN = 0.8;
export function zoneStroke(r: number): CongaStroke;
export function zoneStroke(r: number, center: 'bass' | 'thumb'): HandStroke;
export function zoneStroke(r: number, center: 'bass' | 'thumb' = 'bass'): HandStroke {
  return r < ZONE_BASS ? center : r < ZONE_OPEN ? 'open' : 'slap';
}
