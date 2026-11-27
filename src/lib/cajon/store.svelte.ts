/**
 * Cajon: nastavení (pamatuje se) a hraní. Všechny údery sdílí jednu přední desku:
 * nový úder předchozí přitlumí, max. 4 doznívající.
 */
import { engine, safeStop } from '../audio/engine.svelte';
import { makeRoomImpulse } from '../handpan/voice';
import { emitPlay } from '../song/events';
import type { CajonPad, Hand } from './kit';
import { cajonHit, type CajonVoice } from './synth';

const KEY = 'soundlab.cajon';

interface Saved {
  wires: boolean;
  velocity: number;
  reverb: number;
  labels: boolean;
}

function load(): Saved {
  const def: Saved = { wires: true, velocity: 0.8, reverb: 0.12, labels: true };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = { ...def, ...(JSON.parse(raw) as Partial<Saved>) };
      s.wires = !!s.wires;
      s.velocity = Math.min(1, Math.max(0.1, +s.velocity || def.velocity));
      s.reverb = Math.min(1, Math.max(0, +s.reverb || 0));
      return s;
    }
  } catch {
    /* ignorovat */
  }
  return def;
}

export const cajon = $state({
  ...load(),
  /** záblesk zasažené zóny: klíč `úder.ruka` */
  hits: {} as Record<string, { n: number; v: number }>
});

export function save() {
  try {
    const { hits: _h, ...rest } = $state.snapshot(cajon);
    localStorage.setItem(KEY, JSON.stringify(rest));
  } catch {
    /* ignorovat */
  }
}

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
  conv.buffer = makeRoomImpulse(ctx, 1.2);
  input.connect(dry).connect(dest);
  input.connect(conv).connect(wet).connect(dest);
  bus = { ctx, input, dry, wet };
  applyReverb();
  return bus;
}

export function applyReverb() {
  if (!bus) return;
  const t = bus.ctx.currentTime;
  bus.dry.gain.setTargetAtTime(Math.cos((cajon.reverb * Math.PI) / 2), t, 0.02);
  bus.wet.gain.setTargetAtTime(Math.sin((cajon.reverb * Math.PI) / 2) * 0.9, t, 0.02);
}

const ringing: CajonVoice[] = [];
const MAX = 4;

function play(pad: CajonPad, v: number) {
  const b = getBus();
  if (!b) return;
  const t = b.ctx.currentTime;
  for (const x of ringing) { try { x.damp(t); } catch { /* */ } }
  while (ringing.length >= MAX) safeStop(ringing.shift(), t);
  const voice = cajonHit(b.ctx, b.input, pad, cajon.wires, v, t);
  voice.onEnded = () => {
    engine.removeVoice(voice);
    const i = ringing.indexOf(voice);
    if (i >= 0) ringing.splice(i, 1);
  };
  ringing.push(voice);
  engine.addVoice(voice);
}

/** Úder rukou (dotyk, myš, klávesa). */
export function hit(pad: CajonPad, v = cajon.velocity, hand: Hand = 'L') {
  const k = `${pad}.${hand}`;
  cajon.hits[k] = { n: (cajon.hits[k]?.n ?? 0) + 1, v };
  emitPlay({ kind: 'on', key: `cj:${pad}`, drum: pad, velocity: v, sound: { instrument: 'cajon', cajonWires: cajon.wires } });
  if (engine.running) play(pad, v);
  else void engine.start().then(() => play(pad, v));
}
