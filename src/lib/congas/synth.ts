/**
 * Syntéza conga úderů (model): módy blány + šum dotyku ruky.
 * Otevřený tón: základní mód blány s neharmonickými vyššími módy (poměry kruhové blány 1 : 1,59 : 2,14 : 2,30,
 * u conga hlavy zúžené tlumením hrany). Slap: vysoké módy + ostrý šum, základ utlumen prsty.
 * Tlumený: prsty zůstanou na bláně → krátký a o něco vyšší tón. Bas: dlaň do středu → dutý tón těla bubnu.
 * Vše funguje stejně v AudioContext i OfflineAudioContext (export).
 */
import { silenceOut, type Voice } from '../audio/engine.svelte';
import { CONGA_TUNING, padDrum, padStroke, type CongaDrum, type CongaPad, type CongaStroke, type CongaTuning } from './kit';

export interface CongaVoice extends Voice {
  /** nový úder do stejné blány: předchozí dozní přitlumený (nezmizí) */
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

/** obálka: náběh `att` s, útlum na −60 dB za `decay` s */
function env(h: Hit, peak: number, decay: number, att = 0.002): GainNode {
  const g = h.ctx.createGain();
  g.gain.setValueAtTime(0, h.when);
  g.gain.linearRampToValueAtTime(peak, h.when + att);
  g.gain.setTargetAtTime(0, h.when + att, decay / LN1000);
  g.connect(h.out);
  h.end = Math.max(h.end, h.when + att + decay * 1.2);
  return g;
}

function mode(h: Hit, f: number, peak: number, decay: number, drop = 1, dropTime = 0.025, att = 0.002) {
  if (f >= h.ctx.sampleRate / 2.2) return;
  const o = h.ctx.createOscillator();
  o.type = 'sine';
  if (drop !== 1) {
    o.frequency.setValueAtTime(f * drop, h.when);
    o.frequency.exponentialRampToValueAtTime(f, h.when + dropTime);
  } else {
    o.frequency.value = f;
  }
  o.connect(env(h, peak, decay, att));
  o.start(h.when);
  h.srcs.push(o);
}

function touch(h: Hit, peak: number, decay: number, filters: { type: BiquadFilterType; f: number; q?: number }[]) {
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
  node.connect(env(h, peak, decay, 0.001));
  n.start(h.when);
  h.srcs.push(n);
}

/** doznění otevřeného tónu (s, na −60 dB) – větší buben zní déle */
const DECAY: Record<CongaDrum, number> = { quinto: 0.45, conga: 0.6, tumba: 0.75 };
/** vyrovnání hlasitosti úderů (dB), změřeno offline při síle 0,8 */
const TRIM: Record<CongaStroke, number> = { open: 0, slap: -1, mute: 3, bass: 1 };

/** Jeden úder na conga. `v` = síla 0–1. */
export function congaHit(ctx: BaseAudioContext, dest: AudioNode, pad: CongaPad, tuning: CongaTuning, v: number, when = ctx.currentTime): CongaVoice {
  const drum = padDrum(pad);
  const stroke = padStroke(pad);
  const f = CONGA_TUNING[tuning][drum];
  const vel = Math.min(1, Math.max(0.05, v));
  const bright = 0.45 + 0.55 * vel;
  const out = ctx.createGain();
  out.gain.value = 0.31 * vel * 10 ** (TRIM[stroke] / 20);
  out.connect(dest);
  const h: Hit = { ctx, out, srcs: [], when, end: when };
  const dec = DECAY[drum];

  switch (stroke) {
    case 'open': {
      // čistý zpívající tón: silný základ, slabší vyšší módy, lehký dotyk prstů
      mode(h, f, 1, dec, 1.03);
      mode(h, f * 1.52, 0.32 * bright, dec * 0.5);
      mode(h, f * 1.98, 0.16 * bright, dec * 0.38);
      mode(h, f * 2.44, 0.08 * bright, dec * 0.3);
      mode(h, f * 0.5, 0.1, dec * 0.35); // tělo bubnu
      touch(h, 0.22 * bright, 0.025, [{ type: 'bandpass', f: 1800, q: 0.8 }]);
      break;
    }
    case 'slap': {
      // ostrý plesk: vysoké módy a šum, základ utlumený prsty
      mode(h, f, 0.3, 0.1, 1.04);
      mode(h, f * 2.44, 0.42 * bright, 0.12);
      mode(h, f * 3.1, 0.36 * bright, 0.1);
      mode(h, f * 3.92, 0.28 * bright, 0.08);
      mode(h, f * 5.2, 0.18 * bright, 0.06);
      touch(h, 0.9 * bright, 0.06, [{ type: 'highpass', f: 1400 }, { type: 'peaking', f: 3200, q: 1.2 }]);
      touch(h, 0.35 * bright, 0.012, [{ type: 'highpass', f: 5000 }]);
      break;
    }
    case 'mute': {
      // prsty zůstanou na bláně: krátký, o něco vyšší tón (napnutější blána)
      mode(h, f * 1.07, 0.85, 0.09, 1.02);
      mode(h, f * 1.62, 0.2 * bright, 0.06);
      touch(h, 0.25 * bright, 0.015, [{ type: 'lowpass', f: 2600 }]);
      break;
    }
    case 'bass': {
      // dlaň do středu: dutý hluboký tón těla, blána hned utlumená dlaní
      const fb = f * 0.4;
      mode(h, fb, 1, dec * 0.55, 1.25, 0.04, 0.004);
      mode(h, fb * 2.1, 0.18, dec * 0.2);
      mode(h, f, 0.18, 0.07);
      touch(h, 0.3 * bright, 0.03, [{ type: 'lowpass', f: 700 }]);
      break;
    }
  }

  for (const s of h.srcs) s.stop(h.end);
  let stopped = false;
  let damped = false;
  const voice: CongaVoice = {
    damp(t: number) {
      if (stopped || damped) return;
      damped = true;
      // jen výstup hlasu (nemá jinou automatizaci) → spolehlivé i v Safari
      try { out.gain.setTargetAtTime(0, t, 0.08); } catch { /* */ }
    },
    stop(t = ctx.currentTime) {
      if (stopped) return;
      stopped = true;
      for (const s of h.srcs) try { s.stop(t + 0.05); } catch { /* už zastaveno */ }
      silenceOut(ctx, out, t, 0.006);
    }
  };
  const last = h.srcs[0];
  if (last) {
    last.onended = () => {
      try { out.disconnect(); } catch { /* */ }
      voice.onEnded?.();
    };
  }
  return voice;
}
