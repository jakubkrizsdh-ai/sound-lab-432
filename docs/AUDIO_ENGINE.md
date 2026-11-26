# AUDIO_ENGINE – dokumentace zvukového systému

Stav: **M1 – jádro hotové** (`src/lib/audio/`). Každá změna zvuku se zapisuje sem.

## Signálová cesta
```
zdroje (nástroje, generátory) → bus (engine.input) → master gain (−24 dBFS výchozí)
  → DC filtr (horní propust 10 Hz) → limiter AudioWorklet (−1 dBFS, předstih 5 ms) → výstup
  (měřicí Worklet pro peak, RMS, true peak a f₀ přibude v M3)
```

## Zásady
- Jeden `AudioContext` (`latencyHint: 'interactive'`), odemčení prvním dotykem (iOS).
- Náběh a konec každého hlasu min. 5 ms; změny parametrů `setTargetAtTime`.
- STOP ALL: rampa 30 ms na nulu, uvolnění všech hlasů, obnovení master gainu.
- Limit polyfonie (výchozí 64), krade se nejstarší nejtišší hlas.
- Každý zdroj je funkce `build(ctx: BaseAudioContext, …)`, aby šel použít živě i v `OfflineAudioContext`.

## Implementace (M1)
| Soubor | Obsah |
| --- | --- |
| `audio/engine.svelte.ts` | `engine.start()` (z gesta), `setMasterDb`, `addVoice`/`removeVoice` (max 64), `stopAll()`, `buildMasterChain(ctx)` pro živý i offline kontext, `playTone()` |
| `audio/limiter-dsp.ts` | Limiter: zpožďovací linka, klouzavé minimum (O(1)), attack 1 ms, release 120 ms, odhad mezivzorkové špičky (Catmull-Rom), pojistka stropu, stereo vazba |
| `audio/limiter.worklet.ts` | AudioWorkletProcessor, hlásí největší ztlumení ~každých 85 ms |
| `tuning/ratio.ts`, `tuning/systems.ts` | Přesné zlomky, centy, ladicí systémy, `pitch()` vrací Hz + zdroj |

- Náhradní limiter: `DynamicsCompressorNode` (práh −3 dB, poměr 20, attack 1 ms), když AudioWorklet chybí.
- iOS: `navigator.audioSession.type = 'playback'` (Safari 17+), kontext se vytváří a obnovuje uvnitř gesta.

## Generátory (M2) – `audio/generator.ts`, `audio/waves.ts`, `audio/automation.ts`
- Tónové průběhy jako `PeriodicWave` z Fourierovy řady (256 harmonických, bez normalizace): fáze φ = posun v čase, harmonické pro aditivní syntézu se normalizují na součet ≤ 1.
- Šumy: 4 s smyčkové buffery (bílý; růžový – Kellet; hnědý – integrovaný), bez DC, RMS 0,25.
- Řetězec: zdroj → obálka (náběh ≥ 5 ms, dozvuk) → úroveň (amplituda × hlasitost) → brána (mute/solo) → panoráma → engine.input.
- Pohyb frekvence: plán (úseky from→to, dur, hold, křivka) se naplánuje do `frequency` AudioParam; smyčka se doplánovává po kolech. `freqAt()` počítá zobrazenou hodnotu.

## Modální model handpanu (M4) – implementace v1
| Složka | Popis | Výchozí hodnoty (budou laděny poslechem) |
| --- | --- | --- |
| Buzení | Krátký impulz 1–4 ms, filtrovaný šum | jas roste se silou úderu |
| Mód 1 | základ f | amplituda 1, dozvuk D |
| Mód 2 | oktáva 2f | 0,45 · (0,5 + v), dozvuk 0,55 D |
| Mód 3 | duodecima 3f | 0,22 · v, dozvuk 0,3 D |
| Rozladění | dvojice blízkých módů → jemné rázy | ±0,5–2 c |
| Neharmonické módy | kovový charakter | slabé, krátké |
| Tělo | společná nízká rezonance, sympatické rozeznění Dingu | M4 |
| Prostor | konvoluční / algoritmický reverb vlastní IR | M9 |

Implementace v1 (`handpan/voice.ts`, `handpan/model.ts`): 8 módů – [poměr, amplituda, podíl dozvuku, rozladění c]:
1 / 1 / 1 / 0 · 1 / 0,28 / 0,9 / +1,3 · 2 / 0,5 / 0,6 / 0 · 2 / 0,12 / 0,55 / −1,8 · 3 / 0,26 / 0,35 / 0 · 4,07 / 0,035 / 0,12 · 5,36 / 0,025 / 0,08 · 6,93 / 0,012 / 0,05.
Amplituda módu = amp · v · v^(0,6 + 0,35·log₂ poměr) (vyšší módy rostou se silou úderu). Náběh 2–4 ms, útlum exponenciální na −60 dB za dobu dozvuku.
Úder: 30ms šum, pásmová propust kolem (2,5 + 2v)·f, hlasitost 0,18·v². Ding: základ ×1,1, dozvuk ×1,15.
Sběrnice: suchý signál + konvoluční prostor (generovaná IR 2,2 s, vyšší frekvence doznívají rychleji), rovnovýkonové míchání.

