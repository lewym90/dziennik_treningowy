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
    { id: 'volume', c: 'plan', ic: 'layers', t: 'Ile serii i jak często trenować', lead: 'Objętość (liczba serii tygodniowo) jest jednym z głównych czynników przyrostu mięśni.', f: ['volume', 'volumeStrength', 'freq'], b: [
      ['h', 'Serie na grupę mięśniową'], ['p', 'Dla przyrostu masy zwykle sprawdza się od ok. 10 do 20 serii tygodniowo na grupę mięśniową; początkujący potrzebują mniej (8–12), bo rosną szybciej od mniejszego bodźca. Więcej nie zawsze znaczy lepiej — korzyści maleją, a rośnie zmęczenie.'],
      ['h', 'Jak często'], ['p', 'Tę samą objętość można rozłożyć na 1, 2 lub 3 treningi tej grupy w tygodniu. Najnowsze stanowisko ACSM nie widzi różnicy dla przyrostu masy, jeśli łączna objętość jest taka sama, a wcześniejsze przeglądy lekko faworyzowały 2 treningi. Dlatego kreator planu domyślnie szuka wygodnego rozkładu z co najmniej dwoma kontaktami z grupą tygodniowo, ale nie jest to jedyna słuszna droga.'],
      ['h', 'Praktyka'], ['ul', ['Zacznij od dolnej części zakresu i dokładaj serie, gdy dobrze się regenerujesz.', 'Serie wielostawowe (np. wyciskanie) liczą się także dla triceps i barków, więc nie potrzebujesz ich bardzo dużo bezpośrednio.', 'Jakość ma znaczenie: serie „na pół gwizdka” się nie liczą.']]
    ] },
    { id: 'reps', c: 'plan', ic: 'repeat', t: 'Ciężar, powtórzenia i bliskość upadku', lead: 'Mięśnie rosną w szerokim zakresie powtórzeń, ale siła najbardziej lubi ciężkie serie.', f: ['reps', 'failure'], b: [
      ['h', 'Zakresy powtórzeń'], ['ul', ['Siła: ciężkie serie, zwykle 1–6 powtórzeń (ACSM: ok. 80% maksymalnego ciężaru i więcej).', 'Masa mięśniowa: skuteczne są bardzo różne obciążenia — od ciężkich po umiarkowane (ok. 6–30 powtórzeń), pod warunkiem że serie są wymagające.', 'Wytrzymałość mięśniowa: wyższe powtórzenia (15–25 i więcej).']],
      ['h', 'Zapas powtórzeń (RIR)'], ['p', 'RIR to liczba powtórzeń, które jeszcze byś zrobił. RIR 2 znaczy: „skończyłem serię, ale dwa powtórzenia jeszcze bym zrobił”. Dowody co do tego, jak blisko upadku trenować, są sprzeczne; rozsądny kompromis to RIR 1–3, a w ćwiczeniach izolowanych i na maszynach możesz schodzić bliżej upadku. Początkujący powinni zostawiać większy zapas — priorytetem jest technika.'],
      ['h', 'Progresja w praktyce'], ['p', 'Gdy w kilku seriach dobijasz do górnej granicy zakresu powtórzeń z zachowanym zapasem, zwiększ ciężar o najmniejszy możliwy krok i wróć do dolnej granicy zakresu.']
    ] },
    { id: 'rest', c: 'plan', ic: 'timer', t: 'Przerwy między seriami', lead: 'Odpoczynek pozwala utrzymać liczbę powtórzeń. Dłuższy jest ważniejszy w ciężkich ćwiczeniach.', f: ['rest'], b: [
      ['ul', ['Ciężkie ćwiczenia wielostawowe (przysiad, martwy ciąg, wyciskanie): ok. 2–3 minut, w treningu siły do 5.', 'Ćwiczenia pomocnicze: ok. 1,5–2 minut.', 'Izolacje (uginanie, wznosy): ok. 1–1,5 minuty.', 'Wytrzymałość i obwody: 30–60 sekund.']],
      ['p', 'Jeśli brakuje Ci czasu, zamiast skracać odpoczynek w ciężkich seriach, możesz łączyć ćwiczenia przeciwnych partii w superserie.']
    ] },
    { id: 'splits', c: 'plan', ic: 'calendar', t: 'Jaki podział treningowy wybrać', lead: 'Najlepszy podział to taki, który realnie wykonasz — i który pozwala rozłożyć objętość.', f: ['freq', 'volume'], b: [
      ['ul', ['1–2 dni w tygodniu: całe ciało (FBW).', '3 dni: FBW (A/B/C) — proste i skuteczne, szczególnie dla początkujących.', '4 dni: góra / dół, każda grupa 2 razy w tygodniu.', '5–6 dni: kombinacje góra/dół z Push-Pull-Nogi lub PPL ×2 — dla osób, które mają czas i dobrze się regenerują.']],
      ['p', 'Superserie to dwa ćwiczenia wykonywane bez przerwy, jedno po drugim (np. biceps i triceps). Oszczędzają czas. Obwód to seria wielu ćwiczeń z krótką przerwą — dobra opcja dla wytrzymałości.']
    ] },
    { id: 'technique', c: 'tech', ic: 'shield', t: 'Technika i bezpieczeństwo', lead: 'Dobra technika to najlepszy sposób, by trenować latami bez kontuzji.', f: ['injury'], b: [
      ['ul', ['Naucz się ruchu na lekkim ciężarze, zanim go zwiększysz.', 'Pełny, kontrolowany zakres ruchu; opuszczaj ciężar wolniej niż go podnosisz.', 'Neutralny kręgosłup w przysiadzie i martwym ciągu; napnij brzuch.', 'Przy ciężkich seriach przysiadu i wyciskania leżąc używaj stojaka z ogranicznikami lub asekuracji.', 'Nagrywaj się z boku — to najszybszy sposób na wyłapanie błędów.']],
      ['p', 'Dobrze prowadzony trening siłowy w badaniach wiąże się z mniejszą, nie większą, liczbą urazów sportowych. Ryzyko rośnie, gdy za szybko zwiększasz ciężar lub objętość.']
    ] },
    { id: 'warmup', c: 'tech', ic: 'flame', t: 'Rozgrzewka', lead: 'Krótka, sensowna rozgrzewka zwykle poprawia wydajność pierwszych serii.', f: ['warmup'], b: [
      ['ul', ['3–5 minut lekkiego ruchu ogólnego (rower, marsz, skakanka).', 'Ruchy dynamiczne dla stawów, które będą pracować (krążenia, wykroki, wymachy).', 'Serie przygotowawcze w pierwszym ćwiczeniu: np. 50% → 70% → 85% ciężaru roboczego, po kilka powtórzeń.']],
      ['p', 'Długie statyczne rozciąganie przed ciężkim treningiem nie jest konieczne; możesz je zrobić po treningu lub osobno.']
    ] },
    { id: 'pain', c: 'tech', ic: 'shield', t: 'Ból, zakwasy i kiedy iść do lekarza', lead: 'Zakwasy to normalna sprawa, ostry ból w stawie nie.', f: ['doms', 'injury'], b: [
      ['h', 'Zakwasy (DOMS)'], ['p', 'To tępy ból mięśni 1–3 dni po nowym lub intensywnym treningu. Są normalne, ale nie świadczą o skuteczności treningu — możesz robić postępy bez nich.'],
      ['h', 'Czerwone flagi'], ['ul', ['Ostry, kłujący ból w stawie lub ścięgnie podczas ruchu — przerwij ćwiczenie.', 'Ból, który trwa dłużej niż kilka dni lub narasta.', 'Drętwienie, mrowienie, promieniowanie bólu do kończyny.', 'Ból w klatce piersiowej, duszność, zawroty głowy — natychmiast przerwij trening i skontaktuj się z lekarzem (pilnie: numer alarmowy 112).']],
      ['p', 'Ta aplikacja nie diagnozuje urazów i nie zastępuje lekarza ani fizjoterapeuty. Po kontuzji, przy chorobach serca, ciśnieniu, ciąży lub innych schorzeniach skonsultuj plan treningowy z lekarzem.']
    ] },
    { id: 'recovery', c: 'rec', ic: 'calendar', t: 'Sen i regeneracja', lead: 'Mięśnie rosną w czasie odpoczynku, nie na siłowni.', f: ['sleep', 'deload'], b: [
      ['ul', ['Śpij regularnie co najmniej 7 godzin na dobę.', 'Zadbaj o dni bez ciężkiego treningu tej samej partii.', 'Co kilka tygodni (u wielu osób co 4–8) rozważ lżejszy tydzień: mniej serii i nieco niższy ciężar. Dowody na odciążenia są słabe, dlatego traktuj to jako narzędzie do użycia, gdy czujesz przewlekłe zmęczenie i stagnację, a nie obowiązek.']]
    ] },
    { id: 'protein', c: 'rec', ic: 'flame', t: 'Białko i odżywianie', lead: 'Białko wspiera budowę mięśni; reszta to całkowita energia i jakość diety.', f: ['protein', 'bmr'], b: [
      ['ul', ['Dla osób trenujących siłowo zwykle zaleca się ok. 1,4–2,0 g białka na kg masy ciała na dobę.', 'Rozłóż je na kilka posiłków, ok. 20–40 g każdy (ok. 0,25 g/kg).', 'Moment spożycia jest elastyczny — nie ma magicznego „okna anabolicznego” 30 minut po treningu, choć posiłek z białkiem wokół treningu jest dobrym nawykiem.', 'Przy redukcji wyższe białko pomaga zachować mięśnie.']],
      ['p', 'Aplikacja szacuje zapotrzebowanie kaloryczne orientacyjnie (±10%). Przy chorobach, ciąży lub zaburzeniach odżywiania skonsultuj dietę ze specjalistą.']
    ] },
    { id: 'beginner', c: 'base', ic: 'layers', t: 'Początkujący a zaawansowani', lead: 'Początkujący rosną szybko od małego bodźca; zaawansowani potrzebują więcej i dokładniejszego planowania.', f: ['volume', 'failure'], b: [
      ['ul', ['Początkujący: 2–3 treningi całego ciała tygodniowo, mniej serii, większy zapas powtórzeń, nacisk na technikę i regularność.', 'Średniozaawansowani: więcej serii i podział góra/dół lub FBW 3–4 razy; progresja wolniejsza, zwykle co 1–3 treningi.', 'Zaawansowani: wyższa objętość, więcej zróżnicowania ćwiczeń, planowane odciążenia; postępy liczy się w miesiącach.']]
    ] },
    { id: 'myths', c: 'myth', ic: 'info', t: 'Popularne mity', lead: 'Krótkie sprostowania najczęstszych przekonań.', f: ['doms', 'freq', 'reps', 'protein', 'warmup'], b: [
      ['h', '„Bez zakwasów nie ma wzrostu”'], ['p', 'Nieprawda. Zakwasy nie są wiarygodnym miernikiem skuteczności treningu.'],
      ['h', '„Mięśnie rosną tylko przy ciężkich seriach”'], ['p', 'Nieprawda. Przy serii kończonej blisko upadku mięśnie rosną w szerokim zakresie obciążeń; ciężkie serie są jednak lepsze dla maksymalnej siły.'],
      ['h', '„Każdą grupę trzeba trenować dokładnie 2 razy w tygodniu”'], ['p', 'Najnowsze stanowisko ACSM uważa, że przy tej samej objętości częstotliwość nie ma znaczenia dla przyrostu masy. To wygodna reguła, nie prawo.'],
      ['h', '„Białko trzeba wypić do 30 minut po treningu”'], ['p', 'Okno jest dużo szersze; ważniejsza jest łączna dobowa podaż białka.'],
      ['h', '„Rozciąganie przed treningiem chroni przed kontuzją”'], ['p', 'Dowody są słabe. Lepsza jest rozgrzewka dynamiczna i serie przygotowawcze.']
    ] }
  ];
  F.GUIDE = A;

  const srcHtml = ids => { const seen = [...new Set(ids)].map(k => F.KB.src[k]).filter(Boolean); return seen.length ? `<h3 class="sec">Źródła</h3><section class="card cut"><ol class="srcs">${seen.map(s => `<li><a href="${E(s.u)}" target="_blank" rel="noopener">${E(s.t)}</a><small>${E(s.a)} (${s.y}), ${E(s.j)} · ${E(s.k)}</small></li>`).join('')}</ol></section>` : ''; };
  const confHtml = f => { const k = (f || []).map(x => F.KB.facts[x]).filter(Boolean); if (!k.length) return ''; const order = { niska: 0, średnia: 1, wysoka: 2 }; const c = k.reduce((a, x) => order[x.conf] < order[a] ? x.conf : a, 'wysoka'); return `<p class="conf ${c === 'wysoka' ? 'hi' : c === 'średnia' ? 'mid' : 'lo'}"><b>Pewność wiedzy:</b> ${c} <span class="dim">${c === 'wysoka' ? '(spójne wytyczne i przeglądy)' : c === 'średnia' ? '(przeglądy z zastrzeżeniami)' : '(dowody sprzeczne lub słabe — traktuj orientacyjnie)'}</span></p>`; };

  V.guide = () => {
    const q = F.norm(F.ui.guideQ || '');
    const list = A.filter(a => !q || F.norm(a.t + ' ' + a.lead).includes(q));
    const html = Object.entries(CATS).map(([k, n]) => { const it = list.filter(a => a.c === k); return it.length ? `<h3 class="sec">${n}</h3><div class="stack">${it.map(a => `<a class="plan cut" href="#/guide/${a.id}"><div class="plan-i">${ic(a.ic, 22)}</div><div class="plan-b"><h3>${E(a.t)}</h3><p>${E(a.lead)}</p></div>${ic('chevron-right', 20)}</a>`).join('')}</div>` : ''; }).join('');
    return { html: `${F.head('Porady i nauka', { back: 1, sub: 'Zasady treningu w prostych słowach' })}
      <label class="fld"><input data-b="guideq" type="search" placeholder="Szukaj w poradach…" value="${E(F.ui.guideQ || '')}"></label>
      <div id="guide-list">${html || '<p class="dim pad center">Brak wyników.</p>'}</div>
      <p class="dim small pad">Treści mają charakter ogólny i edukacyjny. Opierają się na przeglądach badań i stanowiskach towarzystw naukowych; nauka ewoluuje, a część zaleceń jest sporna — zaznaczamy to poziomem pewności. Nie zastępują porady lekarza, fizjoterapeuty ani trenera.</p>` };
  };
  F.bind.guideq = el => { F.ui.guideQ = el.value; const l = V.guide(); const tmp = document.createElement('div'); tmp.innerHTML = l.html; const n = tmp.querySelector('#guide-list'); if (n) F.$('#guide-list').innerHTML = n.innerHTML; };
  V.guideArt = id => {
    const a = A.find(x => x.id === id); if (!a) return { html: F.head('Porady', { back: 1 }) + '<p class="dim pad center">Nie znaleziono artykułu.</p>' };
    const body = a.b.map(([t, v]) => t === 'h' ? `<h4 class="lbl">${E(v)}</h4>` : t === 'p' ? `<p>${E(v)}</p>` : `<ul class="tips">${v.map(x => `<li>${E(x)}</li>`).join('')}</ul>`).join('');
    const facts = (a.f || []).map(k => F.KB.facts[k]).filter(Boolean);
    return { html: `${F.head(a.t, { back: 1 })}<section class="card cut art"><p class="lead">${E(a.lead)}</p>${body}${confHtml(a.f)}</section>
      ${facts.length ? `<h3 class="sec">Co mówią badania</h3><section class="card cut">${facts.map(f => `<p class="small">${E(f.pl)} <span class="dim">(pewność: ${f.conf})</span></p>`).join('')}</section>` : ''}
      ${srcHtml(facts.flatMap(f => f.src))}` };
  };
})();
