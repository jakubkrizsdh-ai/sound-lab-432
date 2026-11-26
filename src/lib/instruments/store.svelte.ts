/**
 * Stav nástrojů (mimo handpan): výběr nástroje, nastavení každého nástroje (pamatuje se),
 * společná zvuková sběrnice s prostorem a hraní tónů.
 */
import { engine } from '../audio/engine.svelte';
import { makeRoomImpulse } from '../handpan/voice';
import type { Pitch } from '../tuning/systems';
import {
  INSTRUMENTS, MODAL, defaultCustom, sanitizeModal,
  type InstrumentId, type KeysTuning, type ModalDef, type ScaleChoice
} from './defs';
import { fluteNote, modalRub, modalStrike, pianoNote, synthNote, type NoteVoice, type SynthPreset } from './voices';
import { emitPlay } from '../song/events';

const KEY = 'soundlab.instruments';
const MAX_VOICES = 32;

export interface InstrumentSettings {
  tuning: KeysTuning;
  scale: ScaleChoice;
  octave: number;
  velocity: number;
  /** násobek výchozí délky dozvuku (0,25–3) */
  decayScale: number;
  reverb: number;
  /** mísy: úder nebo tření */
  mode: 'strike' | 'rub';
  synthPreset: SynthPreset;
  cutoff: number;
  release: number;
}

function defaults(id: InstrumentId): InstrumentSettings {
  const d = INSTRUMENTS[id];
  return {
    tuning: 'pythagorean', scale: 'image', octave: d.octave, velocity: 0.7, decayScale: 1,
    reverb: id === 'piano' || id === 'synth' ? 0.2 : 0.3, mode: 'strike', synthPreset: 'pad', cutoff: 2400,
    release: id === 'flute' ? 0.15 : id === 'synth' ? 0.6 : 0.3
  };
}

interface Saved {
  current: InstrumentId;
  settings: Partial<Record<InstrumentId, InstrumentSettings>>;
  custom: ModalDef;
}

function load(): Saved {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as Partial<Saved>;
      return { current: s.current ?? 'handpan', settings: s.settings ?? {}, custom: sanitizeModal(s.custom ?? defaultCustom()) };
    }
  } catch {
    /* ignorovat */
  }
  return { current: 'handpan', settings: {}, custom: defaultCustom() };
}

const saved = load();

export const inst = $state({
  current: saved.current,
  settings: saved.settings,
  custom: saved.custom,
  /** počítadlo úderů podle klíče tónu – vizuální odezva */
  hits: {} as Record<string, { n: number; v: number }>,
  /** tóny, které právě znějí drženě (klíč → true) */
  held: {} as Record<string, boolean>,
  last: null as Pitch | null,
  /** pravý pedál klavíru: tóny po puštění klávesy dál znějí */
  pedal: false
});

export function settingsOf(id: InstrumentId): InstrumentSettings {
  return { ...defaults(id), ...(inst.settings[id] ?? {}) };
}

export function save() {
  try {
    const { current, settings, custom } = $state.snapshot(inst);
    localStorage.setItem(KEY, JSON.stringify({ current, settings, custom }));
  } catch {
    /* ignorovat */
  }
}

export function select(id: InstrumentId) {
  releaseAll();
  inst.current = id;
  save();
  applyReverb();
}

export function setSetting<K extends keyof InstrumentSettings>(k: K, v: InstrumentSettings[K]) {
  const id = inst.current;
  inst.settings = { ...inst.settings, [id]: { ...settingsOf(id), [k]: v } };
  if (k === 'reverb') applyReverb();
  save();
}

export function setCustom(def: ModalDef) {
  inst.custom = sanitizeModal(def);
  save();
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
  conv.buffer = makeRoomImpulse(ctx, 3);
  input.connect(dry).connect(dest);
  input.connect(conv).connect(wet).connect(dest);
  bus = { ctx, input, dry, wet };
  applyReverb();
  return bus;
}

function applyReverb() {
  if (!bus) return;
  const r = settingsOf(inst.current).reverb;
  const t = bus.ctx.currentTime;
  bus.dry.gain.setTargetAtTime(Math.cos((r * Math.PI) / 2), t, 0.02);
  bus.wet.gain.setTargetAtTime(Math.sin((r * Math.PI) / 2) * 0.9, t, 0.02);
}

