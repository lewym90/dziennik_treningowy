# FORGE — stan prac i kontynuacja

Stan na 21 listopada 2026. Wersja **1.28.2** (tryb trenera, raport PDF, biblioteka planów, karta zawodów), opublikowana i sprawdzona online.

- Repozytorium: `lewym90/dziennik_treningowy`, gałąź `main`, GitHub Pages.
- Aplikacja: https://lewym90.github.io/dziennik_treningowy/
- Serwer powiadomień: VPS, usługa `forge-push`, adres `https://188-68-247-201.sslip.io/forge-push`. Wersja z ostrzeżeniem przed końcem przerwy jest zainstalowana i działa (`active`). Kod połączenia: `sudo grep SETUP_CODE /etc/forge-push.env`. Aktualizacja: `bash <(curl -fsSL https://raw.githubusercontent.com/lewym90/dziennik_treningowy/main/server/install.sh)` (klucze i kod zostają).

## Zasady pracy (ustalone z właścicielem)
- Wszystkie teksty w aplikacji po polsku. Bez angielskich etykiet.
- Wygląd jest zatwierdzony: nie zmieniać głównego ekranu ani kart ćwiczeń bez zgody. Nowe funkcje wkładać w istniejące miejsca.
- Bez dopisków „orientacyjnie”, „szacunek”, „±10%”, „plan jest wskazówką”. Opisywać metodę („wyliczone wzorem…”). Zostaje tylko polecenie bezpieczeństwa przy bólu.
- Zalecenia treningowe tylko ze sprawdzonych źródeł (ACSM, WHO, ISSN, metaanalizy). Zero konfabulacji.
- Grafika sprzętu tylko wtedy, gdy pokazuje dokładnie ten sprzęt. Nowe grafiki właściciel generuje sam z angielskich promptów (jeden prompt na grafikę, każdy w osobnym bloku).
- Bez AI w aplikacji. Aplikacja ma działać offline.
- Niczego nie wdrażać bez wyraźnej komendy, gdy właściciel prosi o analizę lub propozycje.
- Po każdym wydaniu: podnieść `F.APPVER` w `js/core.js` i `VERSION` w `sw.js`, nowe pliki dodać do `CORE` w `sw.js`, uruchomić testy, wypchnąć i **sprawdzić, że GitHub Pages naprawdę opublikował nową wersję** (`curl …/sw.js`). Raz build Pages się anulował i poprawka nie dotarła do ludzi.

## Testy
- `node tests/calc.test.js` — 27 testów obliczeń (1RM, tonaż, kalendarz i przenoszenie, regeneracja, stagnacja, cele). Wymaga Playwright.
- `cd server && npm test` — testy serwera powiadomień (w tym ostrzeżenie przed końcem przerwy).

## Co zrobiono 21.11.2026 (v1.18.0 i v1.19.0)
1. **Głośniejszy sygnał końca przerwy** (kompresor, ostrzejszy dźwięk, bez ściszania muzyki). Ustawienia → Głośność sygnału: Normalna / Głośna (domyślnie) / Maks.
2. **Ostrzeżenie przed końcem przerwy** 10/30/60 s lub wyłączone (domyślnie 30 s): sygnał, wibracja, napis; przy zablokowanym telefonie z serwera (pole `pre` w `/timer`, ten sam znacznik `forge-rest`, więc koniec zastępuje ostrzeżenie).
3. **Okno zamiany ćwiczenia** (`F.swapSheet`, `F.similarEx` w `js/app.js`): lista „Podobne, na tę samą partię” + „Wszystkie ćwiczenia”. W treningu, w edytorze planu (stuknięcie w nazwę, ikona ⇄) i w korektach. W kreatorze: `F.PLN.swapPool` + „Wybierz dowolne z bazy”.
4. **Grafika maszyny do uginania nóg siedząc** (`assets/eq/30.webp`, `leg_curl_s`). Razem 31 grafik sprzętu (0–30).
5. **Kreator według celu** (`js/planner.js`, `js/kb.js`):
   - Siła: własne podziały `str1`–`str6` z bojami (sloty `sq_main`, `bench_main`, `dl_main`, `ohp_main`, `sq_var`, `bench_var`), 3–5 powtórzeń, boje min. 3 serie, izolacja maks. 3 serie. Martwy ciąg wreszcie jest.
   - PHUL/PHAT tylko dla Siły (Masa może je wybrać ręcznie, bez premii). `F.PLN.goalOk(goal, splitId)` filtruje podziały.
   - Rzeźba = parametry Masy + cardio (Helms 2015, Wewege 2022).
   - Wytrzymałość: całe ciało, prostsze pule (maszyny, hantle), 15–25 powtórzeń, przerwy 75/60/45 s.
   - Zdrowie: maszyny, całe ciało, 8–15 powtórzeń, przerwy 120/90/60 s.
   - Nowa tabela przerw `F.KB.restT` (ACSM 2009, Grgic 2018, Singer 2024). Usunięte wydłużanie i skracanie przerw przez kreator. Opis „Dlaczego ten plan” pokazuje dokładnie przerwy z planu (sprawdzone na 180 kombinacjach: 0 niezgodności).
   - Komunikat o czasie potrzebnym na pełną objętość („potrzebujesz X min albo dnia więcej”).
   - Plan z samą masą ciała: odfiltrowane dziwne ćwiczenia (`JUNK`, kategorie inne niż siłowe, poziom „expert” dla nie-zaawansowanych), rotacja wariantów, informacja o drążku/hantlach.
