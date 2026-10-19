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
