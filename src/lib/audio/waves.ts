/**
 * Průběhy generátorů jako Fourierovy řady.
 * Průběh se skládá z harmonických sin(n·ωt + n·φ): posun fáze φ je posun v čase,
 * takže tvar zůstane stejný a jen se posune. Prohlížeč řadu omezí pod Nyquistovu frekvenci.
 */
export type ToneWave = 'sine' | 'triangle' | 'square' | 'sawtooth' | 'additive';
export type NoiseWave = 'white' | 'pink' | 'brown';
export type Wave = ToneWave | NoiseWave;

export const TONE_WAVES: ToneWave[] = ['sine', 'triangle', 'square', 'sawtooth', 'additive'];
export const NOISE_WAVES: NoiseWave[] = ['white', 'pink', 'brown'];
export const isNoise = (w: Wave): w is NoiseWave => (NOISE_WAVES as string[]).includes(w);

export const HARMONICS = 256;
export const ADDITIVE_PARTIALS = 16;

/** Amplitudy sinusových složek b[n] (n = 1…N, index 0 nevyužit). */
export function seriesAmplitudes(wave: ToneWave, additive: number[] = [1]): Float64Array {
  const b = new Float64Array(HARMONICS + 1);
  for (let n = 1; n <= HARMONICS; n++) {
    switch (wave) {
      case 'sine':
        b[n] = n === 1 ? 1 : 0;
        break;
      case 'square':
        b[n] = n % 2 ? 4 / (Math.PI * n) : 0;
        break;
      case 'sawtooth':
        b[n] = ((n % 2 ? 1 : -1) * 2) / (Math.PI * n);
        break;
      case 'triangle':
        b[n] = n % 2 ? ((((n - 1) / 2) % 2 ? -1 : 1) * 8) / (Math.PI * Math.PI * n * n) : 0;
        break;
      case 'additive':
        b[n] = additive[n - 1] ?? 0;
        break;
    }
  }
  return b;
}

/**
 * Koeficienty pro createPeriodicWave(real, imag) s fázovým posunem φ (stupně).
 * Web Audio skládá x(t) = Σ real[n]·cos(nωt) + imag[n]·sin(nωt).
 * b·sin(nωt + nφ) = b·sin(nφ)·cos(nωt) + b·cos(nφ)·sin(nωt).
 */
export function waveCoefficients(wave: ToneWave, phaseDeg = 0, additive?: number[]) {
  const b = seriesAmplitudes(wave, additive);
  const phi = (phaseDeg * Math.PI) / 180;
  const real = new Float32Array(HARMONICS + 1);
  const imag = new Float32Array(HARMONICS + 1);
  for (let n = 1; n <= HARMONICS; n++) {
    real[n] = b[n]! * Math.sin(n * phi);
    imag[n] = b[n]! * Math.cos(n * phi);
  }
  return { real, imag };
}

/** Hodnota průběhu v čase t (s) – pro výpočty a vykreslení „Vypočteno“. */
export function waveValue(wave: ToneWave, hz: number, t: number, phaseDeg = 0, additive?: number[], maxN = 64): number {
  const b = seriesAmplitudes(wave, additive);
  const phi = (phaseDeg * Math.PI) / 180;
  let v = 0;
  for (let n = 1; n <= maxN; n++) if (b[n]) v += b[n]! * Math.sin(n * (2 * Math.PI * hz * t + phi));
  return v;
}

/** Šum jako buffer (opakuje se ve smyčce). Hladina zhruba vyrovnaná na RMS ≈ 0,25. */
export function noiseSamples(kind: NoiseWave, length: number, seed = 12345): Float32Array {
  let s = seed >>> 0;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return (s / 4294967296) * 2 - 1;
  };
  const d = new Float32Array(length);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
  for (let i = 0; i < length; i++) {
    const w = rnd();
    if (kind === 'white') d[i] = w;
    else if (kind === 'pink') {
      // Paul Kellet, přesnější varianta
      b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.969 * b2 + w * 0.153852; b3 = 0.8665 * b3 + w * 0.3104856;
      b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
      d[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362;
      b6 = w * 0.115926;
    } else {
      last = (last + 0.02 * w) / 1.02;
      d[i] = last;
    }
  }
  // odstranit stejnosměrnou složku a vyrovnat RMS
  let mean = 0;
  for (const v of d) mean += v;
  mean /= length;
  let rms = 0;
  for (let i = 0; i < length; i++) { d[i]! -= mean; rms += d[i]! * d[i]!; }
  rms = Math.sqrt(rms / length) || 1;
  const k = 0.25 / rms;
  for (let i = 0; i < length; i++) d[i]! *= k;
  return d;
}

export const ADDITIVE_PRESETS: Record<string, number[]> = {
  fundamental: [1],
  odd: Array.from({ length: ADDITIVE_PARTIALS }, (_, i) => ((i + 1) % 2 ? 1 / (i + 1) : 0)),
  all: Array.from({ length: ADDITIVE_PARTIALS }, (_, i) => 1 / (i + 1)),
  organ: [1, 0.5, 0.33, 0.25, 0, 0.15, 0, 0.1]
};
