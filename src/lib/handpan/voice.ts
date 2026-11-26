/**
 * Zvuk handpanu: modální syntéza.
 * Úder = krátký šumový impulz + sada tlumených sinusových módů (f, 2f, 3f + slabé neharmonické).
 * Vše z nativních uzlů Web Audio → stejné v živém i offline kontextu.
 */
import { holdAt, type Voice } from '../audio/engine.svelte';
import { PARTIALS, partialGain } from './model';

export interface StrikeOptions {
  velocity: number;      // 0–1
  decay: number;         // s, dozvuk základního tónu na −60 dB
  ding?: boolean;
}

const LN1000 = Math.log(1000); // −60 dB

const clickCache = new WeakMap<BaseAudioContext, AudioBuffer>();
function clickBuffer(ctx: BaseAudioContext): AudioBuffer {
  let b = clickCache.get(ctx);
  if (!b) {
    const len = Math.round(ctx.sampleRate * 0.03);
    b = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = b.getChannelData(0);
    let s = 987654321;
    for (let i = 0; i < len; i++) {
      s = (s * 1664525 + 1013904223) >>> 0;
      const env = Math.exp(-i / (ctx.sampleRate * 0.004));
      d[i] = ((s / 4294967296) * 2 - 1) * env;
    }
    clickCache.set(ctx, b);
  }
  return b;
}

/** Zahraje jeden úder do `dest` v čase `when`. Vrací hlas, který jde plynule utlumit. */
export function strike(ctx: BaseAudioContext, dest: AudioNode, hz: number, o: StrikeOptions, when = ctx.currentTime): Voice {
  const v = Math.min(1, Math.max(0.02, o.velocity));
  const out = ctx.createGain();
  out.gain.value = 0.42;
  out.connect(dest);
  const nodes: { osc: OscillatorNode | AudioBufferSourceNode; g: GainNode }[] = [];
  let end = when;

  for (const [ratio, amp, decayPart, detune] of PARTIALS) {
    const f = hz * ratio * 2 ** (detune / 1200);
    if (f > ctx.sampleRate * 0.45) continue;
    const a = partialGain(amp, ratio, v) * (o.ding ? (ratio === 1 ? 1.1 : 0.85) : 1);
    if (a < 0.0005) continue;
    const dur = Math.max(0.08, o.decay * decayPart * (o.ding ? 1.15 : 1));
    const osc = ctx.createOscillator();
    osc.frequency.value = f;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(a, when + 0.002 + 0.002 * (1 - v));
    g.gain.setTargetAtTime(0, when + 0.004, dur / LN1000);
    osc.connect(g).connect(out);
    osc.start(when);
    osc.stop(when + dur + 0.05);
    end = Math.max(end, when + dur + 0.05);
    nodes.push({ osc, g });
  }

  // úder prstem: krátký šum kolem 3. harmonické, silnější úder = jasnější
  const click = ctx.createBufferSource();
  click.buffer = clickBuffer(ctx);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = Math.min(ctx.sampleRate * 0.4, hz * (2.5 + 2 * v));
  bp.Q.value = 1.2;
  const cg = ctx.createGain();
  cg.gain.value = 0.18 * v * v;
  click.connect(bp).connect(cg).connect(out);
  click.start(when);
  nodes.push({ osc: click, g: cg });

  let stopped = false;
  const voice: Voice = {
    stop(t = ctx.currentTime) {
      if (stopped) return;
      stopped = true;
      for (const n of nodes) {
        holdAt(n.g.gain, t);
        n.g.gain.setTargetAtTime(0, t, 0.012);
        try { n.osc.stop(t + 0.08); } catch { /* už zastaveno */ }
      }
    }
  };
  // konec hlasu = konec základního módu (dozní nejdéle)
  nodes[0]!.osc.onended = () => {
    out.disconnect();
    voice.onEnded?.();
  };
  void end;
  return voice;
}

/** Umělý dozvuk prostoru: vlastní impulzní odezva (šum s exponenciálním útlumem), bez cizích nahrávek. */
export function makeRoomImpulse(ctx: BaseAudioContext, seconds = 2.2): AudioBuffer {
  const len = Math.round(ctx.sampleRate * seconds);
  const b = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = b.getChannelData(c);
    let s = 1234567 + c * 7919;
    let lp = 0;
    for (let i = 0; i < len; i++) {
      s = (s * 1664525 + 1013904223) >>> 0;
      const w = (s / 4294967296) * 2 - 1;
      const tt = i / ctx.sampleRate;
      lp += (w - lp) * (0.6 - 0.5 * Math.min(1, tt / seconds)); // vyšší frekvence doznívají rychleji
      d[i] = lp * Math.exp((-tt * LN1000) / seconds) * (tt < 0.012 ? tt / 0.012 : 1);
    }
  }
  return b;
}
