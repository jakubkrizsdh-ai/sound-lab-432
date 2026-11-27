import { describe, expect, it } from 'vitest';
import { CONGA_PADS, CONGA_TUNING, CONGA_CODES, isCongaPad, padDrum, padStroke, zoneStroke, ZONE_BASS, ZONE_OPEN } from '../src/lib/congas/kit';
import { sanitizeSong, emptySong } from '../src/lib/song/model';

describe('conga set', () => {
  it('3 bubny × 4 údery, každý má výchozí klávesu, klávesy se neopakují', () => {
    expect(CONGA_PADS).toHaveLength(12);
    const codes = CONGA_PADS.map(p => CONGA_CODES[p]);
    expect(codes.every(Boolean)).toBe(true);
    expect(new Set(codes).size).toBe(12);
  });

  it('ladění v tónech obrázku = přesné poměry k C = 256 Hz', () => {
    expect(CONGA_TUNING.image.tumba).toBe(256 * 27 / 32); // A3
    expect(CONGA_TUNING.image.conga).toBe(256 * 9 / 8);   // D4
    expect(CONGA_TUNING.image.quinto).toBe(256 * 3 / 2);  // G4
    // čisté kvinty
    expect(CONGA_TUNING.image.conga / CONGA_TUNING.image.tumba).toBeCloseTo(4 / 3, 12);
    expect(CONGA_TUNING.image.quinto / CONGA_TUNING.image.conga).toBeCloseTo(4 / 3, 12);
  });

  it('zóny hlavy: střed bas, kruh otevřený, okraj slap', () => {
    expect(zoneStroke(0)).toBe('bass');
    expect(zoneStroke(ZONE_BASS - 0.01)).toBe('bass');
    expect(zoneStroke(ZONE_BASS + 0.01)).toBe('open');
    expect(zoneStroke(ZONE_OPEN + 0.01)).toBe('slap');
    expect(zoneStroke(0.999)).toBe('slap');
  });

  it('rozklad id úderu', () => {
    expect(padDrum('tumba.open')).toBe('tumba');
    expect(padStroke('quinto.slap')).toBe('slap');
    expect(isCongaPad('conga.bass')).toBe(true);
    expect(isCongaPad('kick')).toBe(false);
  });

  it('skladba s conga stopou projde načtením JSON beze ztráty', () => {
    const s = emptySong();
    s.tracks.push({ id: 't1', name: 'Conga', sound: { instrument: 'congas', congaTuning: 'image' }, volumeDb: 0, pan: 0, reverb: 0.12, mute: false, solo: false,
      clips: [{ id: 'c1', start: 0, len: 4, repeat: 2, notes: [{ id: 'n1', t: 0, d: 0.25, v: 0.8, drum: 'tumba.open' }] }] });
    const back = sanitizeSong(JSON.parse(JSON.stringify(s)));
    expect(back?.tracks[0]?.sound.congaTuning).toBe('image');
    expect(back?.tracks[0]?.clips[0]?.notes[0]?.drum).toBe('tumba.open');
  });
});
