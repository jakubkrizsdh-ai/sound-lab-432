/** Přesný poměr dvou celých čísel (vždy zkrácený, jmenovatel kladný). */
export interface Ratio {
  readonly n: number;
  readonly d: number;
}

function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a;
}

export function ratio(n: number, d = 1): Ratio {
  if (!Number.isSafeInteger(n) || !Number.isSafeInteger(d) || d === 0) {
    throw new RangeError(`Neplatný poměr ${n}/${d}`);
  }
  const g = gcd(n, d) || 1;
  const s = d < 0 ? -1 : 1;
  return { n: (s * n) / g, d: (s * d) / g };
}

/** Načte zápis „729/512“, „3/2“ nebo „2“. */
export function parseRatio(text: string): Ratio {
  const m = /^\s*(\d+)\s*(?:\/\s*(\d+))?\s*$/.exec(text);
  if (!m) throw new SyntaxError(`Neplatný zápis poměru: ${text}`);
  return ratio(Number(m[1]), m[2] ? Number(m[2]) : 1);
}

export function mul(a: Ratio, b: Ratio): Ratio {
  return ratio(a.n * b.n, a.d * b.d);
}

export function pow(r: Ratio, e: number): Ratio {
  if (!Number.isInteger(e)) throw new RangeError('Mocnina musí být celé číslo');
  const n = r.n ** Math.abs(e);
  const d = r.d ** Math.abs(e);
  return e >= 0 ? ratio(n, d) : ratio(d, n);
}

export function toNumber(r: Ratio): number {
  return r.n / r.d;
}

export function format(r: Ratio): string {
  return r.d === 1 ? `${r.n}` : `${r.n}/${r.d}`;
}

/** Rozdíl dvou frekvencí v centech (1200 centů = oktáva). */
export function cents(f: number, ref: number): number {
  return 1200 * Math.log2(f / ref);
}

/** Posune frekvenci o daný počet centů. */
export function transposeCents(f: number, c: number): number {
  return f * 2 ** (c / 1200);
}
