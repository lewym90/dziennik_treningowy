/* FORGE — ukryta baza wiedzy (nie jest pokazywana wprost w aplikacji).
   Zasady, z których korzysta kreator planu, wraz z poziomem pewności i źródłami.
   Źródła pokazujemy WYŁĄCZNIE w kompendium „Porady i nauka”, nie w uzasadnieniu planu.
   Pewność: 'wysoka' = spójne metaanalizy/stanowiska towarzystw, 'średnia' = wiarygodne, ale z istotnymi zastrzeżeniami,
   'niska' = konsensus ekspertów lub słaby dowód — wartości traktowane jako orientacyjne, edytowalne przez użytkownika.
   Teksty są po polsku w jednym miejscu, żeby łatwo je przetłumaczyć na kolejne języki. */
(function () {
  const F = window.F = window.F || {};
  F.KB = {};

  /* ---------- ŹRÓDŁA (sprawdzone pod kątem istnienia i treści) ---------- */
  F.KB.src = {
    who2020: { a: 'Bull FC i in. (WHO)', y: 2020, t: 'World Health Organization 2020 guidelines on physical activity and sedentary behaviour', j: 'Br J Sports Med 54(24)', u: 'https://www.ncbi.nlm.nih.gov/books/NBK566048/', k: 'wytyczne' },
    // ACSM 2026: treść zweryfikowana na podstawie streszczenia (tytuł, DOI, kluczowe zalecenia); przed publikacją komercyjną warto sprawdzić pełny tekst
    acsm2026: { a: 'Phillips SM i in. (ACSM)', y: 2026, t: 'Resistance training prescription for muscle function, hypertrophy, and physical performance in healthy adults: an overview of reviews', j: 'Med Sci Sports Exerc 58(4):851–872', u: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC12965823', k: 'stanowisko towarzystwa (przegląd przeglądów)' },
    watson2015: { a: 'Watson NF i in. (AASM, Sleep Research Society)', y: 2015, t: 'Recommended amount of sleep for a healthy adult: a joint consensus statement', j: 'J Clin Sleep Med 11(6)', u: 'https://www.aasm.org/resources/pdf/adultsleepdurationconsensus.pdf', k: 'konsensus towarzystw' },
    schoenfeld2013doms: { a: 'Schoenfeld BJ, Contreras B', y: 2013, t: 'Is postexercise muscle soreness a valid indicator of muscular adaptations?', j: 'Strength Cond J 35(5)', u: 'https://bretcontreras.com/wp-content/uploads/Is-Postexercise-Muscle-Soreness-a-Valid-Indicator-of-Muscular-Adaptations.pdf', k: 'przegląd' },
    schoenfeld2017vol: { a: 'Schoenfeld BJ, Ogborn D, Krieger JW', y: 2017, t: 'Dose-response relationship between weekly resistance training volume and increases in muscle mass: a systematic review and meta-analysis', j: 'J Sports Sci 35(11)', u: 'https://researchgate.net/profile/Brad-Schoenfeld/publication/305455324_Dose-response_relationship_between_weekly_resistance_training_volume_and_increases_in_muscle_mass_A_systematic_review_and_meta-analysis', k: 'metaanaliza' },
    baz2022: { a: 'Baz-Valle E, Balsalobre-Fernández C, Alix-Fages C, Santos-Concejero J', y: 2022, t: 'A systematic review of the effects of different resistance training volumes on muscle hypertrophy', j: 'J Hum Kinet 81', u: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC8884877/', k: 'przegląd systematyczny' },
    ralston2017: { a: 'Ralston GW, Kilgore L, Wyatt FB, Baker JS', y: 2017, t: 'The effect of weekly set volume on strength gain: a meta-analysis', j: 'Sports Med 47', u: 'https://doi.org/10.1007/s40279-017-0762-7', k: 'metaanaliza' },
    schoenfeld2016freq: { a: 'Schoenfeld BJ, Ogborn D, Krieger JW', y: 2016, t: 'Effects of resistance training frequency on measures of muscle hypertrophy: a systematic review and meta-analysis', j: 'Sports Med 46(11)', u: 'https://pubmed.ncbi.nlm.nih.gov/27102172/', k: 'metaanaliza' },
    ralston2018: { a: 'Ralston GW, Kilgore L, Wyatt FB, Buchan D, Baker JS', y: 2018, t: 'Weekly training frequency effects on strength gain: a meta-analysis', j: 'Sports Med Open 4:36', u: 'https://doi.org/10.1186/s40798-018-0149-9', k: 'metaanaliza' },
    schoenfeld2021load: { a: 'Schoenfeld BJ, Grgic J, Van Every DW, Plotkin DL', y: 2021, t: 'Loading recommendations for muscle strength, hypertrophy, and local endurance: a re-examination of the repetition continuum', j: 'Sports 9(2):32', u: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC7927075', k: 'przegląd' },
    robinson2024: { a: 'Robinson ZP, Pelland JC, Remmert JF, Refalo MC, Jukic I, Steele J, Zourdos MC', y: 2024, t: 'Exploring the dose-response relationship between estimated resistance training proximity to failure, strength gain, and muscle hypertrophy: a series of meta-regressions', j: 'Sports Med 54(9)', u: 'https://rke.abertay.ac.uk/en/publications/exploring-the-dose-response-relationship-between-estimated-resist/', k: 'metaregresja' },
    singer2024: { a: 'Singer A, Wolf M, Generoso L i in.', y: 2024, t: 'Give it a rest: a systematic review with Bayesian meta-analysis on the effect of inter-set rest interval duration on muscle hypertrophy', j: 'Front Sports Act Living', u: 'https://doi.org/10.3389/fspor.2024.1429789', k: 'metaanaliza' },
    issn2017: { a: 'Jäger R, Kerksick CM, Campbell BI i in.', y: 2017, t: 'International Society of Sports Nutrition position stand: protein and exercise', j: 'J Int Soc Sports Nutr 14:20', u: 'https://pubmed.ncbi.nlm.nih.gov/28642676/', k: 'stanowisko towarzystwa' },
    bell2023: { a: 'Bell L, Nolan D, Immonen V i in.', y: 2023, t: 'Integrating deloading into strength and physique sports training programmes: an international Delphi consensus approach', j: 'Sports Med Open 9:86', u: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC10511399', k: 'konsensus ekspertów' },
    mccrary2015: { a: 'McCrary JM, Ackermann BJ, Halaki M', y: 2015, t: 'A systematic review of the effects of upper body warm-up on performance and injury', j: 'Br J Sports Med 49(14)', u: 'https://pubmed.ncbi.nlm.nih.gov/25694615/', k: 'przegląd systematyczny' },
    lauersen2014: { a: 'Lauersen JB, Bertelsen DM, Andersen LB', y: 2014, t: 'The effectiveness of exercise interventions to prevent sports injuries: a systematic review and meta-analysis of randomised controlled trials', j: 'Br J Sports Med 48(11)', u: 'https://blogs.bmj.com/bjsm/2014/07/20/exercises-to-prevent-sports-injuries-lots-of-talk-but-do-they-work/', k: 'metaanaliza' },
    tanaka2001: { a: 'Tanaka H, Monahan KD, Seals DR', y: 2001, t: 'Age-predicted maximal heart rate revisited', j: 'J Am Coll Cardiol 37(1)', u: 'https://doi.org/10.1016/S0735-1097(00)01054-8', k: 'badanie' },
    mifflin1990: { a: 'Mifflin MD, St Jeor ST, Hill LA, Scott BJ, Daugherty SA, Koh YO', y: 1990, t: 'A new predictive equation for resting energy expenditure in healthy individuals', j: 'Am J Clin Nutr 51(2)', u: 'https://doi.org/10.1093/ajcn/51.2.241', k: 'badanie' }
  };

  /* ---------- FAKTY (do kompendium i do uzasadnień wewnętrznych) ---------- */
  // conf: wysoka | średnia | niska ; src: klucze z F.KB.src ; n: zakres liczbowy używany przez silnik, jeśli dotyczy
  F.KB.facts = {
    volume: { conf: 'wysoka', src: ['acsm2026', 'schoenfeld2017vol', 'baz2022'], pl: 'Więcej serii tygodniowo na grupę mięśniową zwykle daje większy przyrost masy, ale zyski maleją. Stanowisko ACSM z 2026 r. wskazuje co najmniej 10 serii tygodniowo na grupę, z plateau w okolicy 18–20; wcześniejsze przeglądy sugerowały podobnie, a dla osób wytrenowanych zakres ok. 12–20. Dowody dotyczą głównie młodych, zdrowych osób.' },
    volumeStrength: { conf: 'średnia', src: ['ralston2017'], pl: 'Dla siły wielokrotne serie dają więcej niż jedna seria, z malejącymi korzyściami przy większej objętości.' },
    freq: { conf: 'średnia', src: ['acsm2026', 'schoenfeld2016freq', 'ralston2018'], pl: 'Wcześniejsza metaanaliza wskazywała, że trenowanie grupy mięśniowej 2 razy w tygodniu daje nieco lepszy przyrost masy niż raz. Nowsze stanowisko ACSM (2026) uznaje, że przy tej samej tygodniowej objętości częstotliwość nie ma znaczenia dla przyrostu masy, a dla siły zaleca co najmniej 2 sesje tygodniowo. Wniosek praktyczny: częstotliwość to narzędzie do wygodnego rozłożenia objętości; dwa treningi na grupę to rozsądny punkt wyjścia, ale nie jedyna droga.' },
    reps: { conf: 'wysoka', src: ['schoenfeld2021load'], pl: 'Przyrost masy jest podobny w szerokim zakresie powtórzeń (mniej więcej 5–30), o ile serie kończą się blisko upadku. Maksymalna siła rośnie najlepiej przy ciężkich obciążeniach (zwykle poniżej ok. 6 powtórzeń w serii), ale lżejsze też ją poprawiają.' },
    failure: { conf: 'niska', src: ['acsm2026', 'robinson2024'], pl: 'Dowody są sprzeczne. Metaregresja z 2024 r. sugeruje, że przyrost masy rośnie wraz z bliskością upadku (siła — prawie bez zależności), a stanowisko ACSM z 2026 r. uznaje, że trening do upadku nie daje dodatkowych korzyści i zaleca zapas 2–3 powtórzeń. Rozsądny kompromis: zapas ok. 1–3 powtórzeń, a przy ćwiczeniach izolowanych i maszynach można schodzić bliżej upadku. Dla początkujących większy zapas (technika).' },
    rest: { conf: 'średnia', src: ['singer2024', 'acsm2026', 'schoenfeld2021load'], pl: 'Dla przyrostu masy przerwy dłuższe niż ok. 1–1,5 minuty nie dają wyraźnej dodatkowej korzyści, a ACSM (2026) nie widzi różnicy między krótszym i dłuższym odpoczynkiem dla siły. W praktyce w ciężkich ćwiczeniach wielostawowych dłuższa przerwa (2–3 min i więcej) pomaga utrzymać liczbę powtórzeń, a przy izolacjach wystarczy ok. 1–1,5 min.' },
    sleep: { conf: 'wysoka', src: ['watson2015'], pl: 'Dorośli powinni regularnie spać co najmniej 7 godzin na dobę, aby wspierać zdrowie; przewlekły niedobór snu pogarsza regenerację i samopoczucie.' },
    doms: { conf: 'średnia', src: ['schoenfeld2013doms'], pl: 'Zakwasy (DOMS) nie są wiarygodnym wskaźnikiem skuteczności treningu: ich brak nie oznacza, że trening był nieskuteczny, a ich obecność nie gwarantuje przyrostu.' },
    deload: { conf: 'niska', src: ['bell2023'], pl: 'Odciążenie (deload) to krótki okres lżejszego treningu. Jego skuteczność nie jest dobrze zbadana; wytyczne to głównie konsensus ekspertów, a decyzja zależy od zmęczenia i postępów. Dlatego w planach jest sugestią, nie obowiązkiem.' },
    protein: { conf: 'wysoka', src: ['issn2017'], pl: 'Dla osób trenujących siłowo zalecany zakres białka to ok. 1,4–2,0 g na kg masy ciała na dobę, rozłożone na kilka posiłków (ok. 0,25 g/kg na posiłek, 20–40 g).' },
    who: { conf: 'wysoka', src: ['who2020'], pl: 'WHO zaleca dorosłym 150–300 minut aktywności tlenowej o umiarkowanej intensywności tygodniowo oraz ćwiczenia wzmacniające mięśnie wszystkich głównych grup co najmniej 2 dni w tygodniu.' },
    warmup: { conf: 'średnia', src: ['mccrary2015'], pl: 'Rozgrzewka zwykle poprawia wydajność w kolejnych ćwiczeniach; dowody na zmniejszenie ryzyka kontuzji są słabsze. Dobry schemat to krótki ruch ogólny, a potem serie przygotowawcze z coraz większym ciężarem.' },
    injury: { conf: 'średnia', src: ['lauersen2014'], pl: 'Trening siłowy wiąże się ze znacznie mniejszą liczbą urazów sportowych w badaniach na grupach sportowych, więc rozsądnie prowadzony nie jest czynnikiem ryzyka, tylko ochrony.' },
    hrmax: { conf: 'średnia', src: ['tanaka2001'], pl: 'Tętno maksymalne szacuje się wzorem 208 − 0,7 × wiek; błąd indywidualny to zwykle ±10 uderzeń na minutę.' },
    bmr: { conf: 'wysoka', src: ['mifflin1990'], pl: 'Podstawową przemianę materii dobrze szacuje wzór Mifflina–St Jeora; przy znanym % tłuszczu dokładniejszy bywa wzór Katcha–McArdle’a.' }
  };

  /* ---------- PARAMETRY SILNIKA PLANU (decyzje FORGE oparte na faktach wyżej; zakresy, nie dogmaty) ---------- */
  // tygodniowa liczba serii bezpośrednich na grupę: [min, max]; major = klatka, plecy, nogi; minor = barki, ręce, łydki, brzuch
  F.KB.vol = {
    hyp:   { beg: { major: [8, 12],  minor: [4, 8] },  mid: { major: [10, 16], minor: [6, 12] }, adv: { major: [12, 20], minor: [8, 14] } },
    str:   { beg: { major: [6, 10],  minor: [3, 6] },  mid: { major: [8, 12],  minor: [4, 8] },  adv: { major: [10, 16], minor: [6, 10] } },
    sculpt:{ beg: { major: [8, 12],  minor: [4, 8] },  mid: { major: [10, 14], minor: [6, 10] }, adv: { major: [10, 16], minor: [6, 12] } },
    endur: { beg: { major: [6, 10],  minor: [3, 6] },  mid: { major: [8, 12],  minor: [4, 8] },  adv: { major: [8, 14],  minor: [4, 10] } },
    health:{ beg: { major: [6, 10],  minor: [2, 5] },  mid: { major: [8, 12],  minor: [3, 6] },  adv: { major: [8, 12],  minor: [4, 8] } }
  };
  // zakresy powtórzeń wg roli ćwiczenia: main = główne wielostawowe, sec = pomocnicze wielostawowe, iso = izolowane
  F.KB.reps = {
    hyp:   { main: '6-10', sec: '8-12', iso: '10-15' },
    str:   { main: '3-6',  sec: '6-10', iso: '8-12' },
    sculpt:{ main: '8-12', sec: '10-15', iso: '12-20' },
    endur: { main: '12-20', sec: '15-20', iso: '15-25' },
    health:{ main: '8-12', sec: '10-12', iso: '12-15' }
  };
  // przerwy (s) wg celu i roli; w superserii przerwa dotyczy całej pary
  F.KB.rest = {
    hyp:   { main: 150, sec: 120, iso: 75 },
    str:   { main: 210, sec: 150, iso: 90 },
    sculpt:{ main: 120, sec: 90,  iso: 60 },
    endur: { main: 60,  sec: 45,  iso: 45 },
    health:{ main: 120, sec: 90,  iso: 60 }
  };
  // zapas powtórzeń (RIR) — dla początkujących zawsze większy (nauka techniki)
  F.KB.rir = {
    beg: { main: '3', sec: '3', iso: '2' },
    mid: { main: '2', sec: '2', iso: '1-2' },
    adv: { main: '1-3', sec: '1-2', iso: '0-2' }
  };
  F.KB.deloadEvery = { beg: 8, mid: 6, adv: 5 }; // tygodnie, orientacyjnie (zakres 4–8)
})();
