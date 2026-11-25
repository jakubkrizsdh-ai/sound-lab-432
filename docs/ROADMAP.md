# ROADMAP – plán vývoje

Každý milník končí funkční aplikací, kontrolou podle TESTS.md a schválením autora.

| Milník | Obsah | Stav |
| --- | --- | --- |
| M0 | Kostra aplikace, navigace (cs/en), tmavý motiv, PWA/offline, dokumentace, CI | **Hotovo (0.1.0)** |
| M1 | Zvukové jádro: AudioContext, master limiter, STOP ALL, −24 dBFS, modul ladění se všemi systémy | Další |
| M2 | Frekvenční laboratoř: generátory, průběhy, šumy, fáze, panoráma, obálka, sweep, glissando | Plán |
| M3 | Základní analýza: osciloskop, FFT, peak/RMS, vypočtené hodnoty, panel měření | Plán |
| M4 | Handpan v1: modální engine, rozložení 8/9 + Ding a spodní pole, multitouch, klávesnice | Plán |
| M5 | Ukládání: IndexedDB, autosave, obnova, presety, import/export projektu | Plán |
| M6 | Záznam a export: události, časová osa, offline render do WAV, JSON, round-trip test | Plán |
| M7 | Experimenty: interference, rázy, intervaly, porovnání ladění, drone, binaurální rázy, Lissajous | Plán |
| M8 | Pokročilá analýza: spektrogram (WebGL), detekce f₀, harmonické, mikrofon, import audia | Plán |
| M9 | Studio: stopy, mix, mute/solo, metronom, smyčky, efekty, editace | Plán |
| M10 | Meditace (více tradic) a další nástroje: mísy, gong, kalimba, klavír, vlastní nástroj | Plán |
| M11 | Model cymatiky, výkon, přístupnost, testy na iPhonu a Windows, vydání 1.0 | Plán |

## M1 – plán
1. `src/lib/audio/core.ts`: jeden AudioContext, odemknutí dotykem (iOS), master gain −24 dBFS.
2. Master řetězec: DC blokátor → měkký saturátor → limiter s předstihem (AudioWorklet), strop −1 dBTP.
3. STOP ALL: 30 ms rampa, uvolnění hlasů; napojení na tlačítko a Esc (událost `soundlab:stop-all` už existuje).
4. `src/lib/tuning/`: systémy z MASTER_SPEC §3, zlomky jako přesné poměry, převody Hz ↔ centy.
5. Testy: všech 21 hodnot obrázku, centové rozdíly z návrhu, žádné lupnutí (kontrola obálky v offline renderu).
6. iOS: zvuková relace „playback“ tam, kde ji Safari podporuje, aby tichý režim neztlumil zvuk.

## Dluh a rizika
- **GitHub Pages:** na bezplatném účtu funguje jen pro veřejný repozitář. Krok nasazení v CI do té doby selže (build a testy projdou).
- **iOS Safari:** chování AudioWorkletu a tichého režimu je potřeba ověřit na skutečném iPhonu v M1.
- **Písma:** používáme systémová písma (offline, bez externích služeb); vlastní písmo případně později.
- **Ikony:** zatím jednoduché generované; lze nahradit vlastní grafikou (např. mandalou autora).
