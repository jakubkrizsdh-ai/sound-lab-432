/**
 * Přehrávání skladby, nahrávání hraní do stop a export.
 * Plánovač běží v čase AudioContextu s předstihem (přesné tempo), smyčka bez mezery.
 */
import { buildMasterChain, engine, type Voice } from '../audio/engine.svelte';
import { encodeWav16, floatTo16 } from '../audio/wav';
import { BEATS_PER_BAR, beatsToSec, expand, loopRange, secToBeats, songBeats, uid, type Ev, type Song, type SongNote, type TrackSound } from './model';
import { addClip, addTrack, findTrack, song, trackFor } from './store.svelte';
import { onPlay, type PlayEvent } from './events';
import { playSongNote, SongMixer } from './sound';
import type { InstrumentId } from '../instruments/defs';

const LOOKAHEAD = 0.15;
const TICK = 25;

export const transport = $state({
  playing: false,
  recording: false,
  /** odpočet před nahráváním: zbývající doby */
  countIn: 0,
  /** aktuální pozice v dobách (pro ukazatel) */
  pos: 0,
  metronome: true,
  /** kolik tónů se nahrálo v tomto záznamu */
  takeNotes: 0
});

let mixer: SongMixer | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let raf = 0;
let cursor = 0;            // další nenaplánovaná doba
let cursorTime = 0;        // čas AudioContextu, který jí odpovídá
let anchors: { time: number; beat: number }[] = [];
let events: Ev[] = [];
let eventsRev = -1;
let active: Voice[] = [];
let stopAt: number | null = null;

function getMixer(): SongMixer | null {
  const ctx = engine.ctx;
  const dest = engine.input;
  if (!ctx || !dest) return null;
  if (!mixer) mixer = new SongMixer(ctx, dest);
  return mixer;
}

function refreshEvents() {
  if (eventsRev !== song.rev) {
    events = expand(song.s);
    eventsRev = song.rev;
    const m = mixer;
    if (m) for (const t of song.s.tracks) m.apply(t);
  }
}

function click(time: number, accent: boolean) {
  const ctx = engine.ctx!;
  const o = ctx.createOscillator();
  o.frequency.value = accent ? 1760 : 1320;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, time);
  g.gain.linearRampToValueAtTime(accent ? 0.35 : 0.22, time + 0.002);
  g.gain.setTargetAtTime(0, time + 0.002, 0.012);
  o.connect(g).connect(engine.input!);
  o.start(time);
  o.stop(time + 0.08);
}

function scheduleRange(from: number, to: number, t0: number) {
  const bpm = song.s.bpm;
  const m = getMixer()!;
  for (const ev of eventsInRange(from, to)) {
    const when = t0 + beatsToSec(ev.at - from, bpm);
    const v = playSongNote(engine.ctx!, m.bus(ev.track).input, ev.track.sound, ev.note, Math.max(when, engine.ctx!.currentTime), beatsToSec(ev.note.d, bpm));
    if (v) {
      active.push(v);
      v.onEnded = () => { const i = active.indexOf(v); if (i >= 0) active.splice(i, 1); };
    }
  }
  if (transport.metronome || transport.countIn > 0) {
    for (let b = Math.ceil(from - 1e-9); b < to - 1e-9; b++) click(t0 + beatsToSec(b - from, bpm), b % BEATS_PER_BAR === 0);
  }
}

function eventsInRange(from: number, to: number): Ev[] {
  const out: Ev[] = [];
  for (const e of events) {
    if (e.at >= to - 1e-9) break;
    if (e.at >= from - 1e-9) out.push(e);
  }
  return out;
}

