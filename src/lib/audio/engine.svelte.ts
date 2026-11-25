/**
 * Zvukové jádro SOUND LAB 432.
 * Jeden AudioContext, master řetězec s limiterem, globální STOP ALL a správa hlasů.
 * Signálová cesta: zdroje → bus → master gain → DC filtr → limiter (−1 dBFS) → výstup.
 */
import workletUrl from './limiter.worklet.ts?worker&url';

export type AudioStatus = 'off' | 'starting' | 'running' | 'suspended' | 'error';

export const MASTER_MIN_DB = -60;
export const MASTER_MAX_DB = -6;
export const MASTER_DEFAULT_DB = -24;
export const MASTER_WARN_DB = -12;
export const MAX_VOICES = 64;
const MASTER_KEY = 'soundlab.masterDb';

/** Hlas = cokoli, co zní a jde zastavit (tón handpanu, generátor…). */
export interface Voice {
  /** Zastaví hlas s krátkou rampou, bez lupnutí. */
  stop(when?: number): void;
  /** Zavolá se, když hlas dozní. */
  onEnded?: () => void;
}

export interface MasterChain {
  input: GainNode;
  master: GainNode;
  limiter: AudioNode;
  kind: 'worklet' | 'fallback';
}

export const dbToGain = (db: number) => 10 ** (db / 20);
export const gainToDb = (g: number) => 20 * Math.log10(g);

function clampDb(db: number): number {
  return Math.min(MASTER_MAX_DB, Math.max(MASTER_MIN_DB, Math.round(db)));
}

function loadMasterDb(): number {
  try {
    const v = Number(localStorage.getItem(MASTER_KEY));
    if (localStorage.getItem(MASTER_KEY) !== null && Number.isFinite(v)) return clampDb(v);
  } catch {
    /* ignorovat */
  }
  return MASTER_DEFAULT_DB;
}

/** Reaktivní stav pro rozhraní. */
export const audio = $state({
  status: 'off' as AudioStatus,
  sampleRate: 0,
  baseLatencyMs: null as number | null,
  outputLatencyMs: null as number | null,
  masterDb: loadMasterDb(),
  reductionDb: 0,
  limiterKind: null as MasterChain['kind'] | null,
  voices: 0,
  error: ''
});

const workletLoaded = new WeakSet<BaseAudioContext>();

/**
 * Sestaví master řetězec v libovolném kontextu – živém i OfflineAudioContext (export).
 * Když AudioWorklet chybí, použije se tvrdě nastavený kompresor jako náhradní limiter.
 */
export async function buildMasterChain(ctx: BaseAudioContext, masterDb: number): Promise<MasterChain> {
  const input = ctx.createGain();
  const master = ctx.createGain();
  master.gain.value = dbToGain(masterDb);
  const dc = ctx.createBiquadFilter();
  dc.type = 'highpass';
  dc.frequency.value = 10;
  dc.Q.value = Math.SQRT1_2;

  let limiter: AudioNode;
  let kind: MasterChain['kind'];
  try {
    if (!ctx.audioWorklet) throw new Error('AudioWorklet není k dispozici');
    if (!workletLoaded.has(ctx)) {
      await ctx.audioWorklet.addModule(workletUrl);
      workletLoaded.add(ctx);
    }
    limiter = new AudioWorkletNode(ctx, 'soundlab-limiter', {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [2],
      channelCount: 2,
      channelCountMode: 'explicit'
    });
    kind = 'worklet';
  } catch {
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -3;
    comp.knee.value = 0;
    comp.ratio.value = 20;
    comp.attack.value = 0.001;
    comp.release.value = 0.12;
    limiter = comp;
    kind = 'fallback';
  }
  input.connect(master).connect(dc).connect(limiter).connect(ctx.destination);
  return { input, master, limiter, kind };
}

class AudioEngine {
  ctx: AudioContext | null = null;
  private chain: MasterChain | null = null;
  private starting: Promise<void> | null = null;
  private voices = new Set<Voice>();
  private order: Voice[] = [];

  /** Vstup, do kterého se připojují všechny zdroje. Před start() je null. */
  get input(): AudioNode | null {
    return this.chain?.input ?? null;
  }

  get running(): boolean {
    return this.ctx?.state === 'running' && this.chain !== null;
  }