6. **Kalendarz:** dzień wolny pokazuje „Dzień wolny od treningu” z opcją „Przenieś tu najbliższy trening”. Przeniesiony trening zabiera swój dzień (kolejność wg `src`). `F.nextWorkout()` uwzględnia przeniesienia; `F.nextWorkout(true)` = surowa kolejka planu (używa jej `F.calQueue`).
7. **Teksty bez zastrzeżeń** i nowe źródła w „Porady i nauka”: `restGoal`, `split` (Ramos-Campo 2024), `cutTrain` (Wewege 2022, Helms 2015).

## v1.20.0 — „Zapytaj FORGE” (czat, `js/ask.js`)
- Wejście: ikona dymka z pytajnikiem w nagłówku ekranu Dziś (obok ustawień). Trasa `#/ask`.
- Działa offline, bez AI: rozpoznaje temat (36 tematów), ćwiczenie (nazwy i aliasy, odmiana przez wspólny rdzeń), partię i okres („miesiąc temu”, „w październiku”, „w zeszłym tygodniu”, „ostatnie 3 miesiące”…). Kontekst: „a w wyciskaniu?”, „a dwa miesiące temu?”. Gdy brakuje ćwiczenia, dopytuje i pokazuje najczęstsze.
- Tematy: wynik z danej daty, rekordy, ostatnie rekordy, maks (1RM), postęp z wykresem, stagnacja z diagnozą z danych (serie vs zakres z KB, częstotliwość, przerwa vs `restOf`, odciążenie), ostatni raz, cel na dziś (`F.suggest`), przerwy (plan + zalecane), regeneracja, następny/jutrzejszy trening (przycisk „Zacznij”), serie na partię, zaniedbane partie, liczba treningów, tonaż (wykres 8 tygodni), podsumowanie okresu, waga ciała (wykres), kalorie (`F.nutPlan` z coach.js — z blokadami dla <18 lat i ED), cele, ranga, seria tygodni, zamienniki (`F.similarEx`), technika (`F.EXINFO.t`), mięśnie (mapa ciała), ćwiczenia na partię, kalkulator 1RM („100 na 5”, „100×5”), talerze (rysunek gryfu), rozgrzewka, wiedza z `F.KB.facts` ze źródłami i linkiem do porady, pomoc do aplikacji, ból → komunikat bezpieczeństwa, suplementy → brak wiedzy w bazie.
- Na końcu odpowiedzi „W czym jeszcze mogę pomóc?” + 2–4 pytania. Historia w `kv askLog` (60 wiadomości), menu ⋯: „Kopiuj podsumowanie dla AI” (profil, plan, 10 treningów, maksy, serie na partię, waga) i „Wyczyść rozmowę”.
- Grafiki od właściciela: awatar i ikona w nagłówku Dziś `assets/bg/ask.webp`, ilustracja powitalna `assets/bg/ask-hero.webp` (w CORE sw.js).
- v1.21.0: nagłówek „To nie jest AI — Nie zgaduje. Liczy.” + 8 kafli tematów (puste okno), podpowiedzi przy wpisywaniu, mikrofon (Web Speech API, gdy przeglądarka ma), menu „Co potrafię”. Nowe tematy: porównanie ćwiczeń, plan, rozkład tygodnia i dni tygodnia, „czy potrzebuję odciążenia” (`F.deloadAdvice`, przycisk włączenia), czas treningu, staż/statystyki, spalone kalorie (`F.sessKcal`), najlepszy trening, jak rozbudować partię, profil, data, „mało czasu” (najpierw wielostawowe, ACSM 2009), „nie mam siły”, potwierdzenia. Filtr sprzętu („bez sprzętu”, „w domu”, „hantlami”, „na maszynach”) w zamiennikach i ćwiczeniach na partię. Odporność na literówki (odległość edycji 1), lepsze dopasowanie nazw (kara za niepokryte słowa), waga ciała z datą („ile ważyłem miesiąc temu”), wiedza z danymi użytkownika (serie na partię, powtórzenia z planu, białko z profilu). Naprawione: dopytywanie o ćwiczenie (pending) nie działało, „łydki stojąc” trafiało w zastój, „wyciskanie nogami” w regenerację nóg, „ile robić serii” w regenerację, odmiana partii w podpowiedziach.
- v1.22.0: czat obejmuje całą aplikację. Żywienie (`F.mealPlan`, `F.FOOD` z coach.js): rozpisany dzień posiłków (3/4/5, bez mięsa, inna propozycja), posiłek po/przed treningiem (białko 0,25 g/kg na posiłek, ISSN 2017), makro, „ile białka zostało” (uczciwie: aplikacja nie zapisuje jedzenia). Cardio (`F.cardioWeek`, cel z planu, WHO). Siła (`F.STRSTD` z features.js): poziomy, trójbój, DOTS, Wilks, podejścia na zawody (91/96,5/100%), procent maksa, najlepszy ciężar na N powtórzeń. Ciało: pomiary (`F.MEASF`), BMI (WHO). Osiągnięcia (`F.achievements`), analiza planu (`F.coachAnalyze`). Treningi z konkretnej daty („3 listopada”, „27.10”, „w zeszły wtorek”), trwający trening (`F.S.draft`), stoper przerwy z czatu (`F.restStart/restAdd/restStop`). Ustawienia, powiadomienia (`F.pushOn` z alert.js), kopia zapasowa, baza ćwiczeń, wszystkie plany, lista porad, informacje o aplikacji i danych. Ostatnia deska: wyszukiwanie w treści „Porad i nauki” (`F.GUIDE`) przed „nie umiem”.
- v1.22.1: jeden zakres serii w całej aplikacji — `F.volFor(m)` / `F.volCtx()` / `F.volLabel()` w kb.js (cel i staż z aktualnego planu, `F.KB.vol` + `F.KB.volSmall`). Ekran Mięśnie, czat i raport liczą tak samo (ruch główny 1, pomocnicze 0,5). Stara tabela TARGET z features.js usunięta. Pod nagłówkiem ekranu Mięśnie: „Zakres dla celu: …, zalecany zakres FORGE, oparty na ACSM 2026”.
- Testy: skrypty `ask.js`/`ask2.js`/`ask3.js` w scratchpadzie (60 pytań z danymi + pusty użytkownik), 0 błędów.

