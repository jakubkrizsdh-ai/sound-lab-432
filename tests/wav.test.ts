import { describe, expect, it } from 'vitest';
import { encodeWav16, floatTo16, formatDuration, readWavHeader } from '../src/lib/audio/wav';

describe('WAV export', () => {
  it('hlavička 16bit stereo 48 kHz', async () => {
    const pcm = new Int16Array([1, -1, 2, -2, 3, -3]); // 3 snímky stereo
    const blob = encodeWav16([pcm], 2, 48000);
    const buf = await blob.arrayBuffer();
    const h = readWavHeader(buf);
    expect(h).toMatchObject({ riff: 'RIFF', wave: 'WAVE', fmt: 'fmt ', data: 'data', format: 1, channels: 2, sampleRate: 48000, bits: 16, dataBytes: 12, riffSize: 48 });
    expect(buf.byteLength).toBe(56);
    expect(new DataView(buf).getInt16(44 + 2, true)).toBe(-1);
  });
  it('více bloků za sebou', async () => {
    const b = encodeWav16([new Int16Array(4), new Int16Array(6)], 2, 44100);
    expect(readWavHeader(await b.arrayBuffer()).dataBytes).toBe(20);
  });
  it('převod na 16 bitů: plný rozsah, ořez, dither max ±1 LSB', () => {
    const zero = () => 0.5;
    expect(floatTo16(1, zero)).toBe(32767);
    expect(floatTo16(-1, zero)).toBe(-32768);
    expect(floatTo16(2, zero)).toBe(32767);
    let s = 1;
    const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
    for (let i = 0; i < 1000; i++) expect(Math.abs(floatTo16(0.25, rnd) - 8192)).toBeLessThanOrEqual(1);
  });
  it('formát délky', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(75.9)).toBe('1:15');
    expect(formatDuration(3725)).toBe('1:02:05');
  });
});
