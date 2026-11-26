/**
 * Hlasy nástrojů z nativních uzlů Web Audio (živě i offline).
 * Úderové nástroje dozní samy; držené (tření mísy, klavír, flétna, syntezátor) se uvolní release().
 */
import { holdAt, type Voice } from '../audio/engine.svelte';
import type { ModalDef } from './defs';

export interface NoteVoice extends Voice {
  /** Uvolnění drženého tónu (konec tření, puštění klávesy). U úderu nic nedělá. */
  release(when?: number): void;
}

const LN1000 = Math.log(1000);

const noiseCache = new WeakMap<BaseAudioContext, AudioBuffer>();
function noise(ctx: BaseAudioContext): AudioBuffer {
  let b = noiseCache.get(ctx);
  if (!b) {
    const len = Math.round(ctx.sampleRate * 2);
    b = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = b.getChannelData(0);
    let s = 24680;
    for (let i = 0; i < len; i++) {
      s = (s * 1664525 + 1013904223) >>> 0;
      d[i] = (s / 4294967296) * 2 - 1;
    }
    noiseCache.set(ctx, b);
  }
  return b;
}

type Src = OscillatorNode | AudioBufferSourceNode;

/** Společná správa uzlů hlasu: rychlé utlumení, úklid a konec. */
function makeVoice(ctx: BaseAudioContext, out: GainNode, parts: { src: Src; g: GainNode }[], main: Src, onRelease?: (t: number) => void): NoteVoice {
  let stopped = false;
  const voice: NoteVoice = {
    stop(t = ctx.currentTime) {
      if (stopped) return;
      stopped = true;
      for (const p of parts) {
        holdAt(p.g.gain, t);
        p.g.gain.setTargetAtTime(0, t, 0.012);
        try { p.src.stop(t + 0.08); } catch { /* už zastaveno */ }
      }
    },
    release(t = ctx.currentTime) {
      if (!stopped) onRelease?.(t);
    }
  };
  main.onended = () => {
    out.disconnect();
    voice.onEnded?.();
  };
  return voice;
}

function burst(ctx: BaseAudioContext, out: AudioNode, hz: number, ms: number, gain: number, at: number, when: number, q = 1.2) {
  const src = ctx.createBufferSource();
  src.buffer = noise(ctx);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = Math.min(ctx.sampleRate * 0.4, hz * at);
  bp.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, when);
  g.gain.setTargetAtTime(0, when + 0.001, Math.max(0.001, ms / 1000 / 3));
  src.connect(bp).connect(g).connect(out);
  src.start(when, Math.random() * 1.5);
  src.stop(when + ms / 1000 + 0.05);
  return { src, g };
}

/** Úder do modálního nástroje (mísa, gong, kalimba, zvon, vlastní). */
export function modalStrike(ctx: BaseAudioContext, dest: AudioNode, hz: number, def: ModalDef, velocity: number, decay = def.decay, when = ctx.currentTime): NoteVoice {
  const v = Math.min(1, Math.max(0.02, velocity));
  const ex = def.excitation;
  const out = ctx.createGain();
  out.gain.value = def.gain;
  out.connect(dest);
  const parts: { src: Src; g: GainNode }[] = [];
  let main: Src | null = null;
  for (const [ratio, amp, part, detuneHz] of def.modes) {
    const f = hz * ratio + detuneHz;
    if (f <= 0 || f > ctx.sampleRate * 0.45) continue;
    // měkká palička a slabý úder tlumí vyšší módy
    const tilt = ratio <= 1.01 ? 1 : (1 / ratio) ** (ex.soft * (1.2 - 0.7 * v));
    const a = amp * v * tilt;
    if (a < 0.0004) continue;
    const dur = Math.max(0.05, decay * part);
    const o = ctx.createOscillator();
    o.frequency.value = f;
    const g = ctx.createGain();
    const attack = 0.0015 + ex.soft * 0.012 + (ex.bloom ? ex.bloom * Math.min(1, (ratio - 1) / 8) : 0);
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(a, when + attack);
    g.gain.setTargetAtTime(0, when + attack, dur / LN1000);
    o.connect(g).connect(out);
    o.start(when);
    o.stop(when + attack + dur + 0.05);
    parts.push({ src: o, g });
    if (!main) main = o; // první mód (základ) dozní nejdéle
  }
  if (ex.noiseMs > 0 && ex.noiseGain > 0) parts.push(burst(ctx, out, hz, ex.noiseMs, ex.noiseGain * v * v, ex.noiseAt, when));
  return makeVoice(ctx, out, parts, main ?? parts[0]!.src);
}

/**
 * Tření mísy paličkou: módy se pomalu rozezní (2–4 s), dokud prst drží;
 * po puštění mísa doznívá vlastním dozvukem. Lehký šum tření.
 */
