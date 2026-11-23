/* FORGE — żywienie (#/nutrition): zapotrzebowanie, korekta z trendu masy ciała, jadłospis na 7 dni z przepisami,
   zamienniki produktów, wykluczenia, lista zakupów, woda, błonnik i witamina D. */
(function () {
  const F = window.F; const ic = (n, s, c) => window.icon(n, s, c); const E = F.esc; const V = F.views;
  const DAY = 864e5, WK = 7 * DAY;
  const fN = (v, d = 0) => F.fmtNum(v, d);

  /* ---------- produkty: wartości na 100 g ----------
     [nazwa, krótka nazwa, kcal, białko, węglowodany przyswajalne (bez błonnika), tłuszcz, błonnik, źródło, tagi]
     Źródła: U = USDA SR28 (dziś FoodData Central, SR Legacy; numer NDB w komentarzu; węglowodany = „by difference” minus błonnik),
     L = typowe wartości z etykiet polskich produktów (różnią się między producentami). */
  const FOOD = {
    oats: ['Płatki owsiane', 'płatki owsiane', 379, 13.2, 57.6, 6.5, 10.1, 'U', 'gluten'], // 08120
    millet: ['Kasza jaglana (ugotowana)', 'kasza jaglana', 119, 3.5, 22.4, 1.0, 1.3, 'U', ''], // 20032
    bread: ['Chleb żytni', 'chleb żytni', 259, 8.5, 42.5, 3.3, 5.8, 'U', 'gluten'], // 18060
    breadw: ['Chleb pełnoziarnisty pszenny', 'chleb pełnoziarnisty', 252, 12.5, 36.7, 3.5, 6.0, 'U', 'gluten'], // 18075
    ricecake: ['Wafle ryżowe', 'wafle ryżowe', 387, 8.2, 77.3, 2.8, 4.2, 'U', ''], // 19816
    rice: ['Ryż biały (ugotowany)', 'ryż', 130, 2.7, 27.8, 0.3, 0.4, 'U', ''], // 20445
    riceb: ['Ryż brązowy (ugotowany)', 'ryż brązowy', 123, 2.7, 24.0, 1.0, 1.6, 'U', ''], // 20037
    buck: ['Kasza gryczana (ugotowana)', 'kasza gryczana', 92, 3.4, 17.2, 0.6, 2.7, 'U', ''], // 20010
    bulgur: ['Bulgur (ugotowany)', 'bulgur', 83, 3.1, 14.1, 0.2, 4.5, 'U', 'gluten'], // 20013
    cous: ['Kuskus (przygotowany)', 'kuskus', 112, 3.8, 21.8, 0.2, 1.4, 'U', 'gluten'], // 20029
    pasta: ['Makaron pszenny (ugotowany)', 'makaron', 158, 5.8, 29.1, 0.9, 1.8, 'U', 'gluten'], // 20121
    pastaw: ['Makaron pełnoziarnisty (ugotowany)', 'makaron pełnoziarnisty', 149, 6.0, 26.2, 1.7, 3.9, 'U', 'gluten'], // 20125
    potato: ['Ziemniaki (ugotowane)', 'ziemniaki', 86, 1.7, 18.2, 0.1, 1.8, 'U', ''], // 11367
    sweetp: ['Bataty (pieczone)', 'bataty', 90, 2.0, 17.4, 0.2, 3.3, 'U', ''], // 11508
    chicken: ['Pierś z kurczaka (surowa)', 'kurczak', 120, 22.5, 0, 2.6, 0, 'U', 'meat'], // 05062
    turkey: ['Pierś z indyka (surowa)', 'indyk', 114, 23.3, 0, 2.3, 0, 'U', 'meat'], // 05710
    beef: ['Wołowina mielona, 5% tłuszczu (surowa)', 'wołowina', 137, 21.4, 0, 5.0, 0, 'U', 'meat'], // 23557
    pork: ['Polędwiczka wieprzowa (surowa)', 'polędwiczka wieprzowa', 109, 21.0, 0, 2.2, 0, 'U', 'meat'], // 10060
    salmon: ['Łosoś (surowy)', 'łosoś', 208, 20.4, 0, 13.4, 0, 'U', 'fish'], // 15236
    cod: ['Dorsz (surowy)', 'dorsz', 82, 17.8, 0, 0.7, 0, 'U', 'fish'], // 15015
    tuna: ['Tuńczyk w sosie własnym (odsączony)', 'tuńczyk', 86, 19.4, 0, 1.0, 0, 'U', 'fish'], // 15121
    tofu: ['Tofu twarde', 'tofu', 144, 17.3, 0.5, 8.7, 2.3, 'U', 'soy'], // 16426
    lentils: ['Soczewica (ugotowana)', 'soczewica', 116, 9.0, 12.2, 0.4, 7.9, 'U', ''], // 16070
    chickpeas: ['Ciecierzyca (ugotowana)', 'ciecierzyca', 164, 8.9, 19.8, 2.6, 7.6, 'U', ''], // 16057
    beans: ['Czerwona fasola (ugotowana)', 'czerwona fasola', 127, 8.7, 15.4, 0.5, 7.4, 'U', ''], // 16033
    egg: ['Jajka', 'jajka', 143, 12.6, 0.7, 9.5, 0, 'U', 'egg'], // 01123, 1 duże = 50 g bez skorupki
    skyr: ['Skyr naturalny', 'skyr', 64, 12, 4.1, 0, 0, 'L', 'dairy'],
    twp: ['Twaróg półtłusty', 'twaróg półtłusty', 124, 18, 3.7, 4.0, 0, 'L', 'dairy'],
    twc: ['Twaróg chudy', 'twaróg chudy', 91, 19, 3.5, 0.3, 0, 'L', 'dairy'],
    cottage: ['Serek wiejski', 'serek wiejski', 98, 11.1, 3.4, 4.3, 0, 'U', 'dairy'], // 01012
    yogurt: ['Jogurt naturalny', 'jogurt naturalny', 63, 5.3, 7.0, 1.6, 0, 'U', 'dairy'], // 01117
    kefir: ['Kefir naturalny', 'kefir', 48, 3.4, 4.7, 1.7, 0, 'L', 'dairy'],
    milk: ['Mleko 2%', 'mleko', 50, 3.3, 4.8, 2.0, 0, 'U', 'dairy'], // 01079
    banana: ['Banan', 'banan', 89, 1.1, 20.2, 0.3, 2.6, 'U', ''], // 09040
    apple: ['Jabłko', 'jabłko', 52, 0.3, 11.4, 0.2, 2.4, 'U', ''], // 09003
    blue: ['Borówki', 'borówki', 57, 0.7, 12.1, 0.3, 2.4, 'U', ''], // 09050
    straw: ['Truskawki', 'truskawki', 32, 0.7, 5.7, 0.3, 2.0, 'U', ''], // 09316
    orange: ['Pomarańcza', 'pomarańcza', 47, 0.9, 9.4, 0.1, 2.4, 'U', ''], // 09200
    oil: ['Oliwa z oliwek', 'oliwa', 884, 0, 0, 100, 0, 'U', ''], // 04053
    oil2: ['Olej rzepakowy', 'olej rzepakowy', 884, 0, 0, 100, 0, 'U', ''], // 04582
    almonds: ['Migdały', 'migdały', 579, 21.2, 9.1, 49.9, 12.5, 'U', 'nuts'], // 12061
    walnuts: ['Orzechy włoskie', 'orzechy włoskie', 654, 15.2, 7.0, 65.2, 6.7, 'U', 'nuts'], // 12155
    pb: ['Masło orzechowe', 'masło orzechowe', 598, 22.2, 17.3, 51.4, 5.0, 'U', 'nuts'], // 16398
    avocado: ['Awokado', 'awokado', 160, 2.0, 1.8, 14.7, 6.7, 'U', ''], // 09037
    broccoli: ['Brokuł', 'brokuł', 34, 2.8, 4.0, 0.4, 2.6, 'U', ''], // 11090
    tomato: ['Pomidor', 'pomidor', 18, 0.9, 2.7, 0.2, 1.2, 'U', ''], // 11529
    pepper: ['Papryka czerwona', 'papryka', 31, 1.0, 3.9, 0.3, 2.1, 'U', ''], // 11821
    cucumber: ['Ogórek', 'ogórek', 15, 0.7, 3.1, 0.1, 0.5, 'U', ''], // 11205
    carrot: ['Marchew', 'marchew', 41, 0.9, 6.8, 0.2, 2.8, 'U', ''], // 11124
    spinach: ['Szpinak', 'szpinak', 23, 2.9, 1.4, 0.4, 2.2, 'U', ''], // 11457
    vegmix: ['Mieszanka warzyw mrożonych', 'mieszanka warzyw', 72, 3.3, 9.5, 0.5, 4.0, 'U', ''] // 11583
  };
  const fd = id => { const a = FOOD[id]; return { id, name: a[0], sn: a[1], k: a[2], p: a[3], c: a[4], f: a[5], fib: a[6], src: a[7], tags: a[8] ? a[8].split(' ') : [] }; };
  // suchy produkt na zakupy: mnożnik = kcal po ugotowaniu / kcal suchego (USDA: ryż 20444, ryż brązowy 20036, kasza gryczana 20009, jaglana 20031,
  // bulgur 20012, kuskus 20028, makaron 20120, pełnoziarnisty 20124, soczewica 16069, ciecierzyca 16056, fasola 16032)
  const DRY = { rice: [130 / 365, 'Ryż biały'], riceb: [123 / 367, 'Ryż brązowy'], buck: [92 / 346, 'Kasza gryczana'], millet: [119 / 378, 'Kasza jaglana'], bulgur: [83 / 342, 'Bulgur'], cous: [112 / 376, 'Kuskus'], pasta: [158 / 371, 'Makaron pszenny'], pastaw: [149 / 352, 'Makaron pełnoziarnisty'], lentils: [116 / 352, 'Soczewica'], chickpeas: [164 / 378, 'Ciecierzyca'], beans: [127 / 337, 'Czerwona fasola'] };
  const EGG = 50; // USDA: 1 duże jajko = 50 g części jadalnej
  // jak przygotować (tylko produkty, które tego wymagają)
  const PREP = {
    oats: 'Płatki owsiane ugotuj w wodzie (3–5 minut).', millet: 'Kaszę jaglaną przepłucz gorącą wodą i ugotuj (ok. 15 minut).',
    rice: 'Ryż ugotuj według opakowania (ok. 15 minut).', riceb: 'Ryż brązowy ugotuj według opakowania (ok. 30 minut).', buck: 'Kaszę gryczaną ugotuj (ok. 15 minut).',
    bulgur: 'Bulgur ugotuj (10–12 minut).', cous: 'Kuskus zalej wrzątkiem, przykryj i odstaw na 5 minut.', pasta: 'Makaron ugotuj al dente według opakowania.', pastaw: 'Makaron pełnoziarnisty ugotuj al dente według opakowania.',
    potato: 'Ziemniaki obierz i ugotuj (ok. 20 minut).', sweetp: 'Bataty upiecz w skórce (200°C, ok. 45 minut), potem obierz.',
    chicken: 'Pierś z kurczaka pokrój i usmaż albo upiecz (200°C, ok. 20 minut).', turkey: 'Pierś z indyka pokrój i usmaż albo upiecz (200°C, ok. 20 minut).',
    beef: 'Wołowinę podsmaż na patelni, aż przestanie być różowa (ok. 10 minut).', pork: 'Polędwiczkę pokrój w medaliony i usmaż (ok. 4 minuty z każdej strony).',
    salmon: 'Łososia upiecz (200°C, ok. 15 minut).', cod: 'Dorsza upiecz albo usmaż (10–12 minut).', tuna: 'Tuńczyka odsącz z zalewy.', tofu: 'Tofu osusz, pokrój w kostkę i podsmaż na złoto.',
    lentils: 'Soczewicę ugotuj (czerwona ok. 15 minut, zielona ok. 25 minut) albo użyj gotowej z puszki.', chickpeas: 'Ciecierzycę z puszki odsącz i opłucz.', beans: 'Fasolę z puszki odsącz i opłucz.',
    egg: 'Jajka usmaż albo zrób z nich jajecznicę.', broccoli: 'Brokuł ugotuj na parze (5–7 minut).', vegmix: 'Mieszankę warzyw podsmaż albo ugotuj na parze (ok. 8 minut).', spinach: 'Szpinak podsmaż przez minutę albo dodaj na surowo.'
  };
  // grupy zamienników (zamiana tylko w obrębie grupy)
  const GRP = {
    mp: ['chicken', 'turkey', 'pork', 'beef', 'salmon', 'cod', 'tuna', 'tofu', 'lentils', 'chickpeas', 'beans'],
    eg: ['egg', 'tofu'], dp: ['skyr', 'twc', 'twp', 'cottage', 'yogurt', 'kefir'],
    gr: ['rice', 'riceb', 'buck', 'millet', 'potato', 'sweetp', 'pasta', 'pastaw', 'bulgur', 'cous'],
    ck: ['oats', 'millet'], br: ['bread', 'breadw', 'ricecake'],
    fr: ['banana', 'apple', 'blue', 'straw', 'orange'], ft: ['oil', 'oil2'], nu: ['almonds', 'walnuts', 'pb', 'avocado'],
    vg: ['broccoli', 'pepper', 'tomato', 'cucumber', 'carrot', 'spinach', 'vegmix']
  };
  // potrawy: [nazwa, składniki [id, rola, grupa, stała waga g?], ostatni krok]
  // rola: p — dobieram ilość pod białko, c — pod kalorie, f — pod tłuszcz, x — stała ilość
  const DISH = {
    bf: [
      ['Owsianka ze skyrem, bananem i migdałami', [['oats', 'c', 'ck'], ['skyr', 'p', 'dp'], ['banana', 'x', 'fr', 100], ['almonds', 'f', 'nu']], 'Na owsiankę wyłóż skyr, pokrojony owoc i orzechy.'],
      ['Jajecznica z pieczywem i pomidorem', [['bread', 'c', 'br'], ['egg', 'p', 'eg'], ['tomato', 'x', 'vg', 150], ['oil', 'f', 'ft']], 'Podaj z pieczywem i pokrojonym warzywem.'],
      ['Kanapki z twarogiem i ogórkiem', [['bread', 'c', 'br'], ['twp', 'p', 'dp'], ['cucumber', 'x', 'vg', 120], ['walnuts', 'f', 'nu']], 'Twaróg rozsmaruj na pieczywie, połóż plasterki warzywa, orzechy zjedz obok albo posyp nimi twaróg.'],
      ['Jaglanka z truskawkami i orzechami', [['millet', 'c', 'ck'], ['skyr', 'p', 'dp'], ['straw', 'x', 'fr', 150], ['walnuts', 'f', 'nu']], 'Kaszę wymieszaj ze skyrem, na wierzch owoce i orzechy.'],
      ['Tofucznica ze szpinakiem', [['bread', 'c', 'br'], ['tofu', 'p', 'eg'], ['spinach', 'x', 'vg', 100], ['oil', 'f', 'ft']], 'Tofu rozkrusz widelcem i podsmaż na oleju, dodaj szpinak i podaj z pieczywem.', ['tofu', 'spinach']],
      ['Owsianka z twarogiem i borówkami', [['oats', 'c', 'ck'], ['twc', 'p', 'dp'], ['blue', 'x', 'fr', 120], ['pb', 'f', 'nu']], 'Twaróg wymieszaj z owsianką, dodaj owoce i masło orzechowe.'],
      ['Kanapki z pastą z tuńczyka', [['bread', 'c', 'br'], ['tuna', 'p', 'mp'], ['cucumber', 'x', 'vg', 100], ['oil', 'f', 'ft']], 'Tuńczyka rozgnieć widelcem z oliwą, posmaruj pieczywo i połóż plasterki warzywa.', ['tuna']],
      ['Kanapki z pieczonym indykiem i awokado', [['bread', 'c', 'br'], ['turkey', 'p', 'mp'], ['tomato', 'x', 'vg', 120], ['avocado', 'f', 'nu']], 'Mięso upiecz wcześniej (od razu na kilka dni), pokrój w plastry i połóż na pieczywie z awokado i warzywem.']
    ],
    main: [
      ['Kurczak z ryżem i brokułem', [['rice', 'c', 'gr'], ['chicken', 'p', 'mp'], ['broccoli', 'x', 'vg', 200], ['oil', 'f', 'ft']], 'Wszystko połącz na talerzu.'],
      ['Łosoś z ziemniakami i brokułem', [['potato', 'c', 'gr'], ['salmon', 'p', 'mp'], ['broccoli', 'x', 'vg', 200], ['oil', 'f', 'ft']], 'Podaj rybę z ziemniakami i warzywem.'],
      ['Indyk z makaronem w sosie pomidorowym', [['pasta', 'c', 'gr'], ['turkey', 'p', 'mp'], ['tomato', 'x', 'vg', 250], ['oil', 'f', 'ft']], 'Pomidory pokrój i poduś na oliwie 10 minut, dodaj mięso i wymieszaj z makaronem.'],
      ['Wołowina z kaszą gryczaną i papryką', [['buck', 'c', 'gr'], ['beef', 'p', 'mp'], ['pepper', 'x', 'vg', 200], ['oil', 'f', 'ft']], 'Paprykę pokrój i podsmaż z mięsem, podaj z kaszą.'],
      ['Dorsz z ziemniakami i surówką', [['potato', 'c', 'gr'], ['cod', 'p', 'mp'], ['carrot', 'x', 'vg', 150], ['oil2', 'f', 'ft']], 'Marchew zetrzyj na surówkę, skrop olejem i podaj z rybą i ziemniakami.'],
      ['Polędwiczka z batatami i szpinakiem', [['sweetp', 'c', 'gr'], ['pork', 'p', 'mp'], ['spinach', 'x', 'vg', 150], ['oil', 'f', 'ft']], 'Wszystko połącz na talerzu.'],
      ['Sałatka z tuńczykiem i makaronem', [['pastaw', 'c', 'gr'], ['tuna', 'p', 'mp'], ['tomato', 'x', 'vg', 150], ['cucumber', 'x', 'vg', 100], ['oil', 'f', 'ft']], 'Warzywa pokrój, wymieszaj z ostudzonym makaronem, rybą i oliwą.'],
      ['Tofu z ryżem i warzywami', [['rice', 'c', 'gr'], ['tofu', 'p', 'mp'], ['vegmix', 'x', 'vg', 250], ['oil2', 'f', 'ft']], 'Warzywa i tofu wymieszaj na patelni, podaj z ryżem.'],
      ['Soczewica z ryżem i pomidorami', [['rice', 'c', 'gr'], ['lentils', 'p', 'mp'], ['tomato', 'x', 'vg', 250], ['oil', 'f', 'ft']], 'Pomidory pokrój i poduś na oliwie z soczewicą przez 10 minut, podaj z ryżem.'],
      ['Chili z fasolą i ryżem brązowym', [['riceb', 'c', 'gr'], ['beans', 'p', 'mp'], ['pepper', 'x', 'vg', 150], ['tomato', 'x', 'vg', 150], ['oil', 'f', 'ft']], 'Paprykę i pomidory poduś na oliwie, dodaj fasolę i przyprawy (np. kumin, papryka wędzona), gotuj 10 minut.'],
      ['Kurczak z kuskusem i warzywami', [['cous', 'c', 'gr'], ['chicken', 'p', 'mp'], ['pepper', 'x', 'vg', 120], ['cucumber', 'x', 'vg', 120], ['oil', 'f', 'ft']], 'Warzywa pokrój, wymieszaj z kuskusem i oliwą, połóż mięso.'],
      ['Indyk z kaszą jaglaną i marchewką', [['millet', 'c', 'gr'], ['turkey', 'p', 'mp'], ['carrot', 'x', 'vg', 200], ['oil', 'f', 'ft']], 'Marchew pokrój w słupki i poduś na oliwie, podaj z mięsem i kaszą.'],
      ['Ciecierzyca z bulgurem i warzywami', [['bulgur', 'c', 'gr'], ['chickpeas', 'p', 'mp'], ['tomato', 'x', 'vg', 150], ['cucumber', 'x', 'vg', 150], ['oil', 'f', 'ft']], 'Warzywa pokrój, wymieszaj z bulgurem, ciecierzycą i oliwą.'],
      ['Omlet z ziemniakami i papryką', [['potato', 'c', 'gr'], ['egg', 'p', 'eg'], ['pepper', 'x', 'vg', 150], ['oil', 'f', 'ft']], 'Jajka roztrzep, wlej na patelnię z podsmażoną papryką i pokrojonymi ziemniakami, smaż pod przykryciem 5 minut.', ['egg']],
      ['Makaron z twarogiem i szpinakiem', [['pastaw', 'c', 'gr'], ['twp', 'p', 'dp'], ['spinach', 'x', 'vg', 150], ['oil', 'f', 'ft']], 'Szpinak podsmaż na oliwie, wymieszaj z makaronem i rozkruszonym twarogiem.', ['spinach']]
    ],
    sn: [
      ['Skyr z borówkami i orzechami', [['blue', 'c', 'fr'], ['skyr', 'p', 'dp'], ['walnuts', 'f', 'nu']], 'Wymieszaj w miseczce.'],
      ['Serek wiejski z jabłkiem i migdałami', [['apple', 'c', 'fr'], ['cottage', 'p', 'dp'], ['almonds', 'f', 'nu']], 'Jabłko pokrój i dodaj do serka.'],
      ['Jogurt z bananem i masłem orzechowym', [['banana', 'c', 'fr'], ['yogurt', 'p', 'dp'], ['pb', 'f', 'nu']], 'Banana pokrój, polej jogurtem i masłem orzechowym.'],
      ['Kanapka z jajkiem i pomidorem', [['bread', 'c', 'br'], ['egg', 'p', 'eg'], ['tomato', 'x', 'vg', 100]], 'Jajka ugotuj na twardo (9 minut), pokrój i połóż na pieczywie z warzywem.', ['egg']],
      ['Twaróg z truskawkami', [['straw', 'c', 'fr'], ['twc', 'p', 'dp'], ['almonds', 'f', 'nu']], 'Twaróg wymieszaj z pokrojonymi owocami, posyp orzechami.'],
      ['Pieczona ciecierzyca i pomarańcza', [['orange', 'c', 'fr'], ['chickpeas', 'p', 'mp'], ['oil', 'f', 'ft']], 'Ciecierzycę osusz, wymieszaj z oliwą i przyprawami, piecz 25 minut w 200°C. Owoc zjedz obok.'],
      ['Wafle ryżowe z tuńczykiem', [['ricecake', 'c', 'br'], ['tuna', 'p', 'mp'], ['cucumber', 'x', 'vg', 100]], 'Tuńczyka połóż na waflach z plasterkami warzywa.'],
      ['Jajka na twardo, marchewka i jabłko', [['apple', 'c', 'fr'], ['egg', 'p', 'eg'], ['carrot', 'x', 'vg', 100]], 'Jajka ugotuj na twardo (9 minut). Marchewkę pokrój w słupki.', ['egg']]
    ]
  };
  // limity porcji (g): [min, max]
  const LIM = id => { const f = FOOD[id]; if (id === 'oil' || id === 'oil2') return [5, 30]; if (['almonds', 'walnuts', 'pb'].includes(id)) return [10, 40]; if (id === 'avocado') return [30, 150]; if (id === 'egg') return [EGG, 5 * EGG]; if (id === 'oats') return [30, 120]; if (id === 'ricecake') return [20, 80]; if (/^bread/.test(id)) return [35, 200]; if (f[8].includes('meat') || f[8].includes('fish') || id === 'tofu') return [60, 300]; if (GRP.dp.includes(id)) return [80, id === 'kefir' ? 400 : 350]; if (GRP.fr.includes(id)) return [50, 300]; if (['lentils', 'chickpeas', 'beans'].includes(id)) return [60, 350]; if (id === 'potato' || id === 'sweetp') return [80, 700]; return [40, 600]; };
  const stepOf = id => id === 'oil' || id === 'oil2' ? 5 : id === 'egg' ? EGG : 10;

  /* ---------- wykluczenia ---------- */
  const EXL = [['meat', 'Bez mięsa'], ['fish', 'Bez ryb'], ['dairy', 'Bez nabiału'], ['egg', 'Bez jajek'], ['gluten', 'Bez glutenu'], ['nuts', 'Bez orzechów']];
  const exOf = nu => { const ex = { ...(nu.ex || {}) }; if (nu.veg) { ex.meat = 1; ex.fish = 1; } return ex; };
  const okF = (id, ex) => !FOOD[id][8].split(' ').some(t => t && ex[t]);

  /* ---------- zapotrzebowanie ---------- */
  // średni czas i spalanie z treningów: z ostatnich 28 dni, a gdy historia jest krótsza — od pierwszego treningu (co najmniej 7 dni)
  const trainAvg = () => {
    const now = Date.now(), ss = F.S.sessions; if (!ss.length) return { kcal: 0, min: 0, days: 0 };
    const first = ss.reduce((a, s) => Math.min(a, s.start), now); const days = Math.max(7, Math.min(28, Math.ceil((now - first) / DAY)));
    let k = 0, sec = 0; ss.forEach(s => { if (s.start >= now - days * DAY) { k += F.sessKcal(s).net; sec += s.dur || 0; } });
    return { kcal: k / days, min: sec / 60 / days, days };
  };
  const nutPlan = () => {
    const s = F.S.settings, nu = s.nut || {}; const p = F.profile(); const age = F.ageNow();
    if (!p.sexKnown || !age || !p.heightKnown || !p.bwKnown || !s.activity) return { missing: true };
    if (age < 18) return { block: 'Dla osób poniżej 18. roku życia nie podaję celów kalorycznych ani odchudzania — organizm jest w okresie wzrostu. Porozmawiaj z lekarzem lub dietetykiem.' };
    if (nu.ed) return { block: 'Przy zaburzeniach odżywiania liczenie kalorii i makroskładników może szkodzić. Nie podaję liczb — omów żywienie z lekarzem, psychologiem lub dietetykiem.' };
    const bmr = F.bmr(p), pal = F.PAL[s.activity] || F.PAL[1]; const base = bmr * pal[1];
    const tr = trainAvg(); const adj = nu.adj || 0; const total = base + tr.kcal + adj;
    const bmi = p.bw / Math.pow(p.height / 100, 2);
    const mode = nu.mode || ((s.wiz && s.wiz.goal === 'sculpt') ? 'cut' : (s.wiz && s.wiz.goal === 'hyp' && bmi < 30 ? 'bulk' : 'keep'));
    const preg = (s.wiz && s.wiz.special === 'preg');
    let k = total, note = '';
    if (preg && mode !== 'keep') note = 'W ciąży nie ustawiam deficytu ani nadwyżki — zapotrzebowanie omów z lekarzem prowadzącym.';
    else if (mode === 'cut') { const def = Math.min(total * 0.15, 500); k = total - def; note = `Deficyt ${Math.round(def / 10) * 10} kcal (15%, nie więcej niż 500 kcal) — tempo 0,5–1% masy ciała tygodniowo, które lepiej chroni mięśnie.`; }
    else if (mode === 'bulk') { if (bmi >= 30) note = 'Przy BMI od 30 (otyłość według WHO) nie dodaję nadwyżki — siłę i mięśnie lepiej budować przy kaloriach na utrzymanie.'; else { k = total * 1.10; note = 'Nadwyżka 10% (dolna granica zaleceń 10–20%) — celuj w przyrost 0,25–0,5% masy ciała tygodniowo.'; } }
    else note = 'Utrzymanie masy ciała.';
    let floored = false; if (k < bmr) { k = bmr; floored = true; note += ' Nie schodzę poniżej Twojej podstawowej przemiany materii.'; }
    k = Math.round(k / 10) * 10;
    const ref = bmi >= 30 ? 25 * Math.pow(p.height / 100, 2) : p.bw;
    const pLo = Math.round(ref * 1.4), pHi = Math.round(ref * 2.0);
    const prot = Math.round(mode === 'cut' ? (p.bf ? 2.3 * p.bw * (1 - p.bf / 100) : 2.0 * ref) : 1.7 * ref);
    // węglowodany na kg masy ciała (Thomas i in. 2016): ok. godzina ruchu dziennie → 5–7 g/kg, mniej → 3–5 g/kg
    const cR = tr.min >= 60 ? [5, 7] : [3, 5];
    let fatPct = 0.30, fat = Math.round(k * fatPct / 9), carb = Math.max(0, Math.round((k - prot * 4 - fat * 9) / 4)), fatLow = false;
    if (carb / p.bw < cR[0]) { const need = (k - prot * 4 - cR[0] * p.bw * 4) / k; const np = Math.max(0.20, Math.min(0.30, need)); if (np < fatPct) { fatPct = np; fatLow = true; fat = Math.round(k * fatPct / 9); carb = Math.max(0, Math.round((k - prot * 4 - fat * 9) / 4)); } }
    return { k, tdee: Math.round(total), base: Math.round(base), bmr: Math.round(bmr), pal, train: Math.round(tr.kcal), trMin: tr.min, trDays: tr.days, adj, mode, note, floored, prot, pLo, pHi, fat, fatPct, fatLow, carb, cR, bmi, refMass: Math.round(ref), floor: Math.round(bmr), p, preg,
      water: p.sex === 'f' ? 2.0 : 2.5, fib: 25 };
  };
  F.nutPlan = nutPlan;

  /* ---------- trend masy ciała i korekta kalorii ---------- */
  // tempo z regresji liniowej wpisów masy z ostatnich 4 tygodni (po ostatniej zmianie trybu lub korekcie)
  const RATE = { cut: [-1.0, -0.5], bulk: [0.25, 0.5] }; // % masy ciała tygodniowo: Helms 2014, Iraki 2019
  const trend = () => {
    const nu = F.S.settings.nut || {}; const now = Date.now(); const from = Math.max(now - 28 * DAY, nu.modeAt || 0, nu.adjAt || 0);
    const pts = F.S.bw.filter(b => b.date >= from && b.date <= now); if (pts.length < 4) return { n: pts.length, from, ok: false };
    const span = (pts[pts.length - 1].date - pts[0].date) / DAY; if (span < 14) return { n: pts.length, from, span, ok: false };
    const xs = pts.map(b => (b.date - pts[0].date) / DAY), ys = pts.map(b => b.kg); const mx = xs.reduce((a, v) => a + v, 0) / xs.length, my = ys.reduce((a, v) => a + v, 0) / ys.length;
    const sl = xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0) / xs.reduce((a, x) => a + (x - mx) * (x - mx), 0);
    return { ok: true, n: pts.length, span, from, kgWk: sl * 7, pct: sl * 7 / my * 100 };
  };
  F.nutTrend = trend;
  const STEP = 150, MAXADJ = 750;
  const suggestion = np => {
    const r = RATE[np.mode]; if (!r || np.preg) return null; const t = trend(); if (!t.ok) return { t };
    let d = 0; if (t.pct > r[1]) d = -STEP; else if (t.pct < r[0]) d = STEP;
    const nu = F.S.settings.nut || {}; const next = Math.max(-MAXADJ, Math.min(MAXADJ, (nu.adj || 0) + d)); if (next === (nu.adj || 0)) d = 0;
    return { t, d, r };
  };
  const kAfter = (np, d) => { const t = np.tdee + d; let k = np.mode === 'cut' ? t - Math.min(t * 0.15, 500) : np.mode === 'bulk' && np.bmi < 30 ? t * 1.1 : t; return Math.round(Math.max(np.floor, k) / 10) * 10; };
  F.act.nutAdj = b => { const s = F.S.settings; const nu = s.nut = { ...(s.nut || {}) }; const d = +b.dataset.d; if (b.dataset.reset) { nu.adj = 0; } else nu.adj = Math.max(-MAXADJ, Math.min(MAXADJ, (nu.adj || 0) + d)); nu.adjAt = Date.now(); F.saveSettings(); F.render(true); F.toast(b.dataset.reset ? 'Korekta usunięta' : `Cel ${d > 0 ? 'podniesiony' : 'obniżony'} o ${Math.abs(d)} kcal`, 'hot'); };

  /* ---------- jadłospis ---------- */
  const names = n => n === 3 ? ['Śniadanie', 'Obiad', 'Kolacja'] : n === 4 ? ['Śniadanie', 'Obiad', 'Przekąska', 'Kolacja'] : ['Śniadanie', 'II śniadanie', 'Obiad', 'Przekąska', 'Kolacja'];
  const SHARE = { 3: [0.28, 0.4, 0.32], 4: [0.25, 0.33, 0.12, 0.3], 5: [0.22, 0.12, 0.3, 0.12, 0.24] };
  const slotOf = (nm, i) => i === 0 ? 'bf' : /Przekąska|II śn/.test(nm) ? 'sn' : 'main';
  // składniki potrawy po wykluczeniach i zamianach użytkownika; null gdy potrawa nie pasuje
  const resolve = (dish, ex, sw, key) => {
    let changed = false; const it = [];
    for (let j = 0; j < dish[1].length; j++) {
      const [id0, role, grp, fx] = dish[1][j]; let id = id0; const u = sw && sw[key + '.' + j];
      if (u && FOOD[u] && okF(u, ex)) { id = u; } if (!okF(id, ex)) { const alt = (GRP[grp] || []).find(a => okF(a, ex)); if (!alt) return null; id = alt; }
      if (id !== id0) changed = true; it.push({ id, id0, role, grp, fx, j });
    }
    return { name: dish[0], fin: dish[2], skip: dish[3] || [], it, changed };
  };
  // nazwa potrawy zostaje, jeśli zamieniony składnik nie występuje w nazwie
  const STEM = { oats: 'owsian', millet: 'jagl', bread: 'pieczyw|kanap', breadw: 'pieczyw|kanap', egg: 'jaj|omlet', tofu: 'tofu', twp: 'twar', twc: 'twar', cottage: 'serek', skyr: 'skyr', yogurt: 'jogurt', rice: 'ryż', riceb: 'ryż', buck: 'gryczan', pasta: 'makaron', pastaw: 'makaron', potato: 'ziemniak', sweetp: 'batat', cous: 'kuskus', bulgur: 'bulgur', chickpeas: 'ciecierzyc', lentils: 'soczewic', beans: 'fasol', tuna: 'tuńczyk', turkey: 'indyk', chicken: 'kurczak', beef: 'wołowin', pork: 'polędwicz', salmon: 'łoso', cod: 'dorsz', banana: 'banan', straw: 'truskaw', blue: 'borów', apple: 'jabłk', orange: 'pomarańcz', almonds: 'migdał', walnuts: 'orzech', pb: 'orzechow', avocado: 'awokado', broccoli: 'brokuł', tomato: 'pomidor', cucumber: 'ogór', pepper: 'papryk', carrot: 'marchew|surówk', spinach: 'szpinak', vegmix: 'warzyw' };
  const named = d => d.it.every(x => x.id === x.id0 || !(STEM[x.id0] ? new RegExp(STEM[x.id0], 'i').test(d.name) : false));
  const titleOf = d => { if (!d.changed || named(d)) return d.name; const w = d.it.map(x => FOOD[x.id][1]); const s = w.length > 1 ? w.slice(0, -1).join(', ') + ' i ' + w[w.length - 1] : w[0]; return s.charAt(0).toUpperCase() + s.slice(1); };
  const solve = (d, K, P, Fa) => {
    const g = {}; const sum = i => d.it.reduce((a, x) => a + (g[x.j] || 0) * FOOD[x.id][i] / 100, 0); const kOf = () => sum(2); // 2 kcal, 3 białko, 5 tłuszcz
    const lim = x => x.role === 'x' ? [x.fx * 0.5, x.fx] : LIM(x.id); const set = (x, v) => { const [a, b] = lim(x); g[x.j] = Math.max(a, Math.min(b, v)); };
    const X = d.it.filter(x => x.role === 'x'), pI = d.it.find(x => x.role === 'p'), fI = d.it.find(x => x.role === 'f'), cI = d.it.find(x => x.role === 'c');
    X.forEach(x => { g[x.j] = x.fx; });
    [pI, fI, cI].forEach(x => { if (x) g[x.j] = 0; });
    // 3 przebiegi: białko i tłuszcz liczone z uwzględnieniem tego, co dają pozostałe składniki
    for (let it = 0; it < 3; it++) {
      if (pI) { const o = sum(3) - g[pI.j] * FOOD[pI.id][3] / 100; set(pI, (P - o) / (FOOD[pI.id][3] / 100)); }
      if (fI) { const o = sum(5) - g[fI.j] * FOOD[fI.id][5] / 100; set(fI, (Fa - o) / (FOOD[fI.id][5] / 100)); }
      if (cI) { const o = kOf() - g[cI.j] * FOOD[cI.id][2] / 100; set(cI, (K - o) / (FOOD[cI.id][2] / 100)); }
      // domknij kalorie: brakuje — więcej węglowodanów, potem tłuszczu, potem białka; za dużo — mniej tłuszczu, węglowodanów, dodatków, na końcu białka
      const order = kOf() < K ? [cI, fI, pI] : [fI, cI, ...X, pI];
      for (const x of order) { if (!x) continue; const diff = K - kOf(); if (Math.abs(diff) < 5) break; set(x, g[x.j] + diff / (FOOD[x.id][2] / 100)); }
    }
    const rows = d.it.map(x => { const id = x.id, st = stepOf(id); const gr = Math.max(st, Math.round(g[x.j] / st) * st); const f = fd(id);
      let q = gr + ' g'; if (id === 'egg') q = (gr / EGG) + ' szt. (' + gr + ' g)'; else if (DRY[id]) q = gr + ' g (ok. ' + Math.round(gr * DRY[id][0] / 5) * 5 + ' g suchego)';
      return { id, id0: x.id0, name: DRY[id] ? f.name.replace(' (ugotowany)', ', po ugotowaniu').replace(' (ugotowana)', ', po ugotowaniu').replace(' (przygotowany)', ', po przygotowaniu') : f.name, g: gr, unit: id === 'egg' ? gr / EGG : 0, q, role: x.role, grp: x.grp, j: x.j }; });
    const tot = rows.reduce((a, r) => { const f = fd(r.id); a.k += f.k * r.g / 100; a.p += f.p * r.g / 100; a.c += f.c * r.g / 100; a.f += f.f * r.g / 100; a.fib += f.fib * r.g / 100; return a; }, { k: 0, p: 0, c: 0, f: 0, fib: 0 });
    return { rows, tot };
  };
  // opt: true/false (bez mięsa i ryb — dawny parametr) albo obiekt { ex, sw, day }
  const mealPlan = (np, n, opt, seed = 0) => {
    const o = typeof opt === 'object' && opt ? opt : { ex: opt ? { meat: 1, fish: 1 } : {} }; const ex = o.ex || {}, sw = o.sw || null, day = o.day || 0;
    const nm = names(n), sh = SHARE[n]; const ref = np.refMass;
    // białko: każdy główny posiłek co najmniej 0,4 g/kg (Schoenfeld i Aragon 2018), reszta według udziału kalorii
    const main = nm.map((x, i) => slotOf(x, i) !== 'sn'); const mainN = main.filter(Boolean).length; const minP = 0.4 * ref;
    const rest = np.prot - mainN * minP; const P = nm.map((x, i) => rest >= 0 ? (main[i] ? minP : 0) + rest * sh[i] : (main[i] ? np.prot * sh[i] / main.reduce((a, m, j) => a + (m ? sh[j] : 0), 0) : 0));
    const dense = np.prot * 4 / np.k >= 0.25;
    const run = Pv => { const used = new Set(); let mi = 0;
    return nm.map((name, i) => {
      const slot = slotOf(name, i); const list = DISH[slot]; const key = `${seed}.${day}.${i}`; let d = null;
      // przy wysokim udziale białka (redukcja) najpierw potrawy z gęstym źródłem białka; gdy wykluczenia nie pozwalają — wszystkie
      for (const uniq of [true, false]) for (const strict of dense ? [true, false] : [false]) for (let t = 0; t < list.length && !d; t++) { const idx = (seed * 5 + day * 3 + (slot === 'main' ? mi * 4 : i) + t) % list.length; if (uniq && used.has(slot + idx)) continue; const r = resolve(list[idx], ex, sw, key); if (!r) continue; const sig = r.it.map(x => x.id).sort().join(); if (uniq && used.has(sig)) continue; if (strict) { const pi = r.it.find(x => x.role === 'p'); if (pi && FOOD[pi.id][3] / FOOD[pi.id][2] < 0.095) continue; } d = r; used.add(slot + idx); used.add(sig); }
      if (slot === 'main') mi++;
      if (!d) for (let t = 0; t < DISH.main.length && !d; t++) d = resolve(DISH.main[(seed + t) % DISH.main.length], ex, sw, key);
      if (!d) return { name, empty: true, rows: [], tot: { k: 0, p: 0, c: 0, f: 0, fib: 0 }, target: np.k * sh[i], steps: [] };
      const { rows, tot } = solve(d, np.k * sh[i], Pv[i], np.fat * sh[i]);
      const steps = d.it.filter(x => d.changed || !d.skip.includes(x.id)).map(x => PREP[x.id]).filter(Boolean); steps.push(d.changed ? 'Wszystko połącz na talerzu.' : d.fin);
      return { name, dish: titleOf(d), changed: d.changed, rows, tot, target: np.k * sh[i], pTarget: Pv[i], steps, key, slot };
    }); };
    // gdy białka wyszło za mało (np. przy wykluczeniach), dołóż brakujące do głównych posiłków i przelicz jeszcze raz
    let out = run(P); const short = np.prot - out.reduce((a, m) => a + m.tot.p, 0);
    if (short > np.prot * 0.03) { const P2 = P.map((v, i) => main[i] ? v + short / mainN : v); const o2 = run(P2); if (o2.reduce((a, m) => a + m.tot.p, 0) > out.reduce((a, m) => a + m.tot.p, 0)) out = o2; }
    return out;
  };
  F.mealPlan = mealPlan; F.FOOD = FOOD;
  const myPlanOpts = () => { const nu = F.S.settings.nut || {}; return { ex: exOf(nu), sw: nu.sw || {}, day: nu.day || 0 }; };
  F.nutOpts = myPlanOpts;

  /* ---------- zamienniki ---------- */
  F.act.nutSwap = b => {
    const np = nutPlan(); if (np.missing || np.block) return; const nu = F.S.settings.nut || {}; const n = nu.meals || 4, seed = nu.seed || 0;
    const meals = mealPlan(np, n, myPlanOpts(), seed); const m = meals[+b.dataset.m]; if (!m) return; const r = m.rows.find(x => x.j === +b.dataset.j); if (!r) return;
    const ex = exOf(nu); const cur = fd(r.id); const alts0 = (GRP[r.grp] || []).filter(a => a !== r.id && okF(a, ex));
    const amount = a => { const f = fd(a); let x; if (r.role === 'p') x = r.g * cur.p / f.p; else if (r.role === 'f') x = r.g * cur.f / f.f; else if (r.role === 'c') x = r.g * cur.k / f.k; else x = r.g; const st = stepOf(a); x = Math.max(st, Math.round(x / st) * st); return x; };
    const alts = alts0.filter(a => r.role === 'x' || amount(a) <= LIM(a)[1]); // pomiń produkty, których trzeba by zjeść nierealnie dużo
    const what = { p: 'tyle samo białka', f: 'tyle samo tłuszczu', c: 'tyle samo kalorii', x: 'ta sama waga' }[r.role];
    F.sheet(`<p class="small dim">Zamiana na ${what}. Resztę posiłku przeliczę tak, żeby kalorie i białko się zgadzały.</p>
      ${alts.length ? `<div class="menu">${alts.map(a => { const f = fd(a), x = amount(a); return `<button data-a="nutSwapDo" data-k="${m.key}.${r.j}" data-id="${a}"><span><b>${E(f.name)}</b><small>${a === 'egg' ? x / EGG + ' szt.' : x + ' g'} · ${Math.round(f.k * x / 100)} kcal · białko ${fN(f.p * x / 100)} g</small></span></button>`; }).join('')}</div>` : '<p class="small">Brak zamienników przy Twoich wykluczeniach.</p>'}
      ${(nu.sw || {})[m.key + '.' + r.j] ? `<button class="btn ghost sm" data-a="nutSwapDo" data-k="${m.key}.${r.j}" data-id="">${ic('rotate-ccw', 16)} Przywróć: ${E(FOOD[r.id0][1])}</button>` : ''}`, { title: 'Zamień: ' + E(cur.name) });
  };
  F.act.nutSwapDo = b => { const s = F.S.settings; const nu = s.nut = { ...(s.nut || {}) }; const sw = { ...(nu.sw || {}) }; if (b.dataset.id) sw[b.dataset.k] = b.dataset.id; else delete sw[b.dataset.k]; nu.sw = sw; F.saveSettings(); F.closeSheet(true); F.render(true); };

  /* ---------- lista zakupów (7 dni) ---------- */
  const CAT = [['Mięso i ryby', ['meat', 'fish']], ['Nabiał i jajka', ['dairy', 'egg']], ['Pieczywo, kasze, makarony i płatki', ['grain']], ['Strączki i tofu', ['leg']], ['Warzywa i owoce', ['veg']], ['Tłuszcze i orzechy', ['fat']]];
  const catOf = id => { const t = FOOD[id][8]; if (/meat/.test(t)) return 'meat'; if (/fish/.test(t)) return 'fish'; if (/dairy/.test(t)) return 'dairy'; if (id === 'egg') return 'egg'; if (['tofu', 'lentils', 'chickpeas', 'beans'].includes(id)) return 'leg'; if ([...GRP.gr, ...GRP.ck, ...GRP.br].includes(id)) return 'grain'; if ([...GRP.ft, ...GRP.nu].includes(id)) return 'fat'; return 'veg'; };
  const shopList = (np, days) => {
    const nu = F.S.settings.nut || {}; const n = nu.meals || 4, seed = nu.seed || 0; const base = myPlanOpts(); const sum = {};
    for (let d = 0; d < days; d++) mealPlan(np, n, { ...base, day: d }, seed).forEach(m => m.rows.forEach(r => { sum[r.id] = (sum[r.id] || 0) + r.g; }));
    return Object.entries(sum).map(([id, g]) => { let nm = FOOD[id][0].replace(/ \((ugotowan[yae]|przygotowany|pieczone|surow[aey]|odsączony)\)$/, ''), q;
      if (id === 'egg') q = Math.ceil(g / EGG) + ' szt.'; else if (DRY[id]) { const leg = ['lentils', 'chickpeas', 'beans'].includes(id); nm = DRY[id][1] + (leg ? ' sucha' : ''); q = Math.ceil(g * DRY[id][0] / 10) * 10 + ' g' + (leg ? ` (albo ${Math.ceil(g / 10) * 10} g z puszki po odsączeniu)` : ''); }
      else q = g >= 1000 ? fN(Math.ceil(g / 100) / 10, 1) + ' kg' : Math.ceil(g / 10) * 10 + ' g';
      return { id, nm, q, cat: catOf(id) }; });
  };
  const shopText = (np, days) => { const L = shopList(np, days); return CAT.map(([t, cs]) => { const xs = L.filter(x => cs.includes(x.cat)); return xs.length ? t + ':\n' + xs.map(x => '• ' + x.nm + ' — ' + x.q).join('\n') : ''; }).filter(Boolean).join('\n\n'); };
  F.act.nutShop = b => {
    const np = nutPlan(); if (np.missing || np.block) return; const days = +(b && b.dataset.d) || 7; const L = shopList(np, days);
    F.sheet(`<div class="chips">${[1, 3, 7].map(d => `<button class="chip ${d === days ? 'on' : ''}" data-a="nutShop" data-d="${d}">${d === 1 ? '1 dzień' : d + ' dni'}</button>`).join('')}</div>
      ${CAT.map(([t, cs]) => { const xs = L.filter(x => cs.includes(x.cat)); return xs.length ? `<h4 class="shop-h">${t}</h4>${xs.map(x => `<div class="meal-r"><span>${E(x.nm)}</span><b>${x.q}</b></div>`).join('')}` : ''; }).join('')}
      <p class="dim small">Suma z jadłospisu na ${days === 1 ? 'dzień 1' : 'dni 1–' + days}. Kasze, ryż, makaron i strączki podane na sucho, mięso i ryby na surowo. Zaokrąglone w górę.</p>
      <div class="btn-row"><button class="btn primary" data-a="nutShopShare" data-d="${days}">${ic('share-2', 18)} Udostępnij listę</button><button class="btn ghost" data-a="nutShopCopy" data-d="${days}">${ic('copy', 18)} Kopiuj</button></div>`, { title: 'Lista zakupów' });
  };
  F.act.nutShopCopy = async b => { const np = nutPlan(); try { await navigator.clipboard.writeText('Lista zakupów — FORGE\n\n' + shopText(np, +b.dataset.d)); F.toast('Skopiowano listę', 'hot'); } catch (e) { F.toast('Nie udało się skopiować'); } };
  F.act.nutShopShare = async b => { const np = nutPlan(); const text = 'Lista zakupów — FORGE\n\n' + shopText(np, +b.dataset.d); try { if (navigator.share) { await navigator.share({ title: 'Lista zakupów', text }); return; } } catch (e) { if (e && e.name === 'AbortError') return; } F.act.nutShopCopy(b); };

  /* ---------- akcje ---------- */
  F.act.nutSet = b => {
    const s = F.S.settings; const nu = s.nut = { ...(s.nut || {}) }; const k = b.dataset.k; const v = b.dataset.n ? +b.dataset.v : b.dataset.v === '1' ? true : b.dataset.v === '0' ? false : b.dataset.v;
    if (k === 'mode' && v !== nu.mode) nu.modeAt = Date.now();
    if (k === 'meals') nu.sw = {};
    nu[k] = v; F.saveSettings(); F.render(true);
  };
  F.act.nutEx = b => { const s = F.S.settings; const nu = s.nut = { ...(s.nut || {}) }; const ex = exOf(nu); const t = b.dataset.t; if (ex[t]) delete ex[t]; else ex[t] = 1; nu.ex = ex; nu.veg = !!(ex.meat && ex.fish); if (!(ex.meat && ex.fish)) delete nu.veg; F.saveSettings(); F.render(true); };
  F.act.nutAgain = () => { const s = F.S.settings; const nu = s.nut = { ...(s.nut || {}) }; nu.seed = (nu.seed || 0) + 1; nu.sw = {}; F.saveSettings(); F.render(true); };

  /* ---------- ekran ---------- */
  V.nutrition = () => {
    const np = nutPlan(); const s = F.S.settings, nu = s.nut || {}; const head = F.head('Żywienie', { back: 1, sub: 'Kalorie, jadłospis i zakupy' });
    const ed = `<label class="sw"><span><b>Mam lub miałem(am) zaburzenia odżywiania</b><small>wtedy nie pokażę liczb</small></span><input type="checkbox" data-a="nutSet" data-k="ed" data-v="${nu.ed ? '0' : '1'}" ${nu.ed ? 'checked' : ''}><i></i></label>`;
    if (np.missing) return { html: `${head}<div class="empty"><h3>Uzupełnij dane</h3><p>Do wyliczenia potrzebuję płci, wieku, wzrostu, masy ciała i aktywności w ciągu dnia. Masę ciała wpiszesz przyciskiem „Wpisz wagę”, resztę w Ustawieniach → Profil.</p><div class="btn-row"><a class="btn primary" href="#/settings">Otwórz profil</a><button class="btn ghost" data-a="bwSheet">Wpisz wagę</button></div></div>` };
    if (np.block) return { html: `${head}<section class="card cut"><p class="small">${E(np.block)}</p>${nu.ed ? ed : ''}</section>` };
    const n = nu.meals || 4, seed = nu.seed || 0, day = nu.day || 0; const ex = exOf(nu); const meals = mealPlan(np, n, myPlanOpts(), seed);
    const chip = (on, a, attrs, l) => `<button class="chip ${on ? 'on' : ''}" data-a="${a}" ${attrs}>${l}</button>`;
    const modeL = { cut: 'Redukcja', keep: 'Utrzymanie', bulk: 'Przyrost' };
    const tot = meals.reduce((a, m) => ({ k: a.k + m.tot.k, p: a.p + m.tot.p, c: a.c + m.tot.c, f: a.f + m.tot.f, fib: a.fib + m.tot.fib }), { k: 0, p: 0, c: 0, f: 0, fib: 0 });
    const bw = np.p.bw; const cKg = np.carb / bw;
    // jak liczę
    const how = `<details class="nut-how"><summary>${ic('calculator', 16)} Jak to liczę</summary>
      <div class="meal-r"><span>Podstawowa przemiana materii (${np.p.bf ? 'wzór Katcha–McArdle’a, z % tkanki tłuszczowej' : 'wzór Mifflina–St Jeora'})</span><b>${fN(np.bmr)} kcal</b></div>
      <div class="meal-r"><span>× aktywność w ciągu dnia: ${E(np.pal[0].toLowerCase())} (FAO/WHO/UNU, polskie normy)</span><b>× ${fN(np.pal[1], 2)}</b></div>
      <div class="meal-r"><span>+ treningi (średnio z ${np.trDays} dni)</span><b>${np.train ? '+ ' + fN(np.train) + ' kcal' : '—'}</b></div>
      ${np.adj ? `<div class="meal-r"><span>+ korekta z trendu masy ciała</span><b>${np.adj > 0 ? '+ ' : '− '}${fN(Math.abs(np.adj))} kcal</b></div>` : ''}
      <div class="meal-r"><span><b>Zapotrzebowanie</b></span><b>${fN(np.tdee)} kcal</b></div>
      <p class="dim small">Współczynniki aktywności opisują dzień bez treningów, bo treningi doliczam osobno z tego, co zapisujesz. Wzór daje średnią dla osób takich jak Ty — dlatego co 2 tygodnie sprawdzam trend masy ciała i proponuję korektę.</p></details>`;
    const macro = `<div class="nut-m"><div><small>Białko</small><b>${np.prot} g</b><em>${fN(np.prot / bw, 1)} g/kg</em></div><div><small>Tłuszcz</small><b>${np.fat} g</b><em>${Math.round(np.fatPct * 100)}% kcal</em></div><div><small>Węglowodany</small><b>${np.carb} g</b><em>${fN(cKg, 1)} g/kg</em></div></div>`;
    const cNote = `Węglowodany: ${fN(cKg, 1)} g na kg masy ciała. Przy Twoich treningach (średnio ${fN(np.trMin)} min dziennie) zalecenie to ${np.cR.join('–')} g/kg (Thomas i in. 2016)${cKg < np.cR[0] ? ' — w deficycie mogą spaść niżej; jeśli brakuje Ci sił na treningu, zjedz część węglowodanów przed nim' : ''}.${np.fatLow ? ` Tłuszcz obniżyłem do ${Math.round(np.fatPct * 100)}% kalorii, żeby zostało więcej węglowodanów (EFSA: 20–35%; polskie normy dopuszczają 20–30% przy małej aktywności).` : ' Tłuszcz 30% kalorii (polskie normy 2024: 30–40%, EFSA: 20–35%).'}`;
    // trend i korekta
    const sg = suggestion(np); let trendCard = '';
    if (sg) {
      const t = sg.t, r = RATE[np.mode]; const ab = r.map(Math.abs).sort((a, b) => a - b); const rng = `${fN(ab[0], 2)}–${fN(ab[1], 2)}%`; let body;
      if (!t.ok) body = `<p class="small">Do oceny tempa potrzebuję co najmniej 4 pomiarów masy ciała z 2 tygodni${t.n ? ` (masz ${t.n})` : ''}. Waż się rano, po toalecie, 2–3 razy w tygodniu.</p><button class="btn ghost sm" data-a="bwSheet">${ic('scale', 16)} Wpisz wagę</button>`;
      else {
        const pct = t.pct; const dir = np.mode === 'cut' ? (pct < 0 ? 'spadek' : 'wzrost') : (pct >= 0 ? 'przyrost' : 'spadek');
        body = `<p class="small">Ostatnie ${Math.round(t.span)} dni: <b>${dir} ${fN(Math.abs(pct), 2)}% masy ciała tygodniowo</b> (${fN(Math.abs(t.kgWk), 2)} kg). Cel: ${np.mode === 'cut' ? 'spadek' : 'przyrost'} ${rng} tygodniowo (${np.mode === 'cut' ? 'Helms i in. 2014' : 'Iraki i in. 2019'}).</p>`;
        if (sg.d) body += `<p class="small">${sg.d < 0 ? (np.mode === 'cut' ? 'Chudniesz wolniej niż trzeba.' : 'Przybierasz szybciej niż trzeba — to więcej tłuszczu.') : (np.mode === 'cut' ? 'Chudniesz za szybko — to zagraża mięśniom.' : 'Przybierasz za wolno.')} Proponuję zmienić zapotrzebowanie o <b>${sg.d > 0 ? '+' : '−'}${Math.abs(sg.d)} kcal</b> — cel dzienny ${fN(np.k)} → ${fN(kAfter(np, sg.d))} kcal.</p><button class="btn primary sm" data-a="nutAdj" data-d="${sg.d}">${ic('check', 16)} Zastosuj</button>`;
        else body += `<p class="small">Tempo jest w normie — nic nie zmieniam.</p>`;
      }
      if (np.adj) body += `<p class="dim small">Obecna korekta: ${np.adj > 0 ? '+' : '−'}${Math.abs(np.adj)} kcal. <button class="lnk" data-a="nutAdj" data-reset="1" data-d="0">Usuń korektę</button></p>`;
      trendCard = `<section class="card cut"><h3>${ic('trending-down', 18)} Tempo zmian masy</h3>${body}<p class="dim small">Liczę z wpisów masy ciała od ostatniej zmiany celu (najwyżej 4 tygodnie). Następną korektę zaproponuję po 2 tygodniach.</p></section>`;
    }
    // bezpieczeństwo redukcji
    const t = trend(); const fast = np.mode === 'cut' && t.ok && t.pct < -1.0;
    const reds = np.mode === 'cut' ? `<section class="card cut nut-safe${fast ? ' warn' : ''}"><h3>${ic('shield', 18)} Bezpieczna redukcja</h3><p class="small">${fast ? '<b>Tracisz ponad 1% masy ciała tygodniowo.</b> ' : ''}Zbyt mało jedzenia w stosunku do wysiłku (niska dostępność energii) szkodzi zdrowiu i wynikom — u kobiet i u mężczyzn (Międzynarodowy Komitet Olimpijski, 2023). Jeśli wyniki na treningu spadają, czujesz się ciągle zmęczony, często chorujesz albo u kobiet zatrzymała się miesiączka — zwiększ kalorie i skonsultuj się z lekarzem.</p></section>` : '';
    // jadłospis
    const dayChips = `<div class="seg nut-days" role="tablist" aria-label="Dzień jadłospisu">${[0, 1, 2, 3, 4, 5, 6].map(d => `<button class="${d === day ? 'on' : ''}" data-a="nutSet" data-k="day" data-v="${d}" data-n="1">${d + 1}</button>`).join('')}</div>`;
    const mealH = (m, i) => m.empty ? `<div class="meal"><h4>${m.name}</h4><p class="small dim">Przy tych wykluczeniach nie mam pasującej potrawy.</p></div>` : `<div class="meal"><div class="wz-dh"><h4>${m.name}</h4><small class="dim">${Math.round(m.tot.k)} kcal · B ${Math.round(m.tot.p)} g</small></div><p class="meal-t">${E(m.dish)}</p>
      ${m.rows.map(r => `<button class="meal-r meal-sw" data-a="nutSwap" data-m="${i}" data-j="${r.j}" aria-label="Zamień: ${E(r.name)}"><span>${E(r.name)}</span><b>${r.q}</b>${ic('arrow-left-right', 14)}</button>`).join('')}
      <details class="meal-st"><summary>Jak przygotować</summary><ol>${m.steps.map(x => `<li>${E(x)}</li>`).join('')}</ol></details></div>`;
    const exChips = EXL.map(([k, l]) => chip(ex[k], 'nutEx', `data-t="${k}"`, l)).join('');
    return { html: `${head}
      <section class="card cut"><h3>${ic('flame', 18)} Twoje zapotrzebowanie</h3>
        <div class="chips">${['cut', 'keep', 'bulk'].map(m => chip(np.mode === m, 'nutSet', `data-k="mode" data-v="${m}"`, modeL[m])).join('')}</div>
        <div class="sum-stats nut"><div><small>Cel dzienny</small><b>${fN(np.k)} <em>kcal</em></b></div></div>${macro}
        <p class="small">${E(np.note)}</p>${how}
        <p class="dim small">Białko: ISSN zaleca osobom ćwiczącym 1,4–2,0 g na kg masy ciała${np.bmi >= 30 ? ` (przy BMI od 30 liczę od masy należnej, ${np.refMass} kg)` : ''}${np.mode === 'cut' ? '; w redukcji podnoszę je, bo w deficycie potrzeba więcej (ISSN: 2,3–3,1 g na kg beztłuszczowej masy ciała)' : ''}. ${E(cNote)}</p></section>
      ${trendCard}${reds}
      <section class="card cut"><h3>${ic('layers', 18)} Jadłospis</h3>
        <div class="chips">${[3, 4, 5].map(x => chip(n === x, 'nutSet', `data-k="meals" data-v="${x}" data-n="1"`, x + (x === 5 ? ' posiłków' : ' posiłki'))).join('')}</div>
        <div class="chips nut-ex">${exChips}</div>
        <div class="nut-dh"><span class="small dim">Dzień</span>${dayChips}</div>
        ${meals.map(mealH).join('')}
        ${tot.p < np.prot * 0.9 ? `<p class="small warn-t">Przy tych wykluczeniach białka w jadłospisie jest ${Math.round(tot.p)} g, mniej niż cel ${np.prot} g.</p>` : ''}<p class="small"><b>Razem:</b> ${Math.round(tot.k)} kcal · białko ${Math.round(tot.p)} g · węglowodany ${Math.round(tot.c)} g · tłuszcz ${Math.round(tot.f)} g · błonnik ${Math.round(tot.fib)} g.</p>
        <p class="dim small">Stuknij produkt, żeby go zamienić. W każdym głównym posiłku jest co najmniej ${fN(0.4 * np.refMass)} g białka (0,4 g/kg — Schoenfeld i Aragon 2018). Mięso i ryby ważone na surowo, kasze i makarony po ugotowaniu.${ex.gluten ? ' Bez glutenu: sprawdzaj etykiety — śladowe ilości glutenu bywają w wielu produktach.' : ''}</p>
        <div class="btn-row"><button class="btn primary" data-a="nutShop">${ic('shopping-cart', 18)} Lista zakupów</button><button class="btn ghost" data-a="nutAgain">${ic('repeat', 16)} Inna propozycja</button></div></section>
      <section class="card cut"><h3>${ic('droplets', 18)} Woda, błonnik, witamina D</h3>
        <div class="meal-r"><span>Woda — łącznie z napojów i jedzenia</span><b>${fN(np.water, 1)} l dziennie</b></div>
        <div class="meal-r"><span>Błonnik · w tym jadłospisie</span><b>25 g · ${Math.round(tot.fib)} g</b></div>
        <p class="dim small">Woda i błonnik: Normy żywienia dla populacji Polski (2024) i EFSA. Wody potrzeba więcej przy upale i długim wysiłku — na treningu nie trać przez pocenie ponad 2% masy ciała (ACSM 2007).</p>
        <p class="small"><b>Witamina D.</b> Polskie zalecenia (2023) dla zdrowych dorosłych: jeśli od maja do września nie przebywasz na słońcu 30–45 minut dziennie (10:00–15:00, odsłonięte ręce i nogi, bez filtra), przyjmuj 1000–2000 j.m. (25–50 µg) dziennie przez cały rok, zależnie od masy ciała i diety. Po 65. roku życia — przez cały rok niezależnie od słońca. Przy chorobach dawkę ustala lekarz.</p></section>
      <section class="card cut">${ed}</section>
      <p class="dim small pad">Wartości produktów: USDA FoodData Central (SR Legacy), a dla polskiego nabiału (skyr, twarożek, kefir) — typowe wartości z etykiet; Twój produkt może się nieco różnić. Normy: Normy żywienia dla populacji Polski (NIZP PZH-PIB, 2024), EFSA (2010). Przy chorobach, w ciąży, przy alergiach lub zaburzeniach odżywiania skonsultuj dietę ze specjalistą.</p>` };
  };
})();
