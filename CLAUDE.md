# CLAUDE.md – pracovní pravidla projektu SOUND LAB 432

Dlouhodobé instrukce pro každou práci na tomto repozitáři. Platí pro Clauda i pro lidi.

## Komunikace
- S autorem projektu komunikuj **česky**, srozumitelně pro neprogramátora.
- Před větší změnou řekni, co uděláš a proč. Po milníku shrň, co funguje a jak to vyzkoušet.
- Upozorňuj na technický dluh, rizika a příležitosti (sekce „Dluh a rizika“ v ROADMAP.md).

## Tři vrstvy, které se nesmí slévat
Každá hodnota v rozhraní nese štítek původu:
- **Měřeno** – spočítáno z reálného signálu (analyzátor, Worklet).
- **Vypočteno** – matematika z nastavení (λ = c / f, perioda, centy, poměry).
- **Symbolické** – přiřazení čaker, barev, tradic. Nikdy jako vědecky prokázaný účinek.
- dBFS nikdy nezaměňovat za dB SPL. Simulace cymatiky vždy označit jako model.

## Frekvence a ladění
- Frekvence ukládej jako float64 **a zároveň** jako zdroj: ladění + stupeň + přesný zlomek (např. `729/512`).
- Preset „Obrázek 432“ = pythagorejské ladění od C = 256 Hz (C D E F# G A H). Hodnoty se nesmí měnit.
- Rovnoměrně temperované A = 432 je **jiný** preset (C = 256,87 Hz).
- České názvy tónů: B = B♭, H = B natural.
- Každá změna modulu ladění musí projít testy referenčních hodnot (TESTS.md).

## Zvuk a bezpečnost
- Výchozí hlasitost −24 dBFS, master limiter se stropem −1 dBTP, globální STOP ALL (Esc).
- Každý náběh a konec min. 5 ms rampa; změny parametrů přes `setTargetAtTime`, ne skokem.
- Zvukové uzly po doznění uvolňovat; limit polyfonie.
- Vše, co zní živě, musí jít vyrenderovat i v `OfflineAudioContext` (export = živé hraní).

## Kód
- TypeScript (strict), Svelte 5 (runes), Vite. Žádné placené služby ani externí API.
- Závislosti jen MIT/BSD/Apache. Novou závislost zapiš do DECISION_LOG.md s důvodem.
- Žádný pevný text v komponentách: vše přes `src/lib/i18n` (cs + en, stejné klíče).
- Nepřepisuj funkční části bez zdůvodnění v DECISION_LOG.md.
- Samply jen CC0/CC-BY, každý zapsat do SAMPLES_LICENSES.md.

## Postup práce
1. Práce po milnících z ROADMAP.md. Jeden milník = ověřitelný výsledek.
2. Po každém milníku: `npm run check`, `npm test`, `npm run build`, kontrola na mobilu i desktopu,
   zápis do CHANGELOG.md, aktualizace ROADMAP.md a TESTS.md.
3. Hlavní cílová zařízení: **iPhone (Safari)** a **Windows (Edge/Chrome)**.

## Příkazy
- `npm run dev` – vývojový server
- `npm run check` – typová kontrola
- `npm test` – testy
- `npm run build` – produkční sestavení (pro GitHub Pages s `BASE_PATH=/sound-lab-432/`)
