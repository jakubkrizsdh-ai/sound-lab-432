import { describe, expect, it } from 'vitest';
import { noiseSamples, waveCoefficients, waveValue } from '../src/lib/audio/waves';
import { freqAt, planDuration, stepsPlan, sweepPlan } from '../src/lib/audio/automation';
import { beatHz, speedOfSoundAir, wavelength } from '../src/lib/physics';

describe('průběhy', () => {
  it('sinus s fází 0 začíná v nule a ve čtvrtině periody má 1', () => {
    expect(waveValue('sine', 100, 0)).toBeCloseTo(0, 12);
    expect(waveValue('sine', 100, 0.0025)).toBeCloseTo(1, 12);
  });
  it('fáze 180° obrací sinus (destruktivní interference)', () => {
    for (const t of [0.0007, 0.0013, 0.0041]) {
      expect(waveValue('sine', 432, t) + waveValue('sine', 432, t, 180)).toBeCloseTo(0, 12);
    }
  });
  it('fáze posouvá tvar v čase i u obdélníku (posun 90° = čtvrt periody)', () => {
    const hz = 100;
    for (const t of [0.0011, 0.0034, 0.0062]) {
      expect(waveValue('square', hz, t, 90)).toBeCloseTo(waveValue('square', hz, t + 0.0025), 9);
    }
  });
  it('obdélník, pila a trojúhelník mají správnou hodnotu uprostřed půlvlny', () => {
    expect(waveValue('square', 1, 0.25, 0, undefined, 255)).toBeCloseTo(1, 1);
    expect(waveValue('triangle', 1, 0.25, 0, undefined, 255)).toBeCloseTo(1, 2);
    expect(waveValue('sawtooth', 1, 0.25, 0, undefined, 255)).toBeCloseTo(0.5, 1);
  });
  it('koeficienty pro Web Audio odpovídají řadě (sin složky v imag, cos v real)', () => {
    const { real, imag } = waveCoefficients('sine', 90);
    expect(real[1]).toBeCloseTo(1, 6);
    expect(imag[1]).toBeCloseTo(0, 6);
  });
  it('šum je bez stejnosměrné složky a s RMS 0,25', () => {
    for (const k of ['white', 'pink', 'brown'] as const) {
      const d = noiseSamples(k, 48000);
      let m = 0, r = 0;
      for (const v of d) { m += v; r += v * v; }
      expect(Math.abs(m / d.length)).toBeLessThan(1e-6);
      expect(Math.sqrt(r / d.length)).toBeCloseTo(0.25, 4);
    }
  });
});

describe('pohyb frekvence', () => {
  it('exponenciální sweep je v polovině času na geometrickém průměru', () => {
    const p = sweepPlan(128, 512, 8);
    expect(freqAt(p, 0)).toBe(128);
    expect(freqAt(p, 4)).toBeCloseTo(256, 9);
    expect(freqAt(p, 8)).toBe(512);
    expect(freqAt(p, 20)).toBe(512);
  });
  it('lineární sweep je v polovině na aritmetickém průměru', () => {
    expect(freqAt(sweepPlan(100, 300, 2, 'linear'), 1)).toBeCloseTo(200, 9);
  });
  it('přechody: drží tón, pak plynule přejde; smyčka se opakuje', () => {
    const p = stepsPlan(256, [{ hz: 384, hold: 2, glide: 1 }, { hz: 256, hold: 2, glide: 1 }], true);
    expect(planDuration(p)).toBe(6);
    expect(freqAt(p, 2)).toBe(384);
    expect(freqAt(p, 3.5)).toBeCloseTo(Math.sqrt(384 * 256), 9);
    expect(freqAt(p, 4.5)).toBe(256);
    expect(freqAt(p, 6 + 2)).toBe(384);
  });
});

describe('fyzika', () => {
  it('rychlost zvuku při 20 °C ≈ 343 m/s, λ(432 Hz) ≈ 0,794 m', () => {
    expect(speedOfSoundAir(20)).toBeCloseTo(343.2, 1);
    expect(wavelength(432)).toBeCloseTo(0.7945, 3);
    expect(beatHz(432, 436)).toBe(4);
  });
});