function tick() {
  const ctx = engine.ctx;
  if (!ctx || !transport.playing) return;
  refreshEvents();
  const horizon = ctx.currentTime + LOOKAHEAD;
  const bpm = song.s.bpm;
  const [ls, le] = loopRange(song.s);
  const loopOn = song.s.loop.on;
  // Nahrávání do prázdné skladby (nebo bez smyčky) běží volně, dokud nezastavíte.
  const empty = !song.s.tracks.some(t => t.clips.some(c => c.notes.length));
  const free = transport.recording && (!loopOn || empty);
  const end = free ? Infinity : loopOn ? le : songBeats(song.s);
  while (cursorTime < horizon) {
    const want = cursor + secToBeats(horizon - cursorTime, bpm);
    const segEnd = Math.min(want, end);
    if (segEnd > cursor) {
      scheduleRange(cursor, segEnd, cursorTime);
      cursorTime += beatsToSec(segEnd - cursor, bpm);
      cursor = segEnd;
    }
    if (cursor >= end - 1e-9) {
      if (loopOn || transport.recording) {
        cursor = loopOn ? ls : 0;
        anchors.push({ time: cursorTime, beat: cursor });
        if (anchors.length > 64) anchors.shift();
      } else {
        stopAt = cursorTime;
        break;
      }
    }
  }
}

function follow() {
  const ctx = engine.ctx;
  if (!ctx || !transport.playing) return;
  const now = ctx.currentTime;
  let a = anchors[0];
  for (const x of anchors) if (x.time <= now) a = x;
  if (a) transport.pos = a.beat + secToBeats(Math.max(0, now - a.time), song.s.bpm);
  if (transport.countIn > 0) transport.countIn = Math.max(0, Math.ceil(secToBeats(countInEnd - now, song.s.bpm)));
  if (stopAt !== null && now >= stopAt) {
    stop();
    return;
  }
  raf = requestAnimationFrame(follow);
}

/** Aktuální doba skladby (pro nahrávání). */
function beatNow(): number {
  const ctx = engine.ctx;
  if (!ctx) return 0;
  const now = ctx.currentTime;
  let a = anchors[0];
  for (const x of anchors) if (x.time <= now) a = x;
  return a ? a.beat + secToBeats(Math.max(0, now - a.time), song.s.bpm) : 0;
}

let countInEnd = 0;

export async function play(fromBeat?: number, countInBeats = 0) {
  if (transport.playing) return;
  await engine.start();
  const ctx = engine.ctx;
  if (!ctx || !getMixer()) return;
  refreshEvents();
  const start = fromBeat ?? (song.s.loop.on ? loopRange(song.s)[0] : 0);
  const t0 = ctx.currentTime + 0.08;
  // odpočet: metronom jeden takt před začátkem
  if (countInBeats > 0) {
    transport.countIn = countInBeats;
    countInEnd = t0 + beatsToSec(countInBeats, song.s.bpm);
    for (let b = 0; b < countInBeats; b++) click(t0 + beatsToSec(b, song.s.bpm), b === 0);
  } else {
    countInEnd = t0;
  }
  cursor = start;
  cursorTime = countInEnd;
  anchors = [{ time: countInEnd, beat: start }];
  stopAt = null;
  transport.pos = start;
  transport.playing = true;
  tick();
  timer = setInterval(tick, TICK);
  raf = requestAnimationFrame(follow);
}

export function stop() {
  if (timer) clearInterval(timer);
  timer = null;
  cancelAnimationFrame(raf);
  const ctx = engine.ctx;
  if (ctx) for (const v of active) v.stop(ctx.currentTime);
  active = [];
  transport.playing = false;
  transport.countIn = 0;
  stopAt = null;
  if (transport.recording) finishRecording();
}

// --- nahrávání hraní ---
interface Pending { note: SongNote; sound: TrackSound; at: number }
let take: Pending[] = [];
const open = new Map<string, Pending>();
let unlisten: (() => void) | null = null;

