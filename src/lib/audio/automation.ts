/**
 * Pohyb frekvence v čase: sweep, glissando a automatické přechody.
 * Plán je čistá data – stejný plán se naplánuje do AudioParam (živě i offline)
 * a stejnou funkcí freqAt() se spočítá frekvence pro zobrazení.
 */
export type Curve = 'linear' | 'exponential';

/** Úsek: z frekvence `from` na `to` za `dur` s (dur = 0 → okamžitě, pak drží `hold` s). */
export interface Segment {
  from: number;
  to: number;
  dur: number;
  hold: number;
  curve: Curve;
}

export interface Plan {
  segments: Segment[];
  loop: boolean;
}

export interface Step {
  hz: number;
  /** jak dlouho se na tónu zůstane (s) */
  hold: number;
  /** jak dlouho trvá přechod na tento tón (s) */
  glide: number;
}

export function sweepPlan(from: number, to: number, dur: number, curve: Curve = 'exponential', loop = false): Plan {
  return { segments: [{ from, to, dur, hold: 0, curve }], loop };
}

export function glissandoPlan(from: number, to: number, dur: number): Plan {
  return { segments: [{ from, to, dur, hold: 0, curve: 'exponential' }], loop: false };
}

/** Řada tónů: přechod na každý tón trvá `glide`, tón zní `hold`. */
export function stepsPlan(start: number, steps: Step[], loop: boolean): Plan {
  const segments: Segment[] = [];
  let prev = start;
  for (const s of steps) {
    segments.push({ from: prev, to: s.hz, dur: Math.max(0, s.glide), hold: Math.max(0, s.hold), curve: 'exponential' });
    prev = s.hz;
  }
  // smyčka: návrat na začátek je součástí prvního úseku dalšího kola
  if (loop && segments.length) segments[0] = { ...segments[0]!, from: prev };
  return { segments, loop };
}

export function planDuration(p: Plan): number {
  return p.segments.reduce((a, s) => a + s.dur + s.hold, 0);
}

function interp(s: Segment, x: number): number {
  if (s.dur <= 0) return s.to;
  const k = Math.min(1, Math.max(0, x / s.dur));
  return s.curve === 'exponential' ? s.from * (s.to / s.from) ** k : s.from + (s.to - s.from) * k;
}

/** Frekvence v čase t (s od začátku plánu). Před prvním kolem smyčky platí „from“ prvního úseku. */
export function freqAt(p: Plan, t: number): number {
  const total = planDuration(p);
  if (!p.segments.length) return NaN;
  if (t <= 0) return p.segments[0]!.from;
  if (total <= 0) return p.segments.at(-1)!.to;
  if (t >= total) {
    if (!p.loop) return p.segments.at(-1)!.to;
    t %= total;
  }
  let acc = 0;
  for (const s of p.segments) {
    if (t < acc + s.dur) return interp(s, t - acc);
    acc += s.dur;
    if (t < acc + s.hold) return s.to;
    acc += s.hold;
  }
  return p.segments.at(-1)!.to;
}

/**
 * Naplánuje jedno kolo plánu do AudioParam od času `t0`. Vrací čas konce kola.
 * (Smyčku obnovuje volající, aby plán nezabíral paměť donekonečna.)
 */
export function scheduleCycle(param: AudioParam, p: Plan, t0: number): number {
  let t = t0;
  p.segments.forEach((s, i) => {
    if (i === 0) param.setValueAtTime(s.from, t);
    if (s.dur > 0) {
      if (s.curve === 'exponential' && s.from > 0 && s.to > 0) param.exponentialRampToValueAtTime(s.to, t + s.dur);
      else param.linearRampToValueAtTime(s.to, t + s.dur);
    } else {
      param.setValueAtTime(s.to, t);
    }
    t += s.dur;
    if (s.hold > 0) {
      param.setValueAtTime(s.to, t);
      t += s.hold;
    }
  });
  return t;
}
