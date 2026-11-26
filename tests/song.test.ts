import { describe, expect, it } from 'vitest';
import { beatsToSec, emptySong, eventsBetween, expand, loopRange, quantize, sanitizeSong, songBeats, type Song } from '../src/lib/song/model';

function demo(): Song {
  const s = emptySong();
  s.bpm = 120;
  s.tracks = [
    { id: 't1', name: 'Handpan', sound: { instrument: 'handpan' }, volumeDb: 0, pan: 0, reverb: 0.2, mute: false, solo: false,
      clips: [{ id: 'c1', start: 0, len: 4, repeat: 3, notes: [
        { id: 'n1', t: 0, d: 1, v: 0.8, hz: 364.5, src: { tuning: 'pythagorean', degree: 'F#', octave: 4, refHz: 256, refDegree: 'C', ratio: '729/512' } },
        { id: 'n2', t: 2.5, d: 0.5, v: 0.6, hz: 256 },
        { id: 'n3', t: 4.5, d: 0.5, v: 0.6, hz: 128 } // mimo délku bloku → nehraje
      ] }] },
    { id: 't2', name: 'Bicí', sound: { instrument: 'drums' }, volumeDb: 0, pan: 0, reverb: 0, mute: false, solo: false,
      clips: [{ id: 'c2', start: 4, len: 4, repeat: 1, notes: [{ id: 'd1', t: 0, d: 0.25, v: 1, drum: 'kick' }] }] }
  ];
  return s;
}

describe('skladba', () => {
  it('opakování bloku rozvine tóny za sebou, tóny za koncem bloku nehrají', () => {
    const ev = expand(demo());
    const hp = ev.filter(e => e.track.id === 't1').map(e => e.at);
    expect(hp).toEqual([0, 2.5, 4, 6.5, 8, 10.5]);
  });
  it('tóny jsou seřazené podle času napříč stopami', () => {
    const at = expand(demo()).map(e => e.at);
    expect(at).toEqual([...at].sort((a, b) => a - b));
  });
  it('délka skladby = konec posledního bloku na celé takty', () => {
    expect(songBeats(demo())).toBe(12);
    expect(songBeats(emptySong())).toBe(4);
  });
  it('mute a solo', () => {
    const s = demo();
    s.tracks[1]!.solo = true;
    expect(expand(s).every(e => e.track.id === 't2')).toBe(true);
    s.tracks[1]!.solo = false;
    s.tracks[1]!.mute = true;
    expect(expand(s).some(e => e.track.id === 't2')).toBe(false);
  });
  it('okno pro plánovač [od, do)', () => {
    const ev = expand(demo());
    expect(eventsBetween(ev, 4, 6.5).map(e => e.at)).toEqual([4, 4]);
  });
  it('smyčka: celá skladba, nebo zvolené takty', () => {
    const s = demo();
    expect(loopRange(s)).toEqual([0, 12]);
    s.loop = { on: true, from: 1, to: 2 };
    expect(loopRange(s)).toEqual([4, 8]);
  });
  it('kvantizace na šestnáctiny, i s poloviční silou', () => {
    expect(quantize(1.1, 0.25)).toBe(1);
    expect(quantize(1.1, 0.25, 0.5)).toBeCloseTo(1.05, 9);
  });
  it('převod dob na sekundy', () => {
    expect(beatsToSec(4, 120)).toBe(2);
  });
  it('JSON tam a zpět zachová přesné Hz i zdroj', () => {
    const s = demo();
    const back = sanitizeSong(JSON.parse(JSON.stringify(s)));
    const n = back.tracks[0]!.clips[0]!.notes[0]!;
    expect(n.hz).toBe(364.5);
    expect(n.src?.ratio).toBe('729/512');
    expect(back.tracks[1]!.clips[0]!.notes[0]!.drum).toBe('kick');
  });
  it('poškozený soubor se opraví místo pádu', () => {
    const s = sanitizeSong({ bpm: 'x', tracks: [{ clips: [{ repeat: 9999, notes: [{ t: -5, hz: -1 }, { hz: 440, v: 7 }] }] }] });
    expect(s.bpm).toBe(90);
    expect(s.tracks[0]!.clips[0]!.repeat).toBe(256);
    expect(s.tracks[0]!.clips[0]!.notes).toHaveLength(1);
    expect(s.tracks[0]!.clips[0]!.notes[0]!.v).toBe(1);
    expect(sanitizeSong(null).tracks).toEqual([]);
  });
});
