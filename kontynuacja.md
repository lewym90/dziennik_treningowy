# FORGE — stan prac i kontynuacja

Stan na 23 listopada 2026. Wersja **1.37.0** (trening: pełny ekran na iOS 26, przejście do następnego ćwiczenia po przerwie, obrót, koniec przerwy z serwera; cardio jutro na ekranie Dziś i w czacie; ćwiczenia jednorącz: seria = obie strony w tonażu; karta ćwiczenia: grafiki sprzętu i mięśni jedna pod drugą, gdy jest miejsce; kafel „Dziś”; konkretna liczba powtórzeń zależna od celu), opublikowana i sprawdzona online.

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

## v1.37.0 — trening: pełny ekran, następne ćwiczenie, obrót, powiadomienie (23.11.2026)
- Czarny pas pod panelem serii (iOS 26, aplikacja z ekranu początkowego): gdy dokument nie jest wyższy niż ekran, elementy `position:fixed; bottom:0` kończą się ~safe-area-top nad krawędzią. Na Dziś niewidoczne (długa strona), w treningu (`body.in-workout{overflow:hidden}`) widoczne. Poprawka: `@media (display-mode:standalone){html{min-height:min(100lvh,calc(100% + env(safe-area-inset-top)))}}` (na poprawnych urządzeniach = widoczna wysokość). Źródło: PR ErenDenizK/dizey #155, Apple Dev Forums 799216. NIE proponować „pasa w kolorze” — właściciel chce pełny ekran.
- Koniec przerwy: alert.js nie odwołuje już powiadomienia z serwera, gdy aplikacja jest na ekranie (wcześniej `tickRest` → `pushCancel` 2,2 s przed końcem). Odwołanie tylko przy „Pomiń przerwę”.
- Obrót: iOS nie obsługuje `orientation` z manifestu ani `screen.orientation.lock` (caniuse). `holdPage` (resize/orientationchange): przez 0,7 s przewijanie nie zmienia strony, scrollLeft = strona × szerokość (kilka prób). W poziomie na telefonie (`orientation:landscape and max-height:520px and pointer:coarse`) plansza `#rot` „Obróć telefon pionowo” (ui.js).
- Przejście (decyzja właściciela: dopiero po końcu przerwy): w przerwie po ostatniej serii ćwiczenia/superserii panel „NASTĘPNE ĆWICZENIE” + nazwa + „Seria 1 z N · ciężar×powt.” (`.sd-nx`); po ostatniej serii treningu „Ostatnia seria za Tobą / Po przerwie podsumowanie”. Koniec przerwy (także „Pomiń”) → `advanceAfterRest` (onRestChange): gdy ostatnio zaliczona seria (`F.ui.lastChk`) jest na bieżącej karcie i karta skończona → `goPage` na następną kartę z niezaliczonymi seriami albo podsumowanie. Ręczne przewinięcie w przerwie / „Cofnij” → bez przejścia. `ssCheck` ustawia `F.ui.lastChk` (wcześniej „Zapisano/Cofnij” pokazywały poprzednie ćwiczenie).
- Sprawdzone automatem (393×852, dotyk): zwykłe ćwiczenie (pominięta i naturalnie skończona przerwa), Cofnij, ręczne przewinięcie w przerwie, superseria, ostatnie ćwiczenie → podsumowanie, obrót tam i z powrotem na karcie 2.

## v1.36.1 — następny trening uwzględnia cardio (23.11.2026)
- Zgłoszenie: w poniedziałek po treningu ekran Dziś pokazywał „Następny trening: Śr — Dół 1”, choć na wtorek jest cardio (niebieska kropka). Karta cardio była tylko w dzień cardio (`cardioToday`).
- Ekran Dziś (`home`): najbliższa sesja cardio (`cardioQueue(14)`, niezrobiona, po dziś) przed następnym siłowym → karta „Jutro — cardio” / „Czwartek — cardio” z „Zacznij cardio teraz” i linią „Następny trening siłowy: … — środa”. Karta siłowa: „Następny trening · Środa”; „Dzień X z N” liczy tylko dni siłowe.
- Czat (`H.next`, `H.week`): wspólna kolejka siłowe + cardio (`allQ`); „co mam jutro/dziś”, „następny trening”, „co mam w czwartek” odpowiadają cardio z przyciskiem „Zacznij cardio”; „kiedy trenuję w tym tygodniu”: „2 treningi siłowe i 3 sesje cardio” + lista. Poprawione „Środę, 25 listopada” → „Środa, 25 listopada”.