## v1.23.0 — rozbudowana i sprawdzona baza wiedzy (21.11.2026)
- Każde nowe źródło sprawdzone w PubMed (autorzy, rok, czasopismo, tom, strony, DOI) i treść w streszczeniu lub pełnym tekście (Europe PMC). Narzędzie: skrypty `lit/q.py`, `lit/ft.py` w scratchpadzie (PubMed E-utilities, Europe PMC full text).
- Poprawione dane starych źródeł: ACSM 2026 (pierwszy autor Currier BS), Bell 2023 (Sports Med Open 9:87, autorzy), Lundberg 2022 (52(10):2391–2403), Ramos-Campo 2024 (38(7):1330–1340).
- 33 nowe źródła (razem 56): Pelland 2026 (Sports Med — opublikowana wersja), Schoenfeld 2017, Ralston 2017, Schoenfeld 2019 (częstotliwość), Grgic 2018 (częstotliwość/siła), Refalo 2023, Robinson 2024, Schoenfeld 2015 (tempo), Nunes 2021, Moesgaard 2022, Haugen 2023, Coleman 2024, Rogerson 2024, Behm 2016, Fradkin 2010, Iversen 2021, Fragala 2019, Roberts 2020, Morton 2018, Kerksick 2017, Kreider 2017, Guest 2021, Helms 2014, Garthe 2011, Murphy & Koehler 2022, Iraki 2019, Wilson 2012, Schumann 2022, Sawka 2007, Herrmann 2024 (Kompendium MET), Duchette 2024, Morán-Navarro 2017.
- 28 nowych faktów w `F.KB.facts` (razem 50). Czat łączy kilka faktów w jednej odpowiedzi (klucz `a+b` w `KN`). Kreatyna, kofeina, nawodnienie, tempo, rozciąganie, rozgrzewka, periodyzacja, maszyny vs wolne ciężary, kobiety, osoby starsze, ciąża, tempo redukcji, nadwyżka na masę, regeneracja.
- Porady i nauka: 5 nowych artykułów (`warmup`, `time`, `goals`, `supp`, `groups`; razem 19) + aktualizacja istniejących (objętość, powtórzenia/upadek/tempo, progresja/periodyzacja, regeneracja/odciążenie, białko, cardio, mity). Grafiki: stare artykuły `assets/guide/0–13.webp`, nowe `assets/guide/<id>.webp` (lista `HAS` w guide.js; v1.23.1 — wszystkie 5 grafik dodane).
- Zmiany w logice:
  - Żywienie: redukcja = deficyt 15%, ale maks. 500 kcal (Murphy 2022); białko w redukcji 2,0 g/kg (z % tłuszczu: 2,3 g/kg beztłuszczowej masy); masa = nadwyżka 10% (Iraki 2019, wcześniej 8% bez źródła).
  - Spalanie treningu: MET 3,5–6,0 (Kompendium 2024; wcześniej 3–8,5).
  - Cardio: teksty zgodne z Schumann 2022 (brak osłabienia masy i siły maks.; rozdziel ≥3 h przy sile eksplozywnej); usunięta rada „rower zamiast biegu”.
  - (zastąpione w v1.24.0) przerwa spoza planu z „Domyślnej przerwy”.
  - Kreator: wyrównanie serii między dużymi partiami przy limicie czasu; minimum 4 serie tygodniowo na dużą partię (Iversen 2021).
  - Siła: progi poziomów opisane uczciwie jako progi FORGE (nie z badań); usunięte etykiety DOTS („poziom krajowy” itp.).
  - Gotowe plany: opisy bez haseł marketingowych + informacja, że plan dopasowany ułoży kreator.
  - Regeneracja: opis modelu FORGE (24–72 h / 18–48 h) + Morán-Navarro 2017.
  - Usunięte niepotwierdzone zdania (np. „wahają się o 1–2 kg”, test mowy w ciąży, przykłady równowagi spoza WHO, „szacowany” → „wyliczony”).