export function modalRub(ctx: BaseAudioContext, dest: AudioNode, hz: number, def: ModalDef, velocity: number, decay = def.decay, when = ctx.currentTime): NoteVoice {
  const v = Math.min(1, Math.max(0.05, velocity));
  const out = ctx.createGain();
  out.gain.value = def.gain;
  out.connect(dest);
  const parts: { src: Src; g: GainNode }[] = [];
  const holdUntil = when + 600; // drží max. 10 minut
  for (const [ratio, amp, part, detuneHz] of def.modes) {
    const f = hz * ratio + detuneHz;
    if (f > ctx.sampleRate * 0.45) continue;
    // tření budí hlavně základ, vyšší módy slabě
    const a = amp * v * (ratio <= 1.01 ? 1 : 0.35 / ratio);
    if (a < 0.0004) continue;
    const o = ctx.createOscillator();
    o.frequency.value = f;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, when);
    g.gain.setTargetAtTime(a, when, 1.1 + 0.4 * ratio);
    o.connect(g).connect(out);
    o.start(when);
    o.stop(holdUntil);
    parts.push({ src: o, g });
    (g as GainNode & { _decay?: number })._decay = Math.max(0.5, decay * part);
  }
  // šum tření kolem základu
  const ns = ctx.createBufferSource();
  ns.buffer = noise(ctx);
  ns.loop = true;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = hz;
  bp.Q.value = 8;
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(0, when);
  ng.gain.setTargetAtTime(0.05 * v, when, 0.8);
  ns.connect(bp).connect(ng).connect(out);
  ns.start(when);
  ns.stop(holdUntil);
  parts.push({ src: ns, g: ng });

  return makeVoice(ctx, out, parts, parts[0]!.src, (t) => {
    for (const p of parts) {
      const d = (p.g as GainNode & { _decay?: number })._decay ?? 0.3;
      holdAt(p.g.gain, t);
      p.g.gain.setTargetAtTime(0, t, d / LN1000);
      try { p.src.stop(t + d + 0.1); } catch { /* */ }
    }
  });
}

/**
 * Klavír (syntéza): struny s mírnou neharmonicitou f_n = n·f·√(1 + B·n²),
 * dvě mírně rozladěné struny na tón, kladívko jako krátký šum. Puštění klávesy = tlumítko.
 */
export function pianoNote(ctx: BaseAudioContext, dest: AudioNode, hz: number, velocity: number, decay: number, B: number, when = ctx.currentTime): NoteVoice {
  const v = Math.min(1, Math.max(0.03, velocity));
  const out = ctx.createGain();
  out.gain.value = 0.5;
  out.connect(dest);
  const parts: { src: Src; g: GainNode }[] = [];
  const maxN = Math.min(24, Math.floor((ctx.sampleRate * 0.45) / hz));
  const bright = 0.6 + 0.9 * v;
  // hlubší tóny znějí déle
  const base = decay * Math.min(1.6, Math.max(0.35, Math.sqrt(262 / hz)));
  for (let n = 1; n <= maxN; n++) {
    const fn = n * hz * Math.sqrt(1 + B * n * n);
    const a = (v * 0.9) / n ** (1.9 - 0.8 * v) * (n === 1 ? 1 : bright * 0.8);
    if (a < 0.0005) continue;
    const dur = base / (1 + 0.35 * (n - 1));
    for (const det of n <= 6 ? [-0.6, 0.6] : [0]) {
      const o = ctx.createOscillator();
      o.frequency.value = fn * 2 ** (det / 1200);
      const g = ctx.createGain();
      const peak = n <= 6 ? a / 2 : a;
      g.gain.setValueAtTime(0, when);
      g.gain.linearRampToValueAtTime(peak, when + 0.003);
      // rychlý počáteční pokles + dlouhý dozvuk (dvoustupňový útlum)
      g.gain.setTargetAtTime(peak * 0.45, when + 0.003, 0.18);
      g.gain.setTargetAtTime(0, when + 0.4, dur / LN1000);
      o.connect(g).connect(out);
      o.start(when);
      o.stop(when + 0.4 + dur + 0.05);
      parts.push({ src: o, g });
    }
  }
  parts.push(burst(ctx, out, hz, 15, 0.25 * v * v, 6, when, 0.8));
  return makeVoice(ctx, out, parts, parts[0]!.src, (t) => {
    for (const p of parts) {
      holdAt(p.g.gain, t);
      p.g.gain.setTargetAtTime(0, t, 0.08);
      try { p.src.stop(t + 0.6); } catch { /* */ }
    }
  });
}

/**
 * Flétna: téměř sinusový tón se slabými harmonickými, šum dechu,
 * krátký „chiff“ při nasazení a vibrato, které nabíhá po 0,4 s.
 */