## v1.36.0 — ćwiczenia jednorącz: seria = obie strony (23.11.2026)
- Zgłoszenie: wiosłowanie hantlą jednorącz (jedna hantla, prawa ręka, potem lewa, potem „Zalicz serię”) liczyło w tonażu jedną stronę (30 kg × 8 = 240 kg zamiast 480). Właściciel: NIE pokazywać „kg na hantlę” / „2×” przy jednej hantli — myli.
- core.js `F.uni(ex)`: `row_db`, `curl_con`, `kickback`, `glute_kick` + biblioteka po nazwie/aliasie (one arm, single arm, one leg, single leg, jednorącz, jedną ręką/nogą, na jednej nodze); wyjątek `bulgar` (dwie hantle). Nadpisanie: `settings.uni[id]` (bez UI). 67 ćwiczeń.
- Zapis = ciężar tej jednej hantli/strony (bez zmian w historii, 1RM i progresji — na stronę). `F.setVolume` i praca w kcal (`setWork`) × 2. `F.x2` = false dla `F.uni` (ćwiczenia jednorącz z biblioteki z hantlami były błędnie ×2).
- Migracja `settings.migUni1` (raz, po migawce autoSnap): ćwiczenia jednorącz z biblioteki z hantlami, które dotąd liczyły się jako dwie hantle (`F.wasX2Uni`), mają zapisany ciężar podzielony przez 2 (sesje, plany, szkic). `row_db`, `curl_con`, `kickback` były już na jedną hantlę — bez zmian w danych.
- Karta: kafel „Dziś 2 × 9 · 30 kg · każda strona”; panel serii „kg · 1 hantla”. Panel: kolumny `minmax(0,1fr)` + ucinanie zbyt długich etykiet.

## v1.35.0 — układ karty ćwiczenia (23.11.2026)
- Zgłoszenie: po uproszczeniu karta wyglądała pusto (wolne miejsce nad panelem serii), kafel „Dziś” nieładny. Prośba: gdy starczy miejsca, obie grafiki (sprzęt i mięśnie) jedna pod drugą.
- Slajd treningu (`.wk2 .wk-slide`) to kolumna flex: grafika (`.wk-art`) wypełnia wolne miejsce (min. clamp(120px,21vh,190px)), reszta bez rozciągania. Dolny margines slajdu = rzeczywista wysokość panelu serii (`--dockh`, ResizeObserver na `#set-dock`; zapamiętana największa wysokość — panel przerwy jest wyższy — żeby grafika nie skakała).
- `F.artFit()` (body.js, wołane w `after` widoku treningu): grafika ze sprzętem ≥190 px wysokości → klasa `stk`: dwa panele (sprzęt 1.15fr, mięśnie 1fr), czarne tło, cienka ramka, miękkie krawędzie obrazka (mask). Poniżej — dotychczasowy układ z miniaturą mięśni (przełączanie stuknięciem tylko w tym trybie). Sprawdzone: 393×852 i 393×793 (≈ iPhone z paskiem stanu) → dwa panele, także w czasie przerwy; 375×667 i 320×568 → miniatura.
- Kafel celu `.xt`: „DZIŚ 4 × 7 · 20 kg na hantlę” w jednej linii, pod spodem „Ostatnio 20 kg × 7, 6, 6, 6 · +1 powtórzenie”, notatka (rozgrzewka) jako stopka kafla.

