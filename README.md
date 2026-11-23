# FORGE — dziennik treningowy

Instalowalna aplikacja (PWA) dla ludzi, którzy podnoszą ciężko. Działa offline, bez kont i bez chmury. Dane zostają na urządzeniu.

## Publikacja na GitHub Pages
1. Utwórz nowe repozytorium na GitHub (np. `dziennik_treningowy`) i wgraj do niego **całą zawartość tego folderu** (`index.html`, `sw.js`, `manifest.webmanifest`, `css/`, `js/`, `fonts/`, `icons/`, `vendor/`, `.nojekyll`).
2. W repozytorium: **Settings → Pages → Build and deployment → Source: Deploy from a branch**, gałąź `main`, folder `/ (root)`.
3. Po minucie aplikacja jest pod `https://lewym90.github.io/dziennik_treningowy/`.

## Instalacja na telefonie
- **Android (Chrome):** menu ⋮ → „Zainstaluj aplikację" (albo baner w aplikacji).
- **iPhone (Safari):** Udostępnij → „Do ekranu początkowego".

## Funkcje
- **Trening** na pełnoekranowych kartach przesuwanych palcem: duża grafika sprzętu i pulsujących mięśni, panel serii (ciężar, powtórzenia, „Zalicz serię”), stoper przerwy z ostrzeżeniem, przejście do następnego ćwiczenia po przerwie, superserie, „Sprzęt zajęty”, „Boli przy tym ćwiczeniu”, głosowe zapisywanie serii, serie rozgrzewkowe z wyliczonym ciężarem.
- **Kreator planu** oparty na badaniach (cel, staż, dni, sprzęt, ograniczenia, cardio): kolejność ćwiczeń, konkretna liczba powtórzeń, objętość, przerwy, bloki z odciążeniem, uzasadnienie ze źródłami. Plany startowe, edycja planu, tryb trenera (plan przez link/QR).
- **Postępy**: przegląd, mapa mięśni z liczbą serii, siła (maksy, rekordy, poziomy, trójbój), ciało (waga, pomiary, zdjęcia), cele z prognozą, podsumowania miesiąca i roku, raport PDF.
- **Żywienie**: zapotrzebowanie (Mifflin–St Jeor / Katch–McArdle × aktywność wg FAO i polskich norm + treningi), korekta z trendu masy ciała, białko, tłuszcz i węglowodany ze źródłami, jadłospis na 7 dni z przepisami, wykluczenia, zamienniki produktów, lista zakupów, woda, błonnik, witamina D.
- **Porady i nauka**: ponad 20 artykułów, każdy fakt ze źródłem (przeglądy, metaanalizy, stanowiska towarzystw).
- **Zapytaj FORGE**: czat offline bez AI — odpowiada z Twoich danych i z bazy wiedzy, wykonuje polecenia (z „Cofnij”).
- Kalendarz z przenoszeniem i pomijaniem treningów, osobne sesje cardio, kalkulatory (talerze, 1RM, rozgrzewka, podejścia na zawody).
- Animacje i przejścia między ekranami (Ustawienia → Wygląd: Pełne / Oszczędne).
- Nieograniczona historia (IndexedDB), eksport JSON i CSV, kopia i przywracanie, karta treningu do udostępnienia.
- **Import planów:** PDF (tekst i skany), zrzuty ekranu, zdjęcia (OCR po polsku/angielsku), wklejony tekst, CSV; import historii ze Strong, Hevy, FitNotes. Przed zapisem sprawdzasz i poprawiasz wynik.

## Uwagi
- Testy przed każdym wydaniem: `bash tests/run.sh` (obliczenia, scenariusze w przeglądarce, serwer powiadomień; potrzebny Playwright z Chromium).
- Moduły OCR i PDF (~11 MB) pobierają się przy pierwszym użyciu importu. Przycisk „Pobierz moduły offline” w ekranie Import robi to z góry.
- Po zmianie plików zwiększ `VERSION` w `sw.js` i `F.APPVER` w `js/core.js`, aby użytkownicy dostali aktualizację.
- Dane są w pamięci przeglądarki (aplikacja prosi o trwałe przechowywanie). Rób kopie zapasowe (Ustawienia → Dane i kopia).
- Ikony: Lucide (ISC). Fonty: Barlow (SIL OFL). OCR: Tesseract.js (Apache-2.0). PDF: PDF.js (Apache-2.0). Wartości odżywcze: USDA FoodData Central (SR Legacy, domena publiczna).

## Powiadomienia o końcu przerwy (serwer Web Push)

Przy zablokowanym telefonie system usypia aplikację, więc koniec przerwy musi przyjść z serwera. Folder `server/` zawiera małą usługę Web Push (Node, `web-push`) dla własnego VPS-a, w tym samym stylu co Kalendarz i Poczta:

1. Jako root na serwerze: `bash <(curl -fsSL https://raw.githubusercontent.com/lewym90/dziennik_treningowy/main/server/install.sh)`. Instalator tworzy osobnego użytkownika, usługę `forge-push` na `127.0.0.1:8793` i trasę `/forge-push/` w Caddy (z walidacją i wycofaniem). Wypisuje adres i kod połączenia.
2. W FORGE (na iPhonie z ekranu początkowego): Ustawienia → Dźwięk i powiadomienia → „Włącz powiadomienia”. Kod połączenia jest potrzebny tylko, gdy serwer ma `REQUIRE_CODE=1`.

Każdy telefon ma własny identyfikator i token, a serwer trzyma osobny timer dla każdego urządzenia, więc każdy dostaje wyłącznie swoje powiadomienia. Osobno serwer wysyła niedzielne podsumowanie tygodnia (trasa `/week`), które telefon planuje sam. Nic nie gra w tle, więc muzyka nie jest przerywana. Testy: `cd server && npm install && npm test`.
