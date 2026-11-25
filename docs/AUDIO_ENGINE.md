# AUDIO_ENGINE – dokumentace zvukového systému

Stav: **návrh** (implementace od M1). Každá změna zvuku se zapisuje sem.

## Signálová cesta
```
zdroje (nástroje, generátory) → sběrnice stop → master gain (−24 dBFS výchozí)
  → DC blokátor → měkký saturátor → limiter s předstihem (−1 dBTP) → výstup
                                              ↘ měřicí Worklet (peak, RMS, true peak, f₀)
```

## Zásady
- Jeden `AudioContext` (`latencyHint: 'interactive'`), odemčení prvním dotykem (iOS).
- Náběh a konec každého hlasu min. 5 ms; změny parametrů `setTargetAtTime`.
- STOP ALL: rampa 30 ms na nulu, uvolnění všech hlasů, obnovení master gainu.
- Limit polyfonie (výchozí 64), krade se nejstarší nejtišší hlas.
- Každý zdroj je funkce `build(ctx: BaseAudioContext, …)`, aby šel použít živě i v `OfflineAudioContext`.

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
