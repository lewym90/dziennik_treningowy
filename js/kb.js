/* FORGE — ukryta baza wiedzy. Zasady, z których korzysta kreator planu, oraz fakty i źródła do kompendium „Porady i nauka”.
   ZASADA: w bazie są wyłącznie treści, które zweryfikowano w pełnym tekście lub w oficjalnym streszczeniu źródła.
   Źródła pokazujemy WYŁĄCZNIE w kompendium; uzasadnienie planu ich nie zawiera.
   Pole `k` opisuje rodzaj dowodów (to nie jest ocena „pewności” — to informacja, skąd pochodzi wiedza).
   Teksty są po polsku w jednym miejscu, żeby łatwo je przetłumaczyć. */
(function () {
  const F = window.F = window.F || {};
  F.KB = {};

  F.KB.src = {
    acsm2026: { a: 'Phillips SM i in. (American College of Sports Medicine)', y: 2026, t: 'Resistance training prescription for muscle function, hypertrophy, and physical performance in healthy adults: an overview of reviews', j: 'Med Sci Sports Exerc 58(4):851–872', u: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC12965823', k: 'stanowisko towarzystwa: przegląd 137 przeglądów systematycznych, ponad 30 000 uczestników' },
    acsm2009: { a: 'American College of Sports Medicine (Ratamess N i in.)', y: 2009, t: 'Progression models in resistance training for healthy adults', j: 'Med Sci Sports Exerc 41(3):687–708', u: 'https://www.sportgeneeskunde.com/wp-content/uploads/ACSM-Position-Stand-Progression-Models-in-Resistance-Training-for-Healthy-Adults.pdf', k: 'stanowisko towarzystwa' },
    who2020: { a: 'Bull FC i in. (Światowa Organizacja Zdrowia)', y: 2020, t: 'World Health Organization 2020 guidelines on physical activity and sedentary behaviour', j: 'Br J Sports Med 54(24):1451–1462', u: 'https://www.ncbi.nlm.nih.gov/books/NBK566048/', k: 'wytyczne WHO (rekomendacje „silne”, pewność dowodów umiarkowana)' },
    baz2022: { a: 'Baz-Valle E, Balsalobre-Fernández C, Alix-Fages C, Santos-Concejero J', y: 2022, t: 'A systematic review of the effects of different resistance training volumes on muscle hypertrophy', j: 'J Hum Kinet 81:199–210', u: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC8884877/', k: 'przegląd systematyczny' },
    schoenfeld2021: { a: 'Schoenfeld BJ, Grgic J, Van Every DW, Plotkin DL', y: 2021, t: 'Loading recommendations for muscle strength, hypertrophy, and local endurance: a re-examination of the repetition continuum', j: 'Sports 9(2):32', u: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC7927075', k: 'przegląd z metaanalizami' },
    singer2024: { a: 'Singer A, Wolf M, Generoso L i in.', y: 2024, t: 'Give it a rest: a systematic review with Bayesian meta-analysis on the effect of inter-set rest interval duration on muscle hypertrophy', j: 'Front Sports Act Living 6:1429789', u: 'https://doi.org/10.3389/fspor.2024.1429789', k: 'przegląd systematyczny z metaanalizą (9 badań)' },
    bell2023: { a: 'Bell L, Nolan D, Immonen V i in.', y: 2023, t: 'Integrating deloading into strength and physique sports training programmes: an international Delphi consensus approach', j: 'Sports Med Open 9:86', u: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC10511399', k: 'konsensus ekspertów (metoda Delphi, 21 ekspertów w ostatniej rundzie) — nie badanie eksperymentalne' },
    lundberg2022: { a: 'Lundberg TR, Feuerbacher JF, Sünkeler M, Schumann M', y: 2022, t: 'The effects of concurrent aerobic and strength training on muscle fiber hypertrophy: a systematic review and meta-analysis', j: 'Sports Med 52', u: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9474354/', k: 'przegląd systematyczny z metaanalizą (15 badań)' },
    issn2017: { a: 'Jäger R, Kerksick CM, Campbell BI i in.', y: 2017, t: 'International Society of Sports Nutrition position stand: protein and exercise', j: 'J Int Soc Sports Nutr 14:20', u: 'https://pubmed.ncbi.nlm.nih.gov/28642676/', k: 'stanowisko towarzystwa' },
    aragon2017: { a: 'Aragon AA, Schoenfeld BJ, Wildman R i in.', y: 2017, t: 'International Society of Sports Nutrition position stand: diets and body composition', j: 'J Int Soc Sports Nutr 14:16', u: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5470183', k: 'stanowisko towarzystwa' },
    lauersen2014: { a: 'Lauersen JB, Bertelsen DM, Andersen LB', y: 2014, t: 'The effectiveness of exercise interventions to prevent sports injuries: a systematic review and meta-analysis of randomised controlled trials', j: 'Br J Sports Med 48:871–877', u: 'https://blogs.bmj.com/bjsm/2014/07/20/exercises-to-prevent-sports-injuries-lots-of-talk-but-do-they-work/', k: 'przegląd systematyczny z metaanalizą (25 badań, 26 610 uczestników; link do omówienia)' },
    watson2015: { a: 'Watson NF, Badr MS, Belenky G i in. (AASM, Sleep Research Society)', y: 2015, t: 'Recommended amount of sleep for a healthy adult: a joint consensus statement', j: 'J Clin Sleep Med 11(6):591–592', u: 'https://www.aasm.org/resources/pdf/adultsleepdurationconsensus.pdf', k: 'konsensus towarzystw (panel 15 ekspertów, przegląd 5 314 prac)' },
    schoenfeld2013: { a: 'Schoenfeld BJ, Contreras B', y: 2013, t: 'Is postexercise muscle soreness a valid indicator of muscular adaptations?', j: 'Strength Cond J 35(5)', u: 'https://bretcontreras.com/wp-content/uploads/Is-Postexercise-Muscle-Soreness-a-Valid-Indicator-of-Muscular-Adaptations.pdf', k: 'przegląd narracyjny' },
    tanaka2001: { a: 'Tanaka H, Monahan KD, Seals DR', y: 2001, t: 'Age-predicted maximal heart rate revisited', j: 'J Am Coll Cardiol 37(1):153–156', u: 'https://doi.org/10.1016/S0735-1097(00)01054-8', k: 'metaanaliza i badanie' },
    mifflin1990: { a: 'Mifflin MD, St Jeor ST, Hill LA, Scott BJ, Daugherty SA, Koh YO', y: 1990, t: 'A new predictive equation for resting energy expenditure in healthy individuals', j: 'Am J Clin Nutr 51(2):241–247', u: 'https://doi.org/10.1093/ajcn/51.2.241', k: 'badanie' }
  };

  /* ---------- FAKTY (każdy: treść zweryfikowana w źródle) ---------- */
  F.KB.facts = {
    who: { src: ['who2020'], pl: 'WHO zaleca dorosłym (18–64 lata) co najmniej 150–300 minut tygodniowo aktywności tlenowej o umiarkowanej intensywności (lub 75–150 minut intensywnej) oraz ćwiczenia wzmacniające mięśnie wszystkich głównych grup, o umiarkowanej lub większej intensywności, co najmniej 2 dni w tygodniu. Dla osób 65+ dodatkowo wieloskładnikowy trening równowagi i siły 3 lub więcej dni w tygodniu. Zalecenia są oceniane jako „silne”, a pewność dowodów jako umiarkowana.' },
    gen: { src: ['acsm2026'], pl: 'Stanowisko ACSM z 2026 r. (przegląd 137 przeglądów systematycznych) potwierdza, że trening oporowy poprawia siłę, masę mięśniową i moc w porównaniu z brakiem treningu. Dla zdrowia ogólnego zaleca wykonywanie go z dużym wysiłkiem co najmniej 2 razy w tygodniu, angażując wszystkie główne grupy mięśniowe.' },
    volume: { src: ['acsm2026', 'baz2022'], pl: 'ACSM (2026): dla przyrostu masy mięśniowej korzystne jest co najmniej 10 serii tygodniowo na grupę mięśniową; zależność ma charakter dawka–efekt, a korzyści maleją w okolicy 18–20 serii tygodniowo. Dokładnej liczby serii nie da się wskazać. Przegląd Baz-Valle i in. (2022) sugeruje u młodych, wytrenowanych mężczyzn zakres 12–20 serii tygodniowo; autorzy zaznaczają, że dowodów jest niewiele.' },
    strengthSets: { src: ['acsm2026'], pl: 'Dla siły przyrosty wyrównują się przy ok. 2–3 seriach na ćwiczenie w jednej sesji; zalecane jest co najmniej 2 serie na ćwiczenie i co najmniej 2 sesje tygodniowo. Ciężary od ok. 80% maksymalnego (1RM) i więcej zwiększały siłę wyraźniej.' },
    freq: { src: ['acsm2026'], pl: 'ACSM (2026): dla przyrostu masy mięśniowej, gdy łączna tygodniowa objętość jest taka sama, nie ma znaczenia, czy trenujesz grupę mięśniową raz, czy kilka razy w tygodniu. Dla siły zalecane są co najmniej 2 sesje tygodniowo. Wniosek: podział treningowy to narzędzie do wygodnego rozłożenia objętości, a nie czynnik rozstrzygający.' },
    reps: { src: ['acsm2026', 'schoenfeld2021'], pl: 'ACSM (2026): dla przyrostu masy ciężar w zakresie od ok. 30% do 100% 1RM daje podobne efekty, jeśli wysiłek jest duży; dla siły wyraźnie lepsze są ciężary od ok. 80% 1RM. Przegląd Schoenfelda i in. (2021) wskazuje, że dolna granica skutecznego obciążenia to ok. 30% 1RM, a lekkie obciążenia wymagają bardzo dużego wysiłku w serii.' },
    failure: { src: ['acsm2026'], pl: 'ACSM (2026): trening do upadku mięśniowego nie dawał dodatkowych korzyści dla siły, masy ani mocy. Za wystarczający wysiłek uznano serie kończone blisko upadku, np. z zapasem 2–3 powtórzeń (RIR 2–3); autorzy zaznaczają, że brakuje danych, by wskazać dokładną liczbę. U osób starszych trening do upadku może być niewskazany ze względu na ryzyko naczyniowe i urazowe.' },
    rest: { src: ['singer2024', 'acsm2026', 'acsm2009'], pl: 'Singer i in. (2024): dla przyrostu masy przerwy dłuższe niż ok. 1 minuta dawały niewielką korzyść, a powyżej ok. 1,5 minuty nie widać wyraźnych różnic. ACSM (2026): dla siły nie było różnicy między krótszą (poniżej 1 min) a dłuższą (powyżej 1 min) przerwą. Starsze stanowisko ACSM (2009) zalecało 1–2 min dla przyrostu masy i 3–5 min dla siły i mocy u zaawansowanych.' },
    rom: { src: ['acsm2026'], pl: 'ACSM (2026): pełny zakres ruchu poprawiał siłę wyraźniej niż częściowy. Maszyny i wolne ciężary nie różniły się spójnie pod względem siły i przyrostu masy. Wykonywanie ćwiczeń na początku sesji poprawiało siłę, a dla przyrostu masy kolejność nie miała znaczenia.' },
    order: { src: ['acsm2009'], pl: 'ACSM (2009): rozsądna kolejność to duże grupy przed małymi, ćwiczenia wielostawowe przed jednostawowymi i cięższe przed lżejszymi; warto łączyć ćwiczenia jedno- i obustronne oraz wielo- i jednostawowe.' },
    progression: { src: ['acsm2009', 'acsm2026'], pl: 'ACSM (2009): zwiększ obciążenie o ok. 2–10%, gdy potrafisz wykonać o 1–2 powtórzenia więcej od zaplanowanych. ACSM (2026): periodyzacja nie była istotnie lepsza od planu nieperiodyzowanego, jeśli przeciążenie jest odpowiednie; do dalszych postępów w dłuższym czasie prawdopodobnie potrzebne jest stopniowe zwiększanie wymagań.' },
    deload: { src: ['bell2023'], pl: 'Konsensus 21 ekspertów (Bell i in., 2023): odciążenie to okres zmniejszonego obciążenia treningowego, mający ograniczyć zmęczenie fizyczne i psychiczne. Eksperci zgodzili się, że można je planować na końcu mezocyklu, zwykle zmniejszając liczbę serii przy zachowaniu podobnego ciężaru, zmniejszając bliskość upadku, zachowując znane ćwiczenia wielostawowe i częstotliwość treningów. Autorzy podkreślają, że badań naukowych na ten temat jest mało, a zalecenia opierają się na doświadczeniu praktyków.' },
    concurrent: { src: ['lundberg2022'], pl: 'Metaanaliza Lundberga i in. (2022; 15 badań) wykazała niewielkie osłabienie przyrostu włókien mięśniowych przy łączeniu treningu tlenowego i siłowego, wyraźniejsze przy bieganiu niż przy jeździe na rowerze (tylko 3 badania dotyczyły biegania). Kolejność w sesji ani rozdzielenie treningów na różne dni nie miały istotnego wpływu. Autorzy ostrożnie sugerują rower osobom, którym zależy na masie mięśniowej.' },
    injury: { src: ['lauersen2014'], pl: 'Metaanaliza Lauersena i in. (2014; 25 badań z randomizacją, 26 610 uczestników) wykazała, że programy treningu siłowego zmniejszały liczbę urazów sportowych do niecałej jednej trzeciej (RR 0,32), podczas gdy samo rozciąganie nie zmniejszało ryzyka. Dotyczy to populacji sportowych.' },
    sleep: { src: ['watson2015'], pl: 'Konsensus towarzystw (Watson i in., 2015): dorośli w wieku 18–60 lat powinni regularnie spać co najmniej 7 godzin na dobę. Indywidualne zapotrzebowanie różni się; osoby, które martwią się zbyt krótkim lub zbyt długim snem, powinny skonsultować się z lekarzem.' },
    doms: { src: ['schoenfeld2013'], pl: 'Przegląd Schoenfelda i Contrerasa (2013): zakwasy nie są wiarygodnym samodzielnym wskaźnikiem uszkodzenia mięśni, przyrostu masy ani jakości treningu. Silne zakwasy mogą świadczyć o niewystarczającej regeneracji, a nie o postępie.' },
    protein: { src: ['issn2017'], pl: 'ISSN (2017): dla większości osób ćwiczących wystarcza ok. 1,4–2,0 g białka na kg masy ciała na dobę; pojedyncza porcja ok. 0,25 g/kg lub 20–40 g; porcje warto rozłożyć mniej więcej co 3–4 godziny. Efekt anaboliczny treningu utrzymuje się co najmniej 24 godziny, więc moment posiłku jest elastyczny.' },
    cut: { src: ['aragon2017'], pl: 'ISSN (2017, dieta a skład ciała): u szczupłych, trenujących siłowo osób w deficycie kalorycznym do zachowania mięśni może być potrzebne 2,3–3,1 g białka na kg beztłuszczowej masy ciała; wolniejsze tempo redukcji lepiej chroni masę mięśniową u osób szczupłych. Autorzy zaznaczają, że brakuje badań na kobietach i osobach starszych. Bardzo niskokaloryczne diety niosą ryzyko i wymagają nadzoru.' },
    hrmax: { src: ['tanaka2001'], pl: 'Tętno maksymalne szacuje się wzorem 208 − 0,7 × wiek (Tanaka i in., 2001); błąd indywidualny bywa znaczny.' },
    bmr: { src: ['mifflin1990'], pl: 'Podstawową przemianę materii dobrze szacuje wzór Mifflina–St Jeora (1990); przy znanym odsetku tkanki tłuszczowej można użyć wzoru Katcha–McArdle’a.' }
  };

  /* ---------- PARAMETRY SILNIKA PLANU ----------
     To decyzje projektowe FORGE oparte na faktach powyżej; zakresy, nie dogmaty. Wartości „per sesja” są ostrożnymi heurystykami. */
  // tygodniowa liczba serii: duże grupy = klatka, plecy, czworogłowe, dwugłowe; „minor” liczone z częścią serii pośrednich; łydki i brzuch osobno
  F.KB.vol = {
    hyp:    { beg: { major: [10, 14], minor: [6, 10] },  mid: { major: [10, 16], minor: [8, 14] },  adv: { major: [12, 20], minor: [10, 18] } },
    str:    { beg: { major: [6, 10],  minor: [4, 8] },   mid: { major: [8, 12],  minor: [6, 10] },  adv: { major: [10, 16], minor: [8, 12] } },
    sculpt: { beg: { major: [8, 12],  minor: [5, 9] },   mid: { major: [10, 14], minor: [6, 12] },  adv: { major: [10, 16], minor: [8, 14] } },
    endur:  { beg: { major: [6, 10],  minor: [4, 8] },   mid: { major: [8, 12],  minor: [5, 9] },   adv: { major: [8, 14],  minor: [6, 10] } },
    health: { beg: { major: [6, 10],  minor: [3, 6] },   mid: { major: [8, 12],  minor: [4, 8] },   adv: { major: [8, 12],  minor: [5, 9] } }
  };
  F.KB.volSmall = { calves: [4, 10], abs: [4, 10], glutes: [6, 12], forearms: [0, 6] };
  // ile serii jednej grupy w jednej sesji (górna granica, heurystyka)
  F.KB.perSession = { beg: 8, mid: 10, adv: 12 };
  F.KB.reps = {
    hyp:    { main: '6-10',  sec: '8-12',  iso: '10-15' },
    str:    { main: '3-6',   sec: '6-10',  iso: '8-12' },
    sculpt: { main: '8-12',  sec: '10-15', iso: '12-15' },
    endur:  { main: '12-20', sec: '15-20', iso: '15-25' },
    health: { main: '8-12',  sec: '10-12', iso: '12-15' }
  };
  F.KB.repsPower = { main: '3-5', sec: '5-8', iso: '8-10' };        // dni „power” w PHUL/PHAT (ciężkie)
  F.KB.repsHyp = { main: '8-12', sec: '10-15', iso: '12-20' };        // dni „hipertrofia” w PHUL/PHAT
  F.KB.rest = {
    hyp:    { main: 120, sec: 105, iso: 75 },
    str:    { main: 180, sec: 120, iso: 90 },
    sculpt: { main: 105, sec: 90,  iso: 60 },
    endur:  { main: 60,  sec: 45,  iso: 45 },
    health: { main: 105, sec: 90,  iso: 60 }
  };
  // zapas powtórzeń (RIR) w tygodniu 1 mezocyklu; później maleje do wartości docelowej
  F.KB.rir = {
    beg: { main: '3', sec: '3', iso: '2-3' },
    mid: { main: '2-3', sec: '2', iso: '1-2' },
    adv: { main: '2', sec: '1-2', iso: '1-2' }
  };
  F.KB.meso = { beg: 6, mid: 5, adv: 5 };  // długość mezocyklu w tygodniach (ostatni tydzień = odciążenie); orientacyjnie
})();
