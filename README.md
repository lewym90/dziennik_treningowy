# FORGE — dziennik treningowy

Instalowalna aplikacja (PWA) dla ludzi, którzy podnoszą ciężko. Działa offline, bez kont i bez chmury. Dane zostają na urządzeniu.

## Publikacja na GitHub Pages
1. Utwórz nowe repozytorium na GitHub (np. `forge`) i wgraj do niego **całą zawartość tego folderu** (`index.html`, `sw.js`, `manifest.webmanifest`, `css/`, `js/`, `fonts/`, `icons/`, `vendor/`, `.nojekyll`).
2. W repozytorium: **Settings → Pages → Build and deployment → Source: Deploy from a branch**, gałąź `main`, folder `/ (root)`.
3. Po minucie aplikacja jest pod `https://TWOJ-LOGIN.github.io/forge/`.

## Instalacja na telefonie
- **Android (Chrome):** menu ⋮ → „Zainstaluj aplikację" (albo baner w aplikacji).
- **iPhone (Safari):** Udostępnij → „Do ekranu początkowego".

## Funkcje
- Dziennik: własna biblioteka ćwiczeń (~120 gotowych + własne), serie, powtórzenia, ciężar, RPE, rozgrzewki, drop sety.
- Plany tworzone przez użytkownika, plany startowe (PPL, Góra/Dół, 5×5, Full Body, Pośladki i nogi).
- Trening na żywo: podpowiedź celu (progresja), poprzedni wynik, automatyczny stoper przerw (dźwięk, wibracja, ekran nie gaśnie), wykrywanie rekordów z animacją.
- Wykresy 1RM / ciężaru / objętości, rekordy życiowe, tonaż tygodniowy, podział partii, waga ciała, rangi i osiągnięcia.
- Kalkulatory: talerze, 1RM, rozgrzewka.
- Nieograniczona historia (IndexedDB), eksport JSON i CSV, kopia i przywracanie, karta treningu do udostępnienia.
- **Import planów:** PDF (tekst i skany), zrzuty ekranu, zdjęcia (OCR po polsku/angielsku), wklejony tekst, CSV; import historii ze Strong, Hevy, FitNotes. Przed zapisem sprawdzasz i poprawiasz wynik. Na Androidzie można też wysłać zrzut przez menu „Udostępnij".

## Uwagi
- Moduły OCR i PDF (~11 MB) pobierają się przy pierwszym użyciu importu. Przycisk „Pobierz moduły offline" w ekranie Import robi to z góry.
- Po zmianie plików zwiększ `VERSION` w `sw.js`, aby użytkownicy dostali aktualizację.
- Dane są w pamięci przeglądarki. Rób kopie zapasowe (Ustawienia → Dane).
- Ikony: Lucide (ISC). Fonty: Barlow (SIL OFL). OCR: Tesseract.js (Apache-2.0). PDF: PDF.js (Apache-2.0).

## Powiadomienia o końcu przerwy (serwer Web Push)

Przy zablokowanym telefonie system usypia aplikację, więc koniec przerwy musi przyjść z serwera. Folder `server/` zawiera małą usługę Web Push (Node, `web-push`) dla własnego VPS-a, w tym samym stylu co Kalendarz i Poczta:

1. Jako root na serwerze: `bash <(curl -fsSL https://raw.githubusercontent.com/lewym90/dziennik_treningowy/main/server/install.sh)`. Instalator tworzy osobnego użytkownika, usługę `forge-push` na `127.0.0.1:8793` i trasę `/forge-push/` w Caddy (z walidacją i wycofaniem). Wypisuje adres i kod połączenia.
2. W FORGE (z ekranu początkowego): Ustawienia → Powiadomienia z serwera → wpisz kod → „Połącz”.

Każdy telefon ma własny identyfikator i token, a serwer trzyma osobny timer dla każdego urządzenia, więc każdy dostaje wyłącznie swoje powiadomienia. Kod połączenia służy tylko do pierwszej rejestracji. Nic nie gra w tle, więc muzyka nie jest przerywana. Testy: `cd server && npm install && npm test`.