## v1.24.0 — profil przerw planu (21.11.2026)
- Jedno źródło przerw: każdy plan ma `meta.rest = {main, sec, iso}` (ciężkie wielostawowe / pozostałe wielostawowe / izolowane). Kreator ustawia z `F.KB.restOf(cel, staż, rola)`.
- Rola ćwiczenia: `F.PLN.roleOf(id)` w planner.js (main = pule ruchów głównych kreatora; iso = niewielostawowe lub na czas; reszta sec). Element planu zapisuje `role`.
- `F.restProfile(plan)` w kb.js: `meta.rest`, inaczej z celu/stażu planu, inaczej mediana przerw z ćwiczeń planu według roli (stare plany — profil wyliczany automatycznie). `F.restFor(id, plan)`, `F.autoRest(ex, plan)`, `F.curPlan()`.
- Edytor planu: blok „Przerwy w tym planie” — 3 pola (15–600 s) z przykładami ćwiczeń, przycisk „Zastosuj do wszystkich ćwiczeń” (superserie: najdłuższa w grupie). Nowy plan dziedziczy profil aktualnego planu.
- Dodanie ćwiczenia (plan i trening): przerwa z profilu według roli. Zamiana: przerwa zostaje, chyba że zmienia się klasa wielostawowe ↔ izolowane. Trening bez planu i stoper z czatu: profil aktualnego planu.
- Usunięte z Ustawień: „Domyślna przerwa” (`settings.restSet` nieużywane). W czacie ustawienia pokazują „Przerwy w planie: X / Y / Z”.
- Porada „Przerwy” ma akapit o profilu przerw.

