/**
 * Bicí: nastavení (pamatuje se), hraní padů a krokový sekvencer.
 * Sekvencer plánuje údery dopředu přes čas AudioContextu (přesné tempo i při zatíženém telefonu).
 */
import { engine, type Voice } from '../audio/engine.svelte';
import { makeRoomImpulse } from '../handpan/voice';
import { CHOKES, PADS, PRESETS, STEPS, emptyPattern, stepTime, barDuration, type DrumId, type DrumTuning, type KitId, type Pattern, type PresetId } from './kit';
import { drumHit } from './synth';
import { emitPlay } from '../song/events';

const KEY = 'soundlab.drums';
const LOOKAHEAD = 0.12;   // s – jak daleko dopředu se plánuje
const TICK = 25;          // ms – jak často se plánuje

interface Saved {
  /** pady, nebo obrázek celé soupravy */
  view: 'pads' | 'kit';
  /** ikony nástrojů na padech */
  icons: boolean;
  /** popisky na obrázku soupravy */
  labels: boolean;
  kit: KitId;
  tuning: DrumTuning;
  velocity: number;
  reverb: number;
  bpm: number;
  swing: number;
  pattern: Pattern;
}

function load(): Saved {
  const def: Saved = { view: 'pads', icons: true, labels: false, kit: 'acoustic', tuning: 'natural', velocity: 0.8, reverb: 0.12, bpm: PRESETS.rock.bpm, swing: 0, pattern: structuredClone(PRESETS.rock.pattern) };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = { ...def, ...(JSON.parse(raw) as Partial<Saved>) };
      s.pattern = { ...emptyPattern(), ...s.pattern };
      return s;
    }
  } catch {
    /* ignorovat */
  }
  return def;
}

export const drums = $state({
  ...load(),
  playing: false,
  /** krok, který právě zní (pro ukazatel) */
  step: -1,
  hits: {} as Record<string, { n: number; v: number }>
});

export function save() {
  try {
    const { playing: _p, step: _s, hits: _h, ...rest } = $state.snapshot(drums);
    localStorage.setItem(KEY, JSON.stringify(rest));
  } catch {
    /* ignorovat */
  }
}

// --- zvuková sběrnice ---
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
  bus.dry.gain.setTargetAtTime(Math.cos((drums.reverb * Math.PI) / 2), t, 0.02);
  bus.wet.gain.setTargetAtTime(Math.sin((drums.reverb * Math.PI) / 2) * 0.9, t, 0.02);
}

const ringing = new Map<DrumId, Voice>();

function play(id: DrumId, v: number, when?: number) {
  const b = getBus();
  if (!b) return;
  const t = when ?? b.ctx.currentTime;
  for (const c of CHOKES[id] ?? []) ringing.get(c)?.stop(t);
  // opakovaný úder stejného činelu/bubnu utne předchozí (šetří výkon telefonu)
  ringing.get(id)?.stop(t);
  const voice = drumHit(b.ctx, b.input, id, drums.kit, v, drums.tuning, t);
  voice.onEnded = () => {
    engine.removeVoice(voice);
    if (ringing.get(id) === voice) ringing.delete(id);
  };
  ringing.set(id, voice);
  engine.addVoice(voice);
}

/** Úder z padu nebo klávesy. */
export function hit(id: DrumId, v = drums.velocity) {
  drums.hits[id] = { n: (drums.hits[id]?.n ?? 0) + 1, v };
  emitPlay({ kind: 'on', key: `dr:${id}`, drum: id, velocity: v, sound: { instrument: 'drums', kit: drums.kit, drumTuning: drums.tuning } });
  if (engine.running) play(id, v);
  else void engine.start().then(() => play(id, v));
}

// --- sekvencer ---
let timer: ReturnType<typeof setInterval> | null = null;
let raf = 0;
let barStart = 0;      // čas začátku aktuálního taktu (AudioContext)
let nextStep = 0;      // další krok k naplánování
const scheduled: { step: number; time: number }[] = [];

function schedule() {
  const ctx = engine.ctx;
  if (!ctx) return;
  const horizon = ctx.currentTime + LOOKAHEAD;
  for (;;) {
    const t = barStart + stepTime(nextStep, drums.bpm, drums.swing);
    if (t > horizon) break;
    for (const id of PADS) {
      const val = drums.pattern[id]?.[nextStep] ?? 0;
      if (val) play(id, drums.velocity * (val === 2 ? 1 : 0.72), t);
    }
    scheduled.push({ step: nextStep, time: t });
    nextStep++;
    if (nextStep >= STEPS) {
      nextStep = 0;
      barStart += barDuration(drums.bpm);
    }
  }
}

function followPlayhead() {
  const ctx = engine.ctx;
  if (!ctx || !drums.playing) return;
  while (scheduled.length > 1 && scheduled[1]!.time <= ctx.currentTime) scheduled.shift();
  const cur = scheduled[0];
  if (cur && cur.time <= ctx.currentTime && drums.step !== cur.step) drums.step = cur.step;
  raf = requestAnimationFrame(followPlayhead);
}

export async function start() {
  if (drums.playing) return;
  await engine.start();
  const ctx = engine.ctx;
  if (!ctx) return;
  getBus();
  barStart = ctx.currentTime + 0.06;
  nextStep = 0;
  scheduled.length = 0;
  drums.playing = true;
  schedule();
  timer = setInterval(schedule, TICK);
  raf = requestAnimationFrame(followPlayhead);
}

export function stop() {
  if (timer) clearInterval(timer);
  timer = null;
  cancelAnimationFrame(raf);
  drums.playing = false;
  drums.step = -1;
  scheduled.length = 0;
}

/** Změna tempa za běhu: zbytek taktu pokračuje v novém tempu bez skoku. */
export function setBpm(bpm: number) {
  const ctx = engine.ctx;
  const b = Math.min(240, Math.max(40, Math.round(bpm)));
  if (drums.playing && ctx) {
    const elapsedOld = stepTime(nextStep, drums.bpm, 0);
    const elapsedNew = stepTime(nextStep, b, 0);
    barStart += elapsedOld - elapsedNew;
  }
  drums.bpm = b;
  save();
}

export function toggleCell(id: DrumId, step: number) {
  const row = [...(drums.pattern[id] ?? Array(STEPS).fill(0))];
  row[step] = ((row[step] ?? 0) + 1) % 3; // nic → úder → akcent → nic
  drums.pattern = { ...drums.pattern, [id]: row };
  save();
}

export function loadPreset(p: PresetId) {
  const pr = PRESETS[p];
  drums.pattern = structuredClone(pr.pattern);
  drums.swing = pr.swing;
  setBpm(pr.bpm);
  save();
}

export function clearPattern() {
  drums.pattern = emptyPattern();
  save();
}

if (typeof window !== 'undefined') {
  window.addEventListener('soundlab:stop-all', () => {
    stop();
    ringing.clear();
  });
}
