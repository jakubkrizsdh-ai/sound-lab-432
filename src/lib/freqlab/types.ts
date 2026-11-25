import type { PitchSource } from '../tuning/systems';
import type { Wave } from '../audio/waves';

/** Nastavení jednoho generátoru – čistá data, půjdou uložit do projektu (M5). */
export interface GeneratorSettings {
  id: string;
  wave: Wave;
  /** frekvence v Hz (float64) */
  freq: number;
  /** odkud frekvence pochází, pokud byla vybrána z ladění */
  pitch?: PitchSource;
  /** amplituda průběhu 0–1 (lineárně) */
  amp: number;
  /** hlasitost kanálu v dB (fader), 0 = beze změny */
  volumeDb: number;
  /** počáteční fáze ve stupních (význam má při společném spuštění) */
  phaseDeg: number;
  /** panoráma −1 (vlevo) … +1 (vpravo) */
  pan: number;
  attackMs: number;
  releaseMs: number;
  /** amplitudy harmonických pro aditivní syntézu (1. = základ) */
  harmonics: number[];
  mute: boolean;
  solo: boolean;
}

export const LIMITS = {
  freqMin: 1,
  freqMax: 20000,
  attackMin: 5,
  releaseMin: 5,
  maxGenerators: 16
} as const;

export function defaultGenerator(id: string, freq = 432): GeneratorSettings {
  return {
    id, wave: 'sine', freq, amp: 0.5, volumeDb: 0, phaseDeg: 0, pan: 0,
    attackMs: 20, releaseMs: 120, harmonics: [1], mute: false, solo: false
  };
}
