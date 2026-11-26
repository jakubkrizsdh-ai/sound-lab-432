/**
 * Výchozí rozložení kláves počítače pro nástroje. Klávesy se berou podle fyzické polohy
 * (KeyboardEvent.code), takže fungují stejně na české i anglické klávesnici.
 * Čistá data a výpočty (testovatelné).
 */

/** Handpan: podle polohy pole na bubnu. */
export interface FieldPos { index: number; kind: 'ding' | 'top' | 'bottom'; x: number; y: number }

export function handpanCodes(fields: FieldPos[]): Record<number, string> {
  const out: Record<number, string> = {};
  const top = fields.filter(f => f.kind === 'top');
  const left = top.filter(f => f.x < 0.47).sort((a, b) => a.y - b.y);
  const right = top.filter(f => f.x > 0.53).sort((a, b) => a.y - b.y);
  const center = top.filter(f => f.x >= 0.47 && f.x <= 0.53);
  ['KeyA', 'KeyS', 'KeyD', 'KeyF'].forEach((c, i) => { if (left[i]) out[left[i]!.index] = c; });
  ['KeyH', 'KeyJ', 'KeyK', 'KeyL'].forEach((c, i) => { if (right[i]) out[right[i]!.index] = c; });
  if (center[0]) out[center[0].index] = 'KeyG';
  // více polí na jedné straně než 4 (vlastní rozložení) – další klávesy v řadě
  [...left.slice(4), ...right.slice(4), ...center.slice(1)].forEach((f, i) => { out[f.index] = ['KeyQ', 'KeyW', 'KeyE', 'KeyR'][i] ?? ''; });
  const bottom = fields.filter(f => f.kind === 'bottom').sort((a, b) => a.x - b.x);
  ['KeyV', 'KeyB'].forEach((c, i) => { if (bottom[i]) out[bottom[i]!.index] = c; });
  const ding = fields.find(f => f.kind === 'ding');
  if (ding) out[ding.index] = 'Space';
  return out;
}

/** Kalimba: vzestupně – domácí řada A–L, pak horní řada Q–P. */
export const KALIMBA_CODES = [
  'KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL',
  'KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP'
];

/**
 * Klaviatura (chromaticky od C): bílé klávesy na řadě Q–P a dál [ ], půltóny na číslech nad nimi.
 * Index = půltón od nejnižšího C.
 */
export const PIANO_CODES = [
  'KeyQ', 'Digit2', 'KeyW', 'Digit3', 'KeyE', 'KeyR', 'Digit5', 'KeyT', 'Digit6', 'KeyY', 'Digit7', 'KeyU',
  'KeyI', 'Digit9', 'KeyO', 'Digit0', 'KeyP', 'BracketLeft', 'Equal', 'BracketRight'
];

/** Mísy, zvonky, gong: číslice zleva. */
export const DIGIT_CODES = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0'];

/** Popisek klávesy pro anglické rozložení (když prohlížeč skutečné rozložení neprozradí). */
export function defaultLabel(code: string): string {
  if (!code) return '';
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  const map: Record<string, string> = {
    Space: '␣', Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/', BracketLeft: '[', BracketRight: ']',
    Equal: '=', Minus: '-', Backslash: '\\', Backquote: '`', IntlBackslash: '<'
  };
  return map[code] ?? code.replace(/^Numpad/, 'Num ');
}