## v1.28.2 — powiadomienia jednym przyciskiem (21.11.2026)
- Serwer: kod połączenia nie jest już wymagany (REQUIRE_CODE=1 przywraca). Ochrona: maks. 10 nowych urządzeń na godzinę z jednego IP (IP z ostatniego wpisu X-Forwarded-For), limit urządzeń min. 5000, przy komplecie zwalniane najdłużej nieużywane (>60 dni, pole `used`). Błędny kod nadal odrzucany; z poprawnym kodem bez limitu IP. Testy: `cd server && npm test`.
- Aplikacja (alert.js): przycisk „Włącz powiadomienia” + próbne powiadomienie od razu; adres i kod schowane w „Własny serwer”. `rejoin` działa bez kodu.
- Wymaga aktualizacji serwera na VPS poleceniem z instalatora (klucze zostają, telefony już połączone działają dalej).

## v1.28.0 — trójbój, biblioteka planów, raport PDF, tryb trenera (21.11.2026)
- Pkt 8 (tylko informacje, bez układania szczytowania — Travis 2020: brak dowodów na konkretne protokoły): karta „Zawody” w Narzędziach (`meetHtml`, `settings.meet`): odliczanie, wskazówka na dany etap (ankiety Travis 2021, przegląd Winwood 2026), linki do Planera podejść i artykułu `#/guide/meet` („Przed zawodami w trójboju”, grafika `assets/guide/meet.webp` od v1.28.1). Punkty IPF GL (`F.ipfGL`, współczynniki IPF 2020, sprawdzone na przykładach) obok DOTS/Wilks. Źródła w kb.js: travis2020, travis2021, burke2023, winwood2026, ipfgl; fakt `taper`.
- Pkt 19: 4 nowe plany startowe (Siła: Góra / Dół; Dom: hantle i drążek; Bez sprzętu; Zdrowie 60+), `cat` w meta, arkusz pogrupowany: Siłownia / Dom i bez sprzętu / Zdrowie. Razem 9.
- Pkt 23: `js/pdf.js` — raport PDF (Przegląd → „Raport PDF” oraz Historia → eksport): okres 4 tyg./3 mies./12 mies./całość; strony: podsumowanie (logo, kafelki, tonaż i liczba treningów tygodniowo), siła i rekordy (4 wykresy maksów, tabela 15 rekordów), mięśnie i ciało (serie tygodniowo vs zakres FORGE, masa ciała, pomiary), lista treningów. jsPDF 4.2.1 + fonty Barlow (podzbiór z polskimi znakami) w `lib/`, ładowane dopiero przy generowaniu. Wykresy na canvas, `K = 3,4 px/mm`.
- Pkt 18: `js/trainer.js` — tryb trenera bez serwera: menu planu → „Wyślij podopiecznemu” (link `#/get/<deflate-raw base64url>` + kod QR z `lib/qrcode.min.js`; zawiera własne ćwiczenia). Podopieczny: podgląd planu, „Dodaj ten plan” (ustawia jako aktualny, `meta.from`). Wyniki dla trenera: Historia → eksport → „Wyniki dla trenera” (plik JSON z imieniem, `settings.clientId`). Trener: Ustawienia → Trening → „Tryb trenera” → w Planach sekcja „Podopieczni” (`#/clients`, kv `clients`, scalanie po id sesji; `#/client/<id>` z seriami grupowanymi „3 × 5 · 127,5 kg”, samopoczuciem i bólem). Przewodnik nie pokazuje się, gdy aplikacja jest otwarta z linku planu.

