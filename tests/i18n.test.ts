import { describe, expect, it } from 'vitest';
import { cs } from '../src/lib/i18n/cs';
import { en } from '../src/lib/i18n/en';
import { SECTIONS, sectionFromHash } from '../src/lib/nav';

describe('překlady', () => {
  it('čeština i angličtina mají stejné klíče', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(cs).sort());
  });

  it('žádný překlad není prázdný', () => {
    for (const dict of [cs, en]) {
      for (const [k, v] of Object.entries(dict)) expect(v.trim(), k).not.toBe('');
    }
  });

  it('seznamy položek mají v obou jazycích stejný počet položek', () => {
    for (const k of Object.keys(cs) as (keyof typeof cs)[]) {
      if (k.endsWith('.items')) expect(en[k].split('|').length, k).toBe(cs[k].split('|').length);
    }
  });
});

describe('navigace', () => {
  it('má přesně 8 sekcí v pořadí ze zadání', () => {
    expect(SECTIONS.map(s => s.id)).toEqual([
      'instruments', 'freqlab', 'analyzer', 'experiments', 'studio', 'meditation', 'library', 'settings'
    ]);
  });

  it('každá sekce kromě nastavení má úvod a seznam plánovaných funkcí', () => {
    for (const s of SECTIONS.filter(s => s.id !== 'settings')) {
      expect(cs).toHaveProperty(`${s.id}.intro`);
      expect(cs).toHaveProperty(`${s.id}.items`);
    }
  });

  it('na telefonu se do spodní lišty vejdou nejvýš 4 sekce + Více', () => {
    expect(SECTIONS.filter(s => s.primary).length).toBeLessThanOrEqual(4);
  });

  it('adresa #/... vybere sekci, neznámá adresa vede na Nástroje', () => {
    expect(sectionFromHash('#/studio')).toBe('studio');
    expect(sectionFromHash('#studio')).toBe('studio');
    expect(sectionFromHash('#/nic')).toBe('instruments');
    expect(sectionFromHash('')).toBe('instruments');
  });
});