function onEvent(e: PlayEvent) {
  if (!transport.recording || transport.countIn > 0) return;
  const at = beatNow();
  if (e.kind === 'on') {
    const isDrum = e.sound.instrument === 'drums';
    const note: SongNote = {
      id: uid('n'), t: 0, d: isDrum ? 0.25 : 0.5, v: Math.round(e.velocity * 1000) / 1000,
      ...(e.hz !== undefined ? { hz: e.hz } : {}), ...(e.src ? { src: e.src } : {}),
      ...(e.drum ? { drum: e.drum } : {}), ...(e.variant ? { variant: e.variant } : {})
    };
    const p: Pending = { note, sound: e.sound, at };
    take.push(p);
    open.set(e.key, p);
    transport.takeNotes = take.length;
  } else {
    const p = open.get(e.key);
    if (p) {
      // délka drženého tónu (klavír, flétna, tření mísy); po smyčce může být „záporná“
      const d = at - p.at;
      if (d > 0.05) p.note.d = Math.round(d * 1000) / 1000;
      open.delete(e.key);
    }
  }
}

const NAMES: Record<string, string> = {};
export function setTrackNames(map: Record<string, string>) {
  Object.assign(NAMES, map);
}

function finishRecording() {
  transport.recording = false;
  unlisten?.();
  unlisten = null;
  open.clear();
  if (!take.length) return;
  // rozdělit podle nástroje → každý nástroj do své stopy (vytvoří se, když chybí)
  const byInst = new Map<InstrumentId, Pending[]>();
  for (const p of take) {
    const k = p.sound.instrument;
    if (!byInst.has(k)) byInst.set(k, []);
    byInst.get(k)!.push(p);
  }
  for (const [instrument, list] of byInst) {
    let track = trackFor(instrument);
    if (!track) track = addTrack(list[0]!.sound, NAMES[instrument] ?? instrument);
    const first = Math.min(...list.map(p => p.at));
    const last = Math.max(...list.map(p => p.at + p.note.d));
    const start = Math.floor(first / BEATS_PER_BAR) * BEATS_PER_BAR;
    const len = Math.max(BEATS_PER_BAR, Math.ceil((last - start) / BEATS_PER_BAR - 1e-9) * BEATS_PER_BAR);
    const notes = list.map(p => ({ ...p.note, t: Math.round((p.at - start) * 1000) / 1000 }));
    addClip(track.id, start, len, notes);
  }
  take = [];
  transport.takeNotes = 0;
}

/** Nahrávání: spustí přehrávání (s odpočtem) a zapisuje vše, co zahrajete na nástroje. */
export async function record() {
  if (transport.recording) return;
  if (transport.playing) stop();
  take = [];
  open.clear();
  transport.takeNotes = 0;
  transport.recording = true;
  unlisten = onPlay(onEvent);
  await play(undefined, BEATS_PER_BAR);
}

export function setTrackLive(id: string) {
  const t = findTrack(id);
  if (t && mixer) mixer.apply(t);
}

if (typeof window !== 'undefined') {
  window.addEventListener('soundlab:stop-all', () => { if (transport.playing) stop(); });
}

// --- export ---
/** Vyrenderuje skladbu (jednou celou) do WAV – stejné hlasy jako živě, bez metronomu. */
export async function renderWav(s: Song, onProgress?: (p: number) => void): Promise<Blob> {
  const sr = 44100;
  const evs = expand(s);
  const beats = songBeats(s);
  const tail = 4; // s dozvuku na konci
  const seconds = beatsToSec(beats, s.bpm) + tail;
  const ctx = new OfflineAudioContext(2, Math.ceil(seconds * sr), sr);
  const chain = await buildMasterChain(ctx, -3);
  const mix = new SongMixer(ctx, chain.input);
  for (const ev of evs) {
    playSongNote(ctx, mix.bus(ev.track).input, ev.track.sound, ev.note, 0.05 + beatsToSec(ev.at, s.bpm), beatsToSec(ev.note.d, s.bpm));
  }
  onProgress?.(0.1);
  const buf = await ctx.startRendering();
  onProgress?.(0.8);
  const l = buf.getChannelData(0);
  const r = buf.getChannelData(1);
  const pcm = new Int16Array(l.length * 2);
  let seed = 777;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < l.length; i++) {
    pcm[i * 2] = floatTo16(l[i]!, rnd);
    pcm[i * 2 + 1] = floatTo16(r[i]!, rnd);
  }
  onProgress?.(1);
  return encodeWav16([pcm], 2, sr);
}