## v1.27.0 — ekran serii i nowe funkcje (21.11.2026)
- Pkt 1: trening — serie jako kafelki (`chips()`, `#sx-i`), dolny panel `#set-dock` (klasa `.sdk`, `F.refreshSetDock`): ciężar/powtórzenia z −/+ i polem do wpisania (`data-b="wk"`), „Zalicz serię” (`check`), po zaliczeniu w panelu stoper przerwy (+30 s, Pomiń, „Cofnij” → `undoChk`). Wybór serii dotknięciem kafelka (`selSet`, `F.ui.sel`). Superserie i cardio — stare karty, panel tylko z przerwą. Duża grafika sprzęt/mięśnie zostaje (max 21vh).
- Pkt 2: bloki — `F.blockInfo(plan)` (coach.js, z `meta.meso`, `meta.blockStart`): tydzień X z Y, docelowy zapas powtórzeń, tydzień odciążenia. Pasek w karcie aktualnego planu, notka na 1. ćwiczeniu, po bloku `blockSum` (podsumowanie, „Zacznij następny blok” → `blockStart`).
- Pkt 3: `js/short.js` — „Mam mało czasu” (Dziś i karta planu): 30/45/60 min, `F.shortenItems` (iso→2 serie, sec→2, pomijanie iso, main→3, pomijanie sec, main→2, pomijanie main poza pierwszym; Iversen 2021). Pominięte serie NIE przechodzą na kolejny trening.
- Pkt 4: `js/gym.js` — miejsca treningu (`settings.gyms`, `gymId`), sprzęt; `F.gymOk` filtruje `F.similarEx`; przycisk „Zajęte” na karcie (`exBusy`: „Zrób później” na koniec albo zamiennik); miejsce w nagłówku treningu (gdy >1), w Ustawieniach → Trening, w kreatorze (krok Sprzęt) jako skróty.
- Pkt 6: `js/voice.js` — mikrofon w panelu serii; `F.voiceNums` (liczby słownie/cyframi, „i pół”, „przecinek”), zapis i zaliczenie, cofnięcie przez „Cofnij”.
- Pkt 7: menu ćwiczenia → „Boli przy tym ćwiczeniu”: miejsce (`F.PLN.INJ`), zapis w `settings.painLog` i `sess.pain`, komunikat bezpieczeństwa, ≥2 zgłoszenia tego miejsca w 14 dni → zalecenie konsultacji; opcje: zamień / lżej −10% / pomiń. Przypomnienie na karcie ćwiczenia przez 28 dni.
- Pkt 9: `js/goals2.js` — „Cel na dłużej” (Przegląd): ćwiczenie, maks (Epley), termin; tempo z regresji liniowej maksów z 8 tygodni (min. 3 treningi), data osiągnięcia, potrzebne tempo, punkty kontrolne.
- Pkt 10: `js/recap.js`, trasa `#/recap` (przycisk w Przeglądzie): miesiąc/rok, karty (treningi, tonaż, rekordy, najmocniejszy okres, ulubione ćwiczenie, siła), udostępnianie jako obraz 1080×1920.
- Pkt 11: porównanie zdjęć już było; dodany wyraźny blok prywatności z datą ostatniej kopii i przyciskiem „Zrób kopię teraz” (kopia domyślna zawiera zdjęcia).
- Pkt 12: samopoczucie — okienko „Przed treningiem” (sen, energia 1–5, „Pomiń”) przy starcie; `sess.feel`; w Przeglądzie „Samopoczucie a wyniki” (od 6 ocenionych treningów).
- Pkt 21: kreator — „Szybki start | Zaawansowany” (`Z().quick`, kroki: O Tobie, Zdrowie, Cel+staż, Dni, Sprzęt); domyślnie szybki dla nowych. Bez cardio (cChoice keep).
- Pkt 22: start aplikacji — pomiar: DOMContentLoaded 0,25 s przy 4× wolniejszym CPU; czekanie wynikało z ekranu powitalnego (2,1 s) → 1,3 s.

