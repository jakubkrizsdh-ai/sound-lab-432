import type { MessageKey } from './i18n/cs';

export type SectionId =
  | 'instruments' | 'freqlab' | 'analyzer' | 'experiments'
  | 'studio' | 'meditation' | 'library' | 'settings';

export interface Section {
  id: SectionId;
  label: MessageKey;
  short: MessageKey;
  /** Ikona: cesta SVG v rámečku 24×24, kreslená tahem. */
  icon: string;
  /** Na telefonu ve spodní liště (ostatní v nabídce Více). */
  primary: boolean;
  /** Milník, ve kterém sekce ožije. */
  milestone: string;
}

export const SECTIONS: Section[] = [
  { id: 'instruments', label: 'nav.instruments', short: 'nav.short.instruments', primary: true, milestone: 'M4',
    icon: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18M12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6' },
  { id: 'freqlab', label: 'nav.freqlab', short: 'nav.short.freqlab', primary: true, milestone: 'M2',
    icon: 'M2 12c2-6 4-6 6 0s4 6 6 0 4-6 6 0' },
  { id: 'analyzer', label: 'nav.analyzer', short: 'nav.short.analyzer', primary: true, milestone: 'M3, M8',
    icon: 'M4 20V10M9 20V4M14 20V13M19 20V7' },
  { id: 'experiments', label: 'nav.experiments', short: 'nav.short.experiments', primary: false, milestone: 'M7',
    icon: 'M9 3h6M10 3v6l-5 10h14l-5-10V3' },
  { id: 'studio', label: 'nav.studio', short: 'nav.short.studio', primary: true, milestone: 'M6, M9',
    icon: 'M12 6a6 6 0 1 0 0 12a6 6 0 1 0 0-12' },
  { id: 'meditation', label: 'nav.meditation', short: 'nav.short.meditation', primary: false, milestone: 'M10',
    icon: 'M12 4c3 3 3 7 0 10c-3-3-3-7 0-10M4 14c4 0 6 2 8 6c2-4 4-6 8-6' },
  { id: 'library', label: 'nav.library', short: 'nav.short.library', primary: false, milestone: 'M5',
    icon: 'M4 5h6l2 2h8v12H4z' },
  { id: 'settings', label: 'nav.settings', short: 'nav.short.settings', primary: false, milestone: 'M0',
    icon: 'M12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2' }
];

export function sectionFromHash(hash: string): SectionId {
  const id = hash.replace(/^#\/?/, '');
  return (SECTIONS.find(s => s.id === id)?.id) ?? 'instruments';
}
