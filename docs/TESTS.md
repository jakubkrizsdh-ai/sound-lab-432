# TESTS – kontrolní scénáře

Automatické testy: `npm test` (Vitest). Ruční scénáře se odškrtávají po každém milníku.

## Automatické
| Oblast | Test | Od |
| --- | --- | --- |
| Překlady | cs a en mají stejné klíče, nic prázdného, stejný počet položek v seznamech | M0 |
| Navigace | 8 sekcí v pořadí ze zadání; max. 4 sekce ve spodní liště; adresa `#/…` vybere sekci | M0 |
| Ladění | všech 21 hodnot obrázku přesně; centy ET 432/440/čisté dle návrhu | M1 |
| Zvuk | offline render: žádný skok na začátku a konci tónu, limiter drží −1 dBTP | M1 |
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
