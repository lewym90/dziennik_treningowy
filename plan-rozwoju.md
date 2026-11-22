# FORGE — plan rozwoju (decyzje właściciela, 21.11.2026)

Zasady: wszystko po polsku, schludnie i intuicyjnie (każdy ma wiedzieć, gdzie kliknąć), tylko sprawdzone źródła, bez AI, offline. Grafiki: właściciel generuje z angielskich promptów (jeden prompt na grafikę, osobny blok). Biznesplan i sprzedaż — odłożone; najpierw rozbudowa aplikacji.

| Nr | Funkcja | Decyzja |
|---|---|---|
| 1 | Seria jednym dotknięciem (szybkie zapisywanie serii) | Najpierw pokazać makietę |
| 2 | Bloki treningowe 4–6 tyg. z odciążeniem, podpowiedź z zapasem powtórzeń (RIR) | Zgoda |
| 3 | „Mam mało czasu” — skracanie dzisiejszego treningu (30/45/60 min) | Zgoda |
| 4 | Profile siłowni (Siłownia/Dom/Hotel) + przycisk „Zajęte” z zamiennikiem | Zgoda |
| 5 | Animacje techniki | Do przemyślenia — nie może być tak, że część ćwiczeń ma animacje, a część nie |
| 6 | Głosowe zapisywanie serii | Zgoda |
| 7 | Przycisk „Boli” w trakcie treningu | Zgoda |
| 8 | Moduł trójboisty | Zgoda tylko jeśli ma oparcie w danych i badaniach; nic, co mogłoby komuś zaszkodzić na zawodach |
| 9 | Cel z prognozą | Zgoda |
| 10 | Podsumowanie miesiąca i roku (karty do udostępnienia) | Zgoda |
| 11 | Porównanie sylwetki ze zdjęć | Zgoda; wyraźna informacja, że zdjęcia nie wychodzą poza telefon, są prywatne i bezpieczne; zdjęcia objęte kopią zapasową na telefonie |
| 12 | Samopoczucie przed treningiem (sen, energia) | Zgoda |
| 13 | Aplikacja natywna | Jeszcze nie |
| 14 | Health Connect / Apple Zdrowie | Jeszcze nie |
| 15 | Zegarek | Jeszcze nie |
| 16 | Widżety i stoper na ekranie blokady | Jeszcze nie |
| 17 | Partner treningowy i wyzwania | Nie |
| 18 | Tryb trenera | Zgoda |
| 19 | Biblioteka programów | Zgoda |
| 20 | Synchronizacja i kopia w chmurze | Raczej nie, właściciel przemyśli |
| 21 | Szybki start | Zgoda, ale bez wykluczania opcji: zakładki typu „Szybki start / Zaawansowany” |
| 22 | Szybszy start aplikacji (baza ćwiczeń w tle) | Zgoda |
| 23 | Raport PDF | Zgoda; profesjonalny, zaawansowany, idealny wygląd: logo, grafiki, ładne wykresy |
| 24 | Wersja angielska i ukraińska | Zgoda, ale na samym końcu, gdy aplikacja będzie w pełni gotowa |

Dodatkowo: przebudowa nawigacji — aplikacja ma być schludna i intuicyjna, bez opcji pochowanych po menu. To pierwszy krok, przed nowymi funkcjami.

## Nawigacja (decyzje 21.11.2026)
- Makieta punktu 1: pomysł tak, wykonanie słabe — zostaje duża grafika przełączana sprzęt/mięśnie, połączona z dolnym panelem serii.
- N1 jedna zasada (każda funkcja w jednym miejscu, zakładki = pytania: Dziś / Plany / Historia / Postępy) — zgoda.
- N2 odchudzony ekran Dziś (4 kafle: Żywienie, Porady i nauka, Narzędzia, Wpisz wagę; „Kalendarz ›” przy „Ten tydzień”) — zgoda.
- N3 Historia z przełącznikiem Lista | Kalendarz — zgoda.
- N4 Postępy: Przegląd / Mięśnie / Siła / Ciało — zgoda.
- N5 jeden profil w Ustawieniach — zgoda, bez linijki „Zmień” w innych miejscach; wiek: aplikacja pamięta, kiedy wpisano, i co rok dodaje rok.
- N6 Ustawienia w 5 sekcjach — zgoda.
- N7 wyszukiwarka — NIE (zagraca ekran).
- N8 porządek w menu „⋯” — zgoda.
- N9 spójne nazwy — zgoda.
- N10 pierwsze uruchomienie i jednorazowe podpowiedzi — zgoda.
- N11 najpierw porządek, potem nowe funkcje — zgoda.
- Zasada nadrzędna: nie komplikować, upraszczać i ułatwiać korzystanie.

## Stan wdrożenia
- v1.26.0: N1–N10 (nawigacja).
- v1.27.0: punkty 1, 2, 3, 4, 6, 7, 9, 10, 11, 12, 21, 22.
- v1.28.0: punkty 8 (tylko informacje z badań, bez układania szczytowania), 18, 19, 23.
- Zostało: 5 do przemyślenia (animacje), 20 do decyzji (chmura), 13–16 później, 24 na samym końcu.

## Czat „Zapytaj FORGE” — polecenia (decyzje 22.11.2026)
- Czat ma wiedzieć wszystko o całej aplikacji i wykonywać polecenia (tysiące sformułowań, literówki).
- Plan ułożony przez czat: tylko zapis w Planach + pytanie „Ustawić jako aktualny?” (nie zmienia aktualnego planu sam).
- Polecenia zmieniające ustawienia lub dane: wykonane od razu, w odpowiedzi przycisk „Cofnij”.
- Usuwanie przez czat: zablokowane — czat tylko prowadzi na miejsce, gdzie się usuwa.
- Stała zasada: każda nowa funkcja aplikacji = wpis w mapie aplikacji czatu (FEAT w js/ask2.js) + polecenie, jeśli ma sens.
- Wdrożone w v1.29.0.
