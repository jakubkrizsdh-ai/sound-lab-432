/**
 * WAV (PCM, little-endian) – bezeztrátový export. Čistý výpočet, testovatelný v Node.
 */

/** Float [-1, 1] → 16bit celé číslo s TPDF ditheringem (seed kvůli testům). */
export function floatTo16(x: number, rnd: () => number): number {
  const d = (rnd() - rnd()) / 32768; // trojúhelníkový dither ±1 LSB
  const v = Math.max(-1, Math.min(1, x + d));
  return v < 0 ? Math.round(v * 32768) : Math.round(v * 32767);
}

/** Sestaví WAV z prokládaných 16bit vzorků (L, R, L, R…). */
export function encodeWav16(chunks: Int16Array[], channels: number, sampleRate: number): Blob {
  const samples = chunks.reduce((a, c) => a + c.length, 0);
  const dataBytes = samples * 2;
  const header = new ArrayBuffer(44);
  const v = new DataView(header);
  const str = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  str(0, 'RIFF');
  v.setUint32(4, 36 + dataBytes, true);
  str(8, 'WAVE');
  str(12, 'fmt ');
  v.setUint32(16, 16, true);            // velikost fmt bloku
  v.setUint16(20, 1, true);             // PCM
  v.setUint16(22, channels, true);
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * channels * 2, true);
  v.setUint16(32, channels * 2, true);
  v.setUint16(34, 16, true);
  str(36, 'data');
  v.setUint32(40, dataBytes, true);
  return new Blob([header, ...chunks.map(c => new Uint8Array(c.buffer, c.byteOffset, c.byteLength))], { type: 'audio/wav' });
}

/** Čtení hlavičky WAV (pro testy a kontrolu exportu). */
export function readWavHeader(buf: ArrayBuffer) {
  const v = new DataView(buf);
  const tag = (o: number) => String.fromCharCode(v.getUint8(o), v.getUint8(o + 1), v.getUint8(o + 2), v.getUint8(o + 3));
  return {
    riff: tag(0), wave: tag(8), fmt: tag(12), data: tag(36),
    format: v.getUint16(20, true), channels: v.getUint16(22, true), sampleRate: v.getUint32(24, true),
    bits: v.getUint16(34, true), dataBytes: v.getUint32(40, true), riffSize: v.getUint32(4, true)
  };
}

export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const mm = String(m % 60).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}
