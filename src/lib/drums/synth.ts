/**
 * Syntéza bicích z nativních uzlů Web Audio (živě i offline, bez samplů).
 * Akustická souprava = přirozenější průběhy; elektronická = styl bicích automatů (808).
 */
import { fadeOut, silenceOut, type Voice } from '../audio/engine.svelte';
import { TUNING, type DrumId, type DrumTuning, type KitId } from './kit';

const noiseCache = new WeakMap<BaseAudioContext, AudioBuffer>();
function noiseBuf(ctx: BaseAudioContext): AudioBuffer {
  let b = noiseCache.get(ctx);
  if (!b) {
    const len = ctx.sampleRate;
    b = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = b.getChannelData(0);
    let s = 13579;
    for (let i = 0; i < len; i++) {
      s = (s * 1664525 + 1013904223) >>> 0;
      d[i] = (s / 4294967296) * 2 - 1;
    }
    noiseCache.set(ctx, b);
  }
  return b;
}

/** Kovové „mračno“ šesti obdélníků (princip hi-hatu a činelů automatu 808). */
const METAL = [205.3, 304.4, 369.6, 522.7, 540, 800];

interface Hit {
  ctx: BaseAudioContext;
  out: GainNode;
  srcs: AudioScheduledSourceNode[];
  gains: GainNode[];
  when: number;
  end: number;
}

function begin(ctx: BaseAudioContext, dest: AudioNode, level: number, when: number): Hit {
  const out = ctx.createGain();
  out.gain.value = level;
  out.connect(dest);
  return { ctx, out, srcs: [], gains: [], when, end: when };
}

/** Obálka: rychlý náběh a exponenciální útlum na −60 dB za `decay` s. */
function envelope(h: Hit, peak: number, decay: number, attack = 0.001, delay = 0): GainNode {
  const g = h.ctx.createGain();
  const t = h.when + delay;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(peak, t + attack);
  g.gain.setTargetAtTime(0, t + attack, decay / 6.9);
  h.gains.push(g);
  h.end = Math.max(h.end, t + attack + decay + 0.05);
  return g;
}

function tone(h: Hit, type: OscillatorType, f: number, dest: AudioNode, drop?: { from: number; time: number }): OscillatorNode {
  const o = h.ctx.createOscillator();
  o.type = type;
  if (drop) {
    o.frequency.setValueAtTime(f * drop.from, h.when);
    o.frequency.exponentialRampToValueAtTime(f, h.when + drop.time);
  } else {
    o.frequency.value = f;
  }
  o.connect(dest);
  o.start(h.when);
  h.srcs.push(o);
  return o;
}

function noise(h: Hit, dest: AudioNode, filters: { type: BiquadFilterType; f: number; q?: number }[]): AudioBufferSourceNode {
  const n = h.ctx.createBufferSource();
  n.buffer = noiseBuf(h.ctx);
  n.loop = true;
  let node: AudioNode = n;
  for (const f of filters) {
    const b = h.ctx.createBiquadFilter();
    b.type = f.type;
    b.frequency.value = f.f;
    if (f.q !== undefined) b.Q.value = f.q;
    node.connect(b);
    node = b;
  }
  node.connect(dest);
  n.start(h.when, Math.random() * 0.9);
  h.srcs.push(n);
  return n;
}

function metal(h: Hit, dest: AudioNode, scale: number, filters: { type: BiquadFilterType; f: number; q?: number }[]) {
  const sum = h.ctx.createGain();
  sum.gain.value = 1 / METAL.length;
  let node: AudioNode = sum;
  for (const f of filters) {
    const b = h.ctx.createBiquadFilter();
    b.type = f.type;
    b.frequency.value = f.f;
    if (f.q !== undefined) b.Q.value = f.q;
    node.connect(b);
    node = b;
  }
  node.connect(dest);
  for (const f of METAL) tone(h, 'square', f * scale, sum);
}

