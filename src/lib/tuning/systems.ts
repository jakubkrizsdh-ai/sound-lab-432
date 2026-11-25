import { cents, format, mul, pow, ratio, toNumber, type Ratio } from './ratio';

/**
 * Ladicí systémy.
 * Oktáva se číslují vědecky: C4 je „střední C“ (256 Hz v presetu z obrázku), A4 je ladicí A.
 * České názvy: B = B♭, H = B natural.
 */
export const CHROMATIC = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'B', 'H'] as const;

export type TuningId = 'image432' | 'pythagorean' | 'just' | 'et432' | 'et440' | 'custom';

export interface Degree {
  name: string;
  /** Přesný poměr k tónice (C) v rámci oktávy – u systémů z poměrů. */
  ratio?: Ratio;
  /** Odstup od tóniky v centech – u rovnoměrně temperovaných systémů. */
  cents?: number;
}

export interface TuningSystem {
  id: TuningId;
  kind: 'ratio' | 'equal';
  degrees: Degree[];
  /** Referenční tón: jeho frekvence určuje celý systém. */
  ref: { degree: string; octave: number; hz: number };
  /** Preset, jehož hodnoty se nesmějí měnit (obrázek). */
  locked?: boolean;
}

/** Odkud frekvence pochází – ukládá se vedle čísla, aby se při exportu nic neztratilo. */
export interface PitchSource {
  tuning: TuningId;
  degree: string;
  octave: number;
  refHz: number;
  refDegree: string;
  /** Přesný poměr k tónice C4, jen u systémů z poměrů. */
  ratio?: string;
}

export interface Pitch {
  hz: number;
  source: PitchSource;
}

const R = ratio;

const IMAGE_DEGREES: Degree[] = [
  { name: 'C', ratio: R(1) },
  { name: 'D', ratio: R(9, 8) },
  { name: 'E', ratio: R(81, 64) },
  { name: 'F#', ratio: R(729, 512) },
  { name: 'G', ratio: R(3, 2) },
  { name: 'A', ratio: R(27, 16) },
  { name: 'H', ratio: R(243, 128) }
];

/** 12 tónů z řetězce čistých kvint (Es–Gis), oktávově zredukováno. */
const PYTHAGOREAN_DEGREES: Degree[] = [
  ['C', 1, 1], ['C#', 2187, 2048], ['D', 9, 8], ['D#', 32, 27], ['E', 81, 64], ['F', 4, 3],
  ['F#', 729, 512], ['G', 3, 2], ['G#', 6561, 4096], ['A', 27, 16], ['B', 16, 9], ['H', 243, 128]
].map(([name, n, d]) => ({ name: name as string, ratio: R(n as number, d as number) }));

/** 12 tónů 5-limitního čistého ladění (běžná volba poměrů). */
const JUST_DEGREES: Degree[] = [
  ['C', 1, 1], ['C#', 16, 15], ['D', 9, 8], ['D#', 6, 5], ['E', 5, 4], ['F', 4, 3],
  ['F#', 45, 32], ['G', 3, 2], ['G#', 8, 5], ['A', 5, 3], ['B', 9, 5], ['H', 15, 8]
].map(([name, n, d]) => ({ name: name as string, ratio: R(n as number, d as number) }));

const ET_DEGREES: Degree[] = CHROMATIC.map((name, i) => ({ name, cents: i * 100 }));

export const PRESETS: Record<Exclude<TuningId, 'custom'>, TuningSystem> = {
  image432: { id: 'image432', kind: 'ratio', degrees: IMAGE_DEGREES, ref: { degree: 'C', octave: 4, hz: 256 }, locked: true },
  pythagorean: { id: 'pythagorean', kind: 'ratio', degrees: PYTHAGOREAN_DEGREES, ref: { degree: 'C', octave: 4, hz: 256 } },
  just: { id: 'just', kind: 'ratio', degrees: JUST_DEGREES, ref: { degree: 'C', octave: 4, hz: 256 } },
  et432: { id: 'et432', kind: 'equal', degrees: ET_DEGREES, ref: { degree: 'A', octave: 4, hz: 432 } },
  et440: { id: 'et440', kind: 'equal', degrees: ET_DEGREES, ref: { degree: 'A', octave: 4, hz: 440 } }
};

