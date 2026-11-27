/**
 * Zvuk tónů skladby: stejné hlasy jako při živém hraní (handpan, bicí, mísy, klavír…),
 * takže skladba zní stejně živě i v exportu (OfflineAudioContext).
 */
import { dbToGain, type Voice } from '../audio/engine.svelte';
import { strike } from '../handpan/voice';
import { drumHit } from '../drums/synth';
import { congaHit } from '../congas/synth';
import { isCongaPad } from '../congas/kit';
import type { DrumId } from '../drums/kit';
import { INSTRUMENTS, MODAL, sanitizeModal } from '../instruments/defs';
import { fluteNote, modalRub, modalStrike, pianoNote, synthNote } from '../instruments/voices';
import { makeRoomImpulse } from '../handpan/voice';
import type { SongNote, Track, TrackSound } from './model';

/** Zahraje tón v čase `when` (s) s délkou `dur` (s). Vrací hlas, nebo null. */
export function playSongNote(ctx: BaseAudioContext, dest: AudioNode, sound: TrackSound, n: SongNote, when: number, dur: number): Voice | null {
  const v = n.v;
  const id = sound.instrument;
  if (id === 'drums') {
    return n.drum && !isCongaPad(n.drum) ? drumHit(ctx, dest, n.drum as DrumId, sound.kit ?? 'acoustic', v, sound.drumTuning ?? 'natural', when) : null;
  }
  if (id === 'congas') {
    return isCongaPad(n.drum) ? congaHit(ctx, dest, n.drum, sound.congaTuning ?? 'natural', v, when) : null;
  }
  const hz = n.hz;
  if (!hz) return null;
  if (id === 'handpan') return strike(ctx, dest, hz, { velocity: v, decay: sound.decay ?? 6, ding: n.variant === 'ding' }, when);
  const def = INSTRUMENTS[id];
  const scale = sound.decayScale ?? 1;
  const modal = id === 'custom' ? sanitizeModal(sound.custom ?? MODAL.bells) : id in MODAL ? MODAL[id as keyof typeof MODAL] : null;
  if (modal) {
    if (n.variant === 'rub') {
      const vo = modalRub(ctx, dest, hz, modal, v, modal.decay * scale, when);
      vo.release(when + dur);
      return vo;
    }
    return modalStrike(ctx, dest, hz, modal, v, modal.decay * scale, when);
  }
  if (def.sound?.kind === 'piano') {
    const vo = pianoNote(ctx, dest, hz, v, def.sound.decay * scale, def.sound.inharmonicity, when);
    vo.release(when + dur);
    return vo;
  }
  if (def.sound?.kind === 'flute') {
    const vo = fluteNote(ctx, dest, hz, v, sound.release ?? 0.15, when);
    vo.release(when + dur);
    return vo;
  }
  const vo = synthNote(ctx, dest, hz, v, sound.synthPreset ?? 'pad', sound.cutoff ?? 2400, sound.release ?? 0.6, when);
  vo.release(when + dur);
  return vo;
}

export interface TrackBus {
  input: GainNode;
  volume: GainNode;
  panner: StereoPannerNode;
  send: GainNode;
}

/** Sběrnice skladby: každá stopa má hlasitost, panoráma a podíl společného prostoru. */
export class SongMixer {
  readonly reverbIn: GainNode;
  private buses = new Map<string, TrackBus>();
  constructor(private ctx: BaseAudioContext, private dest: AudioNode) {
    this.reverbIn = ctx.createGain();
    const conv = ctx.createConvolver();
    conv.buffer = makeRoomImpulse(ctx, 2.4);
    const wet = ctx.createGain();
    wet.gain.value = 0.9;
    this.reverbIn.connect(conv).connect(wet).connect(dest);
  }

  bus(t: Track): TrackBus {
    let b = this.buses.get(t.id);
    if (!b) {
      const input = this.ctx.createGain();
      const volume = this.ctx.createGain();
      const panner = this.ctx.createStereoPanner();
      const send = this.ctx.createGain();
      input.connect(volume).connect(panner).connect(this.dest);
      panner.connect(send).connect(this.reverbIn);
      b = { input, volume, panner, send };
      this.buses.set(t.id, b);
    }
    this.apply(t, b);
    return b;
  }

  apply(t: Track, b = this.buses.get(t.id)) {
    if (!b) return;
    const now = this.ctx.currentTime;
    b.volume.gain.setTargetAtTime(dbToGain(t.volumeDb), now, 0.02);
    b.panner.pan.setTargetAtTime(t.pan, now, 0.02);
    b.send.gain.setTargetAtTime(t.reverb, now, 0.02);
  }

  disconnect() {
    for (const b of this.buses.values()) b.panner.disconnect();
    this.reverbIn.disconnect();
    this.buses.clear();
  }
}
