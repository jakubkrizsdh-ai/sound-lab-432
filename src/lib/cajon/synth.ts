/**
 * Syntéza cajonu (model): rezonance bedny (Helmholtz), módy přední desky, šum dotyku ruky
 * a bzučení strun (snare) za deskou. Funguje stejně v AudioContext i OfflineAudioContext.
 */
import { silenceOut, type Voice } from '../audio/engine.svelte';
import { cajonStroke, type CajonPad } from './kit';

export interface CajonVoice extends Voice {
  damp(t: number): void;
}

interface Hit {
  ctx: BaseAudioContext;
  out: GainNode;
  srcs: AudioScheduledSourceNode[];
  when: number;
  end: number;
}

const LN1000 = Math.log(1000);
const NOISE = new WeakMap<BaseAudioContext, AudioBuffer>();
function noiseBuf(ctx: BaseAudioContext): AudioBuffer {
  let b = NOISE.get(ctx);
  if (!b) {
    b = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.5), ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    NOISE.set(ctx, b);
  }
  return b;
}

function env(h: Hit, peak: number, decay: number, att = 0.002): GainNode {
  const g = h.ctx.createGain();
  g.gain.setValueAtTime(0, h.when);
  g.gain.linearRampToValueAtTime(peak, h.when + att);
  g.gain.setTargetAtTime(0, h.when + att, decay / LN1000);
  g.connect(h.out);
  h.end = Math.max(h.end, h.when + att + decay * 1.2);
  return g;
}

function mode(h: Hit, f: number, peak: number, decay: number, drop = 1, dropTime = 0.03) {
  const o = h.ctx.createOscillator();
  o.type = 'sine';
  if (drop !== 1) {
    o.frequency.setValueAtTime(f * drop, h.when);
    o.frequency.exponentialRampToValueAtTime(f, h.when + dropTime);
  } else {
    o.frequency.value = f;
  }
  o.connect(env(h, peak, decay));
  o.start(h.when);
  h.srcs.push(o);
}

function noise(h: Hit, peak: number, decay: number, filters: { type: BiquadFilterType; f: number; q?: number }[], att = 0.001) {
  const n = h.ctx.createBufferSource();
  n.buffer = noiseBuf(h.ctx);
  n.loop = true;
  // každý úder jinde v šumu → žádné dva údery nejsou úplně stejné
  const off = Math.random() * 0.4;
  let node: AudioNode = n;
  for (const f of filters) {
    const b = h.ctx.createBiquadFilter();
    b.type = f.type;
    b.frequency.value = f.f;
    if (f.q !== undefined) b.Q.value = f.q;
    node.connect(b);
    node = b;
  }
  node.connect(env(h, peak, decay, att));
  n.start(h.when, off);
  h.srcs.push(n);
}

/** bzučení strun za deskou */
function wires(h: Hit, peak: number, decay: number) {
  noise(h, peak, decay, [{ type: 'highpass', f: 2600 }, { type: 'bandpass', f: 5200, q: 0.7 }], 0.003);
  noise(h, peak * 0.5, decay * 0.6, [{ type: 'bandpass', f: 3400, q: 2.5 }], 0.003);
}

const TRIM: Record<string, number> = { slap: 0, tone: 0, bass: 0, ghost: 5 };

/** Jeden úder na cajon. `v` = síla 0–1, `withWires` = struny za deskou. */
export function cajonHit(ctx: BaseAudioContext, dest: AudioNode, pad: CajonPad, withWires: boolean, v: number, when = ctx.currentTime): CajonVoice {
  const stroke = cajonStroke(pad);
  const vel = Math.min(1, Math.max(0.05, v));
  const bright = 0.45 + 0.55 * vel;
  const out = ctx.createGain();
  out.gain.value = 0.4 * vel * 10 ** ((TRIM[stroke] ?? 0) / 20);
  out.connect(dest);
  const h: Hit = { ctx, out, srcs: [], when, end: when };

  switch (stroke) {
    case 'bass': {
      // dlaň do středu desky: hluboký „bum“ bedny (vzduch v bedně + deska)
      mode(h, 92, 1, 0.38, 1.3, 0.035);
      mode(h, 184, 0.25, 0.16);
      mode(h, 265, 0.12, 0.1);
      noise(h, 0.35 * bright, 0.035, [{ type: 'lowpass', f: 450 }]);
      if (withWires) wires(h, 0.1 * bright, 0.12);
      break;
    }
    case 'tone': {
      // prsty/dlaň pod horním okrajem: střední dřevěný tón
      mode(h, 235, 0.55, 0.12, 1.05, 0.015);
      mode(h, 372, 0.32, 0.09);
      mode(h, 150, 0.35, 0.16);
      noise(h, 0.4 * bright, 0.04, [{ type: 'bandpass', f: 1300, q: 0.9 }]);
      if (withWires) wires(h, 0.3 * bright, 0.16);
      break;
    }
    case 'slap': {
      // prsty do horního okraje: ostrý plesk, struny naplno
      noise(h, 0.95 * bright, 0.05, [{ type: 'highpass', f: 1500 }, { type: 'peaking', f: 2800, q: 1.1 }]);
      mode(h, 520, 0.3 * bright, 0.05);
      mode(h, 780, 0.22 * bright, 0.04);
      mode(h, 1150, 0.15 * bright, 0.035);
      if (withWires) wires(h, 0.6 * bright, 0.2);
      else noise(h, 0.2 * bright, 0.08, [{ type: 'bandpass', f: 4200, q: 0.8 }]);
      break;
    }
    case 'ghost': {
      // konečky prstů: tiché „ťuknutí“ mezi údery
      noise(h, 0.35 * bright, 0.025, [{ type: 'bandpass', f: 2200, q: 0.9 }]);
      mode(h, 300, 0.12, 0.05);
      if (withWires) wires(h, 0.18 * bright, 0.09);
      break;
    }
  }

  for (const s of h.srcs) s.stop(h.end);
  let stopped = false;
  let damped = false;
  const voice: CajonVoice = {
    damp(t: number) {
      if (stopped || damped) return;
      damped = true;
      try { out.gain.setTargetAtTime(0, t, 0.12); } catch { /* */ }
    },
    stop(t = ctx.currentTime) {
      if (stopped) return;
      stopped = true;
      for (const s of h.srcs) try { s.stop(t + 0.05); } catch { /* už zastaveno */ }
      silenceOut(ctx, out, t, 0.006);
    }
  };
  const first = h.srcs[0];
  if (first) {
    first.onended = () => {
      try { out.disconnect(); } catch { /* */ }
      voice.onEnded?.();
    };
  }
  return voice;
}
