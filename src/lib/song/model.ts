/**
 * Model skladby: stopy → bloky (s opakováním) → tóny.
 * Čas se měří v dobách (beats, čtvrťová nota); 4 doby = 1 takt (4/4).
 * Frekvence se ukládá jako float64 + zdroj (ladění, stupeň, přesný poměr), aby se exportem nic nezměnilo.
 * Čistá data a výpočty – testovatelné, beze zvuku.
 */
import type { PitchSource } from '../tuning/systems';
import type { InstrumentId } from '../instruments/defs';
import type { DrumId } from '../drums/kit';
import type { HandPad, CongaTuning } from '../congas/kit';
import type { CajonPad } from '../cajon/kit';

/** bicí nebo conga: který buben / úder */
export type PercId = DrumId | HandPad | CajonPad;
/** nástroje bez výšky tónu v editoru (řádky = bubny / údery) */
export const isPercussion = (instrument: string) => instrument === 'drums' || instrument === 'congas' || instrument === 'bongos' || instrument === 'cajon';
import type { ModalDef } from '../instruments/defs';

export const BEATS_PER_BAR = 4;
export const SONG_VERSION = 1;

export interface SongNote {
  id: string;
  /** začátek v dobách od začátku bloku */
  t: number;
  /** délka v dobách (u úderových nástrojů jen pro zobrazení, zvuk dozní sám) */
  d: number;
  /** síla 0–1 */
  v: number;
  /** frekvence v Hz (tónové nástroje) */
  hz?: number;
  /** odkud frekvence pochází */
  src?: PitchSource;
  /** bicí: který buben; conga: buben.úder (např. 'tumba.open') */
  drum?: PercId;
  /** zvláštní způsob hry: 'ding' (handpan), 'rub' (tření mísy) */
  variant?: 'ding' | 'rub';
}

export interface Clip {
  id: string;
  /** začátek na časové ose (doby) */
  start: number;
  /** délka jednoho kola (doby) */
  len: number;
  /** kolikrát se blok zahraje za sebou (1 = jednou) */
  repeat: number;
  notes: SongNote[];
}

/** Nastavení zvuku stopy (snímek nastavení nástroje v době nahrání). */
export interface TrackSound {
  instrument: InstrumentId;
  /** handpan: dozvuk; mísy atd.: násobek dozvuku */
  decay?: number;
  decayScale?: number;
  kit?: 'acoustic' | 'electronic';
  drumTuning?: 'natural' | 'image';
  /** conga a bonga: ladění */
  congaTuning?: CongaTuning;
  /** cajon: struny za deskou */
  cajonWires?: boolean;
  synthPreset?: 'pad' | 'lead' | 'organ';
  cutoff?: number;
  release?: number;
  /** vlastní nástroj: snímek definice */
  custom?: ModalDef;
}

export interface Track {
  id: string;
  name: string;
  sound: TrackSound;
  volumeDb: number;
  pan: number;
  reverb: number;
  mute: boolean;
  solo: boolean;
  clips: Clip[];
}

export interface Song {
  version: number;
  name: string;
  bpm: number;
  /** smyčka v taktech [od, do); do ≤ od = celá skladba */
  loop: { on: boolean; from: number; to: number };
  tracks: Track[];
}

let counter = 0;
export const uid = (p: string) => `${p}${Date.now().toString(36)}${(counter++).toString(36)}`;

export function emptySong(): Song {
  return { version: SONG_VERSION, name: 'Skladba', bpm: 90, loop: { on: true, from: 0, to: 0 }, tracks: [] };
}

export const beatsToSec = (beats: number, bpm: number) => (beats * 60) / bpm;
export const secToBeats = (sec: number, bpm: number) => (sec * bpm) / 60;

export const clipEnd = (c: Clip) => c.start + c.len * Math.max(1, c.repeat);

/** Délka skladby v dobách (konec posledního bloku zaokrouhlený na takt, min. 1 takt). */
export function songBeats(s: Song): number {
  let end = 0;
  for (const t of s.tracks) for (const c of t.clips) end = Math.max(end, clipEnd(c));
  return Math.max(BEATS_PER_BAR, Math.ceil(end / BEATS_PER_BAR - 1e-9) * BEATS_PER_BAR);
}

/** Úsek, který se přehrává dokola (doby). */
export function loopRange(s: Song): [number, number] {
  const total = songBeats(s);
  const from = Math.max(0, s.loop.from) * BEATS_PER_BAR;
  const to = s.loop.to > s.loop.from ? s.loop.to * BEATS_PER_BAR : total;
  return [Math.min(from, total - BEATS_PER_BAR), Math.max(Math.min(from, total - BEATS_PER_BAR) + BEATS_PER_BAR, to)];
}