## Měření
- Grafy: `AnalyserNode` (FFT až 32 768, 1,46 Hz/bin při 48 kHz).
- Čísla „Měřeno“: vlastní Worklet – peak, RMS, true peak (4× převzorkování), f₀ metodou YIN/McLeod.
- λ = c / f; c(T) ≈ 331,3 · √(1 + T / 273,15) m/s; voda ~1480 m/s; ocel ~5900 m/s.

## Další nástroje (0.4.0) – `instruments/defs.ts`, `instruments/voices.ts`
| Nástroj | Model | Klíčové parametry |
| --- | --- | --- |
| Tibetská mísa | modální, dvojice módů | 1 : 2,71 : 5,15 : 8,27 : 12; rozladění dvojic 1,4–3,1 Hz; dozvuk 28 s; měkká palička |
| Křišťálová mísa | modální | základ + slabé 2,76 a 5,4; dvojice 0,35 Hz; dozvuk 40 s |
| Gong | modální, 15 módů | 1 … 18,1; „bloom“ 1,2 s – vyšší módy nabíhají později; dozvuk 22 s |
| Kalimba | modální | 1, 2, 5,93, 11,7, 19,3; tvrdý úder; dozvuk 3,2 s |
| Zvonky | modální | hum 0,5, prima 1, tercie 1,19, kvinta 1,5, nominála 2, 2,51, 3, 4; dozvuk 9 s |
| Klavír | aditivní struny | f_n = n·f·√(1 + B·n²), B = 0,00035; 24 alikvot; 2 struny ±0,6 c do 6. alikvoty; dvoustupňový útlum; kladívko 15 ms; tlumítko τ 80 ms |
| Flétna | aditivní + šum | 1 / 0,32–0,47 / 0,12 / 0,05; chiff 30 ms; vibrato 5,2 Hz ±12 c po 0,4 s |
| Syntezátor | subtraktivní | 2 oscilátory (pad: 2× pila ±8 c; lead: pila + obdélník; varhany: sinus + trojúhelník o oktávu výš), dolní propust s obálkou |
| Vlastní | modální | až 16 módů [poměr, hlasitost, dozvuk ×, posun Hz], měkkost, úder, tření |

- Úder: šum z pásmové propusti kolem `noiseAt`·f; měkkost paličky tlumí vyšší módy (1/poměr)^(soft·(1,2 − 0,7v)) a prodlužuje náběh.
- Tření: módy nabíhají s τ = 1,1 + 0,4·poměr s, šum tření kolem základu (Q 8); po puštění každý mód doznívá vlastní dobou.
- Sběrnice nástrojů: suchý signál + prostor (generovaná IR 3 s), limit 32 současných tónů; stejný tón znovu utlumí předchozí (kromě mís a gongu).
- `holdAt(param, t)`: `cancelAndHoldAtTime`, jinak aktuální hodnota – konec tónu jde naplánovat dopředu (offline export).

## Bicí (0.5.0) – `drums/synth.ts`, `drums/kit.ts`, `drums/store.svelte.ts`
| Zvuk | Model |
| --- | --- |
| Kopák | sinus s poklesem výšky (3× → f za 50 ms; elektronický 2,2× za 90 ms, dozvuk 0,9 s) + 2. mód 1,6f + šum paličky nad 2,5 kHz |
| Virbl | tělo (trojúhelník/sinus f a 1,74f) + šum strunek (horní propust 1,2–1,8 kHz) |
| Rim, tlesk | krátké tóny + pásmový šum; tlesk = 4 rychlé záblesky šumu + dozvuk |
| Hi-haty, činely | 6 obdélníků (205,3 / 304,4 / 369,6 / 522,7 / 540 / 800 Hz × měřítko) přes pásmovou / horní propust + šum; dozvuky 0,05–2,6 s |
| Ride – zvon | sinusy 740 / 1180 / 1715 / 2590 Hz + kovový podíl |
| Tomy | sinus s poklesem výšky + mód 1,59f + šum úderu |
| Zvonec, tamburína | 540 + 800 Hz obdélníky v pásmu 2,6 kHz; šum nad 7 kHz + kovový podíl |

- Vyrovnání hlasitostí: tabulka `TRIM` (dB) pro každý zvuk a soupravu, z offline měření.
- Dusení: `CHOKES` – zavřený a šlapaný hi-hat zastaví otevřený (rampa 6 ms).
- Plánovač: každých 25 ms naplánuje údery do 120 ms dopředu; čas kroku `stepTime(krok, BPM, swing)`; swing posouvá sudé šestnáctiny až o 33 % délky kroku.
