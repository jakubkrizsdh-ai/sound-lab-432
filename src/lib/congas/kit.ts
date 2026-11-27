/**
 * Conga set: tři bubny (quinto, conga, tumba), na každém čtyři údery rukou.
 * Výška otevřeného tónu je „Vypočteno“ z ladění; zvuk je model (syntéza), ne nahrávka.
 */

export type CongaDrum = 'quinto' | 'conga' | 'tumba';
/** open = otevřený tón (prsty u okraje), slap = ostrý plesk, mute = tlumený (prsty zůstanou na bláně), bass = dlaň do středu */
export type CongaStroke = 'slap' | 'open' | 'mute' | 'bass';
export type CongaPad = `${CongaDrum}.${CongaStroke}`;
export type CongaTuning = 'natural' | 'image';

/** zleva doprava jako u hráče pravou rukou: nejmenší vlevo */
export const CONGA_DRUMS: CongaDrum[] = ['quinto', 'conga', 'tumba'];
export const STROKES: CongaStroke[] = ['slap', 'open', 'mute', 'bass'];
export const CONGA_PADS: CongaPad[] = CONGA_DRUMS.flatMap(d => STROKES.map(s => `${d}.${s}` as CongaPad));

export const padDrum = (p: CongaPad) => p.split('.')[0] as CongaDrum;
export const padStroke = (p: CongaPad) => p.split('.')[1] as CongaStroke;
export const isCongaPad = (x: unknown): x is CongaPad => typeof x === 'string' && (CONGA_PADS as string[]).includes(x);

/**
 * Výška otevřeného tónu (Hz).
 * natural: běžné ladění souprav (quinto nejvýš, tumba nejníž).
 * image: tóny obrázku (pythagorejské C = 256): A3 = 216 (27/32), D4 = 288 (9/8), G4 = 384 (3/2) – kvintové řady.
 */
export const CONGA_TUNING: Record<CongaTuning, Record<CongaDrum, number>> = {
  natural: { quinto: 370, conga: 290, tumba: 220 },
  image: { quinto: 384, conga: 288, tumba: 216 }
};
export const IMAGE_NOTES: Record<CongaDrum, { name: string; ratio: string }> = {
  quinto: { name: 'G4', ratio: '3/2' },
  conga: { name: 'D4', ratio: '9/8' },
  tumba: { name: 'A3', ratio: '27/32' }
};

/** relativní velikost hlavy (průměr: quinto ~ 9¾″, conga ~ 11″, tumba ~ 12″) */
export const DRUM_SIZE: Record<CongaDrum, number> = { quinto: 0.82, conga: 0.92, tumba: 1 };

/**
 * Výchozí klávesy (fyzické kódy): každý buben dva sloupce.
 * horní řada slap · tlumený, prostřední řada otevřený · bas.
 */
export const CONGA_CODES: Record<CongaPad, string> = {
  'quinto.slap': 'KeyQ', 'quinto.mute': 'KeyW', 'quinto.open': 'KeyA', 'quinto.bass': 'KeyS',
  'conga.slap': 'KeyE', 'conga.mute': 'KeyR', 'conga.open': 'KeyD', 'conga.bass': 'KeyF',
  'tumba.slap': 'KeyT', 'tumba.mute': 'KeyY', 'tumba.open': 'KeyG', 'tumba.bass': 'KeyH'
};

/** zóny hlavy (poloměr 0–1): střed = bas, kruh = otevřený, okraj = slap */
export const ZONE_BASS = 0.42;
export const ZONE_OPEN = 0.8;
export function zoneStroke(r: number): CongaStroke {
  return r < ZONE_BASS ? 'bass' : r < ZONE_OPEN ? 'open' : 'slap';
}
