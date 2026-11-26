/**
 * Události hraní z nástrojů (bez závislostí na studiu). Studio je poslouchá a nahrává do stop.
 * Hraje-li nástroj sám (sekvencer bicích, přehrávání skladby), událost se nevysílá.
 */
import type { PitchSource } from '../tuning/systems';
import type { DrumId } from '../drums/kit';
import type { TrackSound } from './model';

export interface PlayEvent {
  kind: 'on' | 'off';
  /** identita tónu na ploše nástroje (pro spárování začátku a konce) */
  key: string;
  sound: TrackSound;
  hz?: number;
  src?: PitchSource;
  drum?: DrumId;
  variant?: 'ding' | 'rub';
  velocity: number;
}

type Listener = (e: PlayEvent) => void;
const listeners = new Set<Listener>();

export function onPlay(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function emitPlay(e: PlayEvent): void {
  for (const l of listeners) l(e);
}
