import { cs, type MessageKey } from './cs';
import { en } from './en';

export type Locale = 'cs' | 'en';
export const LOCALES: { id: Locale; label: string }[] = [
  { id: 'cs', label: 'Čeština' },
  { id: 'en', label: 'English' }
];

const dictionaries: Record<Locale, Record<MessageKey, string>> = { cs, en };
const STORAGE_KEY = 'soundlab.locale';

function initialLocale(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'cs' || saved === 'en') return saved;
  } catch {
    /* úložiště nemusí být dostupné */
  }
  return 'cs';
}

export const i18n = $state({ locale: initialLocale() });

export function setLocale(locale: Locale): void {
  i18n.locale = locale;
  document.documentElement.lang = locale;
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    /* ignorovat */
  }
}

/** Přeloží klíč do aktuálního jazyka. */
export function t(key: MessageKey): string {
  return dictionaries[i18n.locale][key] ?? cs[key];
}

/** Položky seznamu uložené v jednom klíči, oddělené znakem |. */
export function tl(key: MessageKey): string[] {
  return t(key).split('|');
}

export { dictionaries };
