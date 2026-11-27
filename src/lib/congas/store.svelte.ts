/**
 * Conga: nastavení (pamatuje se) a hraní úderů. Všechny údery jednoho bubnu sdílí jednu blánu:
 * nový úder předchozí přitlumí (jako ruka na skutečné bláně), max. 3 doznívající údery na buben.
 */
import { engine, safeStop } from '../audio/engine.svelte';
import { makeRoomImpulse } from '../handpan/voice';
import { emitPlay } from '../song/events';
import { padDrum, type CongaDrum, type CongaPad, type CongaTuning } from './kit';
import { congaHit, type CongaVoice } from './synth';

const KEY = 'soundlab.congas';

interface Saved {
  tuning: CongaTuning;
  velocity: number;
  reverb: number;
  labels: boolean;
}

function load(): Saved {
  const def: Saved = { tuning: 'natural', velocity: 0.8, reverb: 0.15, labels: true };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = { ...def, ...(JSON.parse(raw) as Partial<Saved>) };
      if (s.tuning !== 'natural' && s.tuning !== 'image') s.tuning = 'natural';
      s.velocity = Math.min(1, Math.max(0.1, +s.velocity || def.velocity));
      s.reverb = Math.min(1, Math.max(0, +s.reverb || 0));
      return s;
    }
  } catch {
    /* ignorovat */
  }
  return def;
}

export const congas = $state({
  ...load(),
  /** pro záblesk zasažené zóny */
  hits: {} as Record<string, { n: number; v: number }>
});

export function save() {
  try {
    const { hits: _h, ...rest } = $state.snapshot(congas);
    localStorage.setItem(KEY, JSON.stringify(rest));
  } catch {
    /* ignorovat */
  }
}

// --- zvuková sběrnice s dozvukem místnosti ---
let bus: { ctx: BaseAudioContext; input: GainNode; dry: GainNode; wet: GainNode } | null = null;
function getBus() {
  const ctx = engine.ctx;
  const dest = engine.input;
  if (!ctx || !dest) return null;
  if (bus?.ctx === ctx) return bus;
  const input = ctx.createGain();
  const dry = ctx.createGain();
  const wet = ctx.createGain();
  const conv = ctx.createConvolver();
  conv.buffer = makeRoomImpulse(ctx, 1.4);
  input.connect(dry).connect(dest);
  input.connect(conv).connect(wet).connect(dest);
  bus = { ctx, input, dry, wet };
  applyReverb();
  return bus;
}

export function applyReverb() {
  if (!bus) return;
  const t = bus.ctx.currentTime;
  bus.dry.gain.setTargetAtTime(Math.cos((congas.reverb * Math.PI) / 2), t, 0.02);
  bus.wet.gain.setTargetAtTime(Math.sin((congas.reverb * Math.PI) / 2) * 0.9, t, 0.02);
}

const ringing = new Map<CongaDrum, CongaVoice[]>();
const MAX_PER_DRUM = 3;

function play(pad: CongaPad, v: number) {
  const b = getBus();
  if (!b) return;
  const t = b.ctx.currentTime;
  const drum = padDrum(pad);
  const list = ringing.get(drum) ?? [];
  for (const x of list) { try { x.damp(t); } catch { /* */ } }
  while (list.length >= MAX_PER_DRUM) safeStop(list.shift(), t);
  const voice = congaHit(b.ctx, b.input, pad, congas.tuning, v, t);
  voice.onEnded = () => {
    engine.removeVoice(voice);
    const i = list.indexOf(voice);
    if (i >= 0) list.splice(i, 1);
  };
  list.push(voice);
  ringing.set(drum, list);
  engine.addVoice(voice);
}

/** Úder rukou (dotyk, myš, klávesa). */
export function hit(pad: CongaPad, v = congas.velocity) {
  congas.hits[pad] = { n: (congas.hits[pad]?.n ?? 0) + 1, v };
  emitPlay({ kind: 'on', key: `cg:${pad}`, drum: pad, velocity: v, sound: { instrument: 'congas', congaTuning: congas.tuning } });
  if (engine.running) play(pad, v);
  else void engine.start().then(() => play(pad, v));
}