## v1.26.0 — nowa nawigacja (21.11.2026)
Decyzje właściciela: `plan-rozwoju.md` (repo) / `claude/forge-plan-rozwoju.md` (projekt). Zasada: upraszczać, każda funkcja w jednym miejscu.
- Dziś: 4 kafle (Żywienie, Porady i nauka, Narzędzia, Wpisz wagę — okienko `F.act.bwSheet`), przy „Ten tydzień” znacznik „Kalendarz ›”. Kreator, import, ćwiczenia → Plany; raport → Postępy.
- Historia: przełącznik Lista | Kalendarz (`F.ui.histView`, `F.calBody()` w calendar.js). Trasa `#/calendar` pokazuje Historię z kalendarzem; `goCal` też.
- Postępy: 4 zakładki Przegląd / Mięśnie / Siła / Ciało. Rekordy dołączone do Siły (`statsPR` pod poziomami siły). Na górze Przeglądu karta „Ten tydzień” (porównanie z poprzednim, link do raportu), potem cele, wykresy, ranga, osiągnięcia.
- Profil tylko w Ustawieniach (usunięte „Twoje dane” z Ciała i Siły; przy braku danych przyciski „Uzupełnij profil” / „Wpisz wagę”). Wiek jako liczba (`age` + `ageAt`), co rok +1 (`F.ageNow` — naprawione zaokrąglanie, wcześniej dodawał rok po pół roku); data urodzenia nadal działa, jeśli była wpisana. Kreator też pyta o wiek.
- Ustawienia w 5 sekcjach z opisem: Profil, Trening, Dźwięk i powiadomienia, Wygląd, Dane i kopia. Import usunięty z Ustawień.
- Menu ćwiczenia w treningu: Zamień, Czas przerwy na górze; „Przesuń wyżej/niżej” w jednym rzędzie; usuń na dole.
- Spójne nazwy (Narzędzia, Baza ćwiczeń), teksty pomocy w czacie zaktualizowane do nowych miejsc. Usunięte „≈” (1RM, kalorie, zapotrzebowanie).
- `js/tour.js`: przewodnik 3 ekrany tylko dla nowych (bez planów i treningów, `settings.tourSeen`), po nim → Plany. Jednorazowe podpowiedzi (`F.hint`, `settings.hints`) na Planach, w Historii i Postępach.
- Punkt 1 (seria jednym dotknięciem): makieta v2 wysłana (duża grafika sprzęt/mięśnie + kafelki serii + dolny panel serii/przerwy), czeka na akceptację.

## v1.25.0 — ekran Plany, plany startowe, Żywienie (21.11.2026)
- Ekran Plany: na górze karta „Aktualny plan” (cel · staż, dni i ćwiczenia, następny trening z dniem, dni tygodnia z „zmień” → `calDays`, przycisk „Rozpocznij”). Niżej „Inne plany”, potem „Nowy plan”: Kreator → Plany startowe → Import, na dole „Baza ćwiczeń”. Kafel Kalendarz usunięty (kalendarz jest na ekranie Dziś).
- Aktualny plan: `settings.curPlan` (ustawiany przy starcie treningu z planu, zapisie z kreatora, dodaniu planu startowego, imporcie, zapisie nowego planu, „Ustaw jako aktualny” w menu planu i w szczegółach planu). `F.nextWorkout` bierze go jako pierwszy, potem plan z ostatniego treningu. `coach.js activePlan` korzysta z `F.nextWorkout`. Eksport z calendar.js: `F.calWeekdays`, `F.WD_SHORT`, `F.calWhen`.
- Nazwa planu z kreatora krótsza: „Masa — Push / Pull / Nogi” (cel i staż w podtytule z `meta`). v1.25.1: stare długie nazwy z kreatora skracane przy starcie (core.js, tylko plany z `meta.goal`); w karcie aktualnego planu bez strzałki, nazwa dnia bez przedrostka „Pn — ”, przycisk „Rozpocznij trening”.
- Plany startowe przepisane (`F.TEMPLATES` w data.js, format `[nazwa, opis, dni, meta]`): Push / Pull / Nogi (masa, średniozaaw.), Góra / Dół (masa, średniozaaw., dni cięższe i lżejsze `hy`), Siła A/B 3×5 (siła, początk., A/B naprzemiennie 3×/tydz.), Całe ciało 3× (masa, początk.), Pośladki i nogi (masa, średniozaaw., góra ciała min. 6 serii klatki). Powtórzenia i przerwy przy dodaniu z `F.KB.reps/repsHyp/restOf`, plan dostaje `meta {goal, exp, weekdays, rest}`. Serie tygodniowo dużych partii w zakresie `F.KB.vol` (skrypt `tpl3.js` + `tplspec.js` w scratchpadzie); barki i łydki lekko powyżej przez serie pośrednie, pośladki w planie pośladkowym celowo powyżej (opisane).
- Żywienie: kafel „Cel dzienny” na całą szerokość (`.sum-stats.nut`), bez „≈” i „ok.”; gdy brak treningów z 4 tygodni — napis zamiast „0 kcal”. Usunięte „ok.” przy wyliczonym czasie treningu (Dziś, plan, kalendarz, czat).

