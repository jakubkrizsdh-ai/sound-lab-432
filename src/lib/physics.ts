/** Fyzikální výpočty (vrstva „Vypočteno“). */

/** Rychlost zvuku ve vzduchu podle teploty (°C), přibližně: 331,3 · √(1 + T / 273,15) m/s. */
export function speedOfSoundAir(tempC: number): number {
  return 331.3 * Math.sqrt(1 + tempC / 273.15);
}

export const MEDIA = {
  air20: speedOfSoundAir(20),   // ≈ 343,2 m/s
  water: 1480,
  steel: 5900                   // podélná vlna
} as const;

/** Vlnová délka λ = c / f v metrech. */
export function wavelength(hz: number, c = MEDIA.air20): number {
  return c / hz;
}

/** Perioda v milisekundách. */
export function periodMs(hz: number): number {
  return 1000 / hz;
}

/** Frekvence rázů dvou tónů. */
export function beatHz(f1: number, f2: number): number {
  return Math.abs(f1 - f2);
}
