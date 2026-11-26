/// Záznam výstupu aplikace: stereo → 16bit prokládané vzorky s ditheringem, po blocích do hlavního vlákna.
import { floatTo16 } from './wav';

declare const sampleRate: number;
declare function registerProcessor(name: string, ctor: unknown): void;
declare class AudioWorkletProcessor {
  readonly port: MessagePort;
  constructor(options?: unknown);
}

const FRAMES = 8192; // ≈ 0,17 s při 48 kHz na jednu zprávu

class SoundLabRecorder extends AudioWorkletProcessor {
  private buf = new Int16Array(FRAMES * 2);
  private n = 0;
  private recording = false;
  private peak = 0;
  private seed = 22222;
  private rnd = () => {
    this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
    return this.seed / 4294967296;
  };

  constructor(o?: unknown) {
    super(o);
    this.port.onmessage = (e: MessageEvent<string>) => {
      if (e.data === 'start') this.recording = true;
      else if (e.data === 'pause') { this.recording = false; this.flush(); }
      else if (e.data === 'stop') { this.recording = false; this.flush(); this.port.postMessage({ done: true, sampleRate }); }
    };
  }

  private flush() {
    if (this.n === 0) return;
    const out = this.buf.slice(0, this.n * 2);
    this.port.postMessage({ pcm: out, peak: this.peak }, [out.buffer]);
    this.n = 0;
    this.peak = 0;
  }

  process(inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
    const input = inputs[0];
    if (this.recording && input && input.length) {
      const l = input[0]!;
      const r = input[1] ?? l;
      for (let i = 0; i < l.length; i++) {
        const a = l[i]!, b = r[i]!;
        const p = Math.max(Math.abs(a), Math.abs(b));
        if (p > this.peak) this.peak = p;
        this.buf[this.n * 2] = floatTo16(a, this.rnd);
        this.buf[this.n * 2 + 1] = floatTo16(b, this.rnd);
        if (++this.n === FRAMES) this.flush();
      }
    }
    // výstup ticho (uzel musí být připojený, aby ho prohlížeč zpracovával)
    const o = outputs[0];
    if (o) for (const ch of o) ch.fill(0);
    return true;
  }
}

registerProcessor('soundlab-recorder', SoundLabRecorder);