function finish(h: Hit): Voice {
  for (const s of h.srcs) s.stop(h.end);
  let stopped = false;
  const voice: Voice = {
    stop(t = h.ctx.currentTime) {
      if (stopped) return;
      stopped = true;
      for (const g of h.gains) {
        fadeOut(g.gain, t, 0.006);
      }
      for (const s of h.srcs) try { s.stop(t + 0.05); } catch { /* už zastaveno */ }
      silenceOut(h.ctx, h.out, t, 0.006);
    }
  };
  h.srcs[0]!.onended = () => {
    h.out.disconnect();
    voice.onEnded?.();
  };
  return voice;
}

/**
 * Vyrovnání hlasitosti (dB) – změřeno offline: plná síla úderu dává špičku kolem
 * −6 dBFS u kopáku a virblu, −7 u tomů, −10 až −12 u činelů, hi-hatů a perkusí.
 */
const TRIM: Record<KitId, Record<DrumId, number>> = {
  acoustic: { crash: -6.2, splash: -6.8, ride: 0.5, rideBell: -12.6, hhOpen: -1.2, tomHi: -8.4, tomMid: -8.1, tomFloor: -8.3,
    hhClosed: -3.6, hhPedal: -0.8, cowbell: -8.7, tambourine: -7.5, kick: -7.8, snare: -9.8, rim: -6.9, clap: -5 },
  electronic: { crash: -6.1, splash: -6.3, ride: 0.3, rideBell: -12.6, hhOpen: 10.1, tomHi: -6.1, tomMid: -6.5, tomFloor: -6.2,
    hhClosed: 11.4, hhPedal: 12.3, cowbell: -8.9, tambourine: -8.1, kick: -5.9, snare: -6.9, rim: -5.4, clap: -6.1 }
};

