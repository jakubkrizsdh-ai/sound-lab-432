# MASTER_SPEC – SOUND LAB 432

Platná specifikace projektu. Vychází z úvodního návrhu (25. 11. 2026) a rozhodnutí v DECISION_LOG.md.
Mění se jen se schválením autora; každá změna má záznam v DECISION_LOG.md.

## 1. Cíl
Dlouhodobě rozšiřitelná digitální zvuková laboratoř: zvuk vytvářet, hrát, zkoumat, kombinovat,
analyzovat, nahrávat a exportovat. Ne jednorázová ukázka ani pouhý generátor frekvencí.

## 2. Platforma
- Modulární webová aplikace (TypeScript, Svelte 5, Vite) nasazená jako **PWA**: offline, instalace na plochu.
- Hlavní zařízení: iPhone (Safari) a Windows (Edge/Chrome). Rozhraní pro telefon, tablet i PC.
- Žádné placené služby, žádný server. Hosting zdarma (GitHub Pages) nebo lokálně.
- Rozhraní česky, přepínatelné do angličtiny.

## 3. Frekvenční systémy
| Preset | Definice |
| --- | --- |
| Obrázek 432 (výchozí) | Pythagorejské, C = 256 Hz, stupnice C D E F# G A H; tři oktávy 128–972 Hz přesně dle obrázku |
| ET A = 432 | Rovnoměrně temperované, A4 = 432 Hz |
| ET A = 440 | Rovnoměrně temperované, A4 = 440 Hz |
| Pythagorejské | Řetězec čistých kvint 3/2 od zvolené reference |
| Čisté (5-limit) | Poměry 1, 9/8, 5/4, 4/3, 3/2, 5/3, 15/8 … |
| Vlastní | Vlastní reference, vlastní stupnice (poměry nebo Hz), import Scala .scl/.kbm |

Funkce: přesné zadání Hz (0,001), transpozice, změna oktáv, porovnání systémů v Hz a centech.

Referenční hodnoty presetu Obrázek 432 (Hz):

| Čakra | Tón | Nízká | Střední | Vysoká | Poměr k C 256 |
| --- | --- | --- | --- | --- | --- |
| Muladhara | C | 128 | 256 | 512 | 1/1 |
| Svadhisthana | D | 144 | 288 | 576 | 9/8 |
| Manipura | E | 162 | 324 | 648 | 81/64 |
| Anahata | F# | 182,25 | 364,5 | 729 | 729/512 |
| Vishuddha | G | 192 | 384 | 768 | 3/2 |
| Ajna | A | 216 | 432 | 864 | 27/16 |
| Sahasrara | H | 243 | 486 | 972 | 243/128 |

## 4. Moduly
Jádro: `audio-core`, `tuning`, `instruments`, `analysis`, `transport`, `recording`, `storage`, `physics`.
Sekce (navigace): Nástroje, Frekvenční laboratoř, Analyzátor vln, Experimenty, Nahrávací studio,
Meditace, Knihovna projektů, Nastavení. Sekce komunikují se zvukem jen přes jádro.

## 5. Nástroje
- **Handpan (priorita):** modální syntéza (f, 2f, 3f + neharmonické módy, úder, rezonance těla),
  rozložení 8 + Ding, 9 + Ding a spodní pole; stupnice Obrázek 432 (výchozí) a D Kurd;
  myš, dotyk, multitouch, klávesnice; síla úderu, délka dozvuku, vizuální odezva, název a Hz tónu,
  editor vlastního rozložení.
- **Další:** tibetské a křišťálové mísy, gong, kalimba, zvonky (modální), flétna, syntezátor,
  klavír (samply CC0/CC-BY), vlastní nástroj definovaný daty (JSON).
- Syntéza i samply: syntéza je jádro (přesné Hz), samply pro hybridní úder a klavír.

## 6. Frekvenční laboratoř
Průběhy sinus, trojúhelník, obdélník, pila, aditivní, bílý/růžový/hnědý šum. U každého generátoru
frekvence, amplituda, hlasitost, fáze, panoráma, náběh, dozvuk. Více generátorů, mute, solo, záznam.
Sweep, glissando, automatické přechody.

## 7. Analýza
Osciloskop, FFT, spektrogram, základní frekvence, harmonické, amplituda, perioda, vlnová délka
(c nastavitelná podle prostředí a teploty), fáze, interference, rázy, peak a RMS v dBFS.
Vstup: výstup aplikace, importovaný soubor, mikrofon. Štítky Měřeno / Vypočteno.

## 8. Experimenty
Interference, intervaly, porovnání ladění, drone, binaurální rázy, pulzování, harmonické struktury,
matematické poměry, Lissajousovy obrazce, model cymatiky (označený jako model).

## 9. Studio a export
Record/Pause/Stop/Play, záznam událostí (tón, Hz, nástroj, čas, délka, síla) i zvuku,
časová osa, smyčky, metronom, stopy, mix, mute/solo, efekty, editace.
Export: WAV (vždy), JSON událostí a projektu; další formáty jen po ověření v prohlížečích.
Frekvence se exportem nesmí změnit (round-trip test).

## 10. Meditace
Volitelná symbolická vrstva; více tradic jako vyměnitelné presety; barva, symbol, frekvence,
oktávy, přehrávání a kombinace, sekvence s délkou a přechody, osobní poznámky.

## 11. Kvalita a bezpečnost zvuku
Nízká latence, plynulé změny, limiter, výchozí −24 dBFS, STOP ALL, bez lupání, stabilní polyfonie,
iOS: start zvuku dotykem, tichý režim, správa paměti a uzlů. Upozornění na sluch a reproduktory.

## 12. Ukládání
IndexedDB (projekty, presety), OPFS (audio), autosave, obnovení po zavření, import/export projektu,
doporučené zálohy do souboru (iOS může data webu smazat).