## v1.34.0 — prostsza karta ćwiczenia (23.11.2026)
- Zgłoszenie: karta miała cel 3 razy (kafel, podpowiedź, panel), dwa różne zapasy (blok „3”, notatka „2–3”), podpowiedź każącą samemu dokładać powtórzenia, plakietkę ×2, przycisk „Zajęte”, pasek bloku. Decyzje właściciela: ŻADNEJ oceny serii (szybki zapis), ramka objaśnienia nad planem usunięta, tydzień bloku raz przy starcie.
- Karta: kafle „Poprzedni trening / Cel na dziś” → jeden kafel „Dziś 4 × 60 kg × 7” + „Ostatnio 60 kg × 7, 6, 6, 6 · +1 powtórzenie / więcej ciężaru / ten sam ciężar” albo „Pierwszy raz” (stuknięcie = wpisz cel w serie). Usunięte: podpowiedź „Pierwszy raz…”, pasek bloku, plakietka ×2 (w panelu „kg na hantlę / na stronę”), przycisk „Zajęte” (→ menu ⋯ „Sprzęt zajęty”). Notatka bez „Zapas…”, „partia priorytetowa…”, „ciężar startowy…” (`cleanNote`, także w superseriach).
- Panel serii: „powt. · zapas N” — N z tygodnia bloku (`F.blockInfo`), bez bloku z opisu planu, odciążenie „4+” (`rirOf`). Jedno źródło zapasu.
- Okienko „Przed treningiem”: „Blok: tydzień X z Y” (albo odciążenie).
- Szczegóły planu: usunięta ramka `repNote`.
- Zasada: aplikacja pamięta i liczy (cel, zapas, progresja); użytkownik tylko zalicza serie. Nie dodawać pytań ani ocen do zapisu serii.

## v1.33.0 — konkretna liczba powtórzeń zamiast samego zakresu (23.11.2026)
- Zgłoszenie: plan pokazywał „4×6-10” — nie wiadomo, ile zrobić. Diagnoza: zakres to podwójna progresja, ale cel liczbowy był tylko w trakcie treningu i tylko z historią; bez historii serie dostawały dół zakresu bez wyjaśnienia, plan i podgląd kreatora pokazywały sam zakres.
- core.js: `F.progModel(exId, {goal, role})` — cel Siła + rola `main` → 'load' (stałe powtórzenia = górna granica zakresu, rośnie ciężar; Plotkin 2022), reszta → 'reps' (podwójna progresja). `F.suggest`: tryb 'load'; „+1 powtórzenie” liczone od najsłabszej serii na ciężarze roboczym (wcześniej od ostatniej); reset po stagnacji w trybie 'load' wraca do górnej granicy. `F.repTarget(it, plan)` — konkretny cel na najbliższy trening: {r, w, lo, hi, model, first}.
- Plan (szczegóły): duża liczba = cel na najbliższy trening („4×7”), pod nazwą ciężar i „zakres 6–10” / „stałe 5 powt.”; karta nad dniami wyjaśnia zasadę zależnie od celu, link do porady. Podgląd kreatora: „4 × 6 · zakres 6–10”. Trening: serie wypełnione celem (z historią: ta sama waga → max(poprzednio, cel), bez historii → dół zakresu albo górna granica w trybie 'load'); „Cel na dziś 4×6 (zakres 6–10)”; podpowiedź „Pierwszy raz: dobierz ciężar…”; w superseriach „Cel 7 powt. (6–10)”. `role` i `goal` zapisane w ćwiczeniach treningu.
- „Dlaczego ten plan”: akapit „Ile powtórzeń zrobić” zamiast „Progresja” (zależny od celu).
- Źródła (PubMed, streszczenia): Schoenfeld 2017 (niskie vs wysokie obciążenia), Lopez 2021 (MSSE, metaanaliza sieciowa), Plotkin 2022 (PeerJ), Helms 2018 (Front Physiol), Larsen 2021 (PeerJ), Halperin 2022 (Sports Med), Zourdos 2016 (JSCR). Fakty `repRange`, `progReps`, `rirAuto` (77 źródeł, 57 faktów). Graham & Cleather 2021 pominięte — w PubMed brak streszczenia.
- Porady: artykuł `reps` — sekcje „Dlaczego w planie jest zakres…” i „Ile zrobić na tym treningu”. Czat: „6 czy 10 powtórzeń”, „dlaczego zakres”, „ile powtórzeń robić” → repRange+progReps (+ cel z planu użytkownika); „jak ocenić zapas”, „RPE” → rirAuto; „cel na dziś” — zasada zależna od modelu, bez historii konkretne „4 × 6” z zapasem z planu; „cele na najbliższy trening” z `F.repTarget`.