/** Jeden úder bicího nástroje. `v` = síla 0–1. */
export function drumHit(ctx: BaseAudioContext, dest: AudioNode, id: DrumId, kit: KitId, v: number, tuning: DrumTuning, when = ctx.currentTime): Voice {
  const e = kit === 'electronic';
  const T = TUNING[tuning];
  const vel = Math.min(1, Math.max(0.05, v));
  const h = begin(ctx, dest, 0.9 * vel * 10 ** (TRIM[kit][id] / 20), when);
  const bright = 0.5 + 0.5 * vel;

  switch (id) {
    case 'kick': {
      const f = e ? T.kickE : T.kick;
      tone(h, 'sine', f, envelope(h, 1, e ? 0.9 : 0.42), { from: e ? 2.2 : 3, time: e ? 0.09 : 0.05 });
      if (!e) tone(h, 'sine', f * 1.6, envelope(h, 0.25, 0.12), { from: 2, time: 0.03 });
      noise(h, envelope(h, 0.35 * bright, 0.012), [{ type: 'highpass', f: 2500 }]); // palička
      break;
    }
    case 'snare': {
      const f = T.snare;
      tone(h, e ? 'sine' : 'triangle', f, envelope(h, e ? 0.55 : 0.7, e ? 0.15 : 0.12), { from: 1.4, time: 0.02 });
      tone(h, 'sine', f * 1.74, envelope(h, 0.35, 0.08));
      noise(h, envelope(h, e ? 0.65 : 0.8, e ? 0.2 : 0.26, 0.001), [{ type: 'highpass', f: e ? 1800 : 1200 }, { type: 'lowpass', f: 9000 * bright }]);
      break;
    }
    case 'rim':
      tone(h, 'sine', e ? 1700 : 1650, envelope(h, 0.6, 0.03));
      tone(h, 'triangle', e ? 520 : 480, envelope(h, 0.45, 0.05));
      noise(h, envelope(h, 0.4, 0.02), [{ type: 'bandpass', f: 2500, q: 2 }]);
      break;
    case 'clap': {
      // několik rychlých tlesknutí za sebou a dozvuk
      for (const [i, d] of [0, 0.011, 0.023, 0.034].entries()) noise(h, envelope(h, 0.75 - i * 0.08, 0.02, 0.001, d), [{ type: 'bandpass', f: 1200, q: 1.2 }]);
      noise(h, envelope(h, 0.45, e ? 0.25 : 0.18, 0.002, 0.034), [{ type: 'bandpass', f: 1100, q: 1 }]);
      break;
    }
    case 'hhClosed':
    case 'hhPedal':
    case 'hhOpen': {
      const dec = id === 'hhOpen' ? (e ? 0.45 : 0.7) : id === 'hhPedal' ? 0.05 : (e ? 0.06 : 0.08);
      const pk = id === 'hhPedal' ? 0.35 : 0.6;
      metal(h, envelope(h, pk, dec), 1, [{ type: 'bandpass', f: 10000, q: 0.8 }, { type: 'highpass', f: 7000 }]);
      if (!e) noise(h, envelope(h, pk * 0.5, dec * 0.8), [{ type: 'highpass', f: 8000 }]);
      break;
    }
    case 'crash':
    case 'splash': {
      const dec = id === 'crash' ? (e ? 1.4 : 2.4) : 0.9;
      metal(h, envelope(h, 0.55, dec, 0.002), id === 'splash' ? 1.35 : 1.1, [{ type: 'highpass', f: id === 'splash' ? 5500 : 4000 }]);
      noise(h, envelope(h, 0.5 * bright, dec * 0.8, 0.002), [{ type: 'highpass', f: 5000 }, { type: 'lowpass', f: 14000 }]);
      break;
    }
    case 'ride': {
      metal(h, envelope(h, 0.4, e ? 1.2 : 2.6), 0.85, [{ type: 'bandpass', f: 6000, q: 0.7 }]);
      noise(h, envelope(h, 0.18, 1.6), [{ type: 'bandpass', f: 7000, q: 1 }]);
      tone(h, 'sine', 3300, envelope(h, 0.12, 0.25)); // „ping“
      break;
    }
    case 'rideBell': {
      for (const [f, a, d] of [[740, 0.5, 1.6], [1180, 0.35, 1.2], [1715, 0.3, 0.9], [2590, 0.15, 0.6]] as const) tone(h, 'sine', f, envelope(h, a, d));
      metal(h, envelope(h, 0.15, 0.8), 1.2, [{ type: 'highpass', f: 5000 }]);
      break;
    }
    case 'tomHi':
    case 'tomMid':
    case 'tomFloor': {
      const f = T[id];
      const dec = id === 'tomFloor' ? 0.65 : id === 'tomMid' ? 0.5 : 0.4;
      tone(h, 'sine', f, envelope(h, 1, e ? dec * 0.8 : dec), { from: e ? 1.8 : 1.35, time: e ? 0.12 : 0.05 });
      if (!e) tone(h, 'sine', f * 1.59, envelope(h, 0.3 * bright, dec * 0.4));
      noise(h, envelope(h, 0.25 * bright, 0.03), [{ type: 'lowpass', f: 3500 }]);
      break;
    }
    case 'cowbell': {
      const bp = { type: 'bandpass' as BiquadFilterType, f: 2600, q: 1.5 };
      const sum = ctx.createGain();
      const b = ctx.createBiquadFilter();
      b.type = bp.type; b.frequency.value = bp.f; b.Q.value = bp.q;
      sum.connect(b).connect(envelope(h, 0.6, e ? 0.35 : 0.25));
      tone(h, 'square', 540, sum);
      tone(h, 'square', 800, sum);
      break;
    }
    case 'tambourine': {
      noise(h, envelope(h, 0.5, 0.18), [{ type: 'highpass', f: 7000 }]);
      metal(h, envelope(h, 0.35, 0.25), 1.6, [{ type: 'highpass', f: 8000 }]);
      break;
    }
  }
  // všechny obálky do výstupu nástroje
  for (const g of h.gains) g.connect(h.out);
  return finish(h);
}
