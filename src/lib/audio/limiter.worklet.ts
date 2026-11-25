/// Master limiter jako AudioWorklet. Výpočet je v limiter-dsp.ts (testovaný v Node).
import { LimiterDSP } from './limiter-dsp';

declare const sampleRate: number;
declare function registerProcessor(name: string, ctor: unknown): void;
declare class AudioWorkletProcessor {
  readonly port: MessagePort;
  constructor(options?: unknown);
}

const REPORT_EVERY = 32; // bloků po 128 vzorcích ≈ 85 ms při 48 kHz

class SoundLabLimiter extends AudioWorkletProcessor {
  private dsp = new LimiterDSP({ sampleRate });
  private blocks = 0;

  constructor(options?: unknown) {
    super(options);
    this.port.onmessage = (e: MessageEvent) => {
      if (e.data === 'reset') this.dsp.reset();
    };
  }

  process(inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
    const input = inputs[0];
    const output = outputs[0];
    if (!output || output.length === 0) return true;
    const outL = output[0]!;
    const outR = output[1];
    if (!input || input.length === 0) {
      outL.fill(0);
      outR?.fill(0);
    } else {
      outL.set(input[0]!);
      if (outR) outR.set(input[1] ?? input[0]!);
    }
    this.dsp.process(outL, outR);
    if (++this.blocks >= REPORT_EVERY) {
      this.blocks = 0;
      this.port.postMessage(this.dsp.maxReductionDb);
      this.dsp.maxReductionDb = 0;
    }
    return true;
  }
}

registerProcessor('soundlab-limiter', SoundLabLimiter);
