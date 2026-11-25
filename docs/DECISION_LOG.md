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

## Závislosti
| Balíček | Licence | Účel |
| --- | --- | --- |
| svelte | MIT | UI |
| vite, @sveltejs/vite-plugin-svelte | MIT | Build |
| vite-plugin-pwa (workbox) | MIT | Offline, instalace |
| typescript | Apache-2.0 | Typy |
| svelte-check, @tsconfig/svelte, @types/node | MIT | Typová kontrola |
| vitest | MIT | Testy |
