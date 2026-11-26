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
| Nástroje | 10 definic; módy s kladnými poměry a amplitudou ≤ 1; mísy = hodnoty obrázku; C dur; řada přes oktávy; pořadí kalimby; klaviatura 25 kláves / 10 černých; vlastní nástroj se opraví a omezí | 0.4.0 |
| Bicí | 16 padů a kláves; dusení hi-hatu; ladění tomů = tóny obrázku; rytmy 16 kroků; časování kroků a swing (nikdy za další krok) | 0.5.0 |
| Obrázek soupravy | každý z 16 zvuků má klikací místo; typická místa (blána/tělo virblu, šlapka kopáku, kopule ridu, horní/spodní činel hi-hatu, pedál, e-pad, kotel, zvonec) vedou na správný zvuk; stolička nic | 0.6.0 |
| WAV | hlavička 16bit stereo, více bloků, převod na 16 bit s ditheringem (±1 LSB, ořez), formát délky | 0.7.0 |
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

## V prohlížeči – nástroje 0.4.0 (ověřeno 2026-11-26, Chrome headless, master 0 dB)
- [x] Plná síla úderu: tibetská mísa −4,6 dBFS, křišťálová −6,2, gong −6,7, kalimba −5,9, zvonky −4,7, klavír −4,2, flétna −11,9, syntezátor −14 až −19 (bez zásahu limiteru).
- [x] Kalimba 432 Hz → změřeno 432,06 Hz; flétna 512 Hz → 512,12 Hz; klavír C4 – základ přesný, alikvoty mírně roztažené.
- [x] Tření mísy: náběh −38 → −16 dB za 2 s, po puštění doznívá.
- [x] Klavír po puštění klávesy utlumen (−166 dB po 0,7 s); flétna a syntezátor po uvolnění ztichnou.
- [x] Konec tónu naplánovaný dopředu: bez skoku hlasitosti (dříve flétna −1 dBFS, nyní −11,9).
- [x] Každý nástroj zahraje dotykem na telefonu (390×844) i klávesnicí na počítači; bez chyb v konzoli.
- [ ] iPhone: tření mísy prstem, klaviatura více prsty (ověří autor).

## V prohlížeči – bicí 0.5.0 (ověřeno 2026-11-26, Chrome headless)
- [x] Všech 16 zvuků × 2 soupravy: bez chyb, plná síla – kopák/virbl ≈ −6 dBFS, tomy ≈ −7, činely a hi-haty −9 až −16 (bez master řetězce).
- [x] Otevřený hi-hat utlumený po 0,1 s → o 0,2 s později ticho.
- [x] Kotel v tónech obrázku: změřeno 95,99 Hz (cíl 96 Hz).
- [x] Sekvencer 120 BPM: 17 kroků za 2,0 s (8 kroků/s).
- [x] Tři současné dotyky na pady; mezerník spustí a zastaví rytmus; rytmus Funk se načte.
- [ ] iPhone: plynulost rytmu, hraní na pady více prsty (ověří autor).

## V prohlížeči – 0.6.0 (2026-11-26)
- [x] Tři současné dotyky na obrázek (blána virblu, kopule ridu, šlapka kopáku) → zahrány virbl, ride – zvon, kopák.
- [x] Ikony na padech, přepnutí na obrázek, popisky; telefon i počítač; bez chyb v konzoli.

## V prohlížeči – nahrávání 0.7.0 (2026-11-26, Chrome headless)
- [x] REC → generátor 432 Hz 1,5 s → přepnutí na Nástroje → Bicí → 4 údery → Stop: jedna nahrávka 3,95 s.
- [x] Exportovaný WAV: 44,1 kHz, stereo, 16 bit; generátor změřen 432,000 Hz; bicí po přepnutí v nahrávce jsou.
- [x] Upozornění „Nahrávka uložena“, seznam ve studiu, stažení s názvem podle data.
- [x] Telefon: horní lišta během nahrávání na jednom řádku.
- [ ] iPhone: Sdílet → Uložit do Souborů, nahrávka po zavření aplikace stále v seznamu (ověří autor).