export function fluteNote(ctx: BaseAudioContext, dest: AudioNode, hz: number, velocity: number, releaseS: number, when = ctx.currentTime): NoteVoice {
  const v = Math.min(1, Math.max(0.05, velocity));
  const out = ctx.createGain();
  out.gain.value = 0.28;
  out.connect(dest);
  const parts: { src: Src; g: GainNode }[] = [];
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 5.2;
  const lfoDepth = ctx.createGain();
  lfoDepth.gain.setValueAtTime(0, when);
  lfoDepth.gain.setTargetAtTime(hz * 0.007, when + 0.4, 0.3); // ±12 centů
  lfo.connect(lfoDepth);
  lfo.start(when);
  const holdUntil = when + 600;
  lfo.stop(holdUntil);
  for (const [n, a] of [[1, 1], [2, 0.32 + 0.15 * v], [3, 0.12 * v], [4, 0.05 * v]] as [number, number][]) {
    if (hz * n > ctx.sampleRate * 0.45) continue;
    const o = ctx.createOscillator();
    o.frequency.value = hz * n;
    const d = ctx.createGain();
    d.gain.value = n;
    lfoDepth.connect(d).connect(o.frequency);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(a * v * 0.9, when + 0.07);
    g.gain.setTargetAtTime(a * v * 0.75, when + 0.07, 0.15);
    o.connect(g).connect(out);
    o.start(when);
    o.stop(holdUntil);
    parts.push({ src: o, g });
  }
  // dech: šum kolem tónu, trvale slabý
  const ns = ctx.createBufferSource();
  ns.buffer = noise(ctx);
  ns.loop = true;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = hz * 2;
  bp.Q.value = 1.5;
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(0, when);
  ng.gain.linearRampToValueAtTime(0.18 * v, when + 0.03); // chiff
  ng.gain.setTargetAtTime(0.035 * v, when + 0.03, 0.06);
  ns.connect(bp).connect(ng).connect(out);
  ns.start(when);
  ns.stop(holdUntil);
  parts.push({ src: ns, g: ng });
  parts.push({ src: lfo, g: lfoDepth });
  return makeVoice(ctx, out, parts, parts[0]!.src, (t) => {
    const r = Math.max(0.03, releaseS);
    for (const p of parts) {
      holdAt(p.g.gain, t);
      p.g.gain.setTargetAtTime(0, t, r / 4);
      try { p.src.stop(t + r + 0.1); } catch { /* */ }
    }
  });
}

export type SynthPreset = 'pad' | 'lead' | 'organ';

/** Syntezátor: dva rozladěné oscilátory + filtr s obálkou. Tři zvuky (pad, lead, varhany). */
export function synthNote(ctx: BaseAudioContext, dest: AudioNode, hz: number, velocity: number, preset: SynthPreset, cutoff: number, releaseS: number, when = ctx.currentTime): NoteVoice {
  const v = Math.min(1, Math.max(0.05, velocity));
  const out = ctx.createGain();
  out.gain.value = 0.6;
  out.connect(dest);
  const P = {
    pad: { waves: ['sawtooth', 'sawtooth'] as OscillatorType[], det: [-8, 8], attack: 0.6, q: 0.8, env: 1.5 },
    lead: { waves: ['sawtooth', 'square'] as OscillatorType[], det: [-4, 5], attack: 0.01, q: 4, env: 3 },
    organ: { waves: ['sine', 'triangle'] as OscillatorType[], det: [0, 1200], attack: 0.02, q: 0.5, env: 0.5 }
  }[preset];
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.Q.value = P.q;
  const fc = Math.min(ctx.sampleRate * 0.45, Math.max(hz * 1.2, cutoff));
  filter.frequency.setValueAtTime(fc, when);
  filter.frequency.linearRampToValueAtTime(Math.min(ctx.sampleRate * 0.45, fc * (1 + P.env * v)), when + Math.max(0.02, P.attack));
  filter.frequency.setTargetAtTime(fc, when + P.attack, 0.4);
  const amp = ctx.createGain();
  amp.gain.setValueAtTime(0, when);
  amp.gain.linearRampToValueAtTime(0.5 * v, when + Math.max(0.005, P.attack));
  amp.gain.setTargetAtTime(0.4 * v, when + P.attack, 0.3);
  filter.connect(amp).connect(out);
  const parts: { src: Src; g: GainNode }[] = [];
  const holdUntil = when + 600;
  P.waves.forEach((w, i) => {
    const o = ctx.createOscillator();
    o.type = w;
    o.frequency.value = hz;
    o.detune.value = P.det[i]!;
    const g = ctx.createGain();
    g.gain.value = i === 0 ? 0.6 : 0.4;
    o.connect(g).connect(filter);
    o.start(when);
    o.stop(holdUntil);
    parts.push({ src: o, g });
  });
  const main = parts[0]!.src;
  return makeVoice(ctx, out, [...parts, { src: main, g: amp }], main, (t) => {
    const r = Math.max(0.02, releaseS);
    holdAt(amp.gain, t);
    amp.gain.setTargetAtTime(0, t, r / 4);
    for (const p of parts) try { p.src.stop(t + r + 0.1); } catch { /* */ }
  });
}
