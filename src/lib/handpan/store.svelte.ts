/**
 * Stav handpanu: nastavení (pamatuje se v zařízení), zvuková sběrnice s dozvukem a hraní.
 */
import { engine, type Voice } from '../audio/engine.svelte';
import { buildFields, type Field, type HandpanConfig, type HandpanTuning, type LayoutId, type NoteRef, type ScaleId } from './model';
import { makeRoomImpulse, strike } from './voice';
import { emitPlay } from '../song/events';

const KEY = 'soundlab.handpan';
const MAX_STRIKES = 24;

interface Saved {
  scale: ScaleId;
  tuning: HandpanTuning;
  layout: LayoutId;
  bottom: boolean;
  custom: Partial<Record<ScaleId, Record<number, NoteRef>>>;
  velocity: number;
  decay: number;
  reverb: number;
}

const DEFAULTS: Saved = { scale: 'image', tuning: 'pythagorean', layout: '8', bottom: false, custom: {}, velocity: 0.7, decay: 6, reverb: 0.25 };

function load(): Saved {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Saved>) };
  } catch {
    /* ignorovat */
  }
  return { ...DEFAULTS };
}

export const hp = $state({
  ...load(),
  /** počítadlo úderů na pole – pro vizuální odezvu */
  hits: {} as Record<number, { n: number; v: number }>,
  last: null as Field | null
});

export const config = (): HandpanConfig => ({
  scale: hp.scale, tuning: hp.tuning, layout: hp.layout, bottom: hp.bottom, custom: hp.custom[hp.scale]
});

export function save() {
  try {
    const { hits: _h, last: _l, ...rest } = $state.snapshot(hp);
    localStorage.setItem(KEY, JSON.stringify(rest));
  } catch {
    /* ignorovat */
  }
}

export function setCustomNote(index: number, note: NoteRef | null) {
  const map = { ...(hp.custom[hp.scale] ?? {}) };
  if (note) map[index] = note;
  else delete map[index];
  hp.custom = { ...hp.custom, [hp.scale]: map };
  save();
}

export function resetCustom() {
  hp.custom = { ...hp.custom, [hp.scale]: {} };
  save();
}

// --- zvuková sběrnice: suchý signál + dozvuk prostoru ---
let bus: { ctx: BaseAudioContext; input: GainNode; wet: GainNode; dry: GainNode } | null = null;

function getBus() {
  const ctx = engine.ctx;
  const dest = engine.input;
  if (!ctx || !dest) return null;
  if (bus?.ctx === ctx) return bus;
  const input = ctx.createGain();
  const dry = ctx.createGain();
  const wet = ctx.createGain();
  const conv = ctx.createConvolver();
  conv.buffer = makeRoomImpulse(ctx);
  input.connect(dry).connect(dest);
  input.connect(conv).connect(wet).connect(dest);
  bus = { ctx, input, dry, wet };
  applyReverb();
  return bus;
}

export function applyReverb() {
  if (!bus) return;
  const t = bus.ctx.currentTime;
  // rovnovýkonové míchání
  bus.dry.gain.setTargetAtTime(Math.cos((hp.reverb * Math.PI) / 2), t, 0.02);
  bus.wet.gain.setTargetAtTime(Math.sin((hp.reverb * Math.PI) / 2) * 0.9, t, 0.02);
}

const byField = new Map<number, Voice>();
const active: Voice[] = [];

function play(field: Field, velocity: number) {
  const b = getBus();
  if (!b) return;
  // Opakovaný úder do stejného pole utlumí předchozí kmit (jako na skutečném nástroji).
  byField.get(field.index)?.stop(b.ctx.currentTime + 0.003);
  const voice = strike(b.ctx, b.input, field.pitch.hz, { velocity, decay: hp.decay, ding: field.kind === 'ding' });
  voice.onEnded = () => {
    engine.removeVoice(voice);
    const i = active.indexOf(voice);
    if (i >= 0) active.splice(i, 1);
    if (byField.get(field.index) === voice) byField.delete(field.index);
  };
  byField.set(field.index, voice);
  active.push(voice);
  engine.addVoice(voice);
  while (active.length > MAX_STRIKES) active.shift()?.stop();
}

/** Úder do pole. Volat z pointerdown / keydown (gesto uživatele). */
export function hit(field: Field, velocity = hp.velocity) {
  const prev = hp.hits[field.index]?.n ?? 0;
  hp.hits[field.index] = { n: prev + 1, v: velocity };
  hp.last = field;
  emitPlay({ kind: 'on', key: `hp${field.index}`, hz: field.pitch.hz, src: field.pitch.source, variant: field.kind === 'ding' ? 'ding' : undefined, velocity, sound: { instrument: 'handpan', decay: hp.decay } });
  if (engine.running) play(field, velocity);
  else void engine.start().then(() => play(field, velocity));
}

export function fieldsNow(): Field[] {
  return buildFields(config());
}
