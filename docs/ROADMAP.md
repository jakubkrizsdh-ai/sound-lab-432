# ROADMAP – plán vývoje

Každý milník končí funkční aplikací, kontrolou podle TESTS.md a schválením autora.

| Milník | Obsah | Stav |
| --- | --- | --- |
| M0 | Kostra aplikace, navigace (cs/en), tmavý motiv, PWA/offline, dokumentace, CI | **Hotovo (0.1.0)** |
| M1 | Zvukové jádro: AudioContext, master limiter, STOP ALL, −24 dBFS, modul ladění se všemi systémy | **Hotovo (0.2.0)** |
| M2 | Frekvenční laboratoř: generátory, průběhy, šumy, fáze, panoráma, obálka, sweep, glissando | Další |
| M3 | Základní analýza: osciloskop, FFT, peak/RMS, vypočtené hodnoty, panel měření | Plán |
| M4 | Handpan v1: modální engine, rozložení 8/9 + Ding a spodní pole, multitouch, klávesnice | Plán |
| M5 | Ukládání: IndexedDB, autosave, obnova, presety, import/export projektu | Plán |
| M6 | Záznam a export: události, časová osa, offline render do WAV, JSON, round-trip test | Plán |
| M7 | Experimenty: interference, rázy, intervaly, porovnání ladění, drone, binaurální rázy, Lissajous | Plán |
| M8 | Pokročilá analýza: spektrogram (WebGL), detekce f₀, harmonické, mikrofon, import audia | Plán |
| M9 | Studio: stopy, mix, mute/solo, metronom, smyčky, efekty, editace | Plán |
| M10 | Meditace (více tradic) a další nástroje: mísy, gong, kalimba, klavír, vlastní nástroj | Plán |
| M11 | Model cymatiky, výkon, přístupnost, testy na iPhonu a Windows, vydání 1.0 | Plán |

## M2 – plán
1. `src/lib/audio/generators.ts`: generátor jako hlas (oscilátor / šum / aditivní tabulka), rampy pro všechny parametry.
2. Šumy: bílý, růžový, hnědý jako smyčkové buffery (případně Worklet).
3. Fáze: `PeriodicWave` s fázovým posunem; panoráma `StereoPannerNode`; náběh a dozvuk.
4. Sweep (lineární / exponenciální), glissando mezi tóny ladění, automatické přechody (seznam frekvencí a časů).
5. Rozhraní podle schváleného návrhu obrazovek (iPhone i Windows); frekvence z ladicí tabulky jedním klepnutím.
6. Testy: přesnost frekvence v offline renderu (odhad f₀), plynulost změn, mute/solo.

## Dluh a rizika
- **GitHub Pages:** na bezplatném účtu funguje jen pro veřejný repozitář. Krok nasazení v CI do té doby selže (build a testy projdou).
- **iOS Safari:** AudioWorklet, tichý režim a latenci je potřeba ověřit na skutečném iPhonu (automatické testy běží v Chrome).
- **Limiter:** strop −1 dBFS na vzorcích, mezivzorkové špičky odhaduje interpolace (test: do +0,2 dB). Plné true-peak měření přijde s analyzátorem (M3).
- **Měkký saturátor** z původního návrhu master řetězce zatím vynechán – limiter stačí a nebarví zvuk. Přidá se, jen pokud bude potřeba.
- **Volba ladění** se zatím neukládá (ukládání přijde v M5).
- **Písma:** používáme systémová písma (offline, bez externích služeb); vlastní písmo případně později.
- **Ikony:** zatím jednoduché generované; lze nahradit vlastní grafikou (např. mandalou autora).
