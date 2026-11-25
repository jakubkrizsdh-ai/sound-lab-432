/**
 * Generátor tónu nebo šumu jako hlas zvukového jádra.
 * Funguje v živém i offline kontextu (export), všechny změny přes rampy.
 */
import { dbToGain, type Voice } from './engine.svelte';
import { isNoise, noiseSamples, waveCoefficients, type NoiseWave, type ToneWave } from './waves';
import { freqAt, planDuration, scheduleCycle, type Plan } from './automation';
import type { GeneratorSettings } from '../freqlab/types';
import { LIMITS } from '../freqlab/types';

const TAU = 0.015; // časová konstanta plynulých změn (s)

const waveCache = new WeakMap<BaseAudioContext, Map<string, PeriodicWave>>();
const noiseCache = new WeakMap<BaseAudioContext, Map<NoiseWave, AudioBuffer>>();

function periodicWave(ctx: BaseAudioContext, s: GeneratorSettings): PeriodicWave {
  const key = `${s.wave}|${s.phaseDeg}|${s.wave === 'additive' ? s.harmonics.join(',') : ''}`;
  let m = waveCache.get(ctx);
  if (!m) waveCache.set(ctx, (m = new Map()));
  let w = m.get(key);
  if (!w) {
    const { real, imag } = waveCoefficients(s.wave as ToneWave, s.phaseDeg, s.harmonics);
    // bez normalizace: amplituda 1 znamená špičku zhruba 1 (sinus přesně 1)
    w = ctx.createPeriodicWave(real, imag, { disableNormalization: true });
    m.set(key, w);
  }
  return w;
}

function noiseBuffer(ctx: BaseAudioContext, kind: NoiseWave): AudioBuffer {
  let m = noiseCache.get(ctx);
  if (!m) noiseCache.set(ctx, (m = new Map()));
  let b = m.get(kind);
  if (!b) {
    const len = Math.round(ctx.sampleRate * 4);
    b = ctx.createBuffer(1, len, ctx.sampleRate);
    b.getChannelData(0).set(noiseSamples(kind, len));
    m.set(kind, b);
  }
  return b;
}

/** Normalizace aditivní řady, aby součet harmonických nepřebudil (špička ≤ 1). */
function additiveScale(s: GeneratorSettings): number {
  if (s.wave !== 'additive') return 1;
  const sum = s.harmonics.reduce((a, v) => a + Math.abs(v), 0);
  return sum > 1 ? 1 / sum : 1;
}

export class Generator implements Voice {
  private source: OscillatorNode | AudioBufferSourceNode | null = null;
  private readonly env: GainNode;
  private readonly level: GainNode;
  private readonly gate: GainNode;
  private readonly panner: StereoPannerNode;
  private s: GeneratorSettings;
  private stopped = false;
  private plan: Plan | null = null;
  private planStart = 0;
  private planEnd = 0;
  private planTimer: ReturnType<typeof setInterval> | null = null;
  onEnded?: () => void;

  constructor(private readonly ctx: BaseAudioContext, dest: AudioNode, settings: GeneratorSettings, audible = true) {
    this.s = { ...settings };
    this.env = ctx.createGain();
    this.env.gain.value = 0;
    this.level = ctx.createGain();
    this.level.gain.value = this.levelValue(this.s);
    this.gate = ctx.createGain();
    this.gate.gain.value = audible ? 1 : 0;
    this.panner = ctx.createStereoPanner();
    this.panner.pan.value = this.s.pan;
    this.env.connect(this.level).connect(this.gate).connect(this.panner).connect(dest);
  }

  private levelValue(s: GeneratorSettings): number {
    return s.amp * dbToGain(s.volumeDb) * additiveScale(s);
  }

  private makeSource(s: GeneratorSettings, when: number): OscillatorNode | AudioBufferSourceNode {
    let src: OscillatorNode | AudioBufferSourceNode;
    if (isNoise(s.wave)) {
      const b = this.ctx.createBufferSource();
      b.buffer = noiseBuffer(this.ctx, s.wave);
      b.loop = true;
      src = b;
    } else {
      const o = this.ctx.createOscillator();
      o.setPeriodicWave(periodicWave(this.ctx, s));
      o.frequency.setValueAtTime(s.freq, when);
      src = o;
    }
    src.connect(this.env);
    src.start(when);
    return src;
  }

  /** Spustí generátor v čase `when` (stejný čas pro více generátorů = stejná fáze). */
  start(when = this.ctx.currentTime): void {
    this.source = this.makeSource(this.s, when);
    const a = Math.max(LIMITS.attackMin, this.s.attackMs) / 1000;
    this.env.gain.setValueAtTime(0, when);
    this.env.gain.linearRampToValueAtTime(1, when + a);
    this.source.onended = () => this.finish();
  }

