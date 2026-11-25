import { describe, expect, it } from 'vitest';
import { LimiterDSP } from '../src/lib/audio/limiter-dsp';

const SR = 48000;
const ceiling = 10 ** (-1 / 20);

function sine(hz: number, amp: number, seconds: number, phase = 0.3): Float32Array {
  const n = Math.round(seconds * SR);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = amp * Math.sin(2 * Math.PI * hz * (i / SR) + phase);
  return out;
}

function peak(x: Float32Array, from = 0): number {
  let p = 0;
  for (let i = from; i < x.length; i++) p = Math.max(p, Math.abs(x[i]!));
  return p;
}

/** Jemný odhad skutečné špičky: 8× převzorkování sinc interpolací (okno 32 vzorků). */
function truePeak(x: Float32Array, from: number): number {
  let p = 0;
  for (let i = from + 32; i < x.length - 32; i++) {
    for (let k = 1; k < 8; k++) {
      const t = i + k / 8;
      let v = 0;
      for (let j = i - 31; j <= i + 32; j++) {
        const d = t - j;
        const w = 0.5 + 0.5 * Math.cos((Math.PI * d) / 32);
        v += x[j]! * (Math.sin(Math.PI * d) / (Math.PI * d)) * w;
      }
      p = Math.max(p, Math.abs(v));
    }
  }
  return p;
}

describe('master limiter', () => {
  it('tichý signál nechá beze změny (jen zpožděný o předstih)', () => {
    const lim = new LimiterDSP({ sampleRate: SR });
    const x = sine(432, 0.25, 0.1);
    const y = Float32Array.from(x);
    lim.process(y);
    const la = lim.latencySamples;
    for (let i = la; i < x.length; i++) expect(y[i]).toBeCloseTo(x[i - la]!, 6);
    expect(lim.maxReductionDb).toBe(0);
  });

  it('přebuzený sinus (+6 dBFS) nepřekročí −1 dBFS v žádném vzorku', () => {
    const lim = new LimiterDSP({ sampleRate: SR });
    const y = sine(432, 2, 0.5);
    lim.process(y);
    expect(peak(y)).toBeLessThanOrEqual(ceiling + 1e-6);
    expect(lim.maxReductionDb).toBeGreaterThan(6);
  });

  it('mezivzorkové špičky u vysoké frekvence zůstanou do 0,2 dB nad stropem', () => {
    const lim = new LimiterDSP({ sampleRate: SR });
    const y = sine(11025.7, 1.6, 0.25, 0.785);
    lim.process(y);
    const tp = truePeak(y, 2000);
    expect(20 * Math.log10(tp / ceiling)).toBeLessThan(0.2);
  });

  it('náhlý úder (skok z ticha) je ztlumen ještě před příchodem špičky', () => {
    const lim = new LimiterDSP({ sampleRate: SR });
    const x = new Float32Array(SR / 10);
    for (let i = 2400; i < x.length; i++) x[i] = 3 * Math.sin(2 * Math.PI * 200 * (i / SR));
    lim.process(x);
    expect(peak(x)).toBeLessThanOrEqual(ceiling + 1e-6);
  });

  it('stereo: oba kanály se ztlumí stejně (obraz se neposune)', () => {
    const lim = new LimiterDSP({ sampleRate: SR });
    const l = sine(300, 2, 0.2);
    const r = sine(300, 1, 0.2);
    lim.process(l, r);
    for (let i = 2000; i < l.length; i += 97) {
      if (Math.abs(r[i]!) > 1e-3) expect(l[i]! / r[i]!).toBeCloseTo(2, 3);
    }
  });
});
