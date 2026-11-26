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
| D25 | 2026-11-26 | Bicí syntézou (oscilátory, šum, kovové „mračno“ 6 obdélníků) | Samply bicích | Bez licencí a stahování; dvě soupravy z jednoho kódu; offline export |
| D26 | 2026-11-26 | Sekvencer s plánováním dopředu (setInterval 25 ms + horizont 120 ms v čase AudioContextu) | setTimeout na každý úder | Přesné tempo nezávislé na zatížení hlavního vlákna |
| D27 | 2026-11-26 | Pady 4×4 místo kresby soupravy | Kresba bicí soupravy | Lépe se hraje prsty na telefonu, stejné rozložení jako klávesnice |
| D28 | 2026-11-26 | 2D pohled na soupravu z kresleného obrázku od autora, klikací oblasti jako data (`KIT_HOTSPOTS`) | Fotografie s logy značek; kreslení soupravy v SVG | Obrázek bez ochranných známek, věrný vzhled; oblasti testovatelné |
| D29 | 2026-11-26 | Ikony padů jako jeden obrázek-maska (sprite 4×4) | 16 souborů / SVG | Jedno stažení, barva ikon z CSS, funguje offline |
| D30 | 2026-11-26 | Nahrávání přes vlastní AudioWorklet za limiterem, 16bit PCM s ditheringem | MediaRecorder | Bezeztrátově, stejně ve všech prohlížečích, přesně to, co je slyšet; MediaRecorder dává různé ztrátové formáty |
| D31 | 2026-11-26 | Nahrávky v IndexedDB jako WAV Blob | OPFS, jen v paměti | Podpora v Safari, přežije zavření aplikace; jednoduché |
| D32 | 2026-11-26 | Export 16 bit (ne 24 bit) | 24bit / 32bit float | Poloviční paměť na telefonu, CD kvalita; 24 bit lze přidat jako volbu |
| D33 | 2026-11-26 | Klávesy handpanu podle polohy polí (ASDF / HJKL), ne podle výšky | Vzestupně A–L | Návrh autora; ruce odpovídají stranám nástroje |
| D34 | 2026-11-26 | Klavír: bílé Q–P, půltóny na číslech | Řada A–L | Návrh autora; víc kláves, obvyklé u hudebních programů |
| D35 | 2026-11-26 | Klávesy podle `KeyboardEvent.code` + popisky z `navigator.keyboard.getLayoutMap()` | Podle znaku (`key`) | Funguje na české i anglické klávesnici; popisky odpovídají tomu, co je na klávesách |
| D36 | 2026-11-26 | Skladba ukládá tóny (MIDI-like události s přesnou Hz a zdrojem ladění), ne zvuk | Nahrávat audio stopy | Tóny jdou posouvat, upravovat a opakovat; přesná frekvence zůstává (pravidlo ladění); export = stejné hlasy offline |
| D37 | 2026-11-26 | Čas v dobách (beats), takt 4/4, změna tempa nemění rozvržení | Čas v sekundách | Bloky a mřížka drží rytmus i po změně BPM |
| D38 | 2026-11-26 | Záznam hraní přes události z nástrojů, rozdělení do stop podle nástroje | Samostatné nahrávání každé stopy | Odpovídá přání autora: přepínat nástroje během jednoho záznamu |
| D39 | 2026-11-26 | Zastavení hlasu dvakrát jištěno: složky (`fadeOut`) + výstup hlasu (`silenceOut`), bez výjimek (`safeStop`) | Jen `cancelAndHoldAtTime` na složkách | Safari může při rychlém opakování vyhodit chybu → zůstaly znít alikvoty (slyšet jako jiný tón) |

## Grafické podklady
| Podklad | Původ | Úprava |
| --- | --- | --- |
| `src/lib/drums/assets/kit.webp` | Obrázek dodal autor projektu (kresba soupravy) | Převod do WebP 82 % |
| `src/lib/drums/assets/pad-icons.png` | Ikony z podkladu, který dodal autor | Vyříznuto, bílé čáry na průhledném pozadí, 128 px |

## Závislosti
| Balíček | Licence | Účel |
| --- | --- | --- |
| svelte | MIT | UI |
| vite, @sveltejs/vite-plugin-svelte | MIT | Build |
| vite-plugin-pwa (workbox) | MIT | Offline, instalace |
| typescript | Apache-2.0 | Typy |
| svelte-check, @tsconfig/svelte, @types/node | MIT | Typová kontrola |
| vitest | MIT | Testy |