## v1.32.0 — zamiana i dodanie ćwiczenia od razu ustawia je na właściwym miejscu (23.11.2026)
- Zgłoszenie: w podglądzie kreatora zamiana ostatnich spięć brzucha na wyciskanie leżąc zostawiała wyciskanie na końcu dnia (z rolą, powtórzeniami i przerwą brzucha).
- planner.js: wspólny klucz `F.PLN.keyOf(it, {goal, prio})` (faza, priorytet, wielkość partii) dla pozycji kreatora i zwykłych pozycji planu; `orderDay` na nim; `F.PLN.placeItem(items, idx, ctx)` przesuwa tylko zmienione ćwiczenie (z superserią), resztę dnia zostawia w kolejności użytkownika; nie rusza, gdy miejsce już jest zgodne. `F.PLN.placeMsg` — komunikat „X → miejsce N (powód)”.
- Podgląd kreatora: `F.PLN.swapInRes` — nowa partia/rodzaj ćwiczenia → nowa rola, slot (zamienniki z właściwej puli), powtórzenia, przerwa z profilu planu, ciężar startowy z historii nowego ćwiczenia (wcześniej zostawał ciężar starego), potem miejsce. Zamiana na ten sam rodzaj i partię nie przesuwa. `F.PLN.refreshDay` po zamianie, usunięciu i przywróceniu: opisy (rozgrzewka wg nowej pozycji, „partia priorytetowa”), czas dnia, tygodniowe serie na partię (`F.PLN.volumeOf` — wcześniej po usunięciu się nie aktualizowały).
- Edycja planu (`itSwap`, `itAdd`) i zamiana z analizy planu (`coachSwap`): `F.placeInPlan(plan, day, idx)` + komunikat. Plany z kreatora zapisują `meta.prio`; starsze plany — bez priorytetów (reszta reguł działa). Strzałki w edycji i trening na żywo bez automatu.
- Refaktor: opis pozycji (`noteOf`), powtórzenia (`repsOf`), ciężar startowy (`startWOf`), `F.PLN.prioOf` wspólne dla generatora i podglądu — 270 planów identycznych przed/po.

