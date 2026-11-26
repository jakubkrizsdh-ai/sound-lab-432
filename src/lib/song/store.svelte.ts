/**
 * Stav skladby a úpravy (s historií Zpět / Znovu). Ukládá se automaticky v zařízení.
 */
import { BEATS_PER_BAR, emptySong, sanitizeSong, snap, quantize, uid, type Clip, type Song, type SongNote, type Track, type TrackSound } from './model';
import type { InstrumentId } from '../instruments/defs';

const KEY = 'soundlab.song';
const HISTORY = 60;

function load(): Song {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return sanitizeSong(JSON.parse(raw));
  } catch {
    /* ignorovat */
  }
  return emptySong();
}

export const song = $state<{ s: Song; rev: number; canUndo: boolean; canRedo: boolean }>({ s: load(), rev: 0, canUndo: false, canRedo: false });

const undoStack: string[] = [];
const redoStack: string[] = [];
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function persist() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify($state.snapshot(song.s)));
    } catch {
      /* plné úložiště – skladbu lze exportovat do JSON */
    }
  }, 300);
}

function touched() {
  song.rev++;
  song.canUndo = undoStack.length > 0;
  song.canRedo = redoStack.length > 0;
  persist();
}

/** Změna skladby s uložením do historie. */
export function edit(fn: (s: Song) => void, record = true) {
  if (record) {
    undoStack.push(JSON.stringify($state.snapshot(song.s)));
    if (undoStack.length > HISTORY) undoStack.shift();
    redoStack.length = 0;
  }
  fn(song.s);
  touched();
}

export function undo() {
  const prev = undoStack.pop();
  if (!prev) return;
  redoStack.push(JSON.stringify($state.snapshot(song.s)));
  song.s = JSON.parse(prev) as Song;
  touched();
}

export function redo() {
  const next = redoStack.pop();
  if (!next) return;
  undoStack.push(JSON.stringify($state.snapshot(song.s)));
  song.s = JSON.parse(next) as Song;
  touched();
}

// --- hledání ---
export const findTrack = (id: string) => song.s.tracks.find(t => t.id === id);
export function findClip(id: string): { track: Track; clip: Clip } | null {
  for (const track of song.s.tracks) {
    const clip = track.clips.find(c => c.id === id);
    if (clip) return { track, clip };
  }
  return null;
}

// --- stopy ---
export function addTrack(sound: TrackSound, name: string): Track {
  const t: Track = { id: uid('t'), name, sound, volumeDb: 0, pan: 0, reverb: sound.instrument === 'drums' ? 0.08 : 0.2, mute: false, solo: false, clips: [] };
  edit(s => { s.tracks.push(t); });
  return findTrack(t.id)!;
}

export function setTrack(id: string, patch: Partial<Track>, record = true) {
  edit(s => {
    const t = s.tracks.find(x => x.id === id);
    if (t) Object.assign(t, patch);
  }, record);
}

export function removeTrack(id: string) {
  edit(s => { s.tracks = s.tracks.filter(t => t.id !== id); });
}

export function trackFor(instrument: InstrumentId): Track | undefined {
  return song.s.tracks.find(t => t.sound.instrument === instrument);
}

// --- bloky ---
export function addClip(trackId: string, startBeat: number, lenBeats = BEATS_PER_BAR * 2, notes: SongNote[] = []): Clip | null {
  const c: Clip = { id: uid('c'), start: Math.max(0, startBeat), len: lenBeats, repeat: 1, notes };
  let ok = false;
  edit(s => {
    const t = s.tracks.find(x => x.id === trackId);
    if (t) { t.clips.push(c); ok = true; }
  });
  return ok ? c : null;
}

export function setClip(id: string, patch: Partial<Clip>, record = true) {
  edit(s => {
    for (const t of s.tracks) {
      const c = t.clips.find(x => x.id === id);
      if (c) Object.assign(c, patch);
    }
  }, record);
}

export function moveClip(id: string, start: number, toTrack?: string) {
  edit(s => {
    for (const t of s.tracks) {
      const i = t.clips.findIndex(x => x.id === id);
      if (i < 0) continue;
      const c = t.clips[i]!;
      c.start = Math.max(0, snap(start, 1));
      if (toTrack && toTrack !== t.id) {
        const dst = s.tracks.find(x => x.id === toTrack);
        // přesun jen mezi stopami se stejným nástrojem (zvuk tónů musí sedět)
        if (dst && dst.sound.instrument === t.sound.instrument) {
          t.clips.splice(i, 1);
          dst.clips.push(c);
        }
      }
      return;
    }
  });
}

export function duplicateClip(id: string) {
  const f = findClip(id);
  if (!f) return;
  const end = f.clip.start + f.clip.len * f.clip.repeat;
  const copy: Clip = { ...JSON.parse(JSON.stringify($state.snapshot(f.clip))) as Clip, id: uid('c'), start: end };
  copy.notes = copy.notes.map(n => ({ ...n, id: uid('n') }));
  edit(s => { s.tracks.find(t => t.id === f.track.id)?.clips.push(copy); });
}

export function deleteClip(id: string) {
  edit(s => { for (const t of s.tracks) t.clips = t.clips.filter(c => c.id !== id); });
}

// --- tóny ---
function withClip(id: string, fn: (c: Clip) => void, record = true) {
  edit(s => {
    for (const t of s.tracks) {
      const c = t.clips.find(x => x.id === id);
      if (c) { fn(c); return; }
    }
  }, record);
}

export function addNote(clipId: string, n: Omit<SongNote, 'id'>): string {
  const id = uid('n');
  withClip(clipId, c => { c.notes.push({ ...n, id }); });
  return id;
}

export function updateNote(clipId: string, noteId: string, patch: Partial<SongNote>, record = true) {
  withClip(clipId, c => {
    const n = c.notes.find(x => x.id === noteId);
    if (n) {
      Object.assign(n, patch);
      // tóny bez frekvence nebo bubnu nepřipustit
      if (patch.hz !== undefined) delete n.drum;
    }
  }, record);
}

export function deleteNote(clipId: string, noteId: string) {
  withClip(clipId, c => { c.notes = c.notes.filter(n => n.id !== noteId); });
}

export function quantizeClip(clipId: string, grid: number, strength = 1) {
  withClip(clipId, c => {
    for (const n of c.notes) n.t = Math.max(0, quantize(n.t, grid, strength));
  });
}

/** Začátek úprav tahem: jeden záznam do historie, další změny během tahu už ne. */
export function beginDrag() {
  undoStack.push(JSON.stringify($state.snapshot(song.s)));
  if (undoStack.length > HISTORY) undoStack.shift();
  redoStack.length = 0;
}

// --- skladba ---
export function setSong(patch: Partial<Song>) {
  edit(s => Object.assign(s, patch));
}

export function newSong() {
  edit(s => Object.assign(s, emptySong()));
}

export function importSong(json: string): boolean {
  try {
    const parsed = sanitizeSong(JSON.parse(json));
    edit(s => Object.assign(s, parsed));
    return true;
  } catch {
    return false;
  }
}

export function exportSongJson(): Blob {
  return new Blob([JSON.stringify({ app: 'SOUND LAB 432', ...$state.snapshot(song.s) }, null, 1)], { type: 'application/json' });
}
