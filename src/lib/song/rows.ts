/**
 * Řádky editoru tónů pro stopu: bubny, nebo chromatické tóny v ladění stopy.
 */
import { PADS, type DrumId } from '../drums/kit';
import { CONGA_PADS } from '../congas/kit';
import { KEY_TUNINGS, CHROMATIC_NAMES, SCALE_DEGREES } from '../instruments/defs';
import { pitch, type PitchSource, type TuningSystem } from '../tuning/systems';
import type { PercId, Track } from './model';

export interface Row {
  key: string;
  label: string;
  hz?: number;
  src?: PitchSource;
  drum?: PercId;
  /** tón stupnice z obrázku (zvýraznění) */
  inScale?: boolean;
}

/** Ladění stopy podle zdroje nahraných tónů (výchozí: pythagorejské C = 256 = obrázek). */
export function trackTuning(t: Track): { sys: TuningSystem; id: keyof typeof KEY_TUNINGS } {
  for (const c of t.clips) for (const n of c.notes) {
    const id = n.src?.tuning;
    if (id === 'pythagorean' || id === 'et432' || id === 'et440' || id === 'just') return { sys: KEY_TUNINGS[id], id };
    if (id === 'image432') return { sys: KEY_TUNINGS.pythagorean, id: 'pythagorean' };
  }
  return { sys: KEY_TUNINGS.pythagorean, id: 'pythagorean' };
}

const DRUM_ORDER: DrumId[] = ['crash', 'splash', 'ride', 'rideBell', 'hhOpen', 'hhClosed', 'hhPedal', 'tomHi', 'tomMid', 'tomFloor', 'cowbell', 'tambourine', 'clap', 'rim', 'snare', 'kick'];

/** Řádky shora dolů (vysoké tóny nahoře). */
export function rowsFor(t: Track, drumName: (d: PercId) => string): Row[] {
  if (t.sound.instrument === 'drums') return DRUM_ORDER.filter(d => PADS.includes(d)).map(d => ({ key: d, label: drumName(d), drum: d }));
  // conga: shora quinto → tumba, v každém slap, otevřený, tlumený, bas
  if (t.sound.instrument === 'congas') return CONGA_PADS.map(d => ({ key: d, label: drumName(d), drum: d }));
  const { sys } = trackTuning(t);
  let lo = 3, hi = 5;
  for (const c of t.clips) for (const n of c.notes) {
    if (n.src) { lo = Math.min(lo, n.src.octave); hi = Math.max(hi, n.src.octave); }
    else if (n.hz) { const o = Math.floor(Math.log2(n.hz / 16.35)); lo = Math.min(lo, o); hi = Math.max(hi, o); }
  }
  lo = Math.max(1, lo);
  hi = Math.min(7, hi);
  const scale = new Set(SCALE_DEGREES.image);
  const rows: Row[] = [];
  for (let o = hi; o >= lo; o--) {
    for (let i = CHROMATIC_NAMES.length - 1; i >= 0; i--) {
      const name = CHROMATIC_NAMES[i]!;
      const p = pitch(sys, name, o);
      rows.push({ key: `${name}${o}`, label: `${name}${o}`, hz: p.hz, src: p.source, inScale: scale.has(name) });
    }
  }
  return rows;
}

/** Na který řádek tón patří (nejbližší frekvence v centech, u bubnů podle bubnu). */
export function rowIndexOf(rows: Row[], n: { hz?: number; drum?: PercId }): number {
  if (n.drum) return rows.findIndex(r => r.drum === n.drum);
  if (!n.hz) return -1;
  let best = -1, dist = Infinity;
  rows.forEach((r, i) => {
    if (!r.hz) return;
    const d = Math.abs(Math.log2(n.hz! / r.hz));
    if (d < dist) { dist = d; best = i; }
  });
  return best;
}
