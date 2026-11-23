/* FORGE — „Zapytaj FORGE”, część 2: polecenia i wiedza o całej aplikacji.
   Czat wykonuje polecenia tymi samymi funkcjami co przyciski (wynik identyczny jak przy wyklikaniu),
   każdą zmianę da się cofnąć przyciskiem „Cofnij”, a usuwania z czatu nie ma (prowadzi tylko na miejsce).
   Wszystko offline, bez AI: rozpoznawanie słów kluczowych, odmian i literówek. */
(function () {
  const F = window.F; const ic = (n, s) => window.icon(n, s); const E = F.esc; const N = F.norm; const V = F.views;
  const DAY = 864e5;
  const S = () => F.S.settings;
  const FD = () => F.askFind || {};
  const MONG = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'];
  const MSTEM = ['stycz', 'lut', 'mar', 'kwie', 'maj', 'czerw', 'lip', 'sierp', 'wrzes', 'pazdz', 'listop', 'grud'];
  const WDL = ['poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota', 'niedziela'];
  const WDA = ['w poniedziałek', 'we wtorek', 'w środę', 'w czwartek', 'w piątek', 'w sobotę', 'w niedzielę'];
  const WDS = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'];
  const wdOf = ts => (new Date(ts).getDay() + 6) % 7;
  const dd = ts => { const d = new Date(ts); return `${d.getDate()} ${MONG[d.getMonth()]}${d.getFullYear() !== new Date().getFullYear() ? ' ' + d.getFullYear() : ''}`; };
  const ddw = ts => `${WDL[wdOf(ts)]}, ${dd(ts)}`;
  const WDACC = ['poniedziałek', 'wtorek', 'środę', 'czwartek', 'piątek', 'sobotę', 'niedzielę'], WDGEN = ['poniedziałku', 'wtorku', 'środy', 'czwartku', 'piątku', 'soboty', 'niedzieli'];
  const ddA = ts => `${WDACC[wdOf(ts)]} ${dd(ts)}`, ddG = ts => `${WDGEN[wdOf(ts)]} ${dd(ts)}`;
  const kg = v => `${F.fw(v)} ${F.unit()}`;
  const later = (fn, ms = 700) => F.askDry ? 0 : setTimeout(() => { try { fn(); } catch (e) { console.error(e); } }, ms);
  const A = (html, acts, chips) => ({ html, acts: acts || [], chips: chips || [] });
  const go = (l, href, i) => ({ l, i: i || 'arrow-right', href });
  const btn = (l, a, d, i) => ({ l, i: i || 'arrow-right', a, d });

  /* ================= LITERÓWKI ================= */
  // słowa poleceń: jeśli w pytaniu jest słowo różniące się o jedną literę (lub przestawione litery), poprawiam je przed rozpoznawaniem
  const VOCAB = ('wlacz wylacz ustaw zmien przelacz zapisz dodaj ustawienia powiadomienia wibracje dzwiek glosnosc ostrzezenie kolor trenera podopieczny podopiecznemu podopiecznych wyniki trening treningu treningi plan planu plany kreator ' +
    'przenies przesun pomin zacznij rozpocznij skroc powtorz odciazenie kopie kopia zapasowa eksport raport podsumowanie kalendarz historia postepy narzedzia zywienie porady miesnie regeneracja rekordy zdjecia pomiary ' +
    'automatyczna automatyczny progresja przerwa przerwy stoper wygaszanie ekranu jednostki kilogramy funty talerze gryf krok tygodniowy zawody startuje odliczanie miejsce silownia domu hotelu bez sprzetu hantle ' +
    'poniedzialek wtorek sroda czwartek piatek sobota niedziela jutro pojutrze tydzien miesiac masa sile sila rzezba redukcja wytrzymalosc zdrowie poczatkujacy sredniozaawansowany zaawansowany wazee waze wzrostu imie ' +
    'kobieta mezczyzna aktualny aktualnym wariant szablon startowy startowe otworz przejdz pokaz usun skasuj').split(' ');
  const EXTRA = ('stworz stworzyc utworz utworzyc uloz ulozyc ulozysz zrobic zrob przygotuj przygotowac wygeneruj wygenerowac zaprojektuj rozpisz zaplanuj dobierz wymysl zbuduj zaproponuj potrzebuje chcialbym chcialabym poprosze szukam ' +
    'automatyczne automatycznie automatycznego automatyczny automatyczna automatyczną odliczanie odliczania stopera przerwe przerwy przerwa wszystkie wszystkich wszystko trenerski trenerskiego trenerska wibrowanie dzwieki ' +
    'wlacz wlaczyc wlaczysz wylacz wylaczyc wylaczysz zalacz aktywuj uruchom odpal dezaktywuj przelacz nastaw zapisz wpisz dodaj popraw zmien ustaw ustawic zmienic pokaz otworz przejdz zabierz wejdz skasuj wykasuj usun wyczysc wymaz wywal ' +
    'przenies przesun przeloz pomin odpusc anuluj zacznij zaczynam rozpocznij skroc powtorz trenuje trenowac bede treningi treningow treningu trening dzisiejszy jutrzejszy najblizszy nastepny ' +
    'nazywam nazywa jestem pracuje pracy siedzaca fizycznie wzrostu wzrost lata ' +
    'udostepnij przeslij wyslij wysylanie podopiecznemu podopiecznego podopiecznych podopieczni klientowi koledze wczytaj wyniki wynikow trenerowi trenera postepy ' +
    'powiadomienia powiadomien sprawdz testowe probne zezwol notyfikacje kopie kopia zapasowa zapasowej backup pobierz eksport eksportuj wyeksportuj podsumowanie miesiaca roku raport tygodniowy ' +
    'historie histori kalendarz kalendarza narzedzia ustawienia zywienie porady baze bazy cwiczen cwiczenia kreator import miesnie sile cialo ' +
    'poniedzialki srody piatki wtorki czwartki soboty niedziele poniedzialek wtorek sroda srode czwartek piatek sobota sobote niedziela niedziele miesiecy tygodni ' +
    'wycisnac przysiasc martwy ciagu wyciskaniu przysiadzie przedramie talia biodra bicepsa lydka ' +
    'podglosnij przycisz rozpiske rozpiska program programu modul modulu zwiekszania glosnosc najglosniej trojboju trojboj zawody zawodow startuje odciazenie deload blok mezocykl kolor zloty niebieski karmin glosnosc ostrzezenie talerz talerze gryf funty kilogramy jednostki krok ciezaru').split(' ');
  const lev1 = (a, b) => { if (a === b) return true; const la = a.length, lb = b.length; if (Math.abs(la - lb) > 1) return false; let i = 0; while (i < la && i < lb && a[i] === b[i]) i++;
    if (la === lb) return a.slice(i + 1) === b.slice(i + 1) || (a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2)); return la > lb ? a.slice(i + 1) === b.slice(i) : a.slice(i) === b.slice(i + 1); };
  let VOC = null, VSET = null, VPRE = null;
  const vocab = () => { if (VOC) return; const w = new Set([...VOCAB, ...EXTRA]); const addT = t => N(t).split(' ').forEach(x => { if (x.length >= 4 && !/\d/.test(x)) w.add(x); });
    try { FEAT.forEach(f => { addT(f[2]); addT(typeof f[3] === 'function' ? '' : f[3].replace(/<[^>]+>/g, ' ')); }); (F.ASK_SUG || []).forEach(addT); F.S.ex.forEach(e => addT(e.name)); } catch (e) { }
    VOC = [...w]; VSET = w; VPRE = new Set(VOC.map(x => x.slice(0, 6))); };
  const fix1 = t => { if (t.length < 6 || /\d/.test(t) || VSET.has(t) || VPRE.has(t.slice(0, 6))) return t;
    for (const v of VOC) { if (v[0] !== t[0] || Math.abs(v.length - t.length) > 2) continue; if (lev1(t, v)) return v; const a = t.slice(0, 8), b = v.slice(0, 8); if (a.length === 8 && b.length === 8 && lev1(a, b)) return b + t.slice(8); } return t; };
  const fix = n => { vocab(); return n.split(' ').map(fix1).join(' '); };

  /* ================= LICZBY I DATY ================= */
  const NUMW = { jeden: 1, jedna: 1, jedno: 1, jednego: 1, dwa: 2, dwie: 2, dwoch: 2, trzy: 3, trzech: 3, cztery: 4, czterech: 4, piec: 5, pieciu: 5, szesc: 6, szesciu: 6, siedem: 7, siedmiu: 7, osiem: 8, dziewiec: 9, dziesiec: 10, pietnascie: 15, dwadziescia: 20, trzydziesci: 30, czterdziesci: 40, piecdziesiat: 50, szescdziesiat: 60, dziewiecdziesiat: 90, sto: 100, pol: 0.5 };
  const numsOf = q => { const out = []; String(q).replace(/(\d+(?:[.,]\d+)?)/g, m => { out.push(parseFloat(m.replace(',', '.'))); return m; }); return out; };
  const wnum = n => { const m = n.match(/\b(jeden|jedna|jedno|dwa|dwie|trzy|cztery|piec|szesc|siedem)\b/); return m ? NUMW[m[1]] : null; };
  const startDay = ts => F.startOfDay(ts);
  const MWD = [/^(pon|poniedz\w*|pn)$/, /^(wt|wtor\w*)$/, /^(sr|srod\w*|sroda)$/, /^(czw|cz|czwart\w*)$/, /^(pt|piat\w*|piatek)$/, /^(sob|so|sobot\w*)$/, /^(nd|ndz|niedz\w*|niedziela)$/];
  const wdsOf = n => { const out = []; n.split(' ').forEach(t => { const i = MWD.findIndex(re => re.test(t)); if (i >= 0 && !out.includes(i)) out.push(i); }); return out.sort((a, b) => a - b); };
  // data w przyszłości (do planowania): jutro, w sobotę, 15 marca, 15.03, za 2 tygodnie
  const futureDate = (n, q) => {
    const today = startDay(Date.now()); let m;
    if (/\bpojutrze\b/.test(n)) return today + 2 * DAY; if (/\bjutr/.test(n)) return today + DAY; if (/\b(dzis|dzisiaj)\b/.test(n)) return today;
    m = n.match(/\bza (\d+|jeden|dwa|dwie|trzy|cztery|piec|szesc)?\s*(dzien|dni|tydzien|tygodnie|tygodni|miesiac|miesiace|miesiecy|rok|lata|lat)\b/);
    if (m) { const k = m[1] ? (NUMW[m[1]] || +m[1]) : 1; const u = /^dzi|^dni/.test(m[2]) ? DAY : /^tyg|^tydz/.test(m[2]) ? 7 * DAY : /^mies/.test(m[2]) ? 30.44 * DAY : 365.25 * DAY; return startDay(today + k * u); }
    m = n.match(/\b([12]?\d|3[01])\s+(stycz\w*|lut\w*|mar(?:ca|zec|cu)|kwie\w*|maj\w*|czerw\w*|lip\w*|sierp\w*|wrzes\w*|pazdz\w*|listop\w*|grud\w*)(?:\s+(20\d\d))?/);
    if (m) { const mi = MSTEM.findIndex(st => m[2].startsWith(st)); let y = m[3] ? +m[3] : new Date().getFullYear(); let t = new Date(y, mi, +m[1]).getTime(); if (!m[3] && t < today) t = new Date(y + 1, mi, +m[1]).getTime(); return t; }
    m = String(q).match(/(?:^|\s)([0-3]?\d)[./]([01]?\d)(?:[./](20\d\d))?(?=\s|$|\?|,|\.)/);
    if (m && +m[2] >= 1 && +m[2] <= 12) { let y = m[3] ? +m[3] : new Date().getFullYear(); let t = new Date(y, +m[2] - 1, +m[1]).getTime(); if (!m[3] && t < today) t = new Date(y + 1, +m[2] - 1, +m[1]).getTime(); return t; }
    const wi = n.split(' ').map(t => MWD.findIndex(re => re.test(t))).filter(i => i >= 0); if (wi.length) { const w = wi[wi.length - 1]; let d = today + DAY; while (wdOf(d) !== w) d += DAY; if (/przyszl|nastepn/.test(n) && d - today < 7 * DAY && /przyszl\w* tydz|przyszl\w* tyg/.test(n)) d += 7 * DAY; return d; }
    return null;
  };
  // termin celu: „do czerwca” = koniec czerwca, „do końca roku”, „za 3 miesiące”, „do 15 marca”
  const deadline = (n, q) => {
    if (/do konca roku|na koniec roku|w tym roku/.test(n)) return new Date(new Date().getFullYear(), 11, 31).getTime();
    if (/do konca miesiaca/.test(n)) { const d = new Date(); return new Date(d.getFullYear(), d.getMonth() + 1, 0).getTime(); }
    if (/(w|za) pol roku/.test(n)) return startDay(Date.now() + 182 * DAY);
    const fd = futureDate(n, q); if (fd && !/\b(jutr|pojutrze|dzis)/.test(n)) return fd;
    const t = n.split(' '); for (let k = 0; k < t.length; k++) { if (!/^(do|na|przed|w)$/.test(t[k - 1] || '')) continue; const i = MSTEM.findIndex(s => t[k].startsWith(s) && (s !== 'mar' || /^mar(zec|ca|cu)$/.test(t[k])) && (s !== 'maj' || /^maj(a|u)?$/.test(t[k])) && (s !== 'lut' || /^lut(y|ego|ym)$/.test(t[k])) && (s !== 'lip' || /^lip(iec|ca|cu)$/.test(t[k])));
      if (i >= 0) { const now = new Date(); let y = now.getFullYear(); if (i < now.getMonth() || (i === now.getMonth() && now.getDate() > 20)) y++; return new Date(y, i + 1, 0).getTime(); } }
    return null;
  };

  /* ================= COFANIE ================= */
  const UNDO = new Map(); let useq = 0;
  const undo = fn => { const k = 'u' + (++useq) + '_' + Date.now().toString(36); UNDO.set(k, fn); return btn('Cofnij', 'askUndo', { k }, 'rotate-ccw'); };
  F.act.askUndo = async b => { const fn = UNDO.get(b.dataset.k); if (!fn) { F.toast('Tej zmiany nie da się już cofnąć z czatu — zmień ją w aplikacji.'); return; } UNDO.delete(b.dataset.k); try { await fn(); F.toast('Cofnięto', 'hot'); } catch (e) { F.toast('Nie udało się cofnąć'); } b.disabled = true; b.innerHTML = 'Cofnięto'; };
  const clone = v => v === undefined ? undefined : JSON.parse(JSON.stringify(v));
  // zmiana ustawień z możliwością cofnięcia
  const setS = (patch, after) => { const s = S(), prev = {}; Object.keys(patch).forEach(k => { prev[k] = clone(s[k]); s[k] = patch[k]; }); F.saveSettings(); if (after) after(); return undo(() => { Object.keys(prev).forEach(k => { if (prev[k] === undefined) delete s[k]; else s[k] = prev[k]; }); F.saveSettings(); if (after) after(); F.render(true); }); };

  /* ================= MAPA APLIKACJI (wiedza) ================= */
  // [id, słowa kluczowe (regex na znormalizowanym tekście), tytuł, opis, przyciski]
  const FEAT = [
    ['today', /ekran (dzis|glown|startow)|zakladk\w* dzis|glowny ekran|strona glowna|pulpit/, 'Ekran Dziś', 'To ekran startowy. Na górze najbliższy trening z przyciskiem startu, niżej karta <b>Ten tydzień</b> (treningi, tonaż i znacznik <b>Kalendarz ›</b>) oraz 4 kafle: <b>Żywienie</b>, <b>Porady i nauka</b>, <b>Narzędzia</b> i <b>Wpisz wagę</b>. Ikona dymka w nagłówku otwiera ten czat, a koło zębate — Ustawienia.', [go('Dziś', '#/home', 'house')]],
    ['tabs', /dolny pasek|dolne menu|zakladk\w* (aplikacji|na dole)|nawigacj|jakie (sa )?zakladki|menu aplikacji|pomaranczow\w* przycisk|przycisk na srodku/, 'Nawigacja', 'Na dole są 4 zakładki — każda odpowiada na jedno pytanie: <b>Dziś</b> (co teraz), <b>Plany</b> (co trenuję), <b>Historia</b> (co zrobiłem), <b>Postępy</b> (jak mi idzie). Pomarańczowy przycisk na środku otwiera wybór treningu: następny w kolejce, pusty albo dowolny dzień z Twoich planów (a gdy trening trwa — wraca do niego). Każda funkcja jest w jednym miejscu.', []],
    ['plansTab', /zakladk\w* plany|ekran plan|ekranie plan|moje plany gdzie|gdzie (sa|mam) plany/, 'Zakładka Plany', 'Na górze karta <b>Aktualny plan</b>: cel i staż, następny trening z dniem, dni tygodnia („zmień”), przycisk <b>Rozpocznij trening</b>, „Mam mało czasu” i pasek bloku. Niżej <b>Inne plany</b>, potem <b>Nowy plan</b>: Kreator planu, Plany startowe, Import — a na dole <b>Baza ćwiczeń</b>. Z trybem trenera dochodzi sekcja <b>Podopieczni</b>.', [go('Plany', '#/plans', 'clipboard-list')]],
    ['curPlan', /aktualn\w* plan|biezac\w* plan|glown\w* plan|ustawic jako aktualn|zmienic plan na inny|ktory plan (jest )?aktywn/, 'Aktualny plan', 'To plan, z którego biorę następny trening, kalendarz, ciężary na dziś i analizy. Zmienisz go w <b>Plany → plan → ⋯ → Ustaw jako aktualny</b> albo poleceniem tutaj, np. „ustaw plan Góra / Dół jako aktualny”. Start treningu z innego planu też ustawia go jako aktualny.', [go('Plany', '#/plans', 'clipboard-list')], ['Jakie mam plany?']],
    ['wizard', /kreator\w*|ulozyc plan|stworzyc plan|dobrac plan|plan dopasowan/, 'Kreator planu', 'Kreator układa plan pod Ciebie: pyta o cel (masa, siła, rzeźba, wytrzymałość, zdrowie), staż, zdrowie (krótka ankieta bezpieczeństwa), dni i czas treningu, sprzęt, partie priorytetowe i ograniczenia. Potem dobiera podział, ćwiczenia, serie, powtórzenia i przerwy według badań i pokazuje „Dlaczego ten plan”. Tryby: <b>Szybki start</b> (5 kroków) i <b>Zaawansowany</b> (wszystkie pytania). „Inny wariant” daje inny zestaw ćwiczeń. Mogę też ułożyć plan stąd: „ułóż mi plan na masę na 3 dni”.', [go('Kreator planu', '#/wizard', 'sparkles')], ['Ułóż mi plan na masę na 3 dni']],
    ['templates', /plan\w* startow|gotow\w* plan|szablon|bibliotek\w* plan/, 'Plany startowe', `Dziewięć gotowych planów w <b>Plany → Plany startowe</b>, w trzech grupach: <b>Siłownia</b> (Push / Pull / Nogi, Góra / Dół, Siła A/B 3×5, Całe ciało 3×, Pośladki i nogi, Siła: Góra / Dół), <b>Dom i bez sprzętu</b> (Dom: hantle i drążek, Bez sprzętu), <b>Zdrowie</b> (Zdrowie 60+). Powtórzenia i przerwy dobieram do celu planu. Dodasz też poleceniem: „dodaj plan startowy Bez sprzętu”.`, [btn('Plany startowe', 'templates', null, 'list-checks')], ['Dodaj plan startowy Góra / Dół']],
    ['import', /import\w*|wczytac plan|wczytywanie plan|plan z pdf|plan ze zdjecia|plan z (pliku|zrzutu)|przeniesc (dane|historie) z|z innej aplikacji|hevy|strong\b|fitnotes/, 'Import', 'W <b>Plany → Import</b> wczytasz plan z PDF-a, zdjęcia, zrzutu ekranu (rozpoznawanie tekstu w telefonie), wklejonego tekstu albo pliku. Tam też <b>Importuj historię treningów (CSV)</b> — ze Strong, Hevy, FitNotes i podobnych, razem z rekordami. Przed zapisem widzisz podgląd i możesz poprawić ćwiczenia.', [go('Import', '#/import', 'upload')]],
    ['planEdit', /edyt\w* plan|edycj\w* plan|zmienic (cwiczeni|serie|powtorzeni) w planie|dodac cwiczenie do planu|dodac dzien|kolejnosc cwiczen|zmienic plan/, 'Edycja planu', '<b>Plany → plan → ⋯ → Edytuj</b>. Dodajesz i usuwasz dni i ćwiczenia, zmieniasz serie, powtórzenia i przerwy, kolejność (strzałki), stuknięcie w nazwę zamienia ćwiczenie, ikona łańcucha robi superserię. Na górze blok <b>Przerwy w tym planie</b>. Zmiany zapisujesz przyciskiem „Zapisz”.', [go('Plany', '#/plans', 'clipboard-list')]],
    ['restProfile', /profil\w* przerw|przerwy w (tym )?planie|przerwy (dla|w) (cwiczen|planu)|ustawic przerwy|dlugosc przerw|zmienic przerw/, 'Przerwy w planie', 'Każdy plan ma 3 czasy przerw: <b>ciężkie wielostawowe</b> (np. przysiad, wyciskanie, martwy ciąg), <b>pozostałe wielostawowe</b> i <b>izolowane</b>. Ustawiasz je w edytorze planu w bloku „Przerwy w tym planie” i jednym przyciskiem stosujesz do wszystkich ćwiczeń. Pojedynczemu ćwiczeniu zmienisz przerwę w treningu: menu ⋯ → Czas przerwy. Polecenie tutaj: „przerwy na ciężkich ćwiczeniach 3 min”.', [go('Plany', '#/plans', 'clipboard-list')]],
    ['superset', /superseri|obwod\w* w planie|polaczyc cwiczenia/, 'Superserie', 'W edytorze planu ikona łańcucha łączy ćwiczenie z następnym. W treningu oba są na jednej karcie, robisz je naprzemiennie, a przerwa rusza po rundzie. W trakcie treningu: menu ⋯ ćwiczenia → „Połącz z następnym ćwiczeniem”.', []],
    ['exdb', /baz\w* cwiczen|wlasne cwiczeni|dodac (nowe |wlasne )?cwiczenie|opis\w* cwiczen|zdjeci\w* cwiczen|lista cwiczen/, 'Baza ćwiczeń', () => `<b>Plany → Baza ćwiczeń</b>: ${F.S.ex.size} ćwiczeń z grafiką sprzętu, mięśniami i wskazówkami techniki. Szukasz po nazwie i filtrujesz po partii. Własne ćwiczenie dodasz przyciskiem „+”: nazwa, partia, sprzęt i rodzaj zapisu (ciężar × powtórzenia, masa ciała + obciążenie, same powtórzenia albo czas). Każde ćwiczenie ma swoją historię, wykres i rekordy.`, [go('Baza ćwiczeń', '#/exercises', 'dumbbell')]],
    ['workout', /ekran treningu|w trakcie treningu|jak (zapisac|wpisac|zaliczyc) seri|zalicz\w* seri|kafel\w* seri|panel serii|jak wyglada trening|jak prowadzic trening/, 'Trening', 'Każde ćwiczenie ma dużą grafikę (sprzęt albo pracujące mięśnie — przełączasz stuknięciem), kafelki serii i dolny panel. Stukasz kafelek serii, ustawiasz ciężar i powtórzenia przyciskami −/+ (albo wpisujesz), naciskasz <b>Zalicz serię</b>. Po zaliczeniu w panelu rusza przerwa (+30 s, Pomiń, <b>Cofnij</b>). Ciężary podpowiadam z poprzedniego treningu. Przesuwasz palcem między ćwiczeniami, lista ćwiczeń jest w nagłówku, trening kończysz przyciskiem „Zakończ”.', []],
    ['timer', /stoper\w*|minutnik|odliczani\w* przerw|automatyczn\w* przerw|ostrzezeni\w* przed koncem|koniec przerwy/, 'Stoper przerw', 'Po zaliczeniu serii przerwa rusza sama (Ustawienia → Trening → Automatyczna przerwa). Czas bierze z planu. W panelu: +30 s, Pomiń, Cofnij. Przed końcem dostajesz ostrzeżenie (domyślnie 30 s, zmienisz w Ustawienia → Dźwięk i powiadomienia), a na koniec sygnał i wibrację. Przy zablokowanym telefonie przerwę ogłasza powiadomienie z serwera. Stoper jest też w Narzędziach, a stąd: „włącz przerwę 90 s”.', [], ['Włącz przerwę 90 s']],
    ['autoProg', /automatyczn\w* progres|auto ?progres|skad (biore|bierzesz|sa) ciezar|podpowiedz\w* ciezar|jak (dobierasz|liczysz) ciezar/, 'Automatyczna progresja', 'Gdy we wszystkich seriach dojdziesz do górnej granicy powtórzeń z planu, następnym razem podpowiem większy ciężar (o krok ciężaru z Ustawień); jeśli nie — ten sam ciężar i cel na więcej powtórzeń. Włączasz i wyłączasz w Ustawienia → Trening → Automatyczna progresja albo poleceniem „wyłącz automatyczną progresję”.', []],
    ['undoSet', /cofnac seri|cofnij seri|pomylk\w* w serii|zle wpisal|poprawic seri|edytowac seri/, 'Poprawianie serii', 'Zaraz po zaliczeniu masz w panelu przycisk <b>Cofnij</b>. Później stuknij kafelek serii — wartości wracają do panelu i możesz je poprawić. Po treningu: Historia → trening → ⋯ → Edytuj trening.', []],
    ['voice', /glosow\w* (wpis|zapis)|mikrofon|podyktow|mowic seri|dyktow/, 'Głosowe wpisywanie', 'W panelu serii jest mikrofon. Powiedz np. „sto na osiem”, „82,5 razy 10” albo „osiem powtórzeń” — zapiszę i zaliczę serię (Cofnij działa). W tym czacie mikrofon jest w polu pytania. Rozpoznawanie mowy zależy od przeglądarki (Chrome, Safari) i czasem wymaga internetu.', []],
    ['busy', /zajet\w*|sprzet (jest )?zajet|ktos (zajal|cwiczy na)|maszyna zajeta/, 'Przycisk „Zajęte”', 'Na karcie ćwiczenia w treningu stuknij <b>Zajęte</b>: możesz <b>zrobić je później</b> (przesunę na koniec) albo wybrać <b>zamiennik</b> na tę samą partię — z listy podobnych ćwiczeń dostępnych w Twoim miejscu treningu.', []],
    ['pain', /przycisk boli|zglos\w* bol|boli przy (tym )?cwiczeniu|bol w (trakcie|czasie) treningu|co jak (mnie )?boli/, '„Boli przy tym ćwiczeniu”', 'W treningu: menu ⋯ ćwiczenia → <b>Boli przy tym ćwiczeniu</b>. Wybierasz miejsce (barki, kolana, plecy…), a ja proponuję: zamień ćwiczenie, zrób lżej (−10%) albo pomiń. Zgłoszenie zapisuję; przez 28 dni przypominam o nim na karcie ćwiczenia, a przy powtarzającym się bólu w tym samym miejscu zalecam konsultację z lekarzem lub fizjoterapeutą. Nie oceniam urazów.', []],
    ['short', /mam malo czasu|funkcj\w* malo czasu|malo czasu (funkcj|dziala|przycisk)|skracan\w* trening|skrocic trening|krotsz\w* trening/, '„Mam mało czasu”', 'Na ekranie Dziś i w karcie aktualnego planu: wybierasz 30, 45 albo 60 minut, a ja skracam dzisiejszy trening — najpierw zmniejszam serie izolowanych, potem pomocniczych, a ćwiczenia główne zostają do końca (Iversen 2021). Pominięte serie nie przechodzą na następny trening. Stąd: „skróć dzisiejszy trening do 45 minut”.', [], ['Skróć dzisiejszy trening do 45 minut']],
    ['gyms', /miejsc\w* treningu|profil\w* silowni|silownia (dom|hotel)|trenuje w domu i na silowni|sprzet w domu|zmienic miejsce/, 'Miejsca treningu', 'Ustawienia → Trening → <b>Miejsca treningu</b>: np. Siłownia, Dom, Hotel — każde z listą dostępnego sprzętu. Zamienniki i przycisk „Zajęte” podsuwają tylko to, co masz w aktualnym miejscu. Gdy masz więcej niż jedno miejsce, zmienisz je w nagłówku treningu albo poleceniem: „jestem dziś w domu”.', [btn('Miejsca treningu', 'gymPick', null, 'map-pin')]],
    ['feel', /samopoczuci|check ?in|ocen\w* (snu|energii)|sen i energi|przed treningiem (pyta|okienko)/, 'Samopoczucie', 'Na starcie treningu okienko „Przed treningiem”: sen i energia w skali 1–5 (możesz pominąć). Po co najmniej 6 ocenionych treningach w Postępy → Przegląd pokazuję „Samopoczucie a wyniki” — jak sen i energia łączą się z Twoim tonażem i rekordami.', []],
    ['warmup', /rozgrzewk\w* (w treningu|do cwiczenia|serie|funkcj)|serie rozgrzewkowe|dodac rozgrzewk/, 'Rozgrzewka', 'W treningu: menu ⋯ ćwiczenia → <b>Dodaj rozgrzewkę</b> — wstawię serie od gryfu do ciężaru roboczego (40, 60, 75 i 90% ciężaru roboczego). Tabelę rozgrzewki do dowolnego ciężaru masz w Narzędziach, a tutaj: „rozgrzewka do 100 kg”.', [], ['Rozgrzewka do 100 kg']],
    ['rpe', /\brpe\b w aplikacji|wpisac rpe|typ serii|seria rozgrzewkowa|drop ?set|seria do upadku/, 'RPE i typ serii', 'Stuknij numer serii (menu serii): ustawisz <b>RPE</b> (jak ciężko było, 6–10), typ serii (rozgrzewkowa, robocza, drop set, do upadku) albo ją powielisz lub usuniesz. Serie rozgrzewkowe nie liczą się do objętości i rekordów.', []],
    ['note', /notatk/, 'Notatki', 'Notatkę do ćwiczenia dodasz w treningu: menu ⋯ → Notatka do ćwiczenia. Zobaczysz ją przy tym ćwiczeniu następnym razem. Notatki trafiają też do raportu PDF.', []],
    ['finish', /zakonczyc trening|koniec treningu|podsumowanie (po )?treningu|karta treningu|udostepnic trening|pochwalic sie/, 'Koniec treningu', 'Przycisk „Zakończ” w nagłówku treningu. Potem podsumowanie: czas, tonaż, serie, rekordy, spalone kalorie i przycisk <b>Karta</b> — obrazek do udostępnienia. Trening, którego zapomniałeś zapisać, dodasz w Historii („Dodaj trening z przeszłości”).', []],
    ['backdate', /zalegl\w* trening|trening z przeszlosci|zapomnialem (zapisac|wpisac)|dopisac trening|dodac (stary|wczorajszy) trening/, 'Trening z przeszłości', 'W <b>Historii</b> przycisk „Dodaj trening z przeszłości”: wybierasz datę i godzinę, a potem wpisujesz ćwiczenia i serie jak w zwykłym treningu.', [go('Historia', '#/history', 'history')]],
    ['history', /zakladk\w* histori|ekran histori|historia treningow|lista treningow|edytowac (stary )?trening|powtorzyc trening|powtorz trening/, 'Historia', 'Wszystkie zapisane treningi. Przełącznik <b>Lista | Kalendarz</b> na górze. Stuknij trening — szczegóły: ćwiczenia, serie, rekordy, czas, kalorie. Menu ⋯: Edytuj trening, Powtórz ten trening, Udostępnij kartę, Usuń. Ikona eksportu w nagłówku: kopia zapasowa, CSV, raport PDF, wyniki dla trenera.', [go('Historia', '#/history', 'history')]],
    ['calendar', /kalendarz\w*|przenosz\w* trening\w*|przeniesieni\w* trening\w*|przeniesc trening|przesunac trening|pominac trening|dzien wolny|dni treningowe|w jakie dni trenuj/, 'Kalendarz', '<b>Historia → Kalendarz</b> (albo „Kalendarz ›” na ekranie Dziś). Widzisz zrobione i zaplanowane treningi. Stuknij dzień z treningiem: <b>przenieś</b> na inny dzień (zabiera swój dzień planu), <b>pomiń</b> albo przywróć. Dzień wolny pozwala przenieść tu najbliższy trening. „Dni treningowe” ustawiasz w karcie aktualnego planu („zmień”). Polecenia: „przenieś jutrzejszy trening na sobotę”, „trenuję w poniedziałki, środy i piątki”.', [go('Kalendarz', '#/calendar', 'calendar')], ['Przenieś jutrzejszy trening na sobotę']],
    ['stats', /zakladk\w* postep|ekran postep|postepy (zakladk|ekran|gdzie)|przeglad postep/, 'Postępy', 'Cztery zakładki: <b>Przegląd</b> (karta Ten tydzień z raportem, cele, wykresy treningów i tonażu, samopoczucie, ranga, osiągnięcia, podsumowanie miesiąca, raport PDF), <b>Mięśnie</b> (mapa serii i regeneracji), <b>Siła</b> (poziomy, punkty, wykresy maksów, tablica rekordów), <b>Ciało</b> (waga, pomiary, zdjęcia).', [go('Postępy', '#/stats', 'chart-line')]],
    ['muscles', /mapa (miesni|ciala)|zakladk\w* miesnie|kolory miesni|zakres (serii )?forge|ile serii (na partie )?(pokazuje|liczy)/, 'Mięśnie', 'Postępy → Mięśnie: mapa ciała z liczbą serii na partię (ostatnie 7 albo 28 dni) albo widok regeneracji. Ćwiczenie liczy się w pełni dla mięśnia głównego i w połowie dla pomocniczych. Zakres FORGE dla Twojego celu i stażu pochodzi z badań (ACSM 2026, Pelland 2026). Stuknij partię — szczegóły i ćwiczenia.', [btn('Mięśnie', 'askRegen', null, 'activity')]],
    ['recovery', /model regeneracj|jak liczysz regeneracj|regeneracj\w* (miesni )?w aplikacji|kiedy partia gotowa/, 'Regeneracja', 'Dla każdej partii liczę czas od ostatniego treningu i ile było serii: duże partie potrzebują zwykle 48–72 h, małe 24–48 h, dłużej po ciężkiej sesji (model FORGE oparty na badaniach, m.in. Morán-Navarro 2017). Widok: Postępy → Mięśnie → Regeneracja. Zapytaj: „czy mogę dziś trenować nogi?”.', [], ['Czy mogę dziś trenować nogi?']],
    ['strengthTab', /zakladk\w* sila|poziom\w* sily (w aplikacji|gdzie)|wykres\w* maks|tablic\w* rekord/, 'Siła', 'Postępy → Siła: poziom siły w głównych bojach (z masy ciała i maksów), punkty DOTS, Wilks i IPF GL, wykresy wyliczonego maksa (1RM wzorem Epleya) i tablica rekordów. Progi poziomów to progi FORGE, nie normy z badań.', [btn('Siła', 'askStr', null, 'dumbbell')]],
    ['records', /jak liczysz rekord|co (to|jest) rekord w aplikacji|rodzaje rekord|gdzie (sa|znajde) rekord/, 'Rekordy', 'Rekord zapisuję, gdy pobijesz najlepszy ciężar w ćwiczeniu, najlepszy wyliczony maks (1RM, wzór Epleya) albo zrobisz więcej powtórzeń na tym samym ciężarze; w ćwiczeniach z masą ciała liczą się powtórzenia, a w ćwiczeniach na czas — najdłuższy czas. Pierwszy trening z ćwiczeniem nie daje rekordu, bo nie ma z czym porównać. Widzisz je w podsumowaniu treningu, w Postępy → Siła (tablica rekordów) i w historii ćwiczenia.', [btn('Rekordy', 'askPrs', null, 'trophy')]],
    ['body', /zakladk\w* cialo|ekran cialo|pomiar\w* (ciala|gdzie|jak dodac)|obwod\w* (gdzie|jak)|wpisac wage|wykres wagi/, 'Ciało', 'Postępy → Ciało: wykres masy ciała, pomiary obwodów (klatka, talia, biodra, ramię, przedramię, udo, łydka, kark, barki, % tłuszczu) i zdjęcia sylwetki. Wagę wpiszesz szybko kaflem „Wpisz wagę” na ekranie Dziś albo tu: „ważę 84,5”. Pomiar: „talia 86”.', [btn('Ciało', 'askBody', null, 'ruler')], ['Ważę 84,5']],
    ['photos', /zdjeci\w* sylwet|zdjeci\w* (postep|ciala)|porownan\w* zdjec|zdjecia (sa )?(prywatn|bezpiecz)|gdzie (sa )?zdjecia/, 'Zdjęcia sylwetki', 'Postępy → Ciało → Zdjęcia: dodajesz zdjęcia z aparatu lub galerii (przód, bok, tył) i porównujesz dwa obok siebie. <b>Zdjęcia nigdy nie wychodzą z telefonu</b> — nie ma serwera ani chmury. Są w pełnej kopii zapasowej, więc rób ją regularnie.', [btn('Ciało', 'askBody', null, 'camera')]],
    ['goals', /cele miesieczn|cel\w* na (ten |ten )?miesiac|dodac cel miesieczn|jak (dziala|ustawic) cel\w* miesieczn/, 'Cele miesięczne', 'Postępy → Przegląd → Cele: liczba treningów w miesiącu, tonaż albo ciężar w ćwiczeniu. Pasek pokazuje postęp. Stąd: „cel na ten miesiąc 12 treningów”.', [btn('Przegląd', 'askOver', null, 'target')], ['Cel na ten miesiąc 12 treningów']],
    ['lgoals', /cel na dluzej|dlugoterminow\w* cel|prognoz\w*|kiedy (osiagne|dojde)|cel z terminem/, 'Cel na dłużej z prognozą', 'Postępy → Przegląd → Cel na dłużej: ćwiczenie, docelowy maks i termin. Z Twoich maksów z ostatnich 8 tygodni liczę tempo (regresja liniowa, min. 3 treningi), datę osiągnięcia celu, potrzebne tempo i punkty kontrolne. Stąd: „chcę wycisnąć 100 kg do czerwca”.', [btn('Przegląd', 'askOver', null, 'target')], ['Chcę wycisnąć 100 kg do czerwca']],
    ['blocks', /blok\w* treningow|mezocykl|tydzien bloku|nowy blok|periodyzacj\w* w aplikacji/, 'Bloki treningowe', 'Plan z kreatora pracuje w blokach: 6 tygodni dla początkujących, 5 dla średniozaawansowanych i zaawansowanych (Rogerson 2024: odciążenie średnio co 5,6 tygodnia). W karcie aktualnego planu widzisz pasek „tydzień X z Y”, w treningu docelowy zapas powtórzeń (RIR) na dany tydzień, a ostatni tydzień to odciążenie. Po bloku dostajesz podsumowanie i przycisk „Zacznij następny blok”. Stąd: „zacznij nowy blok”.', []],
    ['deloadApp', /odciazeni\w* (w aplikacji|wlaczyc|jak dziala)|deload (w aplikacji|wlaczyc)|wlaczyc deload/, 'Odciążenie w aplikacji', 'Gdy masz zastój w co najmniej 2 ćwiczeniach wielostawowych albo trenujesz regularnie 8+ tygodni bez lżejszego tygodnia, w Przeglądzie pojawia się propozycja odciążenia. Włączone trwa 7 dni: połowa serii, ten sam ciężar. Poleceniem: „włącz odciążenie” / „wyłącz odciążenie”. Zapytaj też: „czy potrzebuję odciążenia?”.', [], ['Czy potrzebuję odciążenia?']],
    ['report', /raport\w* (tygodni|tygodniow|miesieczn)|ten tydzien (karta|raport)|pelny raport/, 'Raport tygodnia i miesiąca', 'Postępy → Przegląd → karta „Ten tydzień” → <b>Pełny raport</b>: porównanie z poprzednim okresem, treningi, tonaż, serie na partie, rekordy i wskazówki. Przełączasz tydzień i miesiąc.', [go('Raport', '#/report', 'file-text')]],
    ['recap', /podsumowani\w* (miesiac\w*|roku|roczne|miesieczne)|recap|wrapped|karty do udostepnienia/, 'Podsumowanie miesiąca i roku', 'Postępy → Przegląd → <b>Podsumowanie</b>: karty miesiąca albo roku (treningi, tonaż, rekordy, najmocniejszy okres, ulubione ćwiczenie, siła) i udostępnianie jako obraz 1080×1920 (np. na relację).', [go('Podsumowanie', '#/recap', 'sparkles')]],
    ['pdf', /raport\w* pdf|pdf\w*|wydruk|wydrukowac/, 'Raport PDF', 'Postępy → Przegląd → <b>Raport PDF</b> albo Historia → eksport. Wybierasz okres (4 tygodnie, 3 miesiące, 12 miesięcy, całość). Raport ma logo i wykresy: podsumowanie, tonaż i treningi tygodniowo, siła i rekordy, serie na partie względem zakresu FORGE, masa ciała i pomiary, lista treningów z notatkami. Powstaje w telefonie, bez internetu. Stąd: „zrób raport PDF z 3 miesięcy”.', [btn('Raport PDF', 'pdfSheet', null, 'file-text')], ['Zrób raport PDF z 3 miesięcy']],
    ['rank', /rang\w*|osiagnieci|odznak|xp\b|seria tygodni|passa/, 'Ranga, osiągnięcia, seria', 'Postępy → Przegląd: ranga rośnie z liczbą treningów i tonażem, osiągnięcia odblokowujesz za kamienie milowe (np. kluby 100/140/180 kg), a seria to liczba tygodni z rzędu, w których zrobiłeś cel tygodniowy (Ustawienia → Trening → Cel tygodniowy).', [btn('Przegląd', 'askOver', null, 'award')]],
    ['nutrition', /zywieni\w* (ekran|kafel|w aplikacji|gdzie|jak dziala)|ekran\w* zywien|kalkulator kalorii|jadlospis w aplikacji/, 'Żywienie', 'Kafel <b>Żywienie</b> na ekranie Dziś: dzienny cel kalorii (wzór Mifflina–St Jeora albo Katcha–McArdle’a przy % tłuszczu + Twoje treningi), białko, tłuszcze i węglowodany pod cel planu oraz przykładowy rozkład posiłków (3, 4 lub 5, także bez mięsa). Aplikacja nie zapisuje jedzenia. Zapytaj: „rozpisz posiłki na dziś”.', [go('Żywienie', '#/nutrition', 'flame')]],
    ['guide', /porad\w* i nauk|kafel porad|artykul\w*|baza wiedzy|zrodl\w* (wiedzy|badan)|skad (masz|bierzesz) wiedz/, 'Porady i nauka', 'Kafel na ekranie Dziś. Krótkie artykuły: objętość, powtórzenia i tempo, progresja, przerwy, regeneracja i odciążenie, białko, cardio, mity, rozgrzewka, czas treningu, cele, suplementy, partie mięśni, trening przed zawodami w trójboju i inne. Każde zalecenie ma źródło (badanie, metaanaliza, stanowisko ACSM/WHO/ISSN) sprawdzone w PubMed.', [go('Porady i nauka', '#/guide', 'book-open')]],
    ['tools', /narzedzi\w*|kalkulator\w*/, 'Narzędzia', 'Kafel <b>Narzędzia</b> na ekranie Dziś: stoper przerw, kalkulator talerzy, kalkulator 1RM, planer podejść na zawodach (z sumą i punktami IPF GL, DOTS, Wilks) i rozgrzewka do dowolnego ciężaru. Karta Zawody z odliczaniem jest w Postępy → Siła.', [go('Narzędzia', '#/tools', 'calculator')]],
    ['plates', /kalkulator talerzy|jakie talerze|ile talerzy|talerze (gdzie|ustawic)|ciezar gryfu|gryf (ile|wazy|ustawic)/, 'Kalkulator talerzy', 'Narzędzia → Kalkulator talerzy: wpisujesz ciężar, a ja pokazuję talerze na każdą stronę. Talerze dostępne na Twojej siłowni zaznaczasz w Ustawienia → Trening, ciężar gryfu w kalkulatorze. Stąd: „talerze na 120”, „gryf 15 kg”, „dodaj talerz 1,25”.', [go('Narzędzia', '#/tools', 'calculator')], ['Talerze na 120']],
    ['onerm', /kalkulator 1rm|kalkulator maks|jak liczysz maks|wzor epley|wyliczony maks/, 'Kalkulator 1RM', 'Narzędzia → Kalkulator 1RM: ciężar i powtórzenia → wyliczony maks (wzór Epleya, najdokładniejszy do 10 powtórzeń) i tabela ciężarów na 2–12 powtórzeń. Tutaj wystarczy napisać „100 kg na 5”.', [go('Narzędzia', '#/tools', 'calculator')], ['100 kg na 5']],
    ['attempts', /planer podejsc|podejscia na zawod\w* (gdzie|jak)|jak (dobrac|zaplanowac) podejscia/, 'Planer podejść', 'Narzędzia → Planer podejść na zawodach: z maksa wyliczam trzy podejścia (91%, 96,5% i 100% maksa) zaokrąglone do 2,5 kg — w przysiadzie, wyciskaniu i martwym ciągu. Zapytaj: „podejścia na zawody”.', [go('Narzędzia', '#/tools', 'calculator')], ['Podejścia na zawody']],
    ['meet', /karta zawod|odliczani\w* do (zawod|startu)|data zawod|przed zawodami|trojboj\w* (w aplikacji|modul)|modul trojbo|szczytowani/, 'Zawody w trójboju', 'Postępy → Siła → karta <b>Zawody</b>: wpisujesz datę startu, a ja odliczam dni i podpowiadam praktykę na dany etap (z ankiet zawodników i przeglądów badań: Travis 2021, Winwood 2026). Aplikacja <b>nie układa</b> szczytowania automatycznie — badań jest za mało na jeden sprawdzony protokół. Do tego planer podejść, punkty IPF GL i artykuł „Przed zawodami w trójboju”. Stąd: „mam zawody 15 marca”.', [{ l: 'Karta Zawody', i: 'trophy', a: 'askStr', href: '#/stats' }, go('Artykuł', '#/guide/meet', 'book-open')], ['Mam zawody 15 marca']],
    ['points', /\bdots\b|\bwilks\b|ipf ?gl|punkty (ipf|gl|dots|wilks)|punkt\w* sil/, 'Punkty DOTS, Wilks, IPF GL', 'Porównują wynik trójboju (suma przysiadu, wyciskania i martwego ciągu) między kategoriami wagowymi i płciami. IPF GL to oficjalne punkty IPF od 2020 r. Liczę je w Postępy → Siła (z Twoich maksów) i w planerze podejść w Narzędziach, zawsze z Twoją masą ciała.', [btn('Siła', 'askStr', null, 'dumbbell')]],
    ['coachMode', /tryb\w* trener|trener\w* (tryb|funkcj|w aplikacji)|dla trener|jako trener|prowadzi\w* podopieczn|trenera personaln/, 'Tryb trenera', '<b>Bez serwera i bez kont.</b> 1) Włącz: Ustawienia → Trening → „Tryb trenera” (albo napisz „włącz tryb trenera”). 2) Trener wysyła plan: Plany → plan → ⋯ → <b>Wyślij podopiecznemu</b> — link i kod QR (stąd: „wyślij plan podopiecznemu”). 3) Podopieczny otwiera link i klika „Dodaj ten plan” (staje się jego aktualnym planem). 4) Podopieczny odsyła wyniki: Historia → eksport → <b>Wyniki dla trenera</b> — plik z wybranego okresu (stąd: „wyniki dla trenera”). 5) Trener w Plany → <b>Podopieczni</b> wczytuje plik i widzi treningi, serie, rekordy, samopoczucie i zgłoszony ból. Nowy plik dopisuje się do starego. Wszystko zostaje w telefonach.', () => [S().coachMode ? go('Podopieczni', '#/clients', 'users') : btn('Włącz tryb trenera', 'askCoachOn', null, 'users')], ['Włącz tryb trenera', 'Wyślij plan podopiecznemu', 'Wyniki dla trenera']],
    ['sendPlan', /wysyl\w* plan\w*|wyslac plan|udostepnic plan|udostepnian\w* plan\w*|link do planu|kod qr|qr\b|przeslac plan/, 'Wysyłanie planu', 'Plany → plan → ⋯ → <b>Wyślij podopiecznemu</b>: dostajesz link i kod QR. Link zawiera tylko plan (z własnymi ćwiczeniami), bez Twoich treningów. Odbiorca otwiera link albo skanuje kod aparatem i klika „Dodaj ten plan”. Możesz też „Kopiuj jako tekst” albo „Eksportuj do pliku”. Stąd: „wyślij plan podopiecznemu”.', [], ['Wyślij plan podopiecznemu']],
    ['results', /wyniki dla trener|wysl\w* wynik\w* trener|plik (z wynikami|dla trener)|trener (ma|moze) (widziec|zobaczyc)/, 'Wyniki dla trenera', 'Historia → ikona eksportu → <b>Wyniki dla trenera</b>: wpisujesz imię, wybierasz okres (4 tygodnie, 3 miesiące, całość) i wysyłasz plik komunikatorem. Wyniki to plik, a nie kod QR — kilka tygodni treningów nie zmieści się w kodzie. Zamiast pliku możesz wysłać raport PDF (trener go przeczyta, ale nie wczyta do listy). Stąd: „wyniki dla trenera”.', [btn('Wyniki dla trenera', 'resSheet', null, 'send')]],
    ['clients', /podopieczn\w*|klienci|klientow|moi klienci/, 'Podopieczni', 'Widoczne po włączeniu trybu trenera: Plany → <b>Podopieczni</b>. Wczytujesz plik z wynikami, a na liście widzisz każdą osobę: ostatni trening, liczbę treningów i rekordów z 4 tygodni i zgłoszenia bólu. Stuknij osobę — jej treningi z seriami (np. „3 × 5 · 100 kg”), sen i energia. Zapytaj tutaj: „co u Kasi?”.', []],
    ['getPlan', /plan od trener|dostalem (link|plan)|otworzyc link (do )?planu|dodac plan z linku|zeskanowac kod/, 'Plan od trenera', 'Otwórz link od trenera (albo zeskanuj kod QR aparatem telefonu). Zobaczysz podgląd planu i przycisk <b>Dodaj ten plan</b> — plan od razu staje się aktualnym. Najlepiej otwierać link w przeglądarce, w której masz zainstalowany FORGE.', []],
    ['push', /powiadomien\w*|notyfikac/, 'Powiadomienia', 'Ustawienia → Dźwięk i powiadomienia → <b>Włącz powiadomienia</b> → „Zezwól”. Od razu przychodzi próbne powiadomienie. Potem koniec przerwy (i ostrzeżenie przed końcem) dociera przez Apple/Google także przy zablokowanym telefonie, bez przerywania muzyki. Na iPhonie: iOS 16.4+ i FORGE dodany do ekranu początkowego, otwierany z tej ikony. Stąd: „włącz powiadomienia”.', [], ['Włącz powiadomienia']],
    ['iosTimer', /minutnik\w* (ios|systemow|na ekranie blokady)|skrot\w* (ios|forge)|dynamic island|aplikacj\w* skroty/, 'Minutnik iPhone (Skróty)', 'Tylko iPhone, eksperymentalne: Ustawienia → Dźwięk i powiadomienia → „Minutnik na ekranie blokady (Skróty)”. Tworzysz w aplikacji Skróty skrót „FORGE Przerwa” z akcją „Rozpocznij minutnik” — wtedy każda przerwa ma systemowe odliczanie na ekranie blokady. Przy każdej przerwie na chwilę otwiera się aplikacja Skróty.', []],
    ['install', /zainstal\w*|instalacj\w*|ekran (glowny|poczatkowy)|ikon\w* (aplikacji|na pulpicie)|jak (dodac|pobrac) aplikacj/, 'Instalacja', '<b>Android (Chrome):</b> menu ⋮ → „Zainstaluj aplikację” albo „Dodaj do ekranu głównego”. <b>iPhone (Safari):</b> Udostępnij → „Do ekranu początkowego” → Dodaj, potem uruchamiaj z ikony. Aplikacja działa wtedy na pełnym ekranie i bez internetu, a aktualizuje się sama.', []],
    ['privacy', /prywatn\w*|gdzie (sa|trzymane|zapisane) (moje )?dane|czy (ktos|ktos) widzi|chmur\w*|konto|logowani|rejestracj|offline|bez internetu|serwer\w* (danych|zbiera)/, 'Dane i prywatność', 'Nie ma konta ani chmury — treningi, plany, pomiary i zdjęcia są tylko w tym telefonie (pamięć przeglądarki). Aplikacja działa bez internetu. Wyjątki: powiadomienia (serwer dostaje tylko czas końca przerwy i treść powiadomienia) i link do planu w trybie trenera (zawiera sam plan). Usunięcie aplikacji lub wyczyszczenie danych przeglądarki kasuje dane — rób kopię zapasową.', [go('Ustawienia', '#/settings', 'settings')]],
    ['backup', /kopi\w* zapas\w*|backup|przywroc\w*|zabezpieczeni\w* dan|stracic dane|chron\w* dane|nowy telefon|przeniesc na (nowy|inny) telefon/, 'Kopia zapasowa', 'Ustawienia → Dane i kopia: <b>Kopia zapasowa</b> (pełna, ze zdjęciami), <b>Kopia bez zdjęć</b>, <b>Automatyczne zabezpieczenie</b> (aplikacja sama trzyma kopię treningów w telefonie), <b>Przywróć z kopii</b> i <b>Chroń dane przed czyszczeniem</b>. Plik kopii zapisz poza telefonem (Dysk Google, iCloud). Na nowym telefonie: zainstaluj FORGE → Przywróć z kopii. Stąd: „zrób kopię zapasową”.', [btn('Zrób kopię teraz', 'doBackupBtn', null, 'download')], ['Zrób kopię zapasową']],
    ['csv', /\bcsv\b|excel|arkusz|eksport\w*/, 'Eksport', 'Historia → ikona eksportu (albo Ustawienia → Dane i kopia): pełna kopia (JSON), historia treningów w CSV (do Excela i Arkuszy Google), raport PDF i wyniki dla trenera. Plan wyeksportujesz z jego menu ⋯ (plik albo tekst).', [btn('Eksport', 'exportSheet', null, 'download')]],
    ['profile', /profil\w*|wiek (sam )?(rosnie|zmienia)|dane osobowe|wzrost (gdzie|zmienic)|plec (gdzie|zmienic)|aktywnosc (gdzie|dzienna)/, 'Profil', 'Ustawienia → Profil: imię, płeć, wzrost, wiek, aktywność w ciągu dnia i staż treningowy, a w „Dodatkowych danych” % tłuszczu i tętno. Z tego liczę kalorie, poziom siły i dobieram plan. Wiek wpisujesz raz — co roku sam doda się rok. Stąd: „mam 42 lata”, „mam 182 cm wzrostu”, „jestem średniozaawansowany”.', [go('Ustawienia', '#/settings', 'settings')]],
    ['settings', /ustawieni\w*|opcje aplikacji|konfiguracj/, 'Ustawienia', 'Koło zębate na ekranie Dziś. Pięć sekcji: <b>Profil</b>; <b>Trening</b> (jednostki, cel tygodniowy, krok ciężaru, automatyczna przerwa, automatyczna progresja, nie wygaszaj ekranu, tryb trenera, miejsca treningu, talerze); <b>Dźwięk i powiadomienia</b> (dźwięk, głośność, ostrzeżenie przed końcem przerwy, powiadomienia, wibracje); <b>Wygląd</b> (kolor); <b>Dane i kopia</b>. Każde z nich zmienię też poleceniem, np. „wyłącz wibracje”.', [go('Ustawienia', '#/settings', 'settings')], ['Moje ustawienia']],
    ['units', /jednostk\w*|funt\w*|\blb\b|krok ciezar|zaokraglani/, 'Jednostki i krok ciężaru', 'Ustawienia → Trening: <b>kg albo lb</b> i <b>krok ciężaru</b> (1; 1,25; 2,5; 5) — o tyle podpowiadam zwiększenie ciężaru i tak zaokrąglam. Stąd: „przełącz na funty”, „krok ciężaru 2,5”.', []],
    ['weekly', /cel tygodniow|ile razy w tygodniu (cel|ustawic)/, 'Cel tygodniowy', 'Ustawienia → Trening → Cel tygodniowy (1–7 treningów). Od niego zależy seria tygodni i karta „Ten tydzień”. Stąd: „cel tygodniowy 4”.', []],
    ['color', /kolor\w*|motyw\w*|wyglad\w*|ciemn\w* tryb|jasn\w* tryb|akcent/, 'Wygląd', 'Ustawienia → Wygląd: kolor akcentu — Żar (pomarańczowy), Karmin, Złoto, Lód (niebieski). Aplikacja ma ciemny motyw. Stąd: „zmień kolor na złoty”.', []],
    ['sound', /dzwiek\w*|glosnosc\w*|wibracj\w*|wygaszani\w* ekranu|ekran (gasnie|sie wylacza)|sygnal\w*/, 'Dźwięk, wibracje, ekran', 'Ustawienia → Dźwięk i powiadomienia: dźwięk stopera, głośność sygnału (Normalna / Głośna / Maks. — głośniejszy przebija się przez muzykę), ostrzeżenie przed końcem przerwy (wył., 10, 30, 60 s), powiadomienie po przerwie, wibracje. „Nie wygaszaj ekranu w treningu” jest w sekcji Trening. Stąd: „głośność maks”, „wyłącz wibracje”.', []],
    ['kcalBurn', /spalon\w* kalori\w* (jak|liczysz)|kalori\w* z treningu (jak|liczysz)|zegarek|tetno|pulsometr|kalibracj/, 'Spalone kalorie', 'Kalorie treningu liczę z czasu treningu, intensywności (MET z Kompendium Aktywności 2024) i Twojej masy ciała. Po treningu (szczegóły treningu w Historii) możesz dodać średnie tętno z zegarka albo wpisać kalorie z zegarka — wtedy kalibruję Twój osobisty współczynnik.', []],
    ['tour', /przewodnik|samouczek|wprowadzeni\w*|podpowiedzi (na ekran|jednorazow)|pierwsze uruchomien/, 'Przewodnik', 'Przy pierwszym uruchomieniu krótki przewodnik (3 ekrany) pokazuje, gdzie co jest, a na Planach, w Historii i Postępach pojawiają się jednorazowe podpowiedzi. Po wszystko inne pytaj tutaj — znam każdą funkcję aplikacji.', []],
    ['updates', /aktualizacj\w*|nowa wersj\w*|wersj\w* aplikacji|co nowego/, 'Aktualizacje', () => `Aplikacja aktualizuje się sama — nowa wersja wczytuje się przy kolejnym otwarciu. Obecna wersja: <b>FORGE ${F.APPVER}</b>. Twoje dane zostają nietknięte.`, []],
    ['chat', /\b(czat|chat|asystent|zapytaj forge)\b|co (umiesz|potrafisz) robic|czy jestes ai|sztuczn\w* inteligencj/, 'Zapytaj FORGE', 'To ja. Nie jestem AI — nie zgaduję, tylko liczę z Twoich danych i biorę wiedzę z badań. Odpowiadam na pytania o treningi, plan, rekordy, regenerację, ćwiczenia, żywienie i każdą funkcję aplikacji, a do tego wykonuję polecenia: układam plany, zmieniam ustawienia, zapisuję wagę i pomiary, przenoszę treningi, ustawiam cele, robię raporty i obsługuję tryb trenera. Każdą zmianę możesz cofnąć. Usuwać danych z czatu nie mogę — to celowe.', [], ['Co umiesz?']],
    ['copyai', /podsumowani\w* dla ai|kopiuj podsumowanie|chat ?gpt|gemini|inn\w* czat\w* ai/, 'Podsumowanie dla AI', 'Menu ⋯ w tym czacie → „Kopiuj podsumowanie dla AI”: skopiuję Twój profil, plan, 10 ostatnich treningów, maksy, serie na partię i wagę. Wklejasz to w dowolnym czacie AI i dopisujesz pytanie.', [btn('Kopiuj podsumowanie', 'askCopyAI', null, 'copy')]],
    ['cardioApp', /cardio (w aplikacji|w planie|zapisac|dodac)|zapisac (bieg|rower|spacer)|minuty cardio/, 'Cardio', 'Cardio dodajesz do planu w kreatorze (krok Cardio: rodzaj, minuty, osobno albo po treningu) albo jako ćwiczenie w treningu (bieżnia, rower, orbitrek, wioślarz…) z czasem. „Zrobię później” zostawia je do dokończenia na ekranie Dziś. <b>Osobne sesje cardio</b> mają własne dni tygodnia (Historia → Kalendarz → Dni treningowe → „Osobne sesje cardio”; domyślnie dni bez siłowni): w kalendarzu różowa kropka, a w dniu cardio na ekranie Dziś karta „Dziś cardio” z przyciskiem „Zacznij cardio”. Stąd: „zacznij cardio”. Minuty w tygodniu porównuję z zaleceniem WHO (150–300 min umiarkowanego wysiłku). Zapytaj: „ile cardio w tym tygodniu?”.', []]
  ];
  const FMAP = Object.fromEntries(FEAT.map(f => [f[0], f]));
  const featHits = n => FEAT.map(f => { const m = n.match(f[1]); return m ? { f, len: m[0].length, at: m.index } : null; }).filter(Boolean).sort((a, b) => b.len - a.len);
  const fv = x => typeof x === 'function' ? x() : x;
  const featAns = f => A(`<p><b>${f[2]}</b></p><p>${fv(f[3])}</p>`, (fv(f[4]) || []).filter(a => a && (a.href || a.a)), (f[5] || []).concat(['Co umiesz?']).slice(0, 4));
  const QFORM = /^(co|czym|czy|jak|gdzie|kiedy|ktor|jakie|jaki|jaka|po co|do czego|opowiedz|wyjasnij|opisz|powiedz|na czym|w jaki|chce wiedziec|nie wiem|nie rozumiem|nie moge znalezc|pomoz|pomoc|help|instrukcj)|(dziala|dzialaja|dzialanie|uzywac|korzystac|znajde|znalezc|jest\?|sa\?|o co chodzi|co to|\?)$|(jak (to )?dziala|do czego sluzy|co daje|na czym polega|gdzie (jest|sa|znajde|zmienie|ustawie|moge)|jak (uzyc|uzywac|korzystac|wlaczyc|wylaczyc|zmienic|ustawic|dodac|zrobic|otworzyc|wyslac|wczytac|zainstalowac|znalezc))/;

  /* ================= POLECENIA ================= */
  const ON = /\b(wlacz\w*|zalacz\w*|aktywuj\w*|uruchom\w*|odpal\w*|wlaczy\w*|wlaczon\w*|wlaczyc|aktywn\w*|zezwol\w*)\b/;
  const OFF = /\b(wylacz\w*|dezaktyw\w*|zgas\w*|wylaczon\w*|wylaczyc|nie chce|nie potrzebuje|zablokuj|bez)\b/;
  const VERB = /\b(ustaw\w*|zmien\w*|przelacz\w*|nastaw\w*|daj|wpisz|zapisz|dodaj|popraw|chce|prosze|zrob|wlacz\w*|wylacz\w*)\b/;
  const onOff = n => { const off = OFF.test(n), on = ON.test(n); if (off && !/\bnie (wylaczaj|wylacz)\b/.test(n)) return false; if (on) return true; if (/\bprzelacz/.test(n)) return 'toggle'; return null; };

  const SW = [
    ['autoRest', /automatyczn\w* (przerw|stoper|odlicz)|auto ?przerw|stoper\w* (sam|automat)|przerw\w* (sam\w*|automatycz\w*)/, 'Automatyczna przerwa', 'stoper sam rusza po zaliczeniu serii'],
    ['autoProg', /automatyczn\w* progres|auto ?progres|progresj\w*|podpowiadani\w* ciezar/, 'Automatyczna progresja', 'ciężar i powtórzenia z ostatniego treningu'],
    ['coachMode', /tryb\w* trener|trener\w* tryb|trybu trener/, 'Tryb trenera', 'w Planach jest sekcja Podopieczni'],
    ['vibrate', /wibracj\w*|wibrow\w*|wibrac\w*/, 'Wibracje', ''],
    ['sound', /dzwiek\w*|dzwieki|sygnal\w* dzwiek|wycisz\w*|scisz\w*|glos stopera/, 'Dźwięk stopera', ''],
    ['notifRest', /powiadomieni\w* (po|o koncu) przerw|lokaln\w* powiadomien/, 'Powiadomienie po przerwie', 'gdy aplikacja jest schowana']
  ];
  const settingCmd = (n, q) => {
    // nie wygaszaj ekranu (odwrócona logika)
    if (/wygasz\w*|gasn\w* ekran|ekran\w* (gasl|gasnal|gasnie|sie wygaszal|sie wylaczal)|gasniecie|ekran\w* (bedzie )?(zawsze|caly czas|wlaczon|aktywn|nie gas|sie wylacza|sie blokuje)|blokad\w* ekranu|budzik ekranu/.test(n)) {
      let v = null; if (/nie wygaszaj|bez wygaszania|nie chce\w* (zeby|aby) ekran|(wylacz|zablokuj)\w* (wygasz|gasn|blokad)|ekran\w* (bedzie )?(zawsze|caly czas|wlaczon|aktywn)|nie (gas|blokuj)/.test(n)) v = true; else if (/(wlacz|przywroc)\w* (wygasz|blokad)|niech (ekran )?(gasnie|sie wygasza)|pozwol\w* wygasz/.test(n)) v = false; else return null;
      const u = setS({ wake: v }); return A(`<p>${v ? 'Gotowe — w trakcie treningu ekran nie będzie się wygaszał.' : 'Gotowe — ekran będzie się wygaszał normalnie.'}</p>`, [u, go('Ustawienia', '#/settings', 'settings')]);
    }
    const oo = onOff(n);
    for (const [k, re, name, sub] of SW) { if (!re.test(n)) continue; let v = oo; if (k === 'sound' && /wycisz|scisz/.test(n)) v = false; if (v === null) { if (!VERB.test(n)) return null; return A(`<p><b>${name}</b>: teraz <b>${S()[k] ? 'włączone' : 'wyłączone'}</b>. Napisz „włącz” albo „wyłącz” — zmienię.</p>`, [go('Ustawienia', '#/settings', 'settings')]); }
      if (v === 'toggle') v = !S()[k]; if (!!S()[k] === v) return A(`<p><b>${name}</b>: już ${v ? 'włączone' : 'wyłączone'}.</p>`, k === 'coachMode' && v ? [go('Podopieczni', '#/clients', 'users')] : []);
      const u = setS({ [k]: v });
      if (k === 'coachMode') return A(v ? '<p>Włączyłem <b>tryb trenera</b>. W zakładce Plany na dole jest teraz sekcja <b>Podopieczni</b>. Plan wyślesz z jego menu ⋯ → „Wyślij podopiecznemu” albo napisz „wyślij plan podopiecznemu”.</p>' : '<p>Wyłączyłem tryb trenera. Wczytane wyniki podopiecznych zostają w telefonie — po ponownym włączeniu wszystko wróci.</p>', [u, ...(v ? [go('Podopieczni', '#/clients', 'users')] : [])], v ? ['Wyślij plan podopiecznemu', 'Jak działa tryb trenera?'] : []);
      const g = { autoRest: 'Automatyczną przerwę', autoProg: 'Automatyczną progresję', vibrate: 'Wibracje', sound: 'Dźwięk stopera', notifRest: 'Powiadomienie po przerwie' }[k] || name;
      return A(`<p>${v ? 'Włączyłem' : 'Wyłączyłem'}: <b>${g}</b>${sub ? ` (${sub})` : ''}.</p>`, [u, go('Ustawienia', '#/settings', 'settings')]);
    }
    // jednostki
    if (/\b(funt\w*|lb|lbs)\b/.test(n) && (VERB.test(n) || /^na funt/.test(n)) && !/ile .* (w|na) (kg|kilogram)/.test(n)) { if (S().unit === 'lb') return A('<p>Już liczysz w funtach.</p>'); const u = setS({ unit: 'lb' }); return A('<p>Przełączyłem na <b>funty (lb)</b>. Zapisane ciężary się nie zmieniają — tylko je przeliczam do wyświetlania.</p>', [u]); }
    if (/\b(kilogram\w*|kg|kilo)\b/.test(n) && /(przelacz|ustaw|zmien|wroc)\w* .*(jednostk|na kilo|na kg|kilogram)|jednostk\w* .*(kg|kilogram)/.test(n)) { if (S().unit !== 'lb') return A('<p>Już liczysz w kilogramach.</p>'); const u = setS({ unit: 'kg' }); return A('<p>Przełączyłem na <b>kilogramy</b>.</p>', [u]); }
    // krok ciężaru
    if (/krok\w* (ciezar|obciazen|zwieksz|progres)|zaokraglaj\w* do|skok\w* ciezar/.test(n)) { const v = numsOf(q).find(x => [1, 1.25, 2.5, 5].includes(x)); if (!v) return A('<p>Krok ciężaru może wynosić 1; 1,25; 2,5 albo 5. Napisz np. „krok ciężaru 2,5”.</p>', [], ['Krok ciężaru 2,5', 'Krok ciężaru 1,25']); const u = setS({ step: v }); return A(`<p>Krok ciężaru: <b>${String(v).replace('.', ',')} ${F.unit()}</b>. O tyle będę podpowiadać zwiększenie ciężaru.</p>`, [u]); }
    // cel tygodniowy
    if (/cel\w* tygodniow|tygodniow\w* cel/.test(n) && (VERB.test(n) || numsOf(q).length || wnum(n))) { const v = numsOf(q)[0] || wnum(n); if (!(v >= 1 && v <= 7)) return A('<p>Cel tygodniowy to od 1 do 7 treningów. Napisz np. „cel tygodniowy 4”.</p>'); const u = setS({ weeklyGoal: Math.round(v) }); return A(`<p>Cel tygodniowy: <b>${Math.round(v)} ${F.plur(Math.round(v), 'trening', 'treningi', 'treningów')}</b>.</p>`, [u]); }
    // głośność
    if (/glosnosc\w*|glosniej|ciszej|najglosniej|podglosnij|zglosnij|przycisz|glosn\w* (sygnal|dzwiek)|cich\w* (sygnal|dzwiek)|maksymaln\w* glos/.test(n)) { const cur = S().vol || 'l'; let v = /maks|najglos|max/.test(n) ? 'm' : /normaln|cich/.test(n) && !/ciszej/.test(n) ? 'n' : /\bglosn(a|y|o)\b/.test(n) ? 'l' : /glosniej|podglosnij|zglosnij/.test(n) ? (cur === 'n' ? 'l' : 'm') : /ciszej|przycisz/.test(n) ? (cur === 'm' ? 'l' : 'n') : null;
      if (!v) return A(`<p>Głośność sygnału: <b>${{ n: 'Normalna', l: 'Głośna', m: 'Maks.' }[cur]}</b>. Napisz „głośność maks”, „głośna” albo „normalna”.</p>`, [], ['Głośność maks', 'Głośność normalna']); const u = setS({ vol: v }); try { F.beep(F.SND_END, { force: 1 }); } catch (e) { }
      return A(`<p>Głośność sygnału: <b>${{ n: 'normalna', l: 'głośna', m: 'maksymalna' }[v]}</b>. Puściłem próbny dźwięk.</p>`, [u]); }
    // ostrzeżenie przed końcem przerwy
    if (/ostrzezen\w*|uprzedz\w*|przed koncem przerwy/.test(n) && (VERB.test(n) || OFF.test(n) || numsOf(q).length)) { let v = OFF.test(n) && !numsOf(q).length ? 0 : null; const x = numsOf(q)[0]; if (v === null && x) v = [10, 30, 60].reduce((a, b) => Math.abs(b - x) < Math.abs(a - x) ? b : a, 30); if (v === null && ON.test(n)) v = 30; if (v === null) return A('<p>Ostrzeżenie przed końcem przerwy: wyłączone, 10, 30 albo 60 s. Napisz np. „ostrzeżenie 10 s”.</p>', [], ['Ostrzeżenie 10 s', 'Wyłącz ostrzeżenie']);
      const u = setS({ restWarn: v }); return A(`<p>${v ? `Ostrzeżenie przed końcem przerwy: <b>${v} s</b>.` : 'Wyłączyłem ostrzeżenie przed końcem przerwy.'}</p>`, [u]); }
    // kolor
    if (/kolor\w*|motyw\w*|akcent\w*|barw\w*/.test(n) && (VERB.test(n) || /\b(zar|karmin\w*|zlot\w*|lod|niebiesk\w*|czerwon\w*|pomarancz\w*|zolt\w*)\b/.test(n)) && !/(jak|gdzie|jaki)\b/.test(n.split(' ')[0])) { const v = /zar|pomarancz|ogni|ember|domysln/.test(n) ? 'ember' : /karmin|czerwon|crimson|rozow|bordo/.test(n) ? 'crimson' : /zlot|zolt|gold|bursztyn/.test(n) ? 'gold' : /lod|niebiesk|blekit|fiolet|ice|granat|zimn/.test(n) ? 'ice' : null;
      if (!v) return A('<p>Kolory: <b>Żar</b> (pomarańczowy), <b>Karmin</b>, <b>Złoto</b>, <b>Lód</b> (niebieski). Napisz np. „zmień kolor na złoty”.</p>', [], ['Kolor złoty', 'Kolor lód', 'Kolor karmin']); const u = setS({ accent: v }, () => F.applyAccent && F.applyAccent());
      return A(`<p>Zmieniłem kolor na <b>${{ ember: 'Żar', crimson: 'Karmin', gold: 'Złoto', ice: 'Lód' }[v]}</b>.</p>`, [u]); }
    // talerze i gryf
    if (/talerz\w*|krazk\w*|krazek/.test(n) && /(dodaj|mam|usun|wyrzuc|nie mam|bez|zaznacz|odznacz|wlacz|wylacz)/.test(n) && numsOf(q).length && !/\bna \d/.test(n)) { const ok = [25, 20, 15, 10, 5, 2.5, 1.25, 0.5]; const vs = numsOf(q).filter(x => ok.includes(x)); if (!vs.length) return A('<p>Mogę zaznaczyć talerze: 25, 20, 15, 10, 5, 2,5, 1,25 i 0,5 kg.</p>'); const rm = /(usun|wyrzuc|nie mam|bez|odznacz|wylacz)/.test(n); const pl = [...S().plates]; vs.forEach(p => { const i = pl.indexOf(p); if (rm && i >= 0) pl.splice(i, 1); if (!rm && i < 0) pl.push(p); }); pl.sort((a, b) => b - a); const u = setS({ plates: pl });
      return A(`<p>${rm ? 'Odznaczyłem' : 'Zaznaczyłem'} talerze ${vs.map(x => String(x).replace('.', ',')).join(', ')} kg. Masz teraz: ${pl.map(x => String(x).replace('.', ',')).join(', ')} kg.</p>`, [u]); }
    if (/\bgryf\w*/.test(n) && numsOf(q).length && /(mam|ustaw|zmien|wazy|moj|uzywam|gryf \d)/.test(n) && !/ile wazy/.test(n)) { const v = numsOf(q)[0]; if (!(v >= 5 && v <= 30)) return A('<p>Ciężar gryfu wpisz w zakresie 5–30 kg.</p>'); const u = setS({ bar: F.fromDisp(v) }); return A(`<p>Gryf: <b>${kg(F.fromDisp(v))}</b>. Uwzględnię to w kalkulatorze talerzy i rozgrzewce.</p>`, [u]); }
    return null;
  };

  /* ---------- profil ---------- */
  const profileCmd = (n, q) => {
    const lo = String(q).toLowerCase(); let m;
    if ((m = lo.match(/(?:mam na imi[eę]|nazywam si[eę]|moje imi[eę] (?:to|jest)|m[oó]w (?:do )?mnie|imi[eę]:?)\s+([a-ząćęłńóśźż][a-ząćęłńóśźż-]{1,23})/i))) { const v = m[1].charAt(0).toUpperCase() + m[1].slice(1); const u = setS({ name: v }); return A(`<p>Miło mi, ${E(v)}! Zapisałem imię w profilu.</p>`, [u]); }
    if (/\bjestem (kobieta|dziewczyna|pania|kobieto)|\bplec\w*:? (kobieta|k|zenska)\b/.test(n)) { const u = setS({ sex: 'f' }); return A('<p>Zapisałem w profilu: <b>kobieta</b>. Uwzględnię to w kaloriach, poziomie siły i planach.</p>', [u]); }
    if (/\bjestem (mezczyzna|facetem|facet|chlopakiem|panem)|\bplec\w*:? (mezczyzna|m|meska)\b/.test(n)) { const u = setS({ sex: 'm' }); return A('<p>Zapisałem w profilu: <b>mężczyzna</b>.</p>', [u]); }
    if ((m = n.match(/\bmam (\d{2}) (lat|lata|rok)\b|\bwiek:? (\d{2})\b|\bskonczyl\w* (\d{2})\b|\b(\d{2}) lat(a)? (mam|skonczyl)/)) && !/(stazu|doswiadcz|trenuj|treningu|cwicz)/.test(n)) { const a = +(m[1] || m[3] || m[4] || m[5]); if (a < 10 || a > 100) return A('<p>Wiek wpisz w zakresie 10–100 lat.</p>'); const s = S(); const u = setS({ age: a, ageAt: Date.now(), dob: '' }, () => F.kcalClear && F.kcalClear()); return A(`<p>Zapisałem wiek: <b>${a} ${F.plur(a, 'rok', 'lata', 'lat')}</b>. Co roku sam dodam rok.</p>`, [u]); }
    if (/wzrost|wzrostu|mierze|jestem wysok/.test(n) && numsOf(q).length) { let v = numsOf(q)[0]; if (v < 3) v = Math.round(v * 100); if (!(v >= 100 && v <= 250)) return A('<p>Wzrost wpisz w centymetrach, np. „mam 182 cm wzrostu”.</p>'); const u = setS({ height: Math.round(v) }, () => F.kcalClear && F.kcalClear()); return A(`<p>Zapisałem wzrost: <b>${Math.round(v)} cm</b>.</p>`, [u]); }
    if ((m = n.match(/\bjestem (poczatkuj\w*|nowicjusz\w*|zielon\w*|sredniozaawansowan\w*|srednio ?zaawansowan\w*|zaawansowan\w*|weteran\w*)/))) { const v = /poczat|nowic|zielon/.test(m[1]) ? 'beg' : /sredn/.test(m[1]) ? 'mid' : 'adv'; const u = setS({ exp: v }); return A(`<p>Zapisałem staż: <b>${{ beg: 'początkujący', mid: 'średniozaawansowany', adv: 'zaawansowany' }[v]}</b>. Kreator i podpowiedzi uwzględnią to przy następnym planie.</p>`, [u]); }
    if ((m = n.match(/\btrenuj\w* (od|juz) (\d+|pol|rok|roku|dwoch|trzech|kilku) ?(lat|lata|roku|rok|miesiec\w*|miesiace)?/)) && !/plan/.test(n)) { const k = m[2] === 'pol' ? 0.5 : m[2] === 'rok' || m[2] === 'roku' ? 1 : NUMW[m[2]] || +m[2] || 0; const years = /mies/.test(m[3] || '') ? k / 12 : k; if (!years) return null; const v = years < 1 ? 'beg' : years <= 3 ? 'mid' : 'adv'; const u = setS({ exp: v }); return A(`<p>Zapisałem staż: <b>${{ beg: 'początkujący (do roku)', mid: 'średniozaawansowany (1–3 lata)', adv: 'zaawansowany (3+ lata)' }[v]}</b>.</p>`, [u]); }
    if (/prac\w* (siedzac|biurow)|pracuj\w* (przy biurku|w biurze|siedzac|za biurkiem)|siedz\w* (caly dzien|przy biurku|przy komputerze)/.test(n)) { const u = setS({ activity: 1 }); return A('<p>Zapisałem aktywność w ciągu dnia: <b>siedząca praca, mało ruchu</b>.</p>', [u]); }
    if (/pracuj\w* fizycznie|praca fizyczn|ciezk\w* praca|na budowie/.test(n)) { const u = setS({ activity: 4 }); return A('<p>Zapisałem aktywność w ciągu dnia: <b>wysoka — praca fizyczna</b>.</p>', [u]); }
    if (/(caly dzien|duzo) (na nogach|chodz)|pracuj\w* na nogach/.test(n)) { const u = setS({ activity: 3 }); return A('<p>Zapisałem aktywność w ciągu dnia: <b>umiarkowana — dużo na nogach</b>.</p>', [u]); }
    if ((m = n.match(/tetno spoczynkow\w* (\d{2,3})/))) { const v = +m[1]; if (v < 30 || v > 120) return A('<p>Tętno spoczynkowe wpisz w zakresie 30–120.</p>'); const u = setS({ hrRest: v }); return A(`<p>Zapisałem tętno spoczynkowe: <b>${v}</b>.</p>`, [u]); }
    if ((m = n.match(/tetno maks\w* (\d{3})/))) { const v = +m[1]; if (v < 120 || v > 230) return A('<p>Tętno maksymalne wpisz w zakresie 120–230.</p>'); const u = setS({ hrMax: v }); return A(`<p>Zapisałem tętno maksymalne: <b>${v}</b>.</p>`, [u]); }
    return null;
  };

  /* ---------- ciało: waga, pomiary ---------- */
  const MK = [['waist', /^(tali\w*|pas\w*|pasie)$/], ['chest', /^(klat\w*|klate|piers\w*)$/], ['hips', /^(biodr\w*)$/], ['forearm', /^(przedrami\w*)$/], ['arm', /^(ramie|ramienia|ramion\w*|biceps\w*|bicek|bica|reka|reki)$/], ['thigh', /^(ud\w*)$/], ['calf', /^(lydk\w*|lydek)$/], ['neck', /^(kark\w*|szyj\w*)$/], ['shoulders', /^(bark\w*|naramien\w*)$/], ['bf', /^(tluszcz\w*|bf|fat)$/]];
  const bodyCmd = (n, q) => {
    if (/\bile\b|\bjaka\b|\bjaki\b|czy\b|\?/.test(n + (String(q).includes('?') ? '?' : '')) && !/zapisz|wpisz|dodaj/.test(n)) return null;
    // waga
    const wm = String(q).toLowerCase().match(/(?:wa[żz][eę]|wa[żz]y[lł]em|wa[żz]y[lł]am|moja waga(?: to| jest| wynosi)?|waga(?: cia[lł]a)?:?|zapisz wag[eę]|wpisz wag[eę]|dodaj wag[eę]|ustaw wag[eę]|masa cia[lł]a:?)\s*(?:dzi[sś]|rano|teraz|wczoraj|to)?\s*(\d{2,3}(?:[.,]\d{1,2})?)/);
    if (wm) { const v = parseFloat(wm[1].replace(',', '.')); if (!(v >= 20 && v <= 400)) return A('<p>Podaj wagę w zakresie 20–400.</p>'); const day = /wczoraj/.test(n) ? startDay(Date.now()) - DAY : startDay(Date.now()); const prevIds = new Set(F.S.bw.map(b => b.id));
      return { async: async () => { await F.addBW(F.fromDisp(v), day + 8 * 3600e3); F.rebuild && F.rebuild(); }, then: () => { const e = F.S.bw.find(b => !prevIds.has(b.id)); const prev = F.S.bw.filter(b => b !== e && b.date < (e ? e.date : Date.now())).slice(-1)[0];
        const d = prev ? F.fromDisp(v) - prev.kg : 0; const u = undo(async () => { if (!e) return; F.S.bw = F.S.bw.filter(b => b.id !== e.id); await F.dbDel('bodyweight', e.id); F.rebuild && F.rebuild(); F.render(true); });
        return A(`<p>Zapisałem wagę: <b>${F.fmtNum(v, 1)} ${F.unit()}</b>${/wczoraj/.test(n) ? ' (wczoraj)' : ''}.${prev ? ` Poprzednio ${kg(prev.kg)} (${dd(prev.date)}), zmiana ${d > 0 ? '+' : d < 0 ? '−' : ''}${F.fmtNum(Math.abs(F.toDisp(d)), 1)} ${F.unit()}.` : ''}</p>`, [u, btn('Wykres wagi', 'askBody', null, 'ruler')].map(a => a.a === 'askBody' ? { ...a, href: '#/stats' } : a), ['Ile ważyłem miesiąc temu?']); } }; }
    // pomiary: „talia 86”, „obwód bicepsa 40 cm”, „talia 86 biodra 98”, „mam 18% tłuszczu”
    // pomiar tylko gdy jest kontekst (obwód, cm, %, zapisz…) albo wiadomość to same pary „partia liczba”
    const ctxW = /(obwod\w*|pomiar\w*|\bcm\b|procent|tluszcz\w*|zmierz\w*|zapisz|wpisz|dodaj|zanotuj)/.test(n) || /%/.test(String(q));
    const filler = /^(i|a|oraz|mam|w|na|to|ma|jest|dzis|teraz|moj\w*|moja|wynosi|pasie|\d+)$/;
    if (!ctxW && !n.split(' ').every(t => filler.test(t) || MK.some(([, re]) => re.test(t)))) return null;
    const toks = n.split(' '); const v = {}; const raw = String(q).replace(/(\d),(\d)/g, '$1.$2').toLowerCase(); const rt = F.norm(raw.replace(/\./g, 'DOT')).replace(/dot/g, '.').split(' ');
    for (let i = 0; i < rt.length; i++) { const t = rt[i]; const k = (MK.find(([, re]) => re.test(t)) || [])[0]; if (!k) continue; let num = null; for (let j = i + 1; j < Math.min(rt.length, i + 4); j++) { if (/^\d+(\.\d+)?$/.test(rt[j])) { num = +rt[j]; break; } if (MK.some(([, re]) => re.test(rt[j]))) break; } if (num == null) for (let j = i - 1; j >= Math.max(0, i - 3); j--) { if (/^\d+(\.\d+)?$/.test(rt[j])) { num = +rt[j]; break; } } if (num != null && !(k in v)) v[k] = num; }
    if (!Object.keys(v).length && /%/.test(String(q)) && /tluszcz|\bbf\b/.test(n)) { const x = numsOf(q)[0]; if (x) v.bf = x; }
    void toks; const keys = Object.keys(v); if (!keys.length) return null;
    const bad = keys.filter(k => k === 'bf' ? !(v[k] >= 3 && v[k] <= 60) : !(v[k] > 5 && v[k] < 300)); if (bad.length) return A('<p>Ta wartość wygląda na błędną. Obwody wpisz w centymetrach, tłuszcz w procentach.</p>');
    const MFN = Object.fromEntries((F.MEASF || []).map(x => [x[0], x])); const e = { id: F.uid(), date: startDay(Date.now()) + 8 * 3600e3, v };
    return { async: async () => { F.S.measures.push(e); F.S.measures.sort((a, b) => a.date - b.date); await F.dbPut('measures', e); if (v.bf) { S().bf = v.bf; F.saveSettings(); } }, then: () => {
      const u = undo(async () => { F.S.measures = F.S.measures.filter(x => x.id !== e.id); await F.dbDel('measures', e.id); F.render(true); });
      const prevOf = k => F.S.measures.filter(x => x.id !== e.id && x.v[k] != null).slice(-1)[0];
      return A(`<p>Zapisałem pomiary:</p><ul class="ak-ul">${keys.map(k => { const p = prevOf(k), f = MFN[k] || [k, k, 'cm']; return `<li>${f[1]}: <b>${F.fmtNum(v[k], 1)} ${f[2]}</b>${p ? ` (poprzednio ${F.fmtNum(p.v[k], 1)}, ${dd(p.date)})` : ''}</li>`; }).join('')}</ul>${v.bf ? '<p class="ak-s">% tłuszczu wpisałem też do profilu — kalorie policzę dokładniejszym wzorem.</p>' : ''}`, [u, { l: 'Pomiary', i: 'ruler', a: 'askBody', href: '#/stats' }], ['Moje pomiary']); } };
  };

  /* ---------- miejsce treningu ---------- */
  const gymCmd = (n) => {
    const m = n.match(/\bjestem (dzis |teraz |dzisiaj )?(w|na|we) (\w+)|\btrenuj\w* (dzis |dzisiaj |teraz )?(w|na) (\w+)|\bzmien\w* miejsce( treningu)?( na)? (\w+)|\bmiejsce( treningu)?:? (\w+)|\bjade (do|na) (\w+)/);
    if (!m) { if (/zmien\w* miejsce|miejsca treningu|wybierz miejsce/.test(n) && VERB.test(n)) return A('<p>Wybierz miejsce treningu:</p>', [btn('Miejsca treningu', 'gymPick', null, 'map-pin')]); return null; }
    const w = m[3] || m[6] || m[9] || m[11] || m[13]; if (!w || /^(trakcie|treningu|formie|stanie|pracy|szoku|ciazy|polowie|tym)$/.test(w)) return /zmien\w* miejsce|wybierz miejsce/.test(n) ? A('<p>Wybierz miejsce treningu:</p>', [btn('Miejsca treningu', 'gymPick', null, 'map-pin')]) : null;
    const stem = w.slice(0, 4); const gs = F.gyms ? F.gyms() : []; const syn = { dom: /^(dom|domu|mieszk)/, silow: /^(silow|silka|silke|silce|silk|gym|klub)/, hotel: /^(hotel)/, park: /^(park|dwor|plener|zewn)/, prac: /^(prac|biur)/ };
    const g = gs.find(x => N(x.n).startsWith(stem)) || gs.find(x => Object.values(syn).some(re => re.test(w) && re.test(N(x.n))));
    if (!g) { if (!Object.values(syn).some(re => re.test(w))) return null; return A(`<p>Nie masz jeszcze takiego miejsca. Twoje miejsca: ${gs.map(x => `<b>${E(x.n)}</b>`).join(', ')}. Dodaj nowe — z listą sprzętu, który tam masz.</p>`, [btn('Miejsca treningu', 'gymPick', null, 'map-pin')]); }
    if (S().gymId === g.id || (!S().gymId && gs[0] === g)) return A(`<p>Już masz ustawione miejsce: <b>${E(g.n)}</b>.</p>`);
    const u = setS({ gymId: g.id }); return A(`<p>Miejsce treningu: <b>${E(g.n)}</b>. Zamienniki i przycisk „Zajęte” podsuną tylko sprzęt dostępny tutaj (${(g.eq || []).length} rodzajów).</p>`, [u, btn('Miejsca treningu', 'gymPick', null, 'map-pin')]);
  };

  /* ---------- trening ---------- */
  const workoutCmd = (n, q) => {
    const live = F.S.draft;
    if (/\b(powtorz\w*|zrob\w* (jeszcze raz|ponownie))\b.*(ostatni|wczorajsz|poprzedni|tamten)\w* trening/.test(n)) { const s = F.S.sessions[0]; if (!s) return A('<p>Nie masz jeszcze zapisanego treningu.</p>'); if (live) return A('<p>Trening już trwa — najpierw go zakończ.</p>', [go('Wróć do treningu', '#/workout', 'play')]); later(() => F.startWorkout({ fromSession: s }), 900); return A(`<p>Zaczynam powtórkę treningu <b>${E(s.name || 'Trening')}</b> z ${dd(s.start)} — te same ćwiczenia, ciężary podpowiem z ostatniego razu.</p>`); }
    // skracanie
    let sm = n.match(/\b(skroc\w*|przytnij|skrocony|krotszy)\b/) || n.match(/\b(mam|zostalo mi|mam tylko|tylko|zdaze|zmieszcze sie w|ogarne)\s*(tylko |jakies |ok |okolo )?(\d+|pol godziny|godzine|trzy kwadranse|kwadrans)\s*(min\w*|godzin\w*)?\b/);
    const sm2 = n.match(/\btrening\w* (na|w|do) (\d+) min/); if (!sm && sm2) sm = sm2;
    if (sm && /trening|min|godzin|kwadrans|czasu/.test(n)) { let mins = /pol godziny/.test(n) ? 30 : /trzy kwadranse/.test(n) ? 45 : /\bgodzin/.test(n) && !/\d+ godzin/.test(n) ? 60 : /kwadrans/.test(n) ? 15 : (numsOf(q).find(x => x >= 10 && x <= 180) || 0); if (/\d+ godzin/.test(n)) mins = (numsOf(q)[0] || 1) * 60;
      if (!mins) return /skroc|przytnij|krotszy/.test(n) ? A('<p>Do ilu minut skrócić dzisiejszy trening?</p>', [], ['Skróć trening do 30 minut', 'Skróć trening do 45 minut', 'Skróć trening do 60 minut']) : null; const nx = F.nextWorkout && F.nextWorkout(); if (!nx) return A('<p>Nie masz aktualnego planu, więc nie mam czego skrócić.</p>', [go('Plany', '#/plans', 'clipboard-list')]);
      const full = F.PLN.estMin(nx.day.items); const target = mins < 38 ? 30 : mins < 53 ? 45 : 60;
      if (mins >= full) return A(`<p>Pełny trening <b>${E(nx.day.name)}</b> zajmuje ${full} min — zmieścisz się w ${mins} min bez skracania.</p>`, [btn('Zacznij trening', 'startNext', null, 'play')]);
      const r = F.shortenItems(nx.day.items, target); const est = F.PLN.estMin(r.items);
      return A(`<p>Skrócony trening <b>${E(nx.day.name)}</b> na ${target} min (wyliczony czas ${est} min, pełny ${full} min):</p><ul class="ak-ul">${r.items.map(i => `<li>${E(F.exName(i.exId))} — ${i.sets} × ${E(String(i.reps))}</li>`).join('')}</ul><p class="ak-s">Ćwiczenia główne zostają, skracam najpierw izolowane i pomocnicze (Iversen 2021). Pominięte serie nie przechodzą na kolejny trening.</p>`, [btn(`Zacznij (${target} min)`, 'shortGo', { m: target }, 'play')], ['Zacznij pełny trening']);
    }
    // cardio
    if (/\b(zacznij|zaczynam|rozpocznij|start\w*|odpal|uruchom|zrob\w*|robie|ide na)\b.*\bcardio\b|^cardio$/.test(n) && !/\b(jak|ile|czy|co to)\b/.test(n)) {
      if (live) return A('<p>Trening już trwa.</p>', [go('Wróć do treningu', '#/workout', 'play')]);
      const ct = F.cardioToday && F.cardioToday(), nq = !ct && F.cardioQueue ? F.cardioQueue(13).find(x => !x.done) : null, x = ct || nq;
      if (!x) return A('<p>W Twoim aktualnym planie nie ma osobnych sesji cardio. Cardio dodasz w kreatorze (krok Cardio) albo jako ćwiczenie w zwykłym treningu.</p>', [go('Kreator planu', '#/wizard', 'sparkles')]);
      later(() => F.startWorkout({ plan: x.plan, day: x.day }), 900);
      return A(`<p>Zaczynam: <b>${E(x.day.name)}</b> — ${Math.round((+(x.day.items[0] || {}).reps || 0) / 60)} min.${ct ? '' : ` Zaplanowane było na ${ddA(x.ts)}.`}</p>`);
    }
    // start
    if (/^(zacznij|zaczynam|zaczynamy|start|startuj|startujemy|rozpocznij|rozpoczynam|odpal|dawaj|lecimy|ruszamy|jedziemy|zaczynajmy)\b|\b(zacznij|rozpocznij|odpal|uruchom|wlacz|start\w*|zaczac|rozpoczac|zrobic|robie|robimy)\w* (pelny |dzisiejsz\w* |nastepn\w* |kolejn\w* |najblizsz\w* |pusty |nowy )?trening\b|\bchce (zaczac|cwiczyc|trenowac) (teraz|juz)/.test(n) && !/\b(jak|kiedy|czy|ile|co)\b/.test(n.split(' ')[0])) {
      if (live) return A('<p>Trening już trwa.</p>', [go('Wróć do treningu', '#/workout', 'play')]);
      if (/pusty|bez planu|wolny trening|wlasny trening/.test(n)) { later(() => F.startWorkout({}), 900); return A('<p>Zaczynam pusty trening — ćwiczenia dodasz przyciskiem „+”.</p>'); }
      const plans = F.S.plans; let plan = null, day = null;
      const cleaned = n.replace(/\b(zacznij|zaczynam|zaczynamy|start\w*|rozpocznij|odpal|dawaj|lecimy|trening\w*|dzis|dzisiaj|teraz|juz|prosze|z planu|plan\w*|dzien|dnia)\b/g, ' ').trim();
      if (cleaned) { let best = 0; plans.forEach(p => p.days.forEach(d => { const dn = N(d.name).split(' ').filter(t => t.length > 1); const hit = dn.filter(t => cleaned.split(' ').some(u => u === t || (u.length >= 4 && t.startsWith(u)) || (t.length >= 4 && u.startsWith(t)))).length; const sc = hit ? hit / dn.length + (p.id === S().curPlan ? 0.1 : 0) : 0; if (sc > best) { best = sc; plan = p; day = d; } })); if (best < 0.5) { plan = null; day = null; } }
      if (!plan) { const nx = F.nextWorkout && F.nextWorkout(); if (!nx) return A('<p>Nie masz jeszcze planu. Ułożę go — napisz np. „ułóż mi plan na masę na 3 dni” — albo zacznij pusty trening.</p>', [go('Plany', '#/plans', 'clipboard-list')], ['Ułóż mi plan na masę na 3 dni', 'Zacznij pusty trening']); plan = nx.plan; day = nx.day; }
      later(() => F.startWorkout({ plan, day }), 900);
      return A(`<p>Zaczynam: <b>${E(day.name)}</b> z planu „${E(plan.name)}” — ${day.items.length} ${F.plur(day.items.length, 'ćwiczenie', 'ćwiczenia', 'ćwiczeń')}, wyliczony czas ${F.PLN.estMin(day.items)} min. Powodzenia!</p>`);
    }
    return null;
  };

  /* ---------- odciążenie, blok ---------- */
  const cycleCmd = (n) => {
    if (/odciaz\w*|deload\w*/.test(n) && (ON.test(n) || OFF.test(n) || /\b(zacznij|zakoncz|przerwij|rozpocznij|zrob|chce|zrobmy)\b/.test(n)) && !/\b(czy|kiedy|co to|po co|jak)\b/.test(n)) {
      const s = S(), on = s.deloadUntil > Date.now(); const want = OFF.test(n) || /zakoncz|przerwij|stop/.test(n) ? false : true;
      if (want && on) return A(`<p>Odciążenie już trwa — do ${dd(s.deloadUntil)}.</p>`); if (!want && !on) return A('<p>Odciążenie nie jest włączone.</p>');
      const u = setS(want ? { deloadUntil: Date.now() + 7 * DAY, lastDeload: Date.now() } : { deloadUntil: 0 });
      return A(want ? '<p>Włączyłem <b>odciążenie na 7 dni</b>: połowa serii, ten sam ciężar. Po tygodniu wracasz do pełnego planu.</p>' : '<p>Zakończyłem odciążenie. Następny trening — pełny plan.</p>', [u]);
    }
    if (/(zacznij|rozpocznij|start\w*|nowy|kolejn\w*|nastepn\w*|reset\w*)\w* (nowy |kolejny |nastepny )?(blok|mezocykl|cykl)/.test(n)) { const nx = F.nextWorkout && F.nextWorkout(); if (!nx) return A('<p>Nie masz aktualnego planu.</p>'); const p = nx.plan; const prev = clone(p.meta || {}); p.meta = p.meta || {}; p.meta.blockStart = Date.now();
      return { async: () => F.savePlan(p), then: () => A(`<p>Zacząłem nowy blok w planie <b>${E(p.name)}</b>: tydzień 1.</p>`, [undo(async () => { p.meta = prev; await F.savePlan(p); F.render(true); })]) }; }
    return null;
  };

  /* ---------- kalendarz ---------- */
  const calCfg = () => { const s = S(); if (!s.cal) s.cal = {}; const c = s.cal; c.moves = c.moves || {}; c.pauses = c.pauses || []; c.skips = c.skips || []; return c; };
  const slotAt = key => (F.calQueue ? F.calQueue(60) : []).find(x => x.key === key);
  const calCmd = (n, q) => {
    // dni treningowe
    const wds = wdsOf(n);
    if (wds.length >= 1 && /(trenuj\w*|bede trenowac|chce trenowac|dni treningow\w*|treningi (w|we|mam w)|zmien\w* dni|ustaw\w* dni|cwicz\w* w)/.test(n) && !/(przenies|przesun|przeloz|pomin)/.test(n) && (wds.length >= 2 || /dni treningow|zmien\w* dni|ustaw\w* dni/.test(n))) {
      if (!F.nextWorkout || !F.nextWorkout()) return A('<p>Najpierw potrzebny jest aktualny plan.</p>', [go('Plany', '#/plans', 'clipboard-list')]);
      const c = calCfg(), prev = clone(c); c.wd = wds; c.moves = {}; c.pauses = []; F.saveSettings(); const nd = F.nextWorkout().plan.days.length;
      return A(`<p>Dni treningowe: <b>${wds.map(i => WDS[i]).join(', ')}</b>. Kolejka treningów ułożona od nowa.${wds.length !== nd ? ` Twój plan ma ${nd} ${F.plur(nd, 'dzień', 'dni', 'dni')}, więc będą szły po kolei na te dni.` : ''}</p>`, [undo(() => { S().cal = prev; F.saveSettings(); F.render(true); }), go('Kalendarz', '#/calendar', 'calendar')], ['Kiedy trenuję w tym tygodniu?']);
    }
    // przeniesienie
    if (/\b(przenies\w*|przesun\w*|przeloz\w*|przestaw\w*)\b/.test(n) && /trening|jutr|dzis|pon|wt|sr|czw|pt|sob|niedz|\d/.test(n)) {
      if (/(caly|wszystk\w*|plan) .*o (\d|jeden|dzien)/.test(n)) return A('<p>Przesunięcie całej kolejki zrobisz w kalendarzu: stuknij dzień → „Przesuń wszystko o dzień”.</p>', [go('Kalendarz', '#/calendar', 'calendar')]);
      const parts = n.split(/\b(na|do)\b/); const head = parts[0], tail = n.slice(head.length);
      const today = startDay(Date.now()); let from = null;
      if (/dzisiejsz|dzis/.test(head)) from = today; else if (/jutrzejsz|jutr/.test(head)) from = today + DAY; else { const fw = wdsOf(head); if (fw.length) { let d = today; while (wdOf(d) !== fw[0]) d += DAY; from = d; } else { const fd = futureDate(head, q); if (fd != null) from = fd; } }
      const q0 = F.calQueue ? F.calQueue(60) : []; if (!q0.length) return A('<p>Nie masz zaplanowanych treningów.</p>', [go('Plany', '#/plans', 'clipboard-list')]);
      const slot = from != null ? q0.find(x => x.key === F.dayKey(from)) : (/najblizsz|nastepn|kolejn|ten trening/.test(head) || !head.trim() || /trening/.test(head) ? q0[0] : null);
      if (!slot) return A(`<p>${from != null ? `Na ${ddA(from)} nie masz zaplanowanego treningu.` : 'Nie wiem, który trening przenieść.'} Najbliższe: ${q0.slice(0, 3).map(x => `${WDS[wdOf(dkTs(x.key))]} ${dd(dkTs(x.key))} — ${E(x.day.name)}`).join('; ')}.</p>`, [go('Kalendarz', '#/calendar', 'calendar')]);
      const to = futureDate(tail, q); if (to == null) { const a = A(`<p>Na który dzień przenieść <b>${E(slot.day.name)}</b> (${ddw(dkTs(slot.key))})?</p>`, [], ['Na jutro', 'Na sobotę', 'Na niedzielę']); a.pendingTo = slot; return a; }
      const tk = F.dayKey(to); if (tk < F.dayKey(Date.now())) return A('<p>Ten dzień już minął.</p>'); if (q0.some(x => x.key === tk && x.src !== slot.src)) return A(`<p>Na ${ddA(to)} masz już trening — wybierz inny dzień.</p>`);
      const c = calCfg(), prev = c.moves[slot.src]; if (tk === slot.src) delete c.moves[slot.src]; else c.moves[slot.src] = tk; F.saveSettings();
      return A(`<p>Przeniosłem <b>${E(slot.day.name)}</b> z ${ddG(dkTs(slot.key))} na <b>${ddA(to)}</b>. Kolejne treningi zostają na swoich dniach.</p>`, [undo(() => { const c2 = calCfg(); if (prev == null) delete c2.moves[slot.src]; else c2.moves[slot.src] = prev; F.saveSettings(); F.render(true); }), go('Kalendarz', '#/calendar', 'calendar')]);
    }
    // pominięcie
    if (/\b(pomin\w*|odpusc\w*|odwolaj\w*|anuluj\w*|opuszcz\w*|nie (ide|pojde|dam rady)( dzis| jutro| dzisiaj)? (na )?trening)\b/.test(n) && /(trening|jutr|dzis|pon|wt|sr|czw|pt|sob|niedz)/.test(n) && !/przerw/.test(n)) {
      const today = startDay(Date.now()); let from = /dzisiejsz|dzis/.test(n) ? today : /jutrzejsz|jutr/.test(n) ? today + DAY : null; if (from == null) { const fw = wdsOf(n); if (fw.length) { let d = today; while (wdOf(d) !== fw[0]) d += DAY; from = d; } }
      const q0 = F.calQueue ? F.calQueue(60) : []; const slot = from != null ? q0.find(x => x.key === F.dayKey(from)) : q0[0]; if (!slot) return A(`<p>${from != null ? `Na ${ddA(from)} nie masz zaplanowanego treningu.` : 'Nie masz zaplanowanych treningów.'}</p>`);
      const c = calCfg(), prev = clone(c.skips), last = F.S.sessions.find(s => s.planId === F.nextWorkout().plan.id), lim = F.dayKey(Date.now() - 30 * DAY); c.skips = c.skips.filter(x => x.key >= lim); c.skips.push({ key: slot.key, dayId: slot.day.id, after: last ? last.id : '' }); F.saveSettings();
      return A(`<p>Pominąłem <b>${E(slot.day.name)}</b> (${ddw(dkTs(slot.key))}). Plan idzie dalej — ten dzień planu wypadnie przy następnym treningu.</p>`, [undo(() => { calCfg().skips = prev; F.saveSettings(); F.render(true); }), go('Kalendarz', '#/calendar', 'calendar')]);
    }
    return null;
  };
  const dkTs = k => new Date(Math.floor(k / 10000), Math.floor(k / 100) % 100 - 1, k % 100).getTime();
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

  /* ---------- plany: aktualny, startowe, przerwy ---------- */
  const planByName = n => { const toks = n.split(' ').filter(t => t.length > 1 && !/^(plan\w*|ustaw\w*|zmien\w*|jako|aktualn\w*|na|z|ze|do|moj\w*|ten|ta|wybierz|przelacz\w*|aktywuj\w*|glown\w*|biezac\w*|wyslij|udostepnij|podopieczn\w*|link|kod|qr|daj|przeslij|trener\w*|koleg\w*|klient\w*|mi|go|jej|jemu)$/.test(t)); if (!toks.length) return null; let best = null, bs = 0;
    F.S.plans.forEach(p => { const pn = N(p.name).split(' ').filter(t => t.length > 1); const hit = pn.filter(t => toks.some(u => u === t || (u.length >= 4 && t.startsWith(u.slice(0, 5))) || (t.length >= 4 && u.startsWith(t.slice(0, 5))))).length; const sc = hit / Math.max(pn.length, 1); if (sc > bs) { bs = sc; best = p; } }); return bs >= 0.34 ? best : null; };
  const TPLK = [[/push|pull|ppl|pchaj|ciagnij/, 'Push / Pull / Nogi'], [/sila\w* gora|gora dol sil|sila gora/, 'Siła: Góra / Dół'], [/gora dol|gora i dol|upper|lower/, 'Góra / Dół'], [/3 ?x ?5|a ?b|sila a|siłowy a/, 'Siła A/B'], [/cale cialo|fbw|full body/, 'Całe ciało'], [/poslad|nogi i poslad|glute/, 'Pośladki i nogi'], [/hantl\w* i drazek|dom\w*|w domu/, 'Dom: hantle'], [/bez sprzetu|masa ciala|kalistenik|bez niczego/, 'Bez sprzętu'], [/60|senior|starsz|zdrowi/, 'Zdrowie 60+']];
  const planCmd = (n, q, ctx) => {
    // ustaw jako aktualny
    if (/(ustaw\w*|zmien\w*|przelacz\w*|wybierz|aktywuj\w*|uzyj|trenuj\w* (teraz )?(z|wedlug)|zrob)\b.*\b(plan\w*|aktualn\w*)/.test(n) && /(aktualn|glown|biezac|aktywn|na plan|plan na|przelacz|wybierz|uzyj|trenuj|zmien\w* plan)/.test(n) && !/(uloz|stworz|nowy plan|kreator|startow|gotow|szablon|przerw|dni|wyslij|udostepnij)/.test(n)) {
      if (/^(tak|ustaw jako aktualny|ustaw go|ustaw ten)/.test(n) && ctx.lastPlan) return setCur(F.planOf(ctx.lastPlan));
      const p = planByName(n); if (!p) return A(`<p>Który plan ustawić jako aktualny?</p>`, [], F.S.plans.slice(0, 4).map(x => `Ustaw jako aktualny: ${x.name}`));
      return setCur(p);
    }
    // plan startowy
    if (/(plan\w* startow\w*|gotow\w* plan\w*|szablon\w*|z biblioteki)/.test(n) || (/\b(dodaj|wez|wybierz|wstaw|zaladuj)\w* plan\b/.test(n) && TPLK.some(([re]) => re.test(n)))) {
      const TT = F.TEMPLATES || []; const hit = TPLK.find(([re]) => re.test(n)); const i = hit ? TT.findIndex(t => t[0].startsWith(hit[1])) : -1;
      if (i < 0) return A(`<p>Mam ${TT.length} planów startowych. Który dodać?</p><ul class="ak-ul">${TT.map(t => `<li><b>${E(t[0])}</b> — ${E(t[1]).slice(0, 110)}${t[1].length > 110 ? '…' : ''}</li>`).join('')}</ul>`, [btn('Plany startowe', 'templates', null, 'list-checks')], TT.slice(0, 4).map(t => `Dodaj plan startowy ${t[0]}`));
      const t = TT[i], m = t[3]; const plan = { id: F.uid(), name: t[0], created: Date.now(), meta: { goal: m.goal, exp: m.exp, weekdays: [...m.weekdays], tpl: 1, rest: { main: F.KB.restOf(m.goal, m.exp, 'main'), sec: F.KB.restOf(m.goal, m.exp, 'sec'), iso: F.KB.restOf(m.goal, m.exp, 'iso') } }, days: F.tplItems(t).map(d => ({ id: F.uid(), name: d.name, items: d.items.map(it => ({ id: F.uid(), ...it })) })) };
      return { async: () => F.savePlan(plan), then: () => { ctx.lastPlan = plan.id; ctx.offerCur = plan.id; return A(`<p>Dodałem plan <b>${E(t[0])}</b> — ${plan.days.length} ${F.plur(plan.days.length, 'dzień', 'dni', 'dni')}: ${plan.days.map(d => E(d.name)).join(', ')}. Czeka w zakładce Plany.</p><p><b>Ustawić go jako aktualny?</b></p>`, [btn('Ustaw jako aktualny', 'askSetCur', { id: plan.id }, 'check'), go('Zobacz plan', '#/plan/' + plan.id, 'clipboard-list'), undo(async () => { await F.delPlan(plan.id); F.render(true); })], ['Ustaw jako aktualny']); } };
    }
    // przerwy w planie
    if (/przerw\w*/.test(n) && /(plan|cwiczen|ciezk|wielostaw|izolow|glown|pomocn|pozostal|jednostaw|wszystk)/.test(n) && (VERB.test(n) || /(ciezk|wielostaw|izolow|glown|pomocn|pozostal|jednostaw|wszystk)/.test(n)) && numsOf(q).length && !/^(ile|jak|jaka|jakie|czy)\b/.test(n)) {
      const nx = F.nextWorkout && F.nextWorkout(); if (!nx) return A('<p>Nie masz aktualnego planu.</p>'); const p = nx.plan; let sec = numsOf(q)[0]; if (/min/.test(n) && sec <= 10) sec = Math.round(sec * 60); if (/poltorej/.test(n)) sec = 90; if (!(sec >= 15 && sec <= 600)) return A('<p>Przerwę ustaw w zakresie 15 s – 10 min.</p>');
      const roles = /wszystk|caly plan|calym planie/.test(n) ? ['main', 'sec', 'iso'] : [/(ciezk|glown|boj|bazow)/.test(n) ? 'main' : null, /(pozostal|pomocn|wielostaw(?!.*ciezk))/.test(n) && !/ciezk/.test(n) ? 'sec' : null, /(izolow|jednostaw|pojedyncz|male)/.test(n) ? 'iso' : null].filter(Boolean);
      if (!roles.length) return A(`<p>Dla których ćwiczeń? W planie są 3 grupy przerw: ciężkie wielostawowe (teraz ${F.restProfile(p).main} s), pozostałe wielostawowe (${F.restProfile(p).sec} s) i izolowane (${F.restProfile(p).iso} s).</p>`, [], [`Przerwy na ciężkich ćwiczeniach ${sec} s`, `Przerwy na izolowanych ${sec} s`, `Wszystkie przerwy ${sec} s`]);
      const prev = clone(p); p.meta = p.meta || {}; const r = p.meta.rest = { ...F.restProfile(p) }; roles.forEach(k => { r[k] = sec; });
      p.days.forEach(d => { d.items.forEach(it => { if (it.cardio) return; const role = it.role || F.restRole(it.exId); if (roles.includes(role)) it.rest = r[role]; }); const inf = F.ssInfo(d.items); d.items.forEach((it, k) => { const g = inf[k]; if (g) it.rest = Math.max(...d.items.slice(g.start, g.end + 1).map(x => x.rest || 0)); }); });
      const nm = { main: 'ciężkie wielostawowe', sec: 'pozostałe wielostawowe', iso: 'izolowane' };
      return { async: () => F.savePlan(p), then: () => A(`<p>W planie <b>${E(p.name)}</b> ustawiłem przerwy: ${roles.map(k => `${nm[k]} — <b>${F.fmtDur ? F.fmtDur(sec) : sec + ' s'}</b>`).join(', ')}. Zmieniłem je we wszystkich takich ćwiczeniach planu.</p>`, [undo(async () => { await F.savePlan(prev); F.render(true); }), go('Plan', '#/plan/' + p.id, 'clipboard-list')]) };
    }
    return null;
  };
  const setCur = p => { if (!p) return A('<p>Nie znalazłem tego planu.</p>'); if (S().curPlan === p.id) return A(`<p><b>${E(p.name)}</b> już jest aktualnym planem.</p>`); const u = setS({ curPlan: p.id }); const nx = F.nextWorkout && F.nextWorkout();
    return A(`<p>Aktualny plan: <b>${E(p.name)}</b>.${nx ? ` Następny trening: ${E(nx.day.name)}.` : ''}</p>`, [u, go('Plany', '#/plans', 'clipboard-list')], ['Co mam dziś?', 'Kiedy trenuję w tym tygodniu?']); };
  F.act.askSetCur = b => { const p = F.planOf(b.dataset.id); if (!p) { F.toast('Ten plan już nie istnieje'); return; } F.setCurPlan(p.id); F.toast('Ustawiono jako aktualny plan', 'hot'); b.disabled = true; b.innerHTML = 'Ustawiono'; };

  /* ---------- układanie planu (rozmowa) ---------- */
  const GOALW = [['str', /\b(sil\w*|silow\w*|trojboj\w*|powerlifting\w*|wiecej podnosic|mocniejsz\w*|mocny)\b/], ['sculpt', /\b(rzezb\w*|redukc\w*|schudn\w*|odchudz\w*|spalic|spalanie|chudn\w*|zrzucic|zredukowac|wyrzezbic|definicj\w*|tluszcz\w*)\b/], ['endur', /\b(wytrzymal\w*|kondycj\w*|wydolnos\w*|obwod\w*|crossfit\w*)\b/], ['health', /\b(zdrow\w*|sprawnos\w*|ogoln\w* form\w*|rehabil\w*|kregoslup\w*|seniora?|dla starszych|na start|rekreacyj\w*|dla zdrowia)\b/], ['hyp', /\b(mas\w*|miesn\w*|hipertrof\w*|budow\w*|urosnac|przytyc|wiekszy|sylwetk\w*|na mase|kulturyst\w*|bodybuild\w*)\b/]];
  const EQP = [['bw', /\b(bez sprzetu|masa ciala|masy ciala|wlasn\w* mas\w*|kalistenik\w*|bez niczego|street ?workout|drazek i porecze|tylko drazek)\b/], ['home', /\b(dom\w*|hantl\w*|kettl\w*|odwazn\w*|w mieszkaniu)\b/], ['gym', /\b(silowni\w*|silownia|silka|silke|gym|klub\w*|siłowni|pelny sprzet|wszystko mam)\b/]];
  const SPLW = [[/push ?pull|ppl|pchaj|pull push/, ['ppl3', 'ppl6', 'ulppl5']], [/gora ?\/? ?dol|gora i dol|upper|gore i dol/, ['ul2', 'ul4', 'ul6', 'str4']], [/fbw|cale cialo|full ?body|calego ciala/, ['fbw2', 'fbw3', 'fbw4', 'fb1']], [/phul/, ['phul4']], [/phat/, ['phat5']], [/arnold/, ['arnold6']], [/klasyczn\w* split|split na partie|bro ?split|jedna partia/, ['bro3', 'bro4', 'bro5']], [/antagonist/, ['antag3']]];
  const PRIW = [['chest', /klat/], ['back', /plec|grzbiet/], ['shoulders', /bark/], ['arms', /\b(rece|ramion|biceps|triceps)/], ['legs', /\bnog|\buda\b|udo/], ['glutes', /poslad|pupa|tylek/], ['abs', /brzuch/]];
  const parsePlan = (n, q) => { const o = {};
    for (const [g, re] of GOALW) if (re.test(n)) { o.goal = g; break; }
    if (o.goal === 'hyp' && /\b(sil\w*)\b/.test(n) && /mas/.test(n)) o.goal = 'hyp';
    let m = n.match(/\b(\d|jeden|jedna|dwa|dwie|trzy|cztery|piec|szesc|siedem)\s*(dni\w*|dzien|treningi|treningow|razy|x|dniowy|dniowe|dniow\w*)\b/) || n.match(/\b(\d)x\b/) || n.match(/\b(\d)\s*(dni|razy)\s*w tygodniu/);
    const wd = wdsOf(n); if (wd.length >= 1 && /\b(w|we|na|dni|pon|wt|sr|czw|pt|sob|niedz)/.test(n) && (wd.length >= 2 || !m)) o.days = wd; else if (m) { const k = NUMW[m[1]] || +m[1]; if (k >= 1 && k <= 7) o.ndays = k; }
    const tm = n.match(/\b(\d{2,3})\s*(min\w*)\b/); if (tm) o.time = +tm[1]; else if (/poltorej godzin/.test(n)) o.time = 90; else if (/\b(godzin\w*|60 min)\b/.test(n) && /trening\w* (na|po|trwa)|na godzin|godzinn/.test(n)) o.time = 60; else if (/pol godziny/.test(n)) o.time = 30;
    for (const [k, re] of EQP) if (re.test(n)) { o.preset = k; break; }
    m = n.match(/\b(poczatkuj\w*|nowicjusz\w*|od zera|zaczynam przygod\w*|sredniozaawans\w*|srednio ?zaawans\w*|zaawansowan\w*)\b/); if (m) o.exp = /poczat|nowic|od zera|zaczynam/.test(m[1]) ? 'beg' : /sredn/.test(m[1]) ? 'mid' : 'adv';
    for (const [re, ids] of SPLW) if (re.test(n)) { o.splits = ids; break; }
    const pr = PRIW.filter(([, re]) => re.test(n.replace(/.*(nacisk|priorytet|szczegoln|bardziej|wiecej|skup)\w*/, ''))).map(([k]) => k); if (/(nacisk|priorytet|szczegoln|bardziej na|wiecej na|skup)/.test(n) && pr.length) o.prio = pr.slice(0, 3);
    return o; };
  const PLAN_RE = /\b(uloz\w*|stworz\w*|zrob\w*|przygotuj\w*|wygeneruj\w*|zaprojektuj\w*|rozpisz\w*|zaplanuj\w*|potrzebuj\w*|chce|chcialbym|chcialabym|daj|dobierz\w*|wymysl\w*|napisz|skomponuj\w*|zbuduj\w*|zaproponuj\w*|szukam|poprosze|nowy|nowego|nowa)\b.*\bplan\w*\b|\bnowy plan\b|\bplan\w* (treningow\w* )?(na|pod|dla) (mas|sil|rzezb|redukc|wytrzym|zdrow|kondycj|odchudz|schudn|poczat|silowni|dom|\d)|\bplan (na|w) \d dni|\b(uloz\w*|stworz\w*|rozpisz\w*|przygotuj\w*|zaplanuj\w*|zrob\w*|wymysl\w*|dobierz\w*|zaproponuj\w*|polec\w*|doradz\w*)\b.*\b(program\w*|rozpisk\w*|cos|trening\w* (na|pod|dla) (mas|sil|redukc|rzezb|wytrzym|zdrow|schudn|odchudz|\d)|treningi (na|pod) )|\b(jaki|jakie|co) (plan|program|trening)\w* (polecasz|proponujesz|doradzasz|bys polecil)/;
  const FLOW_STEPS = ['goal', 'days', 'equip', 'exp', 'scr', 'preg'];
  const GOALN = { hyp: 'masa mięśniowa', str: 'siła', sculpt: 'rzeźba / redukcja', endur: 'wytrzymałość', health: 'zdrowie i sprawność' };
  const askStep = (f) => {
    const o = f.o; const s = S();
    if (!o.goal) return A('<p>Jaki jest cel planu?</p>', [], ['Masa mięśniowa', 'Siła', 'Rzeźba / redukcja', 'Zdrowie i sprawność']);
    if (!o.days && !o.ndays) return A(`<p>Cel: <b>${GOALN[o.goal]}</b>. Ile dni w tygodniu możesz trenować?</p>`, [], ['2 dni', '3 dni', '4 dni', '5 dni']);
    if (!o.preset) return A('<p>Gdzie będziesz trenować?</p>', [], ['Siłownia', 'Dom: hantle', 'Bez sprzętu']);
    if (!o.exp && !s.exp) return A('<p>Jak długo trenujesz siłowo?</p>', [], ['Początkujący (do roku)', 'Średniozaawansowany (1–3 lata)', 'Zaawansowany (3+ lata)']);
    if (f.scr == null) return A(`<p>Jeszcze krótka ankieta bezpieczeństwa (ta sama co w kreatorze). Czy dotyczy Cię <b>którakolwiek</b> z tych sytuacji?</p><ul class="ak-ul">${(F.WZ_SCR || []).map(x => `<li>${E(x)}</li>`).join('')}</ul>`, [], ['Nie, żadna mnie nie dotyczy', 'Tak, coś z tego mnie dotyczy']);
    if (s.sex === 'f' && f.preg == null) return A('<p>Czy jesteś w ciąży albo do roku po porodzie?</p>', [], ['Nie', 'Jestem w ciąży', 'Do roku po porodzie']);
    return null;
  };
  const DEFWD = { 1: [2], 2: [1, 4], 3: [0, 2, 4], 4: [0, 1, 3, 4], 5: [0, 1, 2, 4, 5], 6: [0, 1, 2, 3, 4, 5] };
  const buildPlan = (f, ctx, variant = 0) => {
    const o = f.o, s = S(); if (f.preg === 'preg' || f.preg === 'post') { ctx.flow = null; return A(`<p>${f.preg === 'preg' ? 'W ciąży' : 'Po porodzie'} plan musi uwzględniać zgodę lekarza lub położnej i dodatkowe ograniczenia, dlatego ułożysz go w kreatorze (krok Zdrowie) — tam jest to dokładnie obsłużone.</p>`, [go('Kreator planu', '#/wizard', 'sparkles')]); }
    let days = o.days || DEFWD[Math.min(6, o.ndays || 3)]; const capped = (o.days || []).length > 6 || (o.ndays || 0) > 6; if (days.length > 6) days = days.slice(0, 6);
    const opts = { goal: o.goal, days, time: o.time || (s.wiz && s.wiz.time) || 60, preset: o.preset, exp: o.exp || s.exp || 'beg', scr: Array(7).fill(f.scr === true), preg: 'no', prio: o.prio || [] };
    if (o.splits) { const ok = o.splits.find(id => F.PLN.SPLITS[id] && F.PLN.SPLITS[id].nd === days.length && F.PLN.goalOk(o.goal, id)); if (ok) opts.split = ok; }
    let r; try { r = F.wzBuild(opts, variant); } catch (e) { console.error(e); ctx.flow = null; return A('<p>Nie udało się ułożyć planu z tymi danymi. Spróbuj w kreatorze — tam zobaczysz każdy krok.</p>', [go('Kreator planu', '#/wizard', 'sparkles')]); }
    const plan = r.plan; const old = f.planId ? F.planOf(f.planId) : null; if (old) { plan.id = old.id; plan.created = old.created; }
    f.planId = plan.id; f.variant = variant; ctx.lastPlan = plan.id; ctx.flow = { ...f, done: true };
    const spl = r.split ? r.split.n : ''; const wdl = days.map(i => WDS[i]);
    const why = []; if (o.splits && !opts.split) why.push(`Wybrany podział nie pasuje do ${days.length} dni albo do tego celu — dobrałem najlepszy pasujący.`); if (capped) why.push('Ułożyłem 6 dni — jeden dzień w tygodniu na odpoczynek jest potrzebny.'); if (f.scr === true) why.push('<b>Zalecam konsultację z lekarzem przed rozpoczęciem treningu.</b> Plan jest ostrożniejszy (większy zapas powtórzeń, mniej serii), ale nie zastąpi opinii lekarza. Przerwij ćwiczenie przy bólu w klatce piersiowej, zawrotach głowy lub duszności.'); if (r.special === 'senior') why.push('Wiek 65+: plan uwzględnia zalecenia dla osób starszych (więcej maszyn, równowaga).');
    return { async: () => F.savePlan(plan), then: () => A(`<p>${old ? 'Nowy wariant gotowy.' : 'Gotowe.'} Plan <b>${E(plan.name)}</b> czeka w zakładce Plany.</p>
      <div class="ak-rows">${plan.days.map((d, i) => `<div class="ak-r"><span>${/^(Pn|Wt|Śr|Cz|Pt|So|Nd) — /.test(d.name) ? '' : (wdl[i % wdl.length] || '') + ' · '}${E(d.name)}</span><b>${d.items.length} ćw. · ${F.PLN.estMin(d.items)} min</b></div>`).join('')}</div>
      <p class="ak-s">Cel: ${GOALN[o.goal]} · ${spl ? E(spl) + ' · ' : ''}${wdl.join(', ')} · staż: ${{ beg: 'początkujący', mid: 'średniozaawansowany', adv: 'zaawansowany' }[opts.exp]} · sprzęt: ${{ gym: 'siłownia', home: 'dom, hantle', bw: 'bez sprzętu' }[o.preset]}. Ułożony tym samym mechanizmem co kreator (serie, powtórzenia i przerwy z badań).</p>${why.map(x => `<p>${x}</p>`).join('')}
      <p><b>Ustawić go jako aktualny?</b></p>`, [btn('Ustaw jako aktualny', 'askSetCur', { id: plan.id }, 'check'), go('Zobacz plan', '#/plan/' + plan.id, 'clipboard-list'), ...(old ? [] : [undo(async () => { await F.delPlan(plan.id); if (ctx.lastPlan === plan.id) ctx.lastPlan = null; ctx.flow = null; F.render(true); })])], ['Ustaw jako aktualny', 'Inny wariant', 'Dlaczego taki plan?']) };
  };
  const flowStep = (f, n, q, ctx) => {
    const o = f.o; const got = parsePlan(n, q); let changed = false; const corr = /zmien|jednak|wolal|lepiej|zamiast|popraw/.test(n);
    ['goal', 'days', 'ndays', 'time', 'preset', 'exp', 'splits', 'prio'].forEach(k => { if (got[k] == null) return; const dk = (k === 'days' || k === 'ndays');
      if (o[k] == null || corr || f.asked === k || (dk && f.asked === 'days') || (k === 'preset' && f.asked === 'equip')) { if (dk) { delete o.days; delete o.ndays; } o[k] = got[k]; changed = true; } });
    if (f.scr == null && /zadna (mnie )?nie dotyczy|nic z tego (mnie )?nie dotyczy/.test(n)) { f.scr = false; changed = true; } else if (f.scr == null && /cos z tego (mnie )?dotyczy|(jedna|kilka) (z nich )?(mnie )?dotycz/.test(n)) { f.scr = true; changed = true; }
    if (f.preg == null && f.asked !== 'preg' && /jestem w ciazy|po porodzie/.test(n)) { f.preg = /ciaz/.test(n) ? 'preg' : 'post'; changed = true; }
    if (f.asked === 'scr') { if (/^(nie|zadna|nic|brak|jestem zdrow|wszystko (ok|dobrze)|nie dotyczy)/.test(n)) { f.scr = false; changed = true; } else if (/^(tak|dotyczy|mam|choruj|biore|jedna|kilka)/.test(n)) { f.scr = true; changed = true; } }
    if (f.asked === 'preg') { if (/ciaz/.test(n)) { f.preg = 'preg'; changed = true; } else if (/porod|polog|urodzil/.test(n)) { f.preg = 'post'; changed = true; } else if (/^(nie|zadne|brak)/.test(n)) { f.preg = 'no'; changed = true; } }
    if (f.asked === 'exp' && got.exp) { S().exp = got.exp; F.saveSettings(); }
    return changed;
  };
  const planFlow = (n, q, ctx) => {
    const f = ctx.flow;
    const cm = !f && n.match(/\b(zmien\w*|przerob\w*|przebuduj\w*|dostosuj\w*)\b.*\bplan\w* (na|pod) (\d|jeden|dwa|trzy|cztery|piec|szesc) (dni|dniowy|razy)/);
    if (cm) { const nx = F.nextWorkout && F.nextWorkout(); const pm = nx && nx.plan.meta || {}; const o = parsePlan(n, q); if (pm.goal && !o.goal) o.goal = pm.goal; if (!o.preset && S().wiz && S().wiz.preset && F.WZ_PRESET[S().wiz.preset]) o.preset = S().wiz.preset; if (!o.exp && pm.exp) o.exp = pm.exp;
      const nf = { k: 'plan', o, scr: null, preg: S().sex === 'f' ? null : 'no' }; ctx.flow = nf; const a = nextFlow(nf, ctx); if (a && a.html && !a.async) a.html = `<p>Obecnego planu nie przerabiam — ułożę nowy na ${o.ndays || (o.days || []).length} dni, a stary zostanie w Planach.</p>` + a.html; return a; }
    if (!f) { if (!PLAN_RE.test(n) || /(startow|gotow\w* plan|szablon|wyslij|udostepnij|link|przerw|raport|pdf|kopi|\bqr\b|aktualn|zmien|edyt|usun|ustaw|przenies|przesun|podopieczn)/.test(n) || /^(jaki|ile|czy|co|kiedy|gdzie|pokaz)/.test(n) && !/uloz|stworz|zrob|polec|doradz|zaproponuj|przygotuj|rozpisz/.test(n)) return null;
      const nf = { k: 'plan', o: parsePlan(n, q), scr: null, preg: S().sex === 'f' ? null : 'no' }; if (!nf.o.preset && S().wiz && S().wiz.preset && F.WZ_PRESET[S().wiz.preset]) nf.o.preset0 = S().wiz.preset; ctx.flow = nf; return nextFlow(nf, ctx); }
    // trwająca rozmowa
    if (/^(anuluj|stop|koniec|zostaw|nie chce|niewazne|nie trzeba|daj spokoj|przerwij)/.test(n)) { ctx.flow = null; return A('<p>Dobrze, przerywam układanie planu.</p>', [], ['Co umiesz?']); }
    if (f.done) { // po zapisaniu planu
      if (/inn\w* (wariant|wersj|zestaw|cwiczeni)|jeszcze raz|wylosuj|inny plan|nie podoba/.test(n) && f.planId && F.planOf(f.planId)) return buildPlan(f, ctx, (f.variant || 0) + 1);
      if (/^(tak|ustaw|ok ustaw|jasne|poprosze|dawaj|ustaw (go|jako aktualny|ten))/.test(n) && f.planId && F.planOf(f.planId)) { ctx.flow = null; return setCur(F.planOf(f.planId)); }
      if (/dlaczego|czemu|uzasadn/.test(n) && f.planId) { ctx.flow = null; const p = F.planOf(f.planId); return A(`<p>Pełne uzasadnienie („Dlaczego ten plan”: podział, objętość serii na partię względem zakresu FORGE, powtórzenia, przerwy i źródła) zobaczysz w kreatorze przy tych samych odpowiedziach. Skrót: ${E((F.PLN.GOALS[p.meta.goal] || ['', ''])[1])}; podział ${E((F.PLN.SPLITS[p.meta.split] || { n: '' }).n)}; przerwy: ciężkie ${p.meta.rest.main} s, pozostałe ${p.meta.rest.sec} s, izolowane ${p.meta.rest.iso} s.</p>`, [go('Zobacz plan', '#/plan/' + p.id, 'clipboard-list')]); }
      if (/^nie\b/.test(n)) { ctx.flow = null; return A('<p>Dobrze — plan zostaje w zakładce Plany, aktualny plan bez zmian.</p>'); }
      ctx.flow = null; return planFlow(n, q, ctx);
    }
    const ch = flowStep(f, n, q, ctx); if (!ch) { if (f.asked === 'equip' && /jak (zwykle|ostatnio)/.test(n) && f.o.preset0) { f.o.preset = f.o.preset0; return nextFlow(f, ctx); } ctx.flow = null; return null; }
    return nextFlow(f, ctx);
  };
  const nextFlow = (f, ctx) => { const a = askStep(f); if (a) { f.asked = !f.o.goal ? 'goal' : (!f.o.days && !f.o.ndays) ? 'days' : !f.o.preset ? 'equip' : (!f.o.exp && !S().exp) ? 'exp' : f.scr == null ? 'scr' : 'preg'; if (f.asked === 'equip' && f.o.preset0) a.chips = [...a.chips, 'Jak ostatnio']; return a; } return buildPlan(f, ctx, 0); };

  /* ---------- cele i zawody ---------- */
  const goalCmd = (n, q) => {
    // zawody
    if (/(zawod\w*|startuj\w*|start w|turniej\w*|mistrzostw\w*|meet)\b/.test(n) && !/\b(podejsci|jak|co to|czy|ile punkt)\b/.test(n)) {
      if (OFF.test(n) || /(usun|skasuj|wyczysc)\w* (date|zawod)/.test(n)) { if (!S().meet) return A('<p>Nie masz ustawionej daty zawodów.</p>'); const u = setS({ meet: 0 }); return A('<p>Wyłączyłem odliczanie do zawodów.</p>', [u]); }
      const d = futureDate(n, q); if (d == null) { if (/(mam|bede|ustaw|wpisz|dodaj|zapisz)/.test(n)) return A('<p>Kiedy są zawody? Napisz np. „mam zawody 15 marca”.</p>', [{ l: 'Karta Zawody', i: 'trophy', a: 'askStr', href: '#/stats' }]); return null; }
      if (d <= Date.now()) return A('<p>Ta data już minęła.</p>'); const u = setS({ meet: d + 12 * 3600e3 }); const days = Math.round((d - startDay(Date.now())) / DAY);
      return A(`<p>Ustawiłem zawody na <b>${ddA(d)}</b> — za ${days} ${F.plur(days, 'dzień', 'dni', 'dni')}. W Postępy → Siła karta Zawody odlicza dni i podpowiada praktykę na dany etap. Pamiętaj: aplikacja nie układa szczytowania automatycznie — badań jest za mało na jeden sprawdzony protokół.</p>`, [u, { l: 'Karta Zawody', i: 'trophy', a: 'askStr', href: '#/stats' }, go('Przed zawodami', '#/guide/meet', 'book-open')], ['Podejścia na zawody']);
    }
    // cel miesięczny
    if (/cel\w* (na )?(ten |tego |w tym |biezac\w* )?(miesiac|miesieczn)|miesieczn\w* cel|w tym miesiacu (chce|zrobie)/.test(n) && numsOf(q).length) {
      const v = numsOf(q)[0]; const key = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`; let g;
      if (/ton|tonaz/.test(n)) g = { id: F.uid(), m: key, k: 'v', n: F.fromDisp(v * 1000), ex: '' }; else if (/trening|razy|sesj/.test(n) || v <= 31 && !/kg|wycisn|przysiad|martw/.test(n)) g = { id: F.uid(), m: key, k: 's', n: Math.round(v), ex: '' };
      else { const ex = exFromText(n, q); if (!ex) return A('<p>W którym ćwiczeniu? Napisz np. „cel na ten miesiąc 100 kg w wyciskaniu”.</p>'); g = { id: F.uid(), m: key, k: 'l', n: F.fromDisp(v), ex: ex.id }; }
      const gl = S().goals || (S().goals = []); gl.push(g); F.saveSettings();
      return A(`<p>Dodałem cel na ten miesiąc: <b>${g.k === 's' ? `${g.n} ${F.plur(g.n, 'trening', 'treningi', 'treningów')}` : g.k === 'v' ? `${F.fmtNum(v, 1)} t tonażu` : `${kg(g.n)} — ${E(F.exName(g.ex))}`}</b>. Postęp zobaczysz w Postępy → Przegląd.</p>`, [undo(() => { S().goals = (S().goals || []).filter(x => x.id !== g.id); F.saveSettings(); F.render(true); }), { l: 'Cele', i: 'target', a: 'askOver', href: '#/stats' }], ['Moje cele']);
    }
    // cel na dłużej: „chcę wycisnąć 100 kg do czerwca”
    if (/(chce|chcialbym|chcialabym|cel\w*|planuje|zamierzam|marze|ustaw\w* cel|dojsc do|osiagnac|zrobic)\b/.test(n) && /(\d{2,3}(?:[.,]\d)?)\s*(kg|kilo|lb)?/.test(q) && (deadline(n, q) || /\bdo\b|\bza\b|\bw ciagu\b/.test(n)) && /(wycisn|przysiad|martw|podnies|wyciskani|ciag|ciagu|kg|kilo)/.test(n)) {
      const ex = exFromText(n, q); const v = numsOf(q).find(x => x >= 10 && x <= 600); const d = deadline(n, q);
      if (!ex) return A('<p>W którym ćwiczeniu ma być ten cel? Napisz np. „chcę wycisnąć 100 kg do czerwca”.</p>', [], ['Chcę przysiąść 140 kg do końca roku']); if (!v) return A('<p>Ile kilogramów ma wynosić cel?</p>'); if (!d || d < Date.now() + DAY) return A('<p>Do kiedy? Napisz np. „do czerwca”, „do końca roku”, „za 3 miesiące”.</p>');
      const lg = S().lgoals || (S().lgoals = []); const g = { id: F.uid(), ex: ex.id, n: F.fromDisp(v), d }; lg.push(g); F.saveSettings();
      const fc = F.goalForecast ? F.goalForecast(g) : null;
      return A(`<p>Ustawiłem cel: <b>${E(ex.name)} — ${kg(g.n)} (wyliczony maks) do ${dd(d)}</b>.</p>${fc && fc.html ? fc.html : ''}<p class="ak-s">Prognozę z Twoich maksów z 8 tygodni zobaczysz w Postępy → Przegląd → Cel na dłużej.</p>`, [undo(() => { S().lgoals = (S().lgoals || []).filter(x => x.id !== g.id); F.saveSettings(); F.render(true); }), { l: 'Prognoza', i: 'target', a: 'askOver', href: '#/stats' }]);
    }
    return null;
  };
  const exFromText = (n, q) => { const sub = /wycisn/.test(n) && !/(nad glowe|zolniersk|stojac|hantl)/.test(n) ? 'wyciskanie sztangi leżąc' : /przysiad|przysiasc|przysiad/.test(n) && !/(bulgar|wykrok|hantl)/.test(n) ? 'przysiad ze sztangą' : /martw|podniesc z ziemi/.test(n) ? 'martwy ciąg' : null; const f = FD().ex; return (sub && f ? f(sub) : null) || (f ? f(q) : null); };

  /* ---------- raporty, eksport, kopia ---------- */
  const reportCmd = (n) => {
    if (/(raport\w*|pdf\w*)/.test(n) && (/pdf/.test(n) || /(zrob|wygeneruj|stworz|przygotuj|daj|utworz|wyslij|eksportuj|pobierz|potrzebuj|chce|drukuj|wydrukuj)/.test(n)) && (/pdf/.test(n) || !/tygodni\w*|tygodnia/.test(n)) && !/(co to|jak dziala|gdzie)/.test(n)) {
      const k = /(4 tyg|miesiac\b|ostatni miesiac|cztery tyg|4 tygodni)/.test(n) ? '4w' : /(rok|12 mies|roczn|dwunastu)/.test(n) ? '12m' : /(cal\w* histori|wszystk|od poczatku|calosc|calos)/.test(n) ? 'all' : '3m';
      F.ui.pdfP = k; later(() => F.act.pdfSheet(), 500); const L = { '4w': '4 tygodni', '3m': '3 miesięcy', '12m': '12 miesięcy', all: 'całej historii' }[k];
      return A(`<p>Przygotowałem raport PDF z <b>${L}</b>. Stuknij „Utwórz raport PDF” — powstanie w telefonie i od razu go udostępnisz albo zapiszesz. Okres możesz jeszcze zmienić.</p>`, [btn('Raport PDF', 'pdfSheet', null, 'file-text')]);
    }
    if (/(raport|podsumowani\w*) (tygodni\w*|tygodniow\w*|tego tygodnia)|raport tygodnia/.test(n) && /(pokaz|otworz|daj|zrob|chce)/.test(n)) { later(() => F.go('#/report'), 700); return A('<p>Otwieram raport tygodnia.</p>', [go('Raport', '#/report', 'file-text')]); }
    if (/(podsumowani\w*|karta|karty|recap|wrapped) (miesiac\w*|roku|roczn\w*|miesieczn\w*)/.test(n) && /(pokaz|otworz|daj|zrob|udostepnij|chce|wygeneruj|stworz)/.test(n)) { F.ui.recap = /rok|roczn/.test(n) ? 'y' : 'm'; F.ui.recapOff = 0; later(() => F.go('#/recap'), 700); return A(`<p>Otwieram podsumowanie ${F.ui.recap === 'y' ? 'roku' : 'miesiąca'} — karty udostępnisz jako obraz.</p>`, [go('Podsumowanie', '#/recap', 'sparkles')]); }
    if (/(zrob\w*|utworz\w*|wykonaj|pobierz|zapisz|potrzebuj\w*|chce)\b.*(kopi\w* zapas\w*|kopie|kopia|backup)|^(kopia|kopie|backup)( zapasowa| zapasowa teraz)?$/.test(n) && !/(przywroc|wczytaj|jak|gdzie|kiedy)/.test(n)) {
      const last = S().lastBackup; return A(`<p>Kopia zapasowa: wybierz rodzaj — plik zapiszesz albo wyślesz (najlepiej poza telefon: Dysk Google, iCloud).${last ? ` Ostatnia: ${dd(last)}.` : ' Jeszcze jej nie robiłeś.'}</p>`, [btn('Pełna (ze zdjęciami)', 'doBackupBtn', null, 'download'), btn('Bez zdjęć', 'doBackupLite', null, 'file-json')]); }
    if (/(eksport\w*|wyeksportuj|pobierz|zapisz|wyslij)\b.*(csv|excel|arkusz)|\bcsv\b/.test(n)) return A('<p>Eksport historii do CSV (Excel, Arkusze Google):</p>', [btn('Eksport CSV', 'expCsv', null, 'file-spreadsheet')]);
    if (/(przywroc\w*|wczytaj\w*|odtworz\w*)\b.*(kopi\w*|backup|dane)/.test(n)) return A('<p>Przywracanie zastępuje obecne dane plikiem kopii, więc robisz to sam: Ustawienia → Dane i kopia → <b>Przywróć z kopii</b>.</p>', [go('Ustawienia', '#/settings', 'settings')]);
    if (/(chron\w*|zabezpiecz\w*)\b.*dane|trwale przechowywanie/.test(n) && VERB.test(n + ' zrob')) return A('<p>Poproszę przeglądarkę o trwałe przechowywanie danych (żeby ich nie czyściła przy braku miejsca):</p>', [btn('Chroń dane', 'persist', null, 'lock')]);
    return null;
  };

  /* ---------- tryb trenera ---------- */
  const coachCmd = (n, q, ctx) => {
    if (/(wyslij|udostepnij|przeslij|podziel\w* sie|daj|wygeneruj|zrob|przygotuj|pokaz)\w* .*(plan\w*).*(podopieczn\w*|klient\w*|koleg\w*|koled\w*|kolez\w*|kumpl\w*|znajom\w*|przyjaci\w*|partner\w*|zon\w*|mez\w*|link\w*|qr|kod\w*|trenowan\w*|komus|innej osobie)|(link|kod qr|qr)\w* (do |z )?(planu|planem)|(wyslij|udostepnij|przeslij) (moj |ten |aktualny )?plan\w*$/.test(n)) {
      const p = planByName(n.replace(/\b(link\w*|qr|kod\w*)\b/g, ' ')) || (F.nextWorkout && F.nextWorkout() ? F.nextWorkout().plan : F.S.plans[0]); if (!p) return A('<p>Nie masz jeszcze planu do wysłania.</p>', [], ['Ułóż mi plan na masę na 3 dni']);
      later(() => F.act.planSend({ dataset: { id: p.id } }), 500);
      return A(`<p>Przygotowuję link i kod QR do planu <b>${E(p.name)}</b>. Odbiorca otworzy link albo zeskanuje kod aparatem i kliknie „Dodaj ten plan”. Link zawiera tylko plan, bez Twoich treningów.</p>`, [btn('Pokaż link i QR', 'planSend', { id: p.id }, 'send')], F.S.plans.length > 1 ? F.S.plans.filter(x => x.id !== p.id).slice(0, 2).map(x => `Wyślij plan ${x.name} podopiecznemu`) : []);
    }
    if (/wynik\w* (dla|do) trener\w*|(wyslij|przeslij|daj|przygotuj|wygeneruj|zrob|udostepnij)\w* .*(wynik\w*|treningi|postep\w*|plik).*(trener\w*)|(trener\w*) .*(wynik\w*|plik)|plik dla trener/.test(n) && !/(jak|co to|gdzie)\b/.test(n.split(' ')[0])) {
      later(() => F.act.resSheet(), 500);
      return A('<p>Otwieram „Wyniki dla trenera”: wpisz imię, wybierz okres i wyślij plik komunikatorem. Wyniki to plik, a nie kod QR — kilka tygodni treningów nie zmieści się w kodzie ani w linku.</p>', [btn('Wyniki dla trenera', 'resSheet', null, 'send')], ['Zrób raport PDF dla trenera']);
    }
    if (/(wczytaj|zaimportuj|dodaj|otworz)\w* .*(wynik\w*|plik\w*) .*(podopieczn\w*|klient\w*)/.test(n)) { later(() => F.go('#/clients'), 600); return A('<p>Otwieram Podopiecznych — stuknij „Wczytaj wyniki podopiecznego” i wybierz plik.</p>', [btn('Wczytaj plik', 'cliImport', null, 'upload')]); }
    if (/(pokaz|lista|otworz|moi|moich|wszyscy)\w* .*(podopieczn\w*|klient\w*)|^podopieczni$/.test(n)) { if (!S().coachMode) return A('<p>Podopieczni są widoczni w trybie trenera. Włączyć go?</p>', [btn('Włącz tryb trenera', 'askCoachOn', null, 'users')]); later(() => F.go('#/clients'), 600); return A('<p>Otwieram listę podopiecznych.</p>', [go('Podopieczni', '#/clients', 'users')]); }
    // „co u Kasi”
    const L = F.cliCache ? F.cliCache() : null;
    if (L && L.length && /(co u|jak (idzie|trenuje|sie ma|radzi)|wyniki|treningi|postepy|ostatni trening|pokaz)\b/.test(n)) {
      const c = L.find(x => { const t = N(x.name).split(' ')[0]; return t.length >= 3 && n.split(' ').some(u => u.slice(0, 4) === t.slice(0, 4) && Math.abs(u.length - t.length) <= 3); });
      if (c) { const now = Date.now(); const s4 = c.sessions.filter(x => now - x.start < 28 * DAY); const prs = s4.reduce((a, x) => a + (x.prs || []).length, 0); const pain = s4.filter(x => x.pain && x.pain.length); const last = c.sessions[0];
        return A(`<p><b>${E(c.name)}</b> — dane z pliku z ${dd(c.made)}.</p><div class="ak-rows"><div class="ak-r"><span>Ostatni trening</span><b>${last ? `${dd(last.start)} · ${E(last.name || 'Trening')}` : 'brak'}</b></div><div class="ak-r"><span>Treningi (4 tyg.)</span><b>${s4.length}</b></div><div class="ak-r"><span>Rekordy (4 tyg.)</span><b>${prs}</b></div><div class="ak-r"><span>Zgłoszony ból</span><b>${pain.length ? pain.length + '×' : 'brak'}</b></div></div>${last ? `<p class="ak-s">Ostatnio: ${last.ex.slice(0, 5).map(e => E(e.n)).join(', ')}${last.ex.length > 5 ? '…' : ''}.</p>` : ''}${pain.length ? `<p class="ak-s">Ból: ${pain.map(x => x.pain.map(p => (F.PLN.INJ[p.at] || 'inne')).join(', ') + ` (${dd(x.start)})`).join('; ')}.</p>` : ''}`, [go('Szczegóły', '#/client/' + encodeURIComponent(c.id), 'user')]); }
    }
    return null;
  };
  F.act.askCoachOn = b => { S().coachMode = true; F.saveSettings(); F.toast('Tryb trenera włączony', 'hot'); if (b) { b.disabled = true; b.innerHTML = 'Włączono'; } };

  /* ---------- powiadomienia ---------- */
  const pushCmd = (n) => {
    if (!/powiadomien\w*|notyfikac\w*|alert\w*/.test(n) || /po przerwie|lokaln/.test(n)) return null;
    if (/test\w*|probn\w*|sprawdz\w*/.test(n) && /(wyslij|zrob|daj|sprawdz|przeslij)/.test(n)) { if (!F.pushOn || !F.pushOn()) return A('<p>Powiadomienia nie są włączone.</p>', [btn('Włącz powiadomienia', 'pushConnect', null, 'bell')]); later(() => F.act.pushTest(), 300); return A('<p>Wysyłam próbne powiadomienie — powinno przyjść za chwilę.</p>'); }
    const oo = onOff(n); if (oo === null && !VERB.test(n)) return null;
    const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1), sa = window.matchMedia && matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    if (oo === false) { if (!F.pushOn || !F.pushOn()) return A('<p>Powiadomienia już są wyłączone.</p>'); later(() => F.act.pushOff(), 300); return A('<p>Wyłączam powiadomienia z serwera. Włączysz je ponownie jednym przyciskiem.</p>', [btn('Włącz ponownie', 'pushConnect', null, 'bell')]); }
    if (F.pushOn && F.pushOn()) return A('<p>Powiadomienia już są włączone — koniec przerwy dotrze także przy zablokowanym telefonie.</p>', [btn('Wyślij próbne', 'pushTest', null, 'bell')]);
    return A(`<p>Włączenie wymaga Twojej zgody — telefon na to nie pozwala bez stuknięcia. Stuknij przycisk i wybierz „Zezwól”. Od razu przyjdzie próbne powiadomienie.</p>${ios && !sa ? '<p class="ak-s"><b>iPhone:</b> najpierw dodaj FORGE do ekranu początkowego (Safari → Udostępnij → Do ekranu początkowego) i otwórz z tej ikony — w samym Safari powiadomienia nie działają.</p>' : ''}`, [btn('Włącz powiadomienia', 'pushConnect', null, 'bell')]);
  };

  /* ---------- nawigacja ---------- */
  const NAV = [[/ustawieni\w*/, '#/settings', 'Ustawienia'], [/narzedzi\w*|kalkulator\w* (talerzy|1rm|maks)|kalkulator\w*/, '#/tools', 'Narzędzia'], [/zywieni\w*|kalori\w* ekran|dieta ekran/, '#/nutrition', 'Żywienie'], [/porad\w*|artykul\w*|wiedz\w*/, '#/guide', 'Porady i nauka'], [/baz\w* cwiczen|cwiczenia baza|liste cwiczen/, '#/exercises', 'Baza ćwiczeń'], [/kreator\w*/, '#/wizard', 'Kreator planu'], [/import\w*/, '#/import', 'Import'], [/kalendarz\w*/, '#/calendar', 'Kalendarz'], [/histori\w*/, '#/history', 'Historia'], [/podopieczn\w*/, '#/clients', 'Podopieczni'], [/raport\w*/, '#/report', 'Raport'], [/podsumowani\w*|recap/, '#/recap', 'Podsumowanie'],
    [/miesni\w*|regeneracj\w*|mape miesni/, '#/stats', 'Mięśnie', () => { F.ui.statTab = 'mus'; }], [/sil\w*|rekord\w*/, '#/stats', 'Siła', () => { F.ui.statTab = 'str'; }], [/cialo|ciala|pomiar\w*|zdjec\w*|wag\w* ciala|wykres wagi/, '#/stats', 'Ciało', () => { F.ui.statTab = 'body'; }], [/postep\w*|przeglad\w*|statystyk\w*/, '#/stats', 'Postępy', () => { F.ui.statTab = 'over'; }], [/plan\w*/, '#/plans', 'Plany'], [/dzis|ekran glowny|strone glowna|start\w*/, '#/home', 'Dziś'], [/trening\w*/, '#/workout', 'Trening', () => { if (!F.S.draft) throw 0; }]];
  const navCmd = (n) => {
    if (!/^(otworz|przejdz|idz|wejdz|zabierz mnie|przenies mnie|pokaz mi ekran|pokaz ekran|wlacz ekran|skocz|pokaz mi|pokaz|wroc)\b|\b(chce|chcialbym) (zobaczyc|przejsc|wejsc)\b/.test(n)) return null;
    if (/^pokaz\b/.test(n) && !/ekran|zakladk|ustawien|narzedz|kalkulator|porad|baz\w* cwiczen|kreator|import|podopieczn|zywien|kalendarz/.test(n)) return null;
    const rest = n.replace(/^(otworz|przejdz|idz|wejdz|zabierz mnie|przenies mnie|pokaz mi ekran|pokaz ekran|wlacz ekran|skocz|pokaz mi|pokaz|wroc)\s*(?:(?:do|na|w|we|mi)\s+)?/, '');
    for (const [re, href, l, pre] of NAV) if (re.test(rest)) { try { if (pre) pre(); } catch (e) { return A('<p>Teraz nie trwa żaden trening.</p>', [], ['Zacznij trening']); } later(() => F.go(href), 600); return A(`<p>Otwieram: <b>${l}</b>.</p>`, [go(l, href)]); }
    return null;
  };

  /* ---------- blokada usuwania ---------- */
  const delCmd = (n) => {
    if (!/\b(usun\w*|skasuj\w*|wykasuj\w*|wyczysc\w*|wymaz\w*|wywal\w*|kasuj\w*|zlikwiduj\w*|zresetuj\w*|resetuj\w*)\b/.test(n)) return null;
    if (/talerz|krazk|rozmow|czat|ostrzezen|kolor|zawod|odliczani|blok|cykl|odciaz/.test(n)) return null;
    const W = [[/plan\w*/, 'Plany → plan → ⋯ → „Usuń plan”', '#/plans'], [/(trening\w*|sesj\w*)/, 'Historia → trening → ⋯ → „Usuń trening”', '#/history'], [/zdjec\w*|fot\w*/, 'Postępy → Ciało → zdjęcie → kosz', '#/stats'], [/pomiar\w*|obwod\w*|wag\w*/, 'Postępy → Ciało → wpis → kosz', '#/stats'], [/cel\w*/, 'Postępy → Przegląd → cel → kosz', '#/stats'], [/podopieczn\w*|klient\w*/, 'Plany → Podopieczni → osoba → kosz', '#/clients'], [/cwiczen\w*/, 'w treningu: menu ⋯ ćwiczenia → „Usuń z treningu”; w planie: edytor planu', '#/plans'], [/seri\w*/, 'w treningu: stuknij numer serii → Usuń', '#/workout'], [/(wszystk\w*|dane|danych|aplikacj\w*|histori\w*|konto)/, 'Ustawienia → Dane i kopia → „Usuń wszystkie dane” (najpierw zrób kopię!)', '#/settings']];
    const hit = W.find(([re]) => re.test(n)) || [null, 'w miejscu, gdzie ta rzecz jest (menu ⋯ albo ikona kosza)', null];
    return A(`<p>Usuwania nie robię z czatu — żeby nic nie zniknęło przez literówkę albo pomyłkę. Usuniesz to sam: <b>${hit[1]}</b>. Każde usunięcie aplikacja i tak potwierdza.</p>`, hit[2] ? [go('Przejdź tam', hit[2])] : []);
  };

  /* ================= CO UMIEM ================= */
  const capsAns = () => A(`<p>To nie jest AI — nie zgaduję. Liczę z Twoich treningów, wiedzę biorę z badań, a polecenia wykonuję tymi samymi funkcjami co przyciski. Każdą zmianę cofniesz przyciskiem „Cofnij”.</p>
    <p><b>Pytania</b></p><ul class="ak-ul"><li><b>Wyniki:</b> „ile robiłem w przysiadzie miesiąc temu”, „rekord w wyciskaniu”, „postęp w martwym ciągu”, „najlepszy trening”.</li><li><b>Plan:</b> „co mam dziś”, „kiedy trenuję w tym tygodniu”, „ile mam dziś ważyć”, „ile mam przerwy”.</li><li><b>Analiza:</b> „co stoi w miejscu”, „co zaniedbuję”, „czy potrzebuję odciążenia”, „podsumuj miesiąc”.</li><li><b>Regeneracja, ćwiczenia, technika, zamienniki, ciało, żywienie, siła, kalkulatory i wiedza z badań.</b></li><li><b>Cała aplikacja:</b> „jak działa tryb trenera”, „gdzie są zdjęcia”, „co to blok treningowy”, „jak zrobić kopię”.</li></ul>
    <p><b>Polecenia</b></p><ul class="ak-ul"><li><b>Plany:</b> „ułóż mi plan na masę na 3 dni”, „dodaj plan startowy Bez sprzętu”, „ustaw plan Góra / Dół jako aktualny”, „przerwy na ciężkich ćwiczeniach 3 min”, „zacznij nowy blok”, „włącz odciążenie”.</li><li><b>Trening:</b> „zacznij trening”, „zacznij Pull”, „mam 30 minut”, „powtórz ostatni trening”, „jestem dziś w domu”, „włącz przerwę 90 s”.</li><li><b>Kalendarz:</b> „przenieś jutrzejszy trening na sobotę”, „pomiń dzisiejszy trening”, „trenuję w poniedziałki, środy i piątki”.</li><li><b>Ciało i profil:</b> „ważę 84,5”, „talia 86, biodra 98”, „mam 42 lata”, „mam 182 cm wzrostu”, „jestem średniozaawansowany”.</li><li><b>Cele:</b> „chcę wycisnąć 100 kg do czerwca”, „cel na ten miesiąc 12 treningów”, „mam zawody 15 marca”.</li><li><b>Raporty:</b> „zrób raport PDF z 3 miesięcy”, „pokaż podsumowanie roku”, „zrób kopię zapasową”, „eksport CSV”.</li><li><b>Trener:</b> „włącz tryb trenera”, „wyślij plan podopiecznemu”, „wyniki dla trenera”, „co u Kasi?”.</li><li><b>Ustawienia:</b> „wyłącz wibracje”, „głośność maks”, „ostrzeżenie 10 s”, „przełącz na funty”, „krok ciężaru 2,5”, „kolor złoty”, „nie wygaszaj ekranu”, „włącz powiadomienia”.</li><li><b>Nawigacja:</b> „otwórz narzędzia”, „przejdź do kalendarza”.</li></ul>
    <p class="ak-s">Usuwania z czatu nie robię — prowadzę tylko na miejsce, gdzie to zrobisz.</p>`, [], ['Ułóż mi plan na masę na 3 dni', 'Jak działa tryb trenera?', 'Co mam dziś?', 'Ważę 84,5']);

  /* ================= SILNIK ================= */
  const CTX2 = { flow: null, lastPlan: null, pendingTo: null, offerCur: null };
  const CMDS = [['del', delCmd], ['push', pushCmd], ['coach', coachCmd], ['setting', settingCmd], ['profile', profileCmd], ['gym', gymCmd], ['cycle', cycleCmd], ['plan', planCmd], ['cal', calCmd], ['goal', goalCmd], ['report', reportCmd], ['workout', workoutCmd], ['body', bodyCmd], ['nav', navCmd]];
  const orig = F.ask;
  // zwraca {id, a} — id trasy (do testów) i odpowiedź; „async” = zapis w bazie przed odpowiedzią
  F._askCmds = CMDS; F._askFix = n => fix(N(n));
  const route = (q, ctx = CTX2) => {
    const raw = String(q).replace(/×/g, ' x '); const n = fix(N(raw));
    if (!n) return { id: 'empty', a: orig(q) };
    // rozmowa: przeniesienie treningu (dopytanie o dzień)
    if (ctx.pendingTo) { const slot = ctx.pendingTo; ctx.pendingTo = null; const to = futureDate(n, raw); if (to != null) { const a = calCmd(`przenies ${['pon', 'wt', 'sr', 'czw', 'pt', 'sob', 'niedz'][wdOf(dkTs(slot.key))]} na ${n}`, raw); if (a) return { id: 'cal', a }; } }
    if (/^(co (umiesz|potrafisz)|w czym (mozesz|pomozesz)|pomoc|co mozesz|jakie (masz )?(funkcje|polecenia|komendy)|lista (polecen|komend)|co (moge|mozna) (ci )?(kazac|napisac|wpisac))/.test(n)) return { id: 'caps', a: capsAns() };
    const offer = ctx.offerCur; ctx.offerCur = null;
    if (offer && /^(tak|jasne|ok|okej|poprosze|dawaj|ustaw|zgoda|pewnie|tak ustaw)( go| ten plan| jako aktualny)?$/.test(n) && F.planOf(offer)) return { id: 'plan', a: setCur(F.planOf(offer)) };
    const KQ = /^(jak (dziala|dzialaja|uzywac|korzystac|to dziala|sie uzywa|wyglada)|gdzie|co to|czym (jest|sa)|do czego|na czym|opowiedz|wyjasnij|opisz|co daje|nie moge znalezc|po co|w jaki sposob)\b/.test(n) || (String(q).trim().endsWith('?') && !/^(wlacz|wylacz|ustaw|zmien|zrob|dodaj|przenies|przesun|zacznij|otworz|wyslij|uloz|stworz|prosze|mozesz|moglbys|moglabys|czy (mozesz|moglbys|moglabys|dasz rade|zrobisz|ulozysz))/.test(n) && !/polec|doradz|zaproponuj/.test(n));
    if (KQ && !ctx.flow) { const fh0 = featHits(n); if (fh0.length && !/\b(moje|moj|moja|ile|jakie mam|jaki mam|kiedy ostatnio)\b/.test(n)) return { id: 'feat:' + fh0[0].f[0], a: featAns(fh0[0].f) }; }
    const pf = KQ && !ctx.flow ? null : planFlow(n, raw, ctx); if (pf) { if (ctx.flow && ctx.flow.done) ctx.offerCur = ctx.flow.planId; return { id: 'planFlow', a: pf }; }
    if (!KQ) for (const [id, fn] of CMDS) { const a = fn(n, raw, ctx); if (a) { if (a.pendingTo) ctx.pendingTo = a.pendingTo; return { id, a }; } }
    // wiedza o aplikacji
    const fh = featHits(n); const short = n.split(' ').length <= 4;
    if (fh.length && (QFORM.test(n) || String(q).trim().endsWith('?') || short)) { const b = orig(q); const weak = !b || /Na to pytanie nie umiem/.test(b.html); const dataQ = /\b(moje|moj|moja|moich|ile|jakie mam|jaki mam|pokaz moje|kiedy ostatnio)\b/.test(n);
      const qf = QFORM.test(n) || String(q).trim().endsWith('?'); if (weak || (qf && !dataQ)) return { id: 'feat:' + fh[0].f[0], a: featAns(fh[0].f) }; return { id: 'orig', a: b }; }
    const b = orig(q);
    // dzień z osobną sesją cardio — dopisz do odpowiedzi „co mam dziś”
    if (b && /\b(co mam (dzis|dzisiaj)|co (dzis|dzisiaj) (robie|trenuje|mam)|dzisiejszy trening|plan na dzis|co na dzis)\b/.test(n) && F.cardioToday && F.cardioToday()) { const ct = F.cardioToday(); return { id: 'orig', a: { ...b, html: b.html + `<p>${ic('heart-pulse', 14)} Dziś też osobna sesja cardio: <b>${E(ct.day.name)}</b> — ${Math.round((+(ct.day.items[0] || {}).reps || 0) / 60)} min.</p>`, acts: [...(b.acts || []), btn('Zacznij cardio', 'startDay', { p: ct.plan.id, d: ct.day.id }, 'heart-pulse')] } }; }
    if (b && /Na to pytanie nie umiem/.test(b.html) && fh.length) return { id: 'feat:' + fh[0].f[0], a: featAns(fh[0].f) };
    return { id: 'orig', a: b };
  };
  F.askRoute = (q, ctx) => route(q, ctx || { flow: null, lastPlan: null, pendingTo: null });
  F.askReset = () => { CTX2.flow = null; CTX2.lastPlan = null; CTX2.pendingTo = null; };
  // F.ask może zwrócić obietnicę — czat w ask.js czeka na nią (zapis do bazy przed odpowiedzią)
  F.ask = (q) => { const r = route(q, CTX2); const a = r.a; if (a && a.async) return Promise.resolve(a.async()).then(() => a.then()); return a; };
  F.askSync = (q, ctx) => { const r = route(q, ctx || CTX2); return r; };

  // czyszczenie rozmowy czyści też rozmowę o planie
  const clr = F.act.askClear; F.act.askClear = async (...a) => { F.askReset(); return clr(...a); };
  // podpowiedzi przy wpisywaniu
  if (F.ASK_SUG) F.ASK_SUG.push('Ułóż mi plan na masę na 3 dni', 'Ułóż plan na siłę na 4 dni', 'Ułóż plan bez sprzętu na 3 dni', 'Dodaj plan startowy Bez sprzętu', 'Ustaw jako aktualny', 'Zacznij trening', 'Zacznij cardio', 'Mam 30 minut', 'Skróć dzisiejszy trening do 45 minut', 'Powtórz ostatni trening', 'Przenieś jutrzejszy trening na sobotę', 'Pomiń dzisiejszy trening', 'Trenuję w poniedziałki, środy i piątki', 'Ważę 84,5', 'Talia 86', 'Mam 42 lata', 'Mam 182 cm wzrostu', 'Jestem średniozaawansowany', 'Chcę wycisnąć 100 kg do czerwca', 'Cel na ten miesiąc 12 treningów', 'Mam zawody 15 marca', 'Zrób raport PDF z 3 miesięcy', 'Pokaż podsumowanie roku', 'Zrób kopię zapasową', 'Eksport CSV', 'Włącz tryb trenera', 'Wyślij plan podopiecznemu', 'Wyniki dla trenera', 'Jak działa tryb trenera?', 'Włącz powiadomienia', 'Wyłącz wibracje', 'Głośność maks', 'Ostrzeżenie 10 s', 'Przełącz na funty', 'Krok ciężaru 2,5', 'Kolor złoty', 'Nie wygaszaj ekranu', 'Włącz odciążenie', 'Zacznij nowy blok', 'Jestem dziś w domu', 'Otwórz narzędzia', 'Przejdź do kalendarza', 'Gdzie są zdjęcia sylwetki?', 'Jak działa raport PDF?', 'Co to jest blok treningowy?', 'Jak zainstalować aplikację?', 'Przerwy na ciężkich ćwiczeniach 3 min', 'Co u Kasi?');
  // trener: wczytaj listę podopiecznych z wyprzedzeniem (czat liczy synchronicznie)
  if (F.cliLoad) setTimeout(() => { try { F.cliLoad(); } catch (e) { } }, 1500);
})();
