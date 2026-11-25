# TESTS – kontrolní scénáře

Automatické testy: `npm test` (Vitest). Ruční scénáře se odškrtávají po každém milníku.

## Automatické
| Oblast | Test | Od |
| --- | --- | --- |
| Překlady | cs a en mají stejné klíče, nic prázdného, stejný počet položek v seznamech | M0 |
| Navigace | 8 sekcí v pořadí ze zadání; max. 4 sekce ve spodní liště; adresa `#/…` vybere sekci | M0 |
| Ladění | všech 21 hodnot obrázku přesně; přesné poměry; centy ET 432/440/čisté dle návrhu; vlastní reference a stupnice | M1 |
| Limiter | +6 dBFS sinus ≤ −1 dBFS; transient z ticha; mezivzorkové špičky < +0,2 dB; stereo bez posunu obrazu | M1 |
| Průběhy | fáze 180° vyruší sinus; fázový posun = časový posun; hodnoty obdélníku, pily, trojúhelníku; šum bez DC, RMS 0,25 | M2 |
| Pohyb frekvence | exponenciální sweep v polovině = geometrický průměr; lineární = aritmetický; přechody se smyčkou | M2 |
| Handpan | stupnice z obrázku = přesné hodnoty; D Kurd; 8/9 polí + spodní; pole se nepřekrývají; vlastní tón; jas podle síly úderu | M4 |
| Export | round-trip JSON bit po bitu, WAV v toleranci 0,01 Hz | M6 |

## Ruční – M0 (ověřeno 2026-11-25, Chrome headless, 390×844 a 1440×900)
- [x] Aplikace se otevře, výchozí sekce Nástroje.
- [x] Telefon: spodní lišta (4 sekce + Více), nabídka Více otevře zbylé 4 sekce.
- [x] PC: postranní panel s 8 sekcemi, aktivní sekce zvýrazněná.
- [x] Přepnutí do angličtiny změní celé rozhraní a po obnovení stránky zůstane.
- [x] Po prvním načtení funguje bez připojení (obnovení stránky offline).
- [x] Žádné chyby v konzoli.
- [ ] Instalace na plochu iPhonu a spuštění bez připojení (ověří autor).
- [ ] Instalace v Edge na Windows (ověří autor).

## Ruční / v prohlížeči – M1 (ověřeno 2026-11-25, Chrome headless, OfflineAudioContext)
- [x] Skutečný master řetězec s AudioWorkletem: sinus +6 dBFS → výstup −1,00 dBFS.
- [x] Náběh tónu (10 ms): největší skok mezi vzorky není větší než u ustáleného tónu (bez lupnutí).
- [x] Konec tónu: zbytkový signál −77 dBFS v okamžiku zastavení oscilátoru.
- [x] Zkušební tón → zvuk běží, 1 hlas; Esc (STOP ALL) → 0 hlasů.
- [x] Tabulka ladění: obrázek proti ET 432 = −5,9 / −2,0 / +2,0 / +5,9 / −3,9 / 0 / +3,9 c.
- [ ] iPhone: zvuk po prvním klepnutí, i s tichým režimem (ověří autor).
- [ ] Windows Edge/Chrome: zkušební tón, hlasitost, STOP ALL (ověří autor).

## V prohlížeči – M2 a M4 (ověřeno 2026-11-25, Chrome headless, OfflineAudioContext)
- [x] Generátor 364,5 Hz (sinus) → změřeno 364,49999 Hz; trojúhelník 182,25 → 182,25003; obdélník 729 → 729,0003; harmonické 256 → 255,99999.
- [x] Dva sinusy 432 Hz s fází 0° a 180° spuštěné společně → ticho (pod −200 dBFS).
- [x] Sweep 128 → 512 Hz za 2 s dojede na 511,9999 Hz.
- [x] Handpan F#4: změřeno 364,47 Hz (autokorelace), dozvuk 6 s → za 2,3 s pokles o 26 dB.
- [x] Tři současné dotyky (různé pointerId) → 3 znějící hlasy.
- [x] Klávesnice F, mezerník, J zahraje C4, Ding, F#4.
- [x] Editor rozložení: pole H3 → F3 170,67 Hz; obnovení; D Kurd Ding D3 144 Hz; nastavení přežije obnovení stránky.
- [ ] iPhone: multitouch, latence dotyku, zvuk bez sekání při rychlém hraní (ověří autor).
