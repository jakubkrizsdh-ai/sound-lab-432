/** Čísla podle jazyka rozhraní (desetinná čárka v češtině). */
export function num(value: number, locale: string, maxDigits = 3, minDigits = 0): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: maxDigits, minimumFractionDigits: minDigits }).format(value);
}

/** Centy se znaménkem (+5,9 c / −2,0 c). */
export function signedCents(c: number, locale: string): string {
  const v = Math.abs(c) < 0.05 ? 0 : c;
  const sign = v > 0 ? '+' : v < 0 ? '−' : '±';
  return `${sign}${num(Math.abs(v), locale, 1, 1)} c`;
}

/** Hladina v dBFS se skutečným znaménkem minus (−24 dBFS). */
export function dbfs(db: number): string {
  return `${db < 0 ? '−' : ''}${Math.abs(db)} dBFS`;
}