## Audyt v1.25.2 (21.11.2026)
- Sprawdzone: CORE sw.js (201 plików, wszystkie istnieją), 21 tras na pustym i pełnym koncie na 320/375 px (0 błędów JS, brak „undefined/NaN”), przyciski z ikoną mają aria-label, crawl 647 kliknięć. Poprawione: długie tytuły w Poradach na 320 px, usunięte nieużywane `defaultRest`.
- Rynek (21.11.2026): Fitatu 1,2 mln aktywnych miesięcznie, Premium+AI 135,99 zł/rok (promocja); Hevy Pro 23,99 USD/rok, darmowa wersja 4 plany; Strong Pro 29,99 USD/rok; Fitbod 95,99 USD/rok bez darmowej wersji; Strive (Gdańsk) darmowy dziennik offline, PL/EN. Top przychód PL Q4 2025: Fitatu, Diet & Training by Ann, Strava. Propozycje rozwoju przedstawione właścicielowi — czekają na decyzje.

## Audyt (21.11.2026)
- Automatyczny przegląd: 22 ekrany, 556 kliknięć, 0 błędów JS, wszystkie przyciski mają obsługę. 45 akcji niszczących (usuwanie, kopie, import) nie było klikanych automatem.
- Wzory kalorii poprawne (Mifflin–St Jeor, Katch–McArdle). Źródło ACSM 2026 istnieje.
- Nie testowano na prawdziwym telefonie: dźwięk ze słuchawkami, powiadomienia przy blokadzie, offline, import prawdziwych PDF-ów.

## Sprzedaż i rozwój (ustalenia, nic nie wdrożone)
- Model: darmowa aplikacja + Premium (propozycja: 59 zł/rok lub 149 zł jednorazowo, na start 99 zł). Wymaga Google Play i Płatności Google Play; dane i eksport zawsze za darmo.
- Natywny Android: Capacitor na obecnym kodzie (powiadomienia lokalne, Health Connect, widżet, wbudowane moduły OCR/PDF). Identyfikator aplikacji wybrać neutralny (bez „pl”).
- Wersja angielska: jedna aplikacja, wiele języków (teksty są wpisane w kod — trzeba je wyciągnąć do plików językowych).
- Konkurencja: FitAI (Social Tech, Stambuł, 5–9 mln pobrań, subskrypcja, trener AI online, filmy ćwiczeń, Wear OS). Nasze przewagi: offline bez konta, prywatność, plan z badań z uzasadnieniem, trójbój, import planów, pełny polski. Pomysły: animacje 50–80 ćwiczeń offline, karta sklepu wokół różnic, opinie pierwszych użytkowników.

## Otwarte / do zrobienia
- Test na iPhonie i Androidzie od kolegów: głośność sygnału ze słuchawkami, ostrzeżenie 30 s przy zablokowanym telefonie, nowy kreator dla różnych celów.
- Plany zapisane przed 1.19.0 się nie zmieniły — kto chce nową logikę, przechodzi kreator jeszcze raz.
- Na prośbę: rozpisanie animacji ćwiczeń offline albo karty sklepu.
