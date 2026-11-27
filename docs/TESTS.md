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
| Klávesy | handpan A S D F = F#4 D4 H3 G3, H J K L = G4 E4 C4 A3, G = 9. pole, V B = spodní, mezerník = Ding, bez duplicit; kalimba A–L + Q–P; klavír bílé Q–P, půltóny 2 3 5 6 7; přemapování s prohozením a návratem | 0.8.0 |
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

## V prohlížeči – klávesy 0.8.0 (2026-11-26)
- [x] Handpan: a=F#4 s=D4 d=H3 f=G3 h=G4 j=E4 k=C4 l=A3, mezerník=C3; 9 + Ding a spodní pole: g=A4 v=C5 b=D5.
- [x] Přemapování Dingu na N v panelu → N hraje Ding.
- [x] Klavír: Q 2 W 3 E R 5 T 6 Y 7 U I 9 O 0 P = C4 … E5 chromaticky. Kalimba: A = C4, Q = E5.
- [ ] Česká klávesnice na Windows (Edge): popisky + ě š č na číslech (ověří autor).

## V prohlížeči – skladba 0.9.0 (2026-11-26, Chrome headless)
- Nahrání handpanu klávesami A S D F po odpočtu → 1 stopa, 1 blok, 4 tóny. ✔
- Nahrávání přes přepnutí nástroje (handpan → bicí) → 2 stopy (Handpan 2 tóny, Bicí 4 údery). ✔
- Tažení tónu v editoru: čas 0,726 → 1,75 dob (mřížka 1/16), výška 364,5 → 410,06 Hz (o dva řádky výš). ✔ Ctrl+Z vrátí 0,726. ✔
- Přehrávání: po 1,5 s při 90 BPM pozice 1.3 (2,25 doby). ✔
- Export WAV: 1 takt 90 BPM = 2,67 s + 4 s doznění = 6,67 s, 44,1 kHz stereo, špička −7,1 dBFS. ✔
- Testy modelu skladby (tests/song.test.ts): rozvinutí opakování, smyčka, mute/solo, kvantizace, sanitace JSON. ✔

## V prohlížeči – 0.9.1 (2026-11-26, šířka 390 px)
- 2 nahrávky → Smazat všechny → potvrzení → 0 nahrávek, po obnovení stránky stále 0. ✔

## Rychlé opakování tónu – 0.9.2 (2026-11-26, Chrome + simulace chyby Safari)
Živě 40 klepnutí na stejné pole (20–160 ms), nahráno REC, spektrum po 46 ms oknech.

| Případ | Okna s jiným dominantním tónem | Špička |
| --- | --- | --- |
| Handpan E4, původní kód, simulovaná chyba Safari | 5 ze 167 (oktáva 645 Hz) | −15,9 dBFS (hromadění) |
| Handpan E4, opraveno, simulovaná chyba | 0 ze 137 | −25,8 dBFS |
| Handpan E4, opraveno, běžný Chrome | 0 ze 138 | −25,5 dBFS |
| Kalimba D4, původní kód, simulovaná chyba | 0 ze 165 | −19,4 dBFS (hromadění) |
| Kalimba D4, opraveno, simulovaná chyba | 0 ze 126 | −29,2 dBFS |

Na skutečném iPhonu ověří autor (WebKit v testovacím prostředí nejde stáhnout).

## Rychlá hra – všechny nástroje, 0.9.3 (2026-11-26, offline Chrome, nepravidelné rozestupy ±40 %)
Vrchol spektra (dominantní výška) při průměrném rozestupu úderů 500 / 130 / 80 ms.

| Buben (akustická) | Ladění | Původně | Opraveno |
| --- | --- | --- | --- |
| Kopák | 55 Hz | 54,7 / 55,3 / **63,3** | 54,7 / 57,3 / 56,7 |
| Horní tom | 200 Hz | 201 / 200 / **244** | 211 / 201 / 207 |
| Střední tom | 150 Hz | 150 / 151 / **181** | 152 / 153 / 156 |
| Kotel | 105 Hz | 106 / 106 / **113** | 106 / 106 / 105 |

Ostatní nástroje (500 / 130 / 70 ms) – výška stabilní, beze změny kódu: handpan 324 → 324,5 / 322,7 / 325,0; kalimba D4 288 → 288,2 / 288,6 / 286,8; zvonky 576 → 576 / 576 / 579; klavír 324 → 324 / 327 / 322; flétna 576 → 576 / 580 / 581; syntezátor pad/lead/varhany 322–327; tibetská a křišťálová mísa 288 ± 2.
Živě v aplikaci (kotel, 40 rychlých klepnutí): vrchol 104,6 Hz.

## Bubny na reproduktoru telefonu – 0.9.4 (2026-11-26, offline Chrome)
Simulace malého reproduktoru: horní propust 4. řádu 380 Hz. Odhad vnímané výšky YIN (50 ms okna), medián a rozptyl 10–90 %, rozestup úderů ~500 / 150 / 90 ms (±40 %).

| Buben | Ladění | 0.9.3 na „telefonu“ | 0.9.4 na „telefonu“ |
| --- | --- | --- | --- |
| Kotel | 105 Hz | téměř neslyšný, při rychlé hře bez výšky | 106,8 / 106,3 / 107,5 (105–114) |
| Střední tom | 150 Hz | 150 / 150 / **79** | 153 / 152 / 153 (150–166) |
| Horní tom | 200 Hz | **108 / 106 / 105** | 212 / 203 / 205 (200–214) |

Úroveň na „telefonu“ +4 až +5 dB, na plném rozsahu beze změny (RMS ±0,1 dB). Živě v aplikaci se simulovanou chybou Safari: kotel 104,5 Hz.

## Zvuk úderu bubnů = 0.9.2 – 0.9.5 (2026-11-26, offline Chrome, pevná náhoda šumu)
32 úderů (16 bubnů × akustická/elektronická), síla 0,8, porovnání vzorků s verzí 0.9.2: rozdíl 0 (shoda < 1e-6). ✔

## Conga – 0.10.0 (2026-11-27)
- Jednotkové testy (tests/congas.test.ts): 12 úderů s unikátními klávesami; ladění obrázku = 256 × 27/32, 9/8, 3/2 (čisté kvarty mezi bubny); zóny hlavy; JSON skladby s conga stopou beze ztráty. ✔
- Offline Chrome, síla 0,8: otevřené tóny přesně 370,0 / 290,0 / 220,0 Hz; špičky −9 až −11,6 dBFS (bicí −9,2 až −9,6). ✔
- Prohlížeč: klepnutí do středu / kruhu / okraje tumby → bas / otevřený / slap; tlačítko Tlumený; klávesy D E F R → správné údery; nahrávání do Skladby → stopa „Conga“ s 8 údery; editor 12 řádků. ✔
- Export skladby (ladění obrázku): údery 216,7 / 287,5 / 383,3 Hz (rozlišení FFT ~2 Hz). ✔
- Telefon 390 px: tři hlavy vedle sebe, čitelné popisky zón. ✔
