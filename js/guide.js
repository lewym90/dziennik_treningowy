/* FORGE — kompendium „Porady i nauka”. Źródła naukowe pokazujemy tylko tutaj (nie w uzasadnieniu planu).
   Każdy artykuł wskazuje fakty z F.KB.facts; źródła i poziom pewności dołączają się automatycznie. */
(function () {
  const F = window.F; const ic = (n, s, c) => window.icon(n, s, c); const E = F.esc; const V = F.views;

  const CATS = { base: 'Podstawy', plan: 'Układanie treningu', tech: 'Technika i bezpieczeństwo', rec: 'Regeneracja i odżywianie', myth: 'Mity' };
  // b: blok = ['p', tekst] | ['h', nagłówek] | ['ul', [punkty]]
  const A = [
    { id: 'start', c: 'base', ic: 'dumbbell', t: 'Jak działa trening siłowy', lead: 'Mięśnie rosną i nabierają siły, gdy dostają bodziec większy niż ten, do którego są przyzwyczajone — i czas na regenerację.', f: ['who', 'volume'], b: [
      ['h', 'Progresywne przeciążenie'], ['p', 'Sedno treningu to stopniowe zwiększanie wymagań: trochę większy ciężar, jedno powtórzenie więcej, dodatkowa seria albo lepsza technika. Nie musisz robić postępu na każdym treningu; liczy się trend w skali tygodni i miesięcy.'],
      ['h', 'Trzy filary'], ['ul', ['Bodziec — odpowiednio ciężkie, blisko-wyczerpujące serie.', 'Regeneracja — sen, odżywianie i dni odpoczynku, w których mięśnie się odbudowują.', 'Regularność — kilka dobrych tygodni z rzędu znaczy więcej niż jeden idealny trening.']],
      ['h', 'Ile to minimum dla zdrowia'], ['p', 'Wytyczne WHO zalecają dorosłym ćwiczenia wzmacniające główne grupy mięśni co najmniej 2 dni w tygodniu oraz 150–300 minut aktywności tlenowej o umiarkowanej intensywności. Jeśli dopiero zaczynasz, to jest dobry cel na start.']
    ] },
    { id: 'volume', c: 'plan', ic: 'layers', t: 'Ile serii i jak często trenować', lead: 'Liczba serii tygodniowo na grupę mięśniową to jeden z głównych czynników przyrostu mięśni.', f: ['volume', 'strengthSets', 'freq'], b: [
      ['h', 'Serie na grupę mięśniową'], ['p', 'Dla przyrostu masy korzystne jest co najmniej 10 serii tygodniowo na grupę mięśniową; zależność ma charakter dawka–efekt, a korzyści maleją w okolicy 18–20 serii. Początkującym wystarczy zacząć od dolnej części zakresu, a serie dokładać, gdy dobrze się regenerują.'],
      ['h', 'Jak często'], ['p', 'Gdy łączna objętość jest taka sama, nie ma znaczenia, czy trenujesz grupę raz, czy kilka razy w tygodniu. Podział treningowy służy więc wygodnemu rozłożeniu serii — wybierz taki, który realnie wykonasz. Dla siły zaleca się co najmniej 2 sesje tygodniowo.'],
      ['h', 'Praktyka'], ['ul', ['Serie wielostawowe (np. wyciskanie) liczą się częściowo także dla triceps i barków.', 'Do siły wystarczają zwykle 2–3 serie na ćwiczenie w sesji.', 'Jakość ma znaczenie: serie wykonane z dużym wysiłkiem i pełnym zakresem ruchu.']]
    ] },
    { id: 'reps', c: 'plan', ic: 'repeat', t: 'Ciężar, powtórzenia i bliskość upadku', lead: 'Mięśnie rosną w szerokim zakresie obciążeń; siła najbardziej lubi ciężkie serie.', f: ['reps', 'failure'], b: [
      ['h', 'Zakresy'], ['ul', ['Siła: obciążenia od ok. 80% maksymalnego ciężaru (1RM) i więcej, czyli zwykle kilka powtórzeń w serii.', 'Masa mięśniowa: podobne efekty daje obciążenie od ok. 30% do 100% 1RM, jeśli seria jest naprawdę wymagająca.']],
      ['h', 'Zapas powtórzeń (RIR)'], ['p', 'RIR to liczba powtórzeń, które jeszcze byś zrobił. RIR 2 znaczy: „skończyłem serię, ale dwa powtórzenia jeszcze bym zrobił”. Trening do upadku nie dawał dodatkowych korzyści, a serie z zapasem 2–3 powtórzeń uznano za wystarczająco wymagające. U osób starszych upadek bywa niewskazany.'],
      ['h', 'Progresja'], ['p', 'Gdy potrafisz wykonać o 1–2 powtórzenia więcej od planu, zwiększ ciężar o ok. 2–10%.']
    ] },
    { id: 'progress', c: 'plan', ic: 'chart-column', t: 'Progresja, zakres ruchu i kolejność ćwiczeń', lead: 'Jak dobierać ćwiczenia i zwiększać wymagania, by robić stałe postępy.', f: ['progression', 'rom', 'order'], b: [
      ['ul', ['Pełny zakres ruchu poprawiał siłę wyraźniej niż częściowy.', 'Maszyny i wolne ciężary nie różniły się spójnie pod względem siły i przyrostu masy — wybierz to, co wygodne i bezpieczne.', 'Ćwiczenia zaczynaj od najważniejszych: ustawienie na początku sesji poprawiało siłę. Rozsądna kolejność: duże grupy przed małymi, wielostawowe przed jednostawowymi.', 'Zwiększaj obciążenie o ok. 2–10%, gdy potrafisz wykonać o 1–2 powtórzenia więcej od planu.']],
      ['p', 'Periodyzacja (zmienianie obciążeń w cyklach) nie była istotnie lepsza od planu nieperiodyzowanego, jeśli przeciążenie jest odpowiednie. Najważniejsze jest stopniowe zwiększanie wymagań w czasie.']
    ] },
    { id: 'cardio', c: 'rec', ic: 'heart', t: 'Cardio razem z siłą', lead: 'Aktywność tlenowa służy zdrowiu; przy celu masowym warto dobrać jej rodzaj.', f: ['who', 'concurrent', 'hrmax'], b: [
      ['ul', ['WHO: 150–300 minut tygodniowo aktywności tlenowej o umiarkowanej intensywności oraz ćwiczenia siłowe co najmniej 2 dni w tygodniu.', 'Łączenie cardio z siłą może minimalnie osłabiać przyrost włókien mięśniowych, wyraźniej przy bieganiu niż przy jeździe na rowerze (dowody ograniczone).', 'Tętno maksymalne szacuje się jako 208 − 0,7 × wiek; to wartość orientacyjna.']]
    ] },
    { id: 'rest', c: 'plan', ic: 'timer', t: 'Przerwy między seriami', lead: 'Dłuższy odpoczynek bywa korzystny, ale różnice są mniejsze, niż się powszechnie uważa.', f: ['rest'], b: [
      ['ul', ['Dla przyrostu masy przerwy dłuższe niż ok. 1 minuta dawały niewielką korzyść; powyżej ok. 1,5 minuty nie widać wyraźnych różnic.', 'Dla siły nie było różnicy między przerwą krótszą i dłuższą niż 1 minuta.', 'Starsze stanowisko ACSM (2009) zalecało 1–2 minuty dla przyrostu masy i 3–5 minut dla siły u zaawansowanych.']],
      ['p', 'Praktycznie: w ciężkich ćwiczeniach wielostawowych odpoczywaj tak długo, aby utrzymać zaplanowane powtórzenia; w izolacjach możesz krócej. Gdy brakuje czasu, łącz ćwiczenia przeciwnych partii w superserie.']
    ] },
    { id: 'splits', c: 'plan', ic: 'calendar', t: 'Jaki podział treningowy wybrać', lead: 'Najlepszy podział to taki, który realnie wykonasz i który pozwala rozłożyć objętość.', f: ['freq', 'volume'], b: [
      ['ul', ['Całe ciało (FBW): każdy trening angażuje całe ciało; sprawdza się przy 2–4 dniach, szczególnie na początku.', 'Góra / dół: dwa kontakty z grupą tygodniowo przy 4 dniach.', 'Push / Pull / Nogi: pchanie, ciągnięcie i nogi; 3 dni lub 6 dni (każda grupa 2×).', 'Klasyczny split „bro” (jedna–dwie partie dziennie): każda grupa raz w tygodniu, wysoka objętość w jednej sesji.', 'Połączenia: PHUL, PHAT i inne hybrydy siłowo-hipertroficzne dla 4–5 dni.']],
      ['p', 'Skoro przy tej samej objętości częstotliwość nie rozstrzyga o przyroście masy, różnice między podziałami to głównie wygoda, regeneracja i organizacja. Dla siły przydają się co najmniej 2 sesje na grupę w tygodniu. Kreator pokazuje wszystkie podziały dla Twojej liczby dni i mówi, ile razy w tygodniu trenowana jest każda grupa.'],
      ['p', 'Superserie to dwa ćwiczenia wykonywane jedno po drugim bez przerwy (np. biceps i triceps) — oszczędzają czas.']
    ] },
    { id: 'technique', c: 'tech', ic: 'shield', t: 'Technika i bezpieczeństwo', lead: 'Dobra technika to najlepszy sposób, by trenować latami bez kontuzji.', f: ['injury'], b: [
      ['ul', ['Naucz się ruchu na lekkim ciężarze, zanim go zwiększysz.', 'Pełny, kontrolowany zakres ruchu; opuszczaj ciężar wolniej niż go podnosisz.', 'Neutralny kręgosłup w przysiadzie i martwym ciągu; napnij brzuch.', 'Przy ciężkich seriach przysiadu i wyciskania leżąc używaj stojaka z ogranicznikami lub asekuracji.', 'Nagrywaj się z boku — to najszybszy sposób na wyłapanie błędów.']],
      ['p', 'Dobrze prowadzony trening siłowy w badaniach wiąże się z mniejszą, nie większą, liczbą urazów sportowych. Ryzyko rośnie, gdy za szybko zwiększasz ciężar lub objętość.']
    ] },
    { id: 'pain', c: 'tech', ic: 'shield', t: 'Ból, zakwasy i kiedy iść do lekarza', lead: 'Zakwasy to normalna sprawa, ostry ból w stawie nie.', f: ['doms', 'injury'], b: [
      ['h', 'Zakwasy (DOMS)'], ['p', 'To tępy ból mięśni 1–3 dni po nowym lub intensywnym treningu. Są normalne, ale nie świadczą o skuteczności treningu — możesz robić postępy bez nich.'],
      ['h', 'Czerwone flagi'], ['ul', ['Ostry, kłujący ból w stawie lub ścięgnie podczas ruchu — przerwij ćwiczenie.', 'Ból, który trwa dłużej niż kilka dni lub narasta.', 'Drętwienie, mrowienie, promieniowanie bólu do kończyny.', 'Ból w klatce piersiowej, duszność, zawroty głowy — natychmiast przerwij trening i skontaktuj się z lekarzem (pilnie: numer alarmowy 112).']],
      ['p', 'Ta aplikacja nie diagnozuje urazów i nie zastępuje lekarza ani fizjoterapeuty. Po kontuzji, przy chorobach serca, ciśnieniu, ciąży lub innych schorzeniach skonsultuj plan treningowy z lekarzem.']
    ] },
    { id: 'recovery', c: 'rec', ic: 'calendar', t: 'Sen i regeneracja', lead: 'Mięśnie odbudowują się w czasie odpoczynku, nie na siłowni.', f: ['sleep', 'deload'], b: [
      ['ul', ['Dorośli w wieku 18–60 lat powinni regularnie spać co najmniej 7 godzin na dobę.', 'Zostaw dni bez ciężkiego treningu tej samej partii.', 'Odciążenie (lżejszy tydzień) to praktyka oparta na konsensusie ekspertów, nie na badaniach: zwykle mniej serii przy podobnym ciężarze i większym zapasie powtórzeń, na końcu kilkutygodniowego cyklu. Kreator planuje je jako tydzień ostatni, ale możesz je przesunąć, gdy czujesz się świetnie lub przeciwnie — przewlekle zmęczony.']]
    ] },
    { id: 'protein', c: 'rec', ic: 'flame', t: 'Białko i odżywianie', lead: 'Białko wspiera budowę mięśni; reszta to całkowita energia i jakość diety.', f: ['protein', 'bmr'], b: [
      ['ul', ['Dla osób trenujących siłowo zwykle zaleca się ok. 1,4–2,0 g białka na kg masy ciała na dobę.', 'Rozłóż je na kilka posiłków, ok. 20–40 g każdy (ok. 0,25 g/kg).', 'Moment spożycia jest elastyczny — nie ma magicznego „okna anabolicznego” 30 minut po treningu, choć posiłek z białkiem wokół treningu jest dobrym nawykiem.', 'Przy redukcji wyższe białko pomaga zachować mięśnie.']],
      ['p', 'Aplikacja szacuje zapotrzebowanie kaloryczne orientacyjnie (±10%). Przy chorobach, ciąży lub zaburzeniach odżywiania skonsultuj dietę ze specjalistą.']
    ] },
    { id: 'beginner', c: 'base', ic: 'layers', t: 'Początkujący a zaawansowani', lead: 'Początkujący rosną szybko od małego bodźca; zaawansowani potrzebują więcej i dokładniejszego planowania.', f: ['volume', 'progression'], b: [
      ['ul', ['Początkujący: 2–3 treningi całego ciała tygodniowo, mniej serii od dolnej granicy zakresu, większy zapas powtórzeń, nacisk na technikę i regularność.', 'Średniozaawansowani: więcej serii i podział góra/dół lub FBW 3–4 razy w tygodniu.', 'Zaawansowani: wyższa objętość i dokładniejsze planowanie; postępy są wolniejsze. Zalecenia ACSM (2009) dla zaawansowanych to 4–5 treningów tygodniowo.']]
    ] },
    { id: 'myths', c: 'myth', ic: 'info', t: 'Popularne mity', lead: 'Krótkie sprostowania na podstawie przeglądów badań.', f: ['doms', 'freq', 'failure', 'protein', 'injury'], b: [
      ['h', '„Bez zakwasów nie ma wzrostu”'], ['p', 'Zakwasy nie są wiarygodnym wskaźnikiem skuteczności treningu.'],
      ['h', '„Zawsze trzeba trenować do upadku”'], ['p', 'Trening do upadku nie dawał dodatkowych korzyści; wystarczą serie z zapasem 2–3 powtórzeń.'],
      ['h', '„Każdą grupę trzeba trenować dokładnie 2 razy w tygodniu”'], ['p', 'Przy tej samej objętości częstotliwość nie ma znaczenia dla przyrostu masy (dla siły zaleca się co najmniej 2 sesje).'],
      ['h', '„Białko trzeba wypić do 30 minut po treningu”'], ['p', 'Efekt anaboliczny treningu utrzymuje się co najmniej 24 godziny; ważniejsza jest łączna dobowa podaż.'],
      ['h', '„Samo rozciąganie chroni przed kontuzjami”'], ['p', 'W metaanalizie samo rozciąganie nie zmniejszało ryzyka urazów sportowych, a programy siłowe zmniejszały je do niecałej jednej trzeciej.']
    ] },
  ];
  F.GUIDE = A;

  const srcHtml = ids => { const seen = [...new Set(ids)].map(k => F.KB.src[k]).filter(Boolean); return seen.length ? `<h3 class="sec">Źródła</h3><section class="card cut"><ol class="srcs">${seen.map(s => `<li><a href="${E(s.u)}" target="_blank" rel="noopener">${E(s.t)}</a><small>${E(s.a)} (${s.y}), ${E(s.j)} · ${E(s.k)}</small></li>`).join('')}</ol></section>` : ''; };

  V.guide = () => {
    const q = F.norm(F.ui.guideQ || '');
    const list = A.filter(a => !q || F.norm(a.t + ' ' + a.lead).includes(q));
    const html = Object.entries(CATS).map(([k, n]) => { const it = list.filter(a => a.c === k); return it.length ? `<h3 class="sec">${n}</h3><div class="stack">${it.map(a => `<a class="plan cut" href="#/guide/${a.id}"><div class="plan-i">${ic(a.ic, 22)}</div><div class="plan-b"><h3>${E(a.t)}</h3><p>${E(a.lead)}</p></div>${ic('chevron-right', 20)}</a>`).join('')}</div>` : ''; }).join('');
    return { html: `${F.head('Porady i nauka', { back: 1, sub: 'Zasady treningu w prostych słowach' })}
      <label class="fld"><input data-b="guideq" type="search" placeholder="Szukaj w poradach…" value="${E(F.ui.guideQ || '')}"></label>
      <div id="guide-list">${html || '<p class="dim pad center">Brak wyników.</p>'}</div>
      <p class="dim small pad">Treści mają charakter ogólny i edukacyjny. Opierają się na przeglądach badań, stanowiskach towarzystw naukowych i wytycznych WHO; przy każdym fakcie podajemy źródła i rodzaj dowodu. Nie zastępują porady lekarza, fizjoterapeuty ani trenera.</p>` };
  };
  F.bind.guideq = el => { F.ui.guideQ = el.value; const l = V.guide(); const tmp = document.createElement('div'); tmp.innerHTML = l.html; const n = tmp.querySelector('#guide-list'); if (n) F.$('#guide-list').innerHTML = n.innerHTML; };
  V.guideArt = id => {
    const a = A.find(x => x.id === id); if (!a) return { html: F.head('Porady', { back: 1 }) + '<p class="dim pad center">Nie znaleziono artykułu.</p>' };
    const body = a.b.map(([t, v]) => t === 'h' ? `<h4 class="lbl">${E(v)}</h4>` : t === 'p' ? `<p>${E(v)}</p>` : `<ul class="tips">${v.map(x => `<li>${E(x)}</li>`).join('')}</ul>`).join('');
    const facts = (a.f || []).map(k => F.KB.facts[k]).filter(Boolean);
    return { html: `${F.head(a.t, { back: 1 })}<section class="card cut art"><p class="lead">${E(a.lead)}</p>${body}</section>
      ${facts.length ? `<h3 class="sec">Co mówią badania</h3><section class="card cut">${facts.map(f => `<p class="small">${E(f.pl)}</p>`).join('')}</section>` : ''}
      ${srcHtml(facts.flatMap(f => f.src))}` };
  };
})();