  get currentFrequency(): number {
    if (this.plan) return freqAt(this.plan, this.ctx.currentTime - this.planStart);
    return this.s.freq;
  }

  get hasPlan(): boolean {
    return this.plan !== null;
  }

  /** Plynulé zastavení s dozvukem (release). */
  stop(when = this.ctx.currentTime): void {
    if (this.stopped || !this.source) return;
    this.stopped = true;
    this.clearPlanTimer();
    const r = Math.max(LIMITS.releaseMin, this.s.releaseMs) / 1000;
    const g = this.env.gain;
    g.cancelScheduledValues(when);
    g.setValueAtTime(g.value, when);
    g.setTargetAtTime(0, when, r / 5); // za `r` klesne pod 1 %
    this.source.stop(when + r + 0.05);
  }

  private finish() {
    this.clearPlanTimer();
    this.env.disconnect();
    this.panner.disconnect();
    this.onEnded?.();
  }

  setAudible(on: boolean): void {
    this.gate.gain.setTargetAtTime(on ? 1 : 0, this.ctx.currentTime, 0.01);
  }

  /** Použije nové nastavení na běžící generátor (plynule). */
  update(next: GeneratorSettings): void {
    const prev = this.s;
    this.s = { ...next };
    const t = this.ctx.currentTime;
    if (!this.source || this.stopped) return;

    const typeChanged = isNoise(prev.wave) !== isNoise(next.wave) || (isNoise(next.wave) && prev.wave !== next.wave);
    if (typeChanged) {
      this.swapSource();
    } else if (!isNoise(next.wave) && this.source instanceof OscillatorNode) {
      const shape = prev.wave !== next.wave || prev.phaseDeg !== next.phaseDeg || prev.harmonics.join() !== next.harmonics.join();
      if (shape) this.source.setPeriodicWave(periodicWave(this.ctx, next));
      if (prev.freq !== next.freq && !this.plan) this.source.frequency.setTargetAtTime(next.freq, t, TAU);
    }
    if (this.levelValue(prev) !== this.levelValue(next)) this.level.gain.setTargetAtTime(this.levelValue(next), t, TAU);
    if (prev.pan !== next.pan) this.panner.pan.setTargetAtTime(next.pan, t, TAU);
  }

  /** Výměna zdroje (tón ↔ šum) s krátkým prolnutím přes obálku. */
  private swapSource() {
    const t = this.ctx.currentTime;
    const old = this.source!;
    const g = this.env.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(0, t + 0.01);
    old.onended = null;
    old.stop(t + 0.012);
    this.source = this.makeSource(this.s, t + 0.012);
    this.source.onended = () => this.finish();
    g.linearRampToValueAtTime(1, t + 0.025);
  }

  /** Spustí pohyb frekvence (sweep, glissando, přechody). */
  runPlan(plan: Plan): void {
    if (!(this.source instanceof OscillatorNode)) return;
    this.clearPlanTimer();
    const f = this.source.frequency;
    const t = this.ctx.currentTime + 0.02;
    f.cancelScheduledValues(this.ctx.currentTime);
    f.setTargetAtTime(plan.segments[0]?.from ?? this.s.freq, this.ctx.currentTime, 0.005);
    this.plan = plan;
    this.planStart = t;
    this.planEnd = scheduleCycle(f, plan, t);
    if (plan.loop && planDuration(plan) > 0) {
      this.planTimer = setInterval(() => {
        if (this.ctx.currentTime > this.planEnd - 1 && this.source instanceof OscillatorNode) {
          this.planEnd = scheduleCycle(this.source.frequency, plan, this.planEnd);
        }
      }, 250);
    }
  }

  /** Zastaví pohyb a podrží aktuální frekvenci. Vrací ji. */
  stopPlan(): number {
    const hz = this.currentFrequency;
    this.clearPlanTimer();
    this.plan = null;
    if (this.source instanceof OscillatorNode) {
      const f = this.source.frequency;
      const t = this.ctx.currentTime;
      f.cancelScheduledValues(t);
      f.setValueAtTime(hz, t);
    }
    this.s.freq = hz;
    return hz;
  }

  /** Konec jednorázového plánu (pro rozhraní). */
  planFinished(): boolean {
    return !!this.plan && !this.plan.loop && this.ctx.currentTime >= this.planEnd;
  }

  private clearPlanTimer() {
    if (this.planTimer) clearInterval(this.planTimer);
    this.planTimer = null;
  }
}
