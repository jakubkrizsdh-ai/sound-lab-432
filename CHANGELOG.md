# CHANGELOG

## 0.3.0 – 2026-11-25 – Milníky M2 a M4
### Handpan (M4)
- Hratelný handpan: myš, dotyk s více prsty najednou, klávesnice (A–L, mezerník = Ding, Z X = spodní pole, Shift = silněji).
- Stupnice Obrázek 432 (C lydická, přesné hodnoty obrázku 128–576 Hz) a D Kurd; ladění pythagorejské C = 256, ET 432, ET 440, čisté.
- Rozložení 8 + Ding, 9 + Ding, volitelně 2 spodní pole; editor vlastního rozložení (tón a oktáva každého pole).
- Modální syntéza: základ, dvojice módů (jemné rázy), oktáva, duodecima, slabé neharmonické módy, šumový úder; silnější úder = jasnější zvuk.
- Opakovaný úder do pole utlumí předchozí kmit; limit 24 současných úderů.
- Prostor: vlastní generovaná impulzní odezva (bez cizích nahrávek), nastavitelný podíl.
- Síla úderu, délka dozvuku, prostor, hlavní hlasitost; nastavení se pamatuje.
- Vizuální odezva pole podle síly úderu a délky dozvuku; karta tónu (Hz, poměr, perioda, λ, centy proti ET 432/440, symbolická čakra).
### Frekvenční laboratoř (M2)
- Generátory: sinus, trojúhelník, obdélník, pila, harmonické (16 složek), bílý/růžový/hnědý šum; až 16 generátorů.
- Frekvence na 0,001 Hz, výběr tónu z ladění, oktávy; amplituda, hlasitost, fáze, panoráma, náběh, dozvuk; mute/solo.
- „Spustit vše“ spustí generátory ve stejný okamžik → fáze mezi nimi platí přesně.
- Sweep (exponenciální/lineární, smyčka), glissando, automatické přechody.
- Panel výpočtů: součet průběhů, obálka rázů, rázy a intervaly dvojic; ukázky (rázy, kvinta, Muladhara ve 3 oktávách).

## 0.2.0 – 2026-11-25 – Milník M1
- Zvukové jádro: jeden AudioContext, zapnutí prvním dotykem nebo klikem (iOS i Chrome), zvuková relace „playback“ na iPhonu.
- Master řetězec: hlavní hlasitost → DC filtr 10 Hz → limiter v AudioWorkletu (strop −1 dBFS, předstih 5 ms, odhad mezivzorkových špiček).
- Náhradní limiter (kompresor) pro prohlížeče bez AudioWorkletu.
- Hlavní hlasitost −60 až −6 dBFS, výchozí −24 dBFS, pamatuje se; nad −12 dBFS upozornění.
- STOP ALL (tlačítko i Esc) ztlumí master během ~30 ms a zastaví všechny hlasy bez lupnutí.
- Správa hlasů s limitem 64; nejstarší hlas se plynule zastaví.
- Modul ladění: Obrázek 432 (zamčený), ET A = 432, ET A = 440, pythagorejské a čisté ladění, vlastní reference, vlastní stupnice; přesné zlomky, centy, porovnání.
- Nastavení: karta Zvuk (stav, vzorkovací frekvence, latence, limiter, hlasitost, zkušební tón) a karta Ladění (tabulka Hz, poměrů a rozdílů v centech, přehrání tónu klepnutím).
- Horní lišta: hlavní hlasitost, indikátor limiteru, výzva k zapnutí zvuku.
- Testy: 21 hodnot z obrázku, centové rozdíly, limiter (přebuzení, transient, mezivzorkové špičky, stereo).

## 0.1.0 – 2026-11-25 – Milník M0
- Kostra aplikace: Svelte 5, TypeScript, Vite.
- Osm sekcí v navigaci; na PC postranní panel, na telefonu spodní lišta a nabídka „Více“.
- Tmavý motiv, systémová písma, ovládací prvky min. 44 px.
- Rozhraní česky i anglicky, volba se pamatuje.
- PWA: funguje offline, instalace na plochu (iPhone, Windows), upozornění na novou verzi.
- Tlačítko STOP ALL a klávesa Esc (napojení na zvuk v M1).
- Nastavení: jazyk, stav offline režimu, návod k instalaci, bezpečnost sluchu, verze.
- Dokumentace: MASTER_SPEC, CLAUDE, ROADMAP, DECISION_LOG, CHANGELOG, AUDIO_ENGINE, TESTS, SAMPLES_LICENSES.
- CI na GitHubu: typová kontrola, testy, build, nasazení na GitHub Pages.
