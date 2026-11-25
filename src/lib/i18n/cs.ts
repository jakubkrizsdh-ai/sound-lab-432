// Čeština – výchozí jazyk rozhraní.
// Každý klíč musí existovat i v en.ts (hlídá test tests/i18n.test.ts).
export const cs = {
  'app.name': 'SOUND LAB 432',
  'app.tagline': 'Interaktivní zvuková laboratoř',

  'nav.label': 'Hlavní navigace',
  'nav.more': 'Více',
  'nav.instruments': 'Nástroje',
  'nav.freqlab': 'Frekvenční laboratoř',
  'nav.analyzer': 'Analyzátor vln',
  'nav.experiments': 'Experimenty',
  'nav.studio': 'Nahrávací studio',
  'nav.meditation': 'Meditace',
  'nav.library': 'Knihovna projektů',
  'nav.settings': 'Nastavení',
  'nav.short.instruments': 'Nástroje',
  'nav.short.freqlab': 'Frekvence',
  'nav.short.analyzer': 'Analýza',
  'nav.short.experiments': 'Pokusy',
  'nav.short.studio': 'Studio',
  'nav.short.meditation': 'Meditace',
  'nav.short.library': 'Projekty',
  'nav.short.settings': 'Nastavení',

  'top.tuning': 'Pythagorejské · C = 256 Hz · A = 432 Hz',
  'top.master': 'Master',
  'top.stopAll': 'STOP ALL',
  'top.stopAllAria': 'Zastavit všechny zvuky (Esc)',
  'top.audioPending': 'Zvukové jádro přijde v milníku M1',

  'section.planned': 'Plánováno',
  'section.milestone': 'Milník',

  'instruments.intro': 'Hratelné nástroje. Prvním je handpan s modální syntézou a přesnými frekvencemi.',
  'instruments.items': 'Handpan (8 + Ding, 9 + Ding, spodní pole)|Stupnice z obrázku 432 a D Kurd|Tibetské a křišťálové mísy, gong, kalimba|Klavír, flétna, syntezátor, zvonky|Vlastní nástroj',
  'freqlab.intro': 'Generátory tónů a šumů s přesným zadáním frekvence.',
  'freqlab.items': 'Sinus, trojúhelník, obdélník, pila, aditivní syntéza|Bílý, růžový a hnědý šum|Frekvence, amplituda, fáze, panoráma, náběh, dozvuk|Více generátorů současně, mute, solo, záznam|Sweep, glissando, automatické přechody',
  'analyzer.intro': 'Měření skutečného signálu v reálném čase.',
  'analyzer.items': 'Osciloskop a FFT spektrum|Spektrogram v čase|Základní frekvence a harmonické|Peak a RMS v dBFS|Import audia a mikrofon',
  'experiments.intro': 'Pokusy s interferencí, rázy, intervaly a laděním.',
  'experiments.items': 'Konstruktivní a destruktivní interference|Rázy a binaurální rázy|Porovnání ladicích systémů|Drone a pulzování|Lissajousovy obrazce, model cymatiky',
  'studio.intro': 'Nahrávání, časová osa, mix a export.',
  'studio.items': 'Záznam událostí s přesnými Hz|Bezeztrátový záznam zvuku|Stopy, mix, mute a solo|Metronom a smyčky|Export WAV a JSON',
  'meditation.intro': 'Volitelná symbolická vrstva sedmi čaker a meditační sekvence.',
  'meditation.items': 'Mapa čaker z obrázku a další tradice|Přehrávání a kombinace čaker|Sekvence s délkou a přechody|Osobní poznámky k prožitku',
  'meditation.disclaimer': 'Přiřazení frekvencí čakrám je symbolické. Nejde o vědecky prokázaný léčebný účinek.',
  'library.intro': 'Projekty, presety ladění, vlastní nástroje a experimenty.',
  'library.items': 'Automatické lokální ukládání|Obnova po zavření aplikace|Import a export projektu|Presety ladění a nástrojů',

  'settings.intro': 'Jazyk, zvuk a informace o aplikaci.',
  'settings.language': 'Jazyk rozhraní',
  'settings.offline': 'Offline režim',
  'settings.offlineReady': 'Aplikace je uložená a funguje bez připojení.',
  'settings.offlinePending': 'Ukládám aplikaci pro offline použití…',
  'settings.install': 'Instalace',
  'settings.installHint': 'Na iPhonu: Sdílet → Přidat na plochu. Na Windows: ikona instalace v adresním řádku Edge nebo Chrome.',
  'settings.safety': 'Bezpečnost sluchu',
  'settings.safetyText': 'Aplikace začíná na nízké hlasitosti (−24 dBFS). Dlouhý poslech čistých tónů ve sluchátkách a vysoké frekvence unavují sluch rychleji. Reproduktory telefonu pod ~300 Hz téměř nehrají. Úroveň v dBFS je digitální, nejde o hlasitost v místnosti (dB SPL).',
  'settings.version': 'Verze',

  'update.ready': 'Je k dispozici nová verze.',
  'update.reload': 'Načíst'
} as const;

export type MessageKey = keyof typeof cs;
