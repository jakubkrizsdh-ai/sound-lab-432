# ROADMAP – plán vývoje

Každý milník končí funkční aplikací, kontrolou podle TESTS.md a schválením autora.

| Milník | Obsah | Stav |
| --- | --- | --- |
| M0 | Kostra aplikace, navigace (cs/en), tmavý motiv, PWA/offline, dokumentace, CI | **Hotovo (0.1.0)** |
| M1 | Zvukové jádro: AudioContext, master limiter, STOP ALL, −24 dBFS, modul ladění se všemi systémy | **Hotovo (0.2.0)** |
| M2 | Frekvenční laboratoř: generátory, průběhy, šumy, fáze, panoráma, obálka, sweep, glissando | **Hotovo (0.3.0)** |
| M3 | Základní analýza: osciloskop, FFT, peak/RMS, vypočtené hodnoty, panel měření | Další |
| M4 | Handpan v1: modální engine, rozložení 8/9 + Ding a spodní pole, multitouch, klávesnice | **Hotovo (0.3.0)** |
| M5 | Ukládání: IndexedDB, autosave, obnova, presety, import/export projektu | Plán |
| M6 | Záznam a export: události, časová osa, offline render do WAV, JSON, round-trip test | Záznam zvuku + export WAV **hotovo (0.7.0)**; události a JSON plán |
| M7 | Experimenty: interference, rázy, intervaly, porovnání ladění, drone, binaurální rázy, Lissajous | Plán |
| M8 | Pokročilá analýza: spektrogram (WebGL), detekce f₀, harmonické, mikrofon, import audia | Plán |
| M9 | Studio: stopy, mix, mute/solo, metronom, smyčky, efekty, editace | Plán |
| M10 | Meditace (více tradic) a další nástroje: mísy, gong, kalimba, klavír, vlastní nástroj | Nástroje **hotovo (0.4.0)**, meditace plán |
| M11 | Model cymatiky, výkon, přístupnost, testy na iPhonu a Windows, vydání 1.0 | Plán |

## M3 – plán
1. Měřicí AudioWorklet na masteru: peak, RMS, true peak (dBFS), detekce f₀ (YIN/McLeod).
2. Osciloskop a FFT spektrum z reálného výstupu (Canvas 2D), stabilní zobrazení periodického signálu.
3. Panel měření dostupný při hraní na handpan i v laboratoři (štítek „Měřeno“).
4. Rychlost zvuku podle teploty / prostředí v Nastavení (λ se přepočítá).
5. Testy: měřená f₀ sinusu 432 Hz s chybou < 0,1 Hz, peak/RMS známých signálů.

## Dluh a rizika
- **GitHub Pages:** na bezplatném účtu funguje jen pro veřejný repozitář. Krok nasazení v CI do té doby selže (build a testy projdou).
- **iOS Safari:** AudioWorklet, tichý režim a latenci je potřeba ověřit na skutečném iPhonu (automatické testy běží v Chrome).
- **Limiter:** strop −1 dBFS na vzorcích, mezivzorkové špičky odhaduje interpolace (test: do +0,2 dB). Plné true-peak měření přijde s analyzátorem (M3).
- **Měkký saturátor** z původního návrhu master řetězce zatím vynechán – limiter stačí a nebarví zvuk. Přidá se, jen pokud bude potřeba.
- **Volba ladění** v Nastavení se zatím neukládá; generátory se po zavření aplikace nepamatují (M5). Handpan si nastavení pamatuje.
- **Handpan – realismus:** model je v1. Ladit poslechem: amplitudy a doby módů, rezonance těla a sympatické rozeznění Dingu (zatím chybí).
- **Výkon na iPhonu:** jeden úder = ~9 uzlů Web Audio; limit 24 úderů. Při sekání zvuku snížit limit nebo přejít na AudioWorklet s bankou rezonátorů.
- **Síla úderu z dotyku:** iPhone tlak prstu nehlásí, síla je z posuvníku a místa úderu (střed pole silněji).
- **Klavír je syntéza, ne samply.** Zní přijatelně, ale ne jako nahraný klavír. Volné samply (CC0/CC-BY) lze doplnit, až je bude možné stáhnout a ověřit licenci (SAMPLES_LICENSES.md); prostředí vývoje teď stahování z webu neumožňuje.
- **Klavír – neharmonicita:** vyšší alikvoty jsou záměrně mírně roztažené (B = 0,00035); základní tón zůstává přesný (odchylka < 0,3 c).
- **Mísy – tření:** zjednodušený model (pomalý náběh módů + šum tření), ne fyzikální model tření.
- **Bicí:** syntéza, ne samply – akustická souprava zní věrohodně, ale ne jako nahraná. Sekvencer zatím jeden takt (16 kroků) a jeden vzor; řetězení vzorů, delší takty a záznam do studia přijdou s M9 (studio používá stejný plánovač).
- **Sekvencer na pozadí:** prohlížeč může při zamčeném telefonu nebo skryté kartě časovač zpomalit; rytmus pak vynechá. Řešením je plánovač v AudioWorkletu (M9).
- **Nahrávky v zařízení:** IndexedDB; iOS může data webu po delší nečinnosti smazat (upozornění ve studiu, doporučen export). Limit 15 min ≈ 150 MB paměti.
- **Nahrávka vs. sluchátka Bluetooth:** nahrává se digitální výstup aplikace, zpoždění sluchátek se do nahrávky nepromítne.
- **Pořadí milníků:** M4 (handpan) předběhl M3 na přání autora, aby šlo co nejdřív hrát.
- **Písma:** používáme systémová písma (offline, bez externích služeb); vlastní písmo případně později.
- **Ikony:** zatím jednoduché generované; lze nahradit vlastní grafikou (např. mandalou autora).