## v1.31.0 — kolejność ćwiczeń w kreatorze oparta na badaniach (23.11.2026)
- Zgłoszenie właściciela: w planie z kreatora (Góra/Dół, priorytety klatka/barki/plecy) wiosłowanie stało w dniu dołu między RDL a uginaniem nóg — kolejność wyglądała na przypadkową. Diagnoza: sortowanie działało tylko przy priorytetach i limicie czasu; poza tym zostawała kolejność szablonu + ćwiczenia dokładane na koniec (np. hip thrust po brzuchu, prostowanie nóg przed wejściami). Automat na 18 792 dniach planów: 12 776 par „izolowane przed wielostawowym”, 7 422 z nich na ten sam mięsień (wstępne zmęczenie).
- `F.PLN.orderDay(items, prioM)` w planner.js, stosowane do każdego dnia każdego planu (po wszystkich korektach objętości): 1) boje celu Siła (`sq_main`, `bench_main`, `dl_main`, `ohp_main`), 2) ciężkie wielostawowe (`main`), 3) pomocnicze wielostawowe (`sec`; izolowane z puli, które są wielostawowe — 2,5), 4) izolowane. W grupie: partie priorytetowe, potem wielkość partii (nogi → klatka/plecy → barki → ręce → łydki → przedramiona → brzuch), remis = kolejność szablonu. Superserie jako całość. Wynik automatu: 0 par izolowane-przed-wielostawowym poza superseriami (1 510 w superseriach mieszanych przy krótkim czasie — świadomy wyjątek, opisany), boje zawsze pierwsze. Czas dni bez zmian (2 520 dni: średnio 57,70 vs 57,69 min, tyle samo przekroczeń).
- Ćwiczenie partii priorytetowej dołożone w dniu innej partii ma dopisek „partia priorytetowa: dodatkowe serie w tym dniu”. „Dlaczego ten plan”: nowe akapity Kolejność i Objętość (wyjaśniają limit serii na sesję i dokładanie w innym dniu).
- Źródła (sprawdzone w PubMed, streszczenia): Simão 2012 (Sports Med), Simão 2010 (JSSM), Spineti 2010 (JSCR), Assumpção 2013 (Clin Physiol Funct Imaging), Avelar 2019 (APNM), Tomeleri 2020 (JSCR), Brandão 2020 (JSCR), Augustsson 2003 (JSCR), Hermann 2026 (IJES). Fakty: `orderPrio`, `preEx`, `orderHyp` (razem 70 źródeł, 54 fakty).
- Porady i nauka: nowy artykuł `order` „Kolejność ćwiczeń w treningu”; v1.31.1 — grafika od właściciela `assets/guide/order.webp` (480×480, w `HAS` i CORE). Artykuł „Progresja…” odsyła do niego.
- Czat: „kolejność ćwiczeń”, „od największych do najmniejszych”, „czym zacząć trening” → orderPrio+preEx+orderHyp; „wstępne zmęczenie”, „biceps przed plecami” → preEx+orderPrio; „dlaczego w dniu nóg wiosłowanie” → nowa pozycja FEAT `prioDay`; „zmień/przestaw kolejność” → Edycja planu. Naprawione: „wiek”/„płeć” w odpowiedzi o profilu łapały „najwiękSZYCH” i „PLECami”; krótkie polecenie z trafieniem w funkcję aplikacji nie spada już do wyszukiwania w poradach.
- Plany zapisane wcześniej się nie zmieniają — nowa kolejność po ponownym przejściu kreatora.

## v1.30.3 — usuwanie ćwiczeń w podglądzie planu z kreatora (23.11.2026)
- Prośba właściciela: przed zapisem planu z kreatora można nie tylko zamienić, ale też usunąć ćwiczenie (× obok ⇄). W dniu zostaje min. 1 ćwiczenie; superseria z jednym ćwiczeniem przestaje być superserią; czas dnia przeliczany. Pasek „Usunięte: … — Przywróć ostatnie” (`wzDel`, `wzUndoDel`, `res.removed`).
- Usunięte „ok.” przy wyliczonym czasie dnia i białku w podglądzie kreatora.

