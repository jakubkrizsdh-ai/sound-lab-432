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

## Modální model handpanu (M4)
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

Prototyp z návrhu obrazovek používá zjednodušenou verzi (5 oscilátorů + šumový úder).

## Měření
- Grafy: `AnalyserNode` (FFT až 32 768, 1,46 Hz/bin při 48 kHz).
- Čísla „Měřeno“: vlastní Worklet – peak, RMS, true peak (4× převzorkování), f₀ metodou YIN/McLeod.
- λ = c / f; c(T) ≈ 331,3 · √(1 + T / 273,15) m/s; voda ~1480 m/s; ocel ~5900 m/s.
