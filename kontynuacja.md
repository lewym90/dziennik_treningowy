# FORGE — stan prac i kontynuacja

Stan na 21 listopada 2026. Wersja **1.20.0** („Zapytaj FORGE”), opublikowana i sprawdzona online.

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
- Testy: skrypty `ask.js`/`ask2.js`/`ask3.js` w scratchpadzie (60 pytań z danymi + pusty użytkownik), 0 błędów.

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
