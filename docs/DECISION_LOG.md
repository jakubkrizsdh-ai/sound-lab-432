# DECISION_LOG – registr rozhodnutí

| # | Datum | Rozhodnutí | Zvažované alternativy | Důvod |
| --- | --- | --- | --- | --- |
| D1 | 2026-11-25 | Modulární webová aplikace jako PWA | Jeden HTML soubor, desktop (Tauri) | Offline, instalace na iPhone i Windows, testovatelnost; jeden soubor neumí service worker ani mikrofon přes file:// |
| D2 | 2026-11-25 | Vlastní zvukové jádro (Web Audio + AudioWorklet), bez Tone.js | Tone.js | Plná kontrola nad přesností, limiterem a offline renderem; méně závislostí |
| D3 | 2026-11-25 | Handpan na modální syntéze, samply jen hybridně a pro klavír | Čisté samply | Přesné libovolné Hz bez transpozice samplu |
| D4 | 2026-11-25 | Frekvence jako float64 + přesný zlomek a zdroj ladění | Jen desetinné číslo | Beze změny při exportu a importu |
| D5 | 2026-11-25 | Základní export jen WAV a JSON | MP3, OGG, M4A | Spolehlivé ve všech prohlížečích; další formáty po ověření (M6) |
| D6 | 2026-11-25 | GitHub repozitář + lokální kopie | Jen lokální složka | Historie změn, zálohy, hosting zdarma |
| D7 | 2026-11-25 | Hlavní zařízení iPhone a Windows | – | Volba autora; testujeme nejdřív tam |
| D8 | 2026-11-25 | Výchozí stupnice z obrázku, druhý preset D Kurd | – | Volba autora |
| D9 | 2026-11-25 | Rozložení 8 + Ding, 9 + Ding i spodní pole | Jen jedno | Volba autora |
| D10 | 2026-11-25 | Rozhraní česky s přepnutím do angličtiny | Anglická navigace | Volba autora; překlady v `src/lib/i18n`, test hlídá shodu klíčů |
| D11 | 2026-11-25 | Svelte 5 + TypeScript + Vite | React, Preact, vanilla | Malý a rychlý výstup, čitelné komponenty; volbu svěřil autor |
| D12 | 2026-11-25 | Symbolická vrstva s více tradicemi jako presety | Jen mapa z obrázku | Volba autora; každá tradice s uvedením zdroje |
| D13 | 2026-11-25 | vite-plugin-pwa (Workbox) pro offline | Ručně psaný service worker | Ověřené řešení cache a aktualizací, licence MIT |
| D14 | 2026-11-25 | Systémová písma, žádné Google Fonts | Webová písma | Offline bez externích požadavků |
| D15 | 2026-11-25 | Navigace přes `#/sekce` v adrese | Router knihovna | Funguje na GitHub Pages bez serverových pravidel, žádná závislost |
| D16 | 2026-11-25 | Handpan (M4) před analýzou (M3) | Pořadí podle roadmapy | Přání autora co nejdřív hrát; M4 na M3 nezávisí |
| D17 | 2026-11-25 | Handpan v1 z nativních uzlů (oscilátory + šum), ne AudioWorklet rezonátory | Banka rezonátorů ve Workletu | Jednodušší, přesné Hz, funguje i offline; Worklet zvážit při problémech s výkonem |
| D18 | 2026-11-25 | Dozvuk prostoru z vygenerované impulzní odezvy | Nahraná IR | Žádné licence, malá velikost, nastavitelné |
| D19 | 2026-11-25 | Generátory z PeriodicWave (Fourierova řada) místo vestavěných typů | `OscillatorNode.type` | Umožní nastavit fázi a vlastní harmonické; stejná amplituda pro všechny průběhy |
| D20 | 2026-11-25 | Výchozí zvuk handpanu: pythagorejské C = 256 (= obrázek) | Samostatný preset jen se 7 tóny | 12tónový systém obsahuje i B♭ a F pro D Kurd a hodnoty obrázku zůstávají přesné |
| D21 | 2026-11-26 | Další nástroje před M3 na přání autora | Pořadí roadmapy | Autor chce hrát; analýza na nástrojích nezávisí |
| D22 | 2026-11-26 | Nástroje jako data (`instruments/defs.ts`), společný modální engine | Kód pro každý nástroj | Snadné přidávání; vlastní nástroj používá tentýž engine |
| D23 | 2026-11-26 | Klavír syntézou | Samply (Salamander, VCSL) | Bez stahování a licencí, přesné Hz v libovolném ladění; samply později jako volba |
| D24 | 2026-11-26 | Mísy hrají stupnici z obrázku (7 tónů), volitelně C dur | Libovolné tóny | Navazuje na obrázek; jiné tóny umí vlastní nástroj a klaviatura |

## Závislosti
| Balíček | Licence | Účel |
| --- | --- | --- |
| svelte | MIT | UI |
| vite, @sveltejs/vite-plugin-svelte | MIT | Build |
| vite-plugin-pwa (workbox) | MIT | Offline, instalace |
| typescript | Apache-2.0 | Typy |
| svelte-check, @tsconfig/svelte, @types/node | MIT | Typová kontrola |
| vitest | MIT | Testy |