## v1.30.2 — kolory: czerwony siłowy, niebieski cardio (23.11.2026)
- Decyzja właściciela: kropki czerwony = trening siłowy (#ff3b2f), niebieski = cardio (#2f8cff); stałe kolory niezależne od koloru akcentu. Pasek tygodnia, kalendarz (czerwona kropka w rogu dnia siłowego, niebieskie dni cardio z serduszkiem), etykiety w kolejce, przycisk „Dziś też cardio”.

## v1.30.1 — jedna kolejka dni; trening przeniesiony na dziś na górze (23.11.2026)
- Zgłoszenie: trening siłowy przeniesiony na dziś (z dalszego dnia) nie pojawiał się na górze ekranu Dziś — `calQueue(1)` liczył tylko dni źródłowe do jutra. Teraz `calQueue(60)`; w dzień z siłowym i cardio: karta treningu + „Dziś też cardio”.
- Kolejka w kalendarzu: jedna lista dni od dziś (gdy dziś nic nie zrobione), w każdym dniu siłowy i/lub cardio z etykietą i przyciskiem Start dla dzisiejszych.
- Ikona `heart` nie istniała w zestawie ikon (puste miejsca) → `heart-pulse`; także `qr-code`, `layout-list`, `home` w czacie zamienione na istniejące.

## v1.30.0 — osobne sesje cardio w kalendarzu i na ekranie Dziś (23.11.2026)
- Zgłoszenie: osobne sesje cardio (dni planu „Cardio: …”, `cardioOnly`) były widoczne tylko w planie. Teraz mają własne dni tygodnia: `settings.cal.cwd` albo automatycznie (`cardioWd`: najpierw dni bez siłowni, rozłożone równo; gdy brak wolnych — dni siłowe). `F.cardioQueue(days, from)`: k-ta sesja tygodnia = k-ty dzień cardio planu; zrobione = sesja tego dnia z dniem cardio. `F.cardioToday()`.
- Ekran Dziś: w dzień cardio bez siłowni — karta „Dziś cardio” z „Zacznij cardio” + „Następny trening siłowy: … — jutro”; w dzień z oboma — przycisk „Dziś też cardio” pod kartą treningu. Pasek tygodnia: kropki (pomarańczowa = siłowy, różowa = cardio) z legendą.
- Kalendarz (Historia): różowe dni cardio z kropką, sekcja „Cardio” pod kolejką, arkusz dnia z „Zacznij teraz: Cardio…”; „Dni treningowe” mają drugi wiersz „Osobne sesje cardio”. Karta aktualnego planu: wiersz „Cardio: Pn · Śr · Nd”.
- Sesja cardio zrobiona dziś nie przesuwa już treningu siłowego na jutro (`calQueue.doneToday` liczy tylko sesje siłowe).
- Czat: „zacznij cardio”, „co mam dziś” dopisuje cardio, opis funkcji zaktualizowany.

## v1.29.4 — aktualizacja nie może zapisać starych plików (22.11.2026)
- Właściciel po aktualizacji do 1.29.3 nadal widział błąd kreatora. Przyczyna: GitHub Pages wysyła pliki z `cache-control: max-age=600`, a instalacja nowego service workera (`addAll(CORE)`) mogła pobrać stary plik z pamięci przeglądarki i zapisać go pod nową wersją. Teraz instalacja pobiera CORE z `cache: 'reload'` (zawsze z serwera). Sprawdzone: świeża instalacja ma w pamięci poprawiony wizard.js.
- Zasada na przyszłość: po wydaniu nowej wersji poprawka dociera w całości przy pierwszej aktualizacji.

## v1.29.3 — kreator pamięta wybory po cofnięciu (22.11.2026)
- Zgłoszenie (nagranie): po cofnięciu do kroku Cel i powrocie krok Cardio pokazywał zaznaczoną opcję, ale „Dalej” mówił „Wybierz, co robimy z cardio”. Przyczyny: stuknięcie tego samego celu kasowało wybór cardio (`wzGoal` — teraz tylko przy zmianie celu) i walidacja nie uznawała opcji pokazanej jako zaznaczona domyślnie (teraz ją przyjmuje).
- Test `wzt.js`: 5 celów × szybki/zaawansowany — przejście do planu, cofnięcie do początku i ponowne przejście bez dotykania odpowiedzi: 10/10.

## v1.29.2 — Wstecz w kreatorze (22.11.2026)
- Zgłoszenie właściciela: po wejściu w podgląd planu z kreatora nie dało się wrócić. Teraz: strzałka Wstecz w nagłówku podglądu (wraca do wyboru podziału, odpowiedzi zostają) i przycisk „Wstecz” zamiast „Zmień odpowiedzi”; w krokach kreatora strzałka w nagłówku cofa o krok (na pierwszym kroku wychodzi). `F.head` przyjmuje `back: 'nazwaAkcji'`.
- Zasada: każdy ekran, w który się wchodzi, ma Wstecz (sprawdzone automatem na 18 trasach; zakładki dolnego paska i arkusze z × są wyjątkiem).
- Usunięte „ok.” z opisu „Dlaczego ten plan” (objętość, zakres powtórzeń, RIR, odciążenie, powrót po przerwie, cardio).

## Audyt v1.29.1 (22.11.2026)
- Automaty: skrypt `audit.js` (scratchpad) — 25 tras × pusty/pełny × 320 px i Pixel 7: błędy JS, „undefined/NaN”, zastrzeżenia, angielskie słowa, poziomy scroll, wychodzące/ucięte elementy, obrazki, przyciski bez etykiety; `sheets.js` — 15 arkuszy na 320 px; crawl; testy czatu (3184 sformułowania + efekty); calc 27/27.
- Naprawione: 320 px — przewijanie w poziomie w historii ćwiczenia (krótsze nazwy wykresów: 1RM / Ciężar / Objętość / Powtórzenia), nazwy ćwiczeń nachodzące na przyciski w edytorze planu (przyciski przechodzą do drugiej linii), ucięty ciężar w panelu serii (mniejsza czcionka i przyciski ≤374 px), kolory w jednym rzędzie, wyśrodkowane przyciski w pustych stanach.
- Spójność: „deload” → „odciążenie” wszędzie w interfejsie; „Max” → „Maks.”; usunięte „ok.” przy liczbach liczonych przez aplikację (cytaty z badań bez zmian), „oszacuję” → „wyliczę”, rozmiar modułów importu 11,5 MB; kropka po XP w randze; „0,4 MB” zamiast „0.4 MB”; spacja w stopce Ustawień.
- Planer podejść (Narzędzia): punkty IPF GL + DOTS i Wilks; podpowiedź kieruje do Ustawienia → Profil (zamiast nieistniejącego miejsca w Siła). Karta Zawody jest w Postępy → Siła — poprawione opisy w czacie.
- Kopia zapasowa zawiera teraz podopiecznych trybu trenera (`clients`), przywracanie je scala (nowszy plik wygrywa).
- Zdjęcia techniki offline: od razu komunikat zamiast białego pola.
- Przyciski −/+ celu tygodniowego mają etykiety dla czytników ekranu.

## v1.29.0 — czat: polecenia i wiedza o całej aplikacji (22.11.2026)
- Nowy `js/ask2.js` (ładowany po ask.js i tour.js, w CORE). Owija `F.ask`: najpierw rozmowa (układanie planu), potem polecenia, potem mapa aplikacji (FEAT, ~75 funkcji: tytuł, gdzie jest, jak działa, przyciski), na końcu stary czat. `F.ask` może zwrócić Promise (zapis do bazy) — `send()` w ask.js robi `await`.
- Polecenia (wywołują te same funkcje co przyciski): ustawienia (przełączniki, jednostki, krok, cel tygodniowy, głośność, ostrzeżenie, kolor, talerze, gryf, wygaszanie ekranu), profil (imię, płeć, wiek, wzrost, staż, aktywność, tętno), waga i pomiary, miejsce treningu, start/skrócenie/powtórzenie treningu, odciążenie, nowy blok, aktualny plan, plany startowe, przerwy w planie, kalendarz (przenieś, pomiń, dni treningowe), cele (miesięczne, na dłużej), zawody, raport PDF/tygodnia/podsumowanie, kopia, CSV, tryb trenera (włącz, wyślij plan → link i QR, wyniki dla trenera, podopieczni, „co u Kasi”), powiadomienia, nawigacja.
- Układanie planu w rozmowie: cel → dni → sprzęt → staż (gdy brak w profilu) → ankieta bezpieczeństwa (ta sama co kreator) → ciąża/poród (kobiety → kreator). `F.wzBuild(opts, variant)` w wizard.js = ten sam generator co kreator. Plan zapisany, NIE aktualny; pytanie „Ustawić jako aktualny?”, „Inny wariant” podmienia plan.
- „Cofnij”: `F.act.askUndo` (mapa funkcji w pamięci — po przeładowaniu cofnięcie niedostępne, czat to mówi). Usuwanie zablokowane (`delCmd`).
- Literówki: słownik z opisów FEAT, podpowiedzi, nazw ćwiczeń i listy słów poleceń; poprawka tylko gdy żadne słowo nie ma tego samego 6-literowego początku.
- Testy: `gen.js` → `chat_tests.json` (3165 sformułowań), `ct.js` (trasy, F.askDry), `cf.js` (efekty + cofanie). Wynik: 3161/3165.
- Przy okazji: „Rekord 1RM (szac.)” → „(wyliczony)”.

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