export interface Ev {
  track: Track;
  note: SongNote;
  /** absolutní začátek v dobách */
  at: number;
}

/** Všechny tóny skladby s absolutním časem (opakování bloků rozvinuta), seřazené. Ztlumené stopy vynechá. */
export function expand(s: Song, opts: { respectMute?: boolean } = {}): Ev[] {
  const anySolo = s.tracks.some(t => t.solo);
  const out: Ev[] = [];
  for (const track of s.tracks) {
    if (opts.respectMute !== false && (track.mute || (anySolo && !track.solo))) continue;
    for (const c of track.clips) {
      for (let r = 0; r < Math.max(1, c.repeat); r++) {
        const base = c.start + r * c.len;
        for (const n of c.notes) if (n.t < c.len - 1e-9) out.push({ track, note: n, at: base + n.t });
      }
    }
  }
  return out.sort((a, b) => a.at - b.at);
}

/** Tóny v okně [from, to) dob – pro plánovač. */
export function eventsBetween(evs: Ev[], from: number, to: number): Ev[] {
  // binární hledání začátku
  let lo = 0, hi = evs.length;
  while (lo < hi) {
    const m = (lo + hi) >> 1;
    if (evs[m]!.at < from - 1e-9) lo = m + 1; else hi = m;
  }
  const out: Ev[] = [];
  for (let i = lo; i < evs.length && evs[i]!.at < to - 1e-9; i++) out.push(evs[i]!);
  return out;
}

/** Zarovnání na mřížku (doby), např. grid 0,25 = šestnáctiny. Síla 0–1. */
export function quantize(t: number, grid: number, strength = 1): number {
  if (grid <= 0) return t;
  const q = Math.round(t / grid) * grid;
  return t + (q - t) * strength;
}

export function snap(t: number, grid: number): number {
  return grid > 0 ? Math.round(t / grid) * grid : t;
}

/** Ověření a oprava skladby načtené ze souboru (ochrana před poškozenými daty). */
export function sanitizeSong(raw: unknown): Song {
  const r = (raw ?? {}) as Partial<Song>;
  const num = (v: unknown, lo: number, hi: number, d: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);
  const tracks = Array.isArray(r.tracks) ? r.tracks.slice(0, 32) : [];
  return {
    version: SONG_VERSION,
    name: typeof r.name === 'string' ? r.name.slice(0, 80) : 'Skladba',
    bpm: num(r.bpm, 30, 300, 90),
    loop: { on: !!r.loop?.on, from: num(r.loop?.from, 0, 999, 0), to: num(r.loop?.to, 0, 999, 0) },
    tracks: tracks.map((t: Partial<Track>) => ({
      id: typeof t.id === 'string' ? t.id : uid('t'),
      name: typeof t.name === 'string' ? t.name.slice(0, 60) : 'Stopa',
      sound: { ...(t.sound ?? {}), instrument: (t.sound?.instrument ?? 'piano') as InstrumentId },
      volumeDb: num(t.volumeDb, -60, 6, 0),
      pan: num(t.pan, -1, 1, 0),
      reverb: num(t.reverb, 0, 1, 0.2),
      mute: !!t.mute,
      solo: !!t.solo,
      clips: (Array.isArray(t.clips) ? t.clips.slice(0, 256) : []).map((c: Partial<Clip>) => ({
        id: typeof c.id === 'string' ? c.id : uid('c'),
        start: num(c.start, 0, 100000, 0),
        len: num(c.len, 0.25, 4096, 4),
        repeat: Math.round(num(c.repeat, 1, 256, 1)),
        notes: (Array.isArray(c.notes) ? c.notes.slice(0, 20000) : [])
          .map((n: Partial<SongNote>) => ({
            id: typeof n.id === 'string' ? n.id : uid('n'),
            t: num(n.t, 0, 4096, 0),
            d: num(n.d, 0.01, 4096, 0.25),
            v: num(n.v, 0, 1, 0.7),
            ...(typeof n.hz === 'number' && n.hz > 0 && n.hz < 22000 ? { hz: n.hz } : {}),
            ...(n.src ? { src: n.src } : {}),
            ...(n.drum ? { drum: n.drum } : {}),
            ...(n.variant === 'ding' || n.variant === 'rub' ? { variant: n.variant } : {})
          }))
          .filter(n => n.hz !== undefined || n.drum !== undefined)
      }))
    }))
  };
}
