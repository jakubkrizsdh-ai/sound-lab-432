/**
 * Přiřazení kláves počítače k tónům a bubnům. Výchozí rozložení dává nástroj,
 * uživatel může libovolnou klávesu změnit (uloží se v zařízení).
 */
import { defaultLabel } from './layouts';

const KEY = 'soundlab.keys';

function load(): Record<string, Record<string, string>> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, Record<string, string>>;
  } catch {
    return {};
  }
}

export const keys = $state({
  /** nástroj → slot → kód klávesy (jen změny proti výchozímu) */
  overrides: load(),
  /** popisky podle skutečné klávesnice (Chrome/Edge), jinak prázdné */
  layout: {} as Record<string, string>
});

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify($state.snapshot(keys.overrides)));
  } catch {
    /* ignorovat */
  }
}

/** Výsledné přiřazení: výchozí + změny. Jedna klávesa jen jednomu slotu. */
export function resolve(instrument: string, defaults: Record<string, string>): { bySlot: Record<string, string>; byCode: Record<string, string> } {
  const ov = keys.overrides[instrument] ?? {};
  const bySlot: Record<string, string> = { ...defaults, ...ov };
  // klávesa přiřazená ručně jinam se z výchozího slotu odebere
  const taken = new Set(Object.values(ov));
  for (const [slot, code] of Object.entries(defaults)) if (!(slot in ov) && taken.has(code)) bySlot[slot] = '';
  const byCode: Record<string, string> = {};
  for (const [slot, code] of Object.entries(bySlot)) if (code) byCode[code] = slot;
  return { bySlot, byCode };
}

export function bind(instrument: string, defaults: Record<string, string>, slot: string, code: string) {
  const cur = resolve(instrument, defaults).bySlot;
  const ov = { ...(keys.overrides[instrument] ?? {}) };
  // prohození: slot, který klávesu měl, dostane původní klávesu tohoto slotu
  const other = Object.entries(cur).find(([s, c]) => c === code && s !== slot)?.[0];
  if (other) ov[other] = cur[slot] ?? '';
  ov[slot] = code;
  keys.overrides = { ...keys.overrides, [instrument]: ov };
  save();
}

export function resetBindings(instrument: string) {
  const { [instrument]: _x, ...rest } = keys.overrides;
  keys.overrides = rest;
  save();
}

export function keyLabel(code: string | undefined): string {
  if (!code) return '';
  const l = keys.layout[code];
  return l ? (l === ' ' ? '␣' : l.toUpperCase()) : defaultLabel(code);
}

/** Zjistí skutečné rozložení klávesnice (např. české: + ě š č…). */
export async function loadLayout() {
  const kb = (navigator as Navigator & { keyboard?: { getLayoutMap?: () => Promise<Map<string, string>> } }).keyboard;
  if (!kb?.getLayoutMap) return;
  try {
    const m = await kb.getLayoutMap();
    const o: Record<string, string> = {};
    m.forEach((v, k) => (o[k] = v));
    keys.layout = o;
  } catch {
    /* nepodporováno */
  }
}

/** Klávesy, které nástroj nesmí převzít (STOP ALL apod.). */
export const RESERVED = new Set(['Escape', 'Tab', 'Enter', 'ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight', 'AltLeft', 'AltRight', 'MetaLeft', 'MetaRight', 'CapsLock']);

if (typeof window !== 'undefined') void loadLayout();