export const PRESET_ORDER: Exclude<TuningId, 'custom'>[] = ['image432', 'et432', 'et440', 'pythagorean', 'just'];

/** Kopie systému s jinou referencí (např. pythagorejské od A4 = 440). Zamčený preset nejde změnit. */
export function withReference(sys: TuningSystem, ref: TuningSystem['ref']): TuningSystem {
  if (sys.locked) throw new Error('Preset z obrázku má pevné hodnoty');
  if (!(ref.hz > 0) || !Number.isFinite(ref.hz)) throw new RangeError('Referenční frekvence musí být kladné číslo');
  findDegree(sys, ref.degree);
  return { ...sys, ref: { ...ref } };
}

/** Vlastní stupnice z poměrů (např. „1“, „9/8“, „5/4“…) nebo z centů. */
export function customScale(degrees: Degree[], ref: TuningSystem['ref']): TuningSystem {
  if (degrees.length === 0) throw new RangeError('Stupnice musí mít aspoň jeden tón');
  const kind = degrees.every(d => d.ratio) ? 'ratio' : 'equal';
  return withReference({ id: 'custom', kind, degrees, ref }, ref);
}

function findDegree(sys: TuningSystem, name: string): Degree {
  const d = sys.degrees.find(x => x.name === name);
  if (!d) throw new RangeError(`Tón ${name} v ladění ${sys.id} není`);
  return d;
}

function centsOf(d: Degree): number {
  return d.ratio ? 1200 * Math.log2(toNumber(d.ratio)) : (d.cents ?? 0);
}

function degreeValue(d: Degree): number {
  if (d.ratio) return toNumber(d.ratio);
  return 2 ** ((d.cents ?? 0) / 1200);
}

/** Frekvence tónice C4 daného systému. */
export function tonicHz(sys: TuningSystem): number {
  const refDeg = findDegree(sys, sys.ref.degree);
  return (sys.ref.hz / degreeValue(refDeg)) * 2 ** (4 - sys.ref.octave);
}

/** Frekvence tónu v daném systému a oktávě, včetně zdroje pro uložení. */
export function pitch(sys: TuningSystem, degree: string, octave: number): Pitch {
  const d = findDegree(sys, degree);
  const refDeg = findDegree(sys, sys.ref.degree);
  let hz: number;
  if (d.ratio && refDeg.ratio) {
    // Přesně: reference × (tón / referenční tón) × 2^(rozdíl oktáv), jedno násobení a dělení.
    const r = mul(mul(d.ratio, ratio(refDeg.ratio.d, refDeg.ratio.n)), pow(R(2), octave - sys.ref.octave));
    hz = (sys.ref.hz * r.n) / r.d;
  } else {
    hz = sys.ref.hz * 2 ** ((centsOf(d) - centsOf(refDeg)) / 1200 + octave - sys.ref.octave);
  }
  const source: PitchSource = { tuning: sys.id, degree, octave, refHz: sys.ref.hz, refDegree: sys.ref.degree };
  if (d.ratio) source.ratio = format(mul(d.ratio, pow(R(2), octave - 4)));
  return { hz, source };
}

/** Rozdíl dvou systémů pro tóny, které mají oba. */
export function compare(a: TuningSystem, b: TuningSystem, octave = 4) {
  return a.degrees
    .filter(d => b.degrees.some(x => x.name === d.name))
    .map(d => {
      const fa = pitch(a, d.name, octave).hz;
      const fb = pitch(b, d.name, octave).hz;
      return { degree: d.name, a: fa, b: fb, diffHz: fa - fb, diffCents: cents(fa, fb) };
    });
}

/** Poměr tónu k tónici jako text, pokud existuje. */
export function degreeRatioText(sys: TuningSystem, degree: string): string | undefined {
  const d = findDegree(sys, degree);
  return d.ratio ? format(d.ratio) : undefined;
}
