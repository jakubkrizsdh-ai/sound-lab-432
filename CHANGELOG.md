# CHANGELOG

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