// --- hraní ---
const byKey = new Map<string, NoteVoice>();
const active: NoteVoice[] = [];

function soundDef(id: InstrumentId): ModalDef | null {
  if (id === 'custom') return inst.custom;
  if (id in MODAL) return MODAL[id as keyof typeof MODAL];
  return null;
}

function start(key: string, p: Pitch, velocity: number): void {
  const b = getBus();
  if (!b) return;
  const id = inst.current;
  const s = settingsOf(id);
  const def = INSTRUMENTS[id];
  const ctx = b.ctx;
  // Stejný tón znovu: kalimba, zvonky a klávesy utlumí předchozí kmit; mísy a gong znějí dál.
  const prev = byKey.get(key);
  if (prev && def.surface !== 'bowls' && def.surface !== 'gong') prev.stop(ctx.currentTime + 0.003);

  let voice: NoteVoice;
  const modal = soundDef(id);
  if (modal) {
    const rub = (def.surface === 'bowls' || (id === 'custom' && modal.rub)) && s.mode === 'rub';
    voice = rub
      ? modalRub(ctx, b.input, p.hz, modal, velocity, modal.decay * s.decayScale)
      : modalStrike(ctx, b.input, p.hz, modal, velocity, modal.decay * s.decayScale);
  } else if (def.sound?.kind === 'piano') {
    voice = pianoNote(ctx, b.input, p.hz, velocity, def.sound.decay * s.decayScale, def.sound.inharmonicity);
  } else if (def.sound?.kind === 'flute') {
    voice = fluteNote(ctx, b.input, p.hz, velocity, s.release);
  } else {
    voice = synthNote(ctx, b.input, p.hz, velocity, s.synthPreset, s.cutoff, s.release);
  }
  voice.onEnded = () => {
    engine.removeVoice(voice);
    const i = active.indexOf(voice);
    if (i >= 0) active.splice(i, 1);
    if (byKey.get(key) === voice) byKey.delete(key);
  };
  byKey.set(key, voice);
  active.push(voice);
  engine.addVoice(voice);
  while (active.length > MAX_VOICES) active.shift()?.stop();
}

/** Začátek tónu (dotyk, klávesa). `key` = identita tónu na ploše. */
export function noteOn(key: string, p: Pitch, velocity = settingsOf(inst.current).velocity) {
  inst.hits[key] = { n: (inst.hits[key]?.n ?? 0) + 1, v: velocity };
  inst.held[key] = true;
  inst.last = p;
  const id = inst.current;
  const st = settingsOf(id);
  const rub = st.mode === 'rub' && (INSTRUMENTS[id].surface === 'bowls' || (id === 'custom' && inst.custom.rub));
  emitPlay({
    kind: 'on', key: `${id}:${key}`, hz: p.hz, src: p.source, variant: rub ? 'rub' : undefined, velocity,
    sound: { instrument: id, decayScale: st.decayScale, synthPreset: st.synthPreset, cutoff: st.cutoff, release: st.release, ...(id === 'custom' ? { custom: $state.snapshot(inst.custom) as ModalDef } : {}) }
  });
  if (engine.running) start(key, p, velocity);
  else void engine.start().then(() => start(key, p, velocity));
}

/** Konec drženého tónu (puštění prstu nebo klávesy). */
export function noteOff(key: string) {
  inst.held[key] = false;
  emitPlay({ kind: 'off', key: `${inst.current}:${key}`, velocity: 0, sound: { instrument: inst.current } });
  if (inst.pedal && inst.current === 'piano') return;
  byKey.get(key)?.release();
}

export function setPedal(on: boolean) {
  inst.pedal = on;
  if (!on) for (const [k, v] of byKey) if (!inst.held[k]) v.release();
}

export function releaseAll() {
  for (const [k, v] of byKey) {
    v.release();
    inst.held[k] = false;
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('soundlab:stop-all', () => {
    byKey.clear();
    active.length = 0;
    inst.held = {};
  });
}
