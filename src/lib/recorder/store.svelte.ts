/**
 * Nahrávání celé relace: zaznamenává výstup aplikace (za limiterem), nezávisle na sekci a nástroji.
 * Přepínání nástrojů ani STOP ALL nahrávání nezastaví – jen tlačítko Stop.
 */
import { engine } from '../audio/engine.svelte';
import { encodeWav16 } from '../audio/wav';
import { deleteRecording, getRecording, listRecordings, putRecording, type RecordingMeta } from './db';
import workletUrl from '../audio/recorder.worklet.ts?worker&url';

export const MAX_SECONDS = 15 * 60; // ochrana paměti telefonu

export const rec = $state({
  state: 'idle' as 'idle' | 'recording' | 'paused' | 'saving',
  seconds: 0,
  /** špičková úroveň posledního bloku 0–1 (Měřeno) */
  peak: 0,
  list: [] as RecordingMeta[],
  lastSaved: null as RecordingMeta | null,
  error: ''
});

let node: AudioWorkletNode | null = null;
let sink: GainNode | null = null;
let chunks: Int16Array[] = [];
let frames = 0;
let sampleRate = 48000;
let finish: ((sr: number) => void) | null = null;
const loaded = new WeakSet<BaseAudioContext>();

async function ensureNode(): Promise<AudioWorkletNode> {
  await engine.start();
  const ctx = engine.ctx!;
  const out = engine.output;
  if (!out) throw new Error('Zvuk není připraven');
  if (node && node.context === ctx) return node;
  if (!loaded.has(ctx)) {
    await ctx.audioWorklet.addModule(workletUrl);
    loaded.add(ctx);
  }
  node = new AudioWorkletNode(ctx, 'soundlab-recorder', { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [2], channelCount: 2, channelCountMode: 'explicit' });
  sink = ctx.createGain();
  sink.gain.value = 0;
  out.connect(node);
  node.connect(sink).connect(ctx.destination);
  node.port.onmessage = (e: MessageEvent<{ pcm?: Int16Array; peak?: number; done?: boolean; sampleRate?: number }>) => {
    const d = e.data;
    if (d.pcm) {
      chunks.push(d.pcm);
      frames += d.pcm.length / 2;
      rec.seconds = frames / sampleRate;
      rec.peak = d.peak ?? 0;
      if (rec.seconds >= MAX_SECONDS && rec.state === 'recording') void stop();
    }
    if (d.done && finish) finish(d.sampleRate ?? sampleRate);
  };
  return node;
}

export async function start() {
  if (rec.state !== 'idle') return;
  rec.error = '';
  try {
    const n = await ensureNode();
    sampleRate = engine.ctx!.sampleRate;
    chunks = [];
    frames = 0;
    rec.seconds = 0;
    rec.peak = 0;
    n.port.postMessage('start');
    rec.state = 'recording';
  } catch (err) {
    rec.error = String(err);
  }
}

export function pause() {
  if (rec.state !== 'recording' || !node) return;
  node.port.postMessage('pause');
  rec.state = 'paused';
}

export function resume() {
  if (rec.state !== 'paused' || !node) return;
  node.port.postMessage('start');
  rec.state = 'recording';
}

function defaultName(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `SOUND LAB ${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}.${p(d.getMinutes())}`;
}

/** Ukončí nahrávání a uloží WAV do zařízení. */
export async function stop(): Promise<RecordingMeta | null> {
  if ((rec.state !== 'recording' && rec.state !== 'paused') || !node) return null;
  rec.state = 'saving';
  const sr = await new Promise<number>((res) => {
    finish = res;
    node!.port.postMessage('stop');
  });
  finish = null;
  if (frames === 0) {
    rec.state = 'idle';
    return null;
  }
  const blob = encodeWav16(chunks, 2, sr);
  const now = new Date();
  const meta: RecordingMeta = {
    id: `r${now.getTime()}`, name: defaultName(now), created: now.getTime(),
    duration: frames / sr, sampleRate: sr, bytes: blob.size
  };
  chunks = [];
  try {
    await putRecording({ ...meta, blob });
  } catch (err) {
    rec.error = String(err);
    // uložení selhalo (málo místa) – nabídnout aspoň okamžité stažení
    download(blob, meta.name);
  }
  rec.state = 'idle';
  rec.seconds = 0;
  rec.peak = 0;
  rec.lastSaved = meta;
  await refresh();
  return meta;
}

export async function refresh() {
  try {
    rec.list = await listRecordings();
  } catch {
    rec.list = [];
  }
}

export async function remove(id: string) {
  await deleteRecording(id);
  await refresh();
}

export async function rename(id: string, name: string) {
  const r = await getRecording(id);
  if (!r) return;
  await putRecording({ ...r, name: name.trim() || r.name });
  await refresh();
}

export async function blobOf(id: string): Promise<Blob | null> {
  return (await getRecording(id))?.blob ?? null;
}

const fileName = (name: string) => `${name.replace(/[\\/:*?"<>|]+/g, '-')}.wav`;

export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName(name);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/** Sdílení souboru (iPhone: Uložit do Souborů, AirDrop, Zprávy…). Vrací false, když to zařízení neumí. */
export async function share(blob: Blob, name: string): Promise<boolean> {
  const file = new File([blob], fileName(name), { type: 'audio/wav' });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (!nav.share || !nav.canShare?.({ files: [file] })) return false;
  try {
    await nav.share({ files: [file], title: name });
  } catch {
    /* uživatel sdílení zrušil */
  }
  return true;
}

export const canShareFiles = () => {
  try {
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    return !!nav.canShare?.({ files: [new File([new Uint8Array(1)], 'x.wav', { type: 'audio/wav' })] });
  } catch {
    return false;
  }
};

if (typeof window !== 'undefined') void refresh();