  /**
   * Zapne zvuk. Musí se zavolat z dotyku nebo kliknutí (iOS a Chrome jinak zvuk nepustí).
   * Opakované volání jen obnoví pozastavený kontext.
   */
  start(): Promise<void> {
    if (this.ctx && this.chain) {
      if (this.ctx.state !== 'running') void this.ctx.resume();
      return Promise.resolve();
    }
    if (this.starting) return this.starting;

    // iOS: zvuková relace „playback“ – přehrává i při zapnutém tichém režimu (Safari 17+)
    const nav = navigator as Navigator & { audioSession?: { type: string } };
    try {
      if (nav.audioSession) nav.audioSession.type = 'playback';
    } catch {
      /* starší Safari */
    }

    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctor({ latencyHint: 'interactive' });
    this.ctx = ctx;
    audio.status = 'starting';
    void ctx.resume(); // ještě uvnitř gesta

    ctx.onstatechange = () => this.syncState();
    this.starting = (async () => {
      try {
        this.chain = await buildMasterChain(ctx, audio.masterDb);
        if (this.chain.limiter instanceof AudioWorkletNode) {
          this.chain.limiter.port.onmessage = (e: MessageEvent<number>) => {
            audio.reductionDb = e.data;
          };
        }
        audio.limiterKind = this.chain.kind;
        audio.sampleRate = ctx.sampleRate;
        audio.baseLatencyMs = Number.isFinite(ctx.baseLatency) ? ctx.baseLatency * 1000 : null;
        this.syncState();
      } catch (err) {
        audio.status = 'error';
        audio.error = String(err);
      } finally {
        this.starting = null;
      }
    })();
    return this.starting;
  }

  private syncState() {
    const ctx = this.ctx;
    if (!ctx || !this.chain) return;
    audio.status = ctx.state === 'running' ? 'running' : ctx.state === 'closed' ? 'off' : 'suspended';
    const out = (ctx as AudioContext & { outputLatency?: number }).outputLatency;
    audio.outputLatencyMs = out && Number.isFinite(out) ? out * 1000 : null;
  }

  setMasterDb(db: number) {
    const v = clampDb(db);
    audio.masterDb = v;
    try {
      localStorage.setItem(MASTER_KEY, String(v));
    } catch {
      /* ignorovat */
    }
    if (this.ctx && this.chain) {
      this.chain.master.gain.setTargetAtTime(dbToGain(v), this.ctx.currentTime, 0.03);
    }
  }

  /** Zaregistruje znějící hlas. Při překročení limitu se nejstarší hlas plynule zastaví. */
  addVoice(v: Voice): void {
    this.voices.add(v);
    this.order.push(v);
    while (this.order.length > MAX_VOICES) {
      const oldest = this.order.shift();
      if (oldest && this.voices.has(oldest)) {
        this.voices.delete(oldest);
        oldest.stop();
      }
    }
    audio.voices = this.voices.size;
  }

  removeVoice(v: Voice): void {
    this.voices.delete(v);
    const i = this.order.indexOf(v);
    if (i >= 0) this.order.splice(i, 1);
    audio.voices = this.voices.size;
  }

  /** STOP ALL: master během ~30 ms na nulu, zastavit všechny hlasy, master zpět. */
  stopAll(): void {
    window.dispatchEvent(new CustomEvent('soundlab:stop-all'));
    const ctx = this.ctx;
    const chain = this.chain;
    const all = [...this.voices];
    this.voices.clear();
    this.order = [];
    audio.voices = 0;
    if (!ctx || !chain) return;
    const t = ctx.currentTime;
    const g = chain.master.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    g.setTargetAtTime(0, t, 0.008);
    for (const v of all) v.stop(t + 0.04);
    g.setTargetAtTime(dbToGain(audio.masterDb), t + 0.08, 0.02);
  }
}

export const engine = new AudioEngine();

export interface ToneOptions {
  type?: OscillatorType;
  duration?: number;   // s
  levelDb?: number;    // dBFS před master gainem
}

/** Jednoduchý testovací tón s rampami (bez lupnutí). Pro zkoušku zvuku a ladění. */
export function playTone(hz: number, o: ToneOptions = {}): Voice | null {
  const ctx = engine.ctx;
  const input = engine.input;
  if (!ctx || !input) return null;
  const t = ctx.currentTime;
  const dur = o.duration ?? 1.5;
  const osc = ctx.createOscillator();
  osc.type = o.type ?? 'sine';
  osc.frequency.value = hz;
  const env = ctx.createGain();
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(dbToGain(o.levelDb ?? -6), t + 0.01);
  env.gain.setTargetAtTime(0, t + dur, 0.06);
  osc.connect(env).connect(input);
  osc.start(t);
  osc.stop(t + dur + 0.5);

  let stopped = false;
  const voice: Voice = {
    stop(when = ctx.currentTime) {
      if (stopped) return;
      stopped = true;
      env.gain.cancelScheduledValues(when);
      env.gain.setValueAtTime(env.gain.value, when);
      env.gain.setTargetAtTime(0, when, 0.008);
      osc.stop(when + 0.08);
    }
  };
  osc.onended = () => {
    osc.disconnect();
    env.disconnect();
    engine.removeVoice(voice);
    voice.onEnded?.();
  };
  engine.addVoice(voice);
  return voice;
}
