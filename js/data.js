/* FORGE — dane startowe: partie mięśniowe, biblioteka ćwiczeń, plany startowe, cytaty, rangi */
window.F = window.F || {};

F.MUSCLES = {
  chest: 'Klatka piersiowa', back: 'Plecy', shoulders: 'Barki', biceps: 'Biceps', triceps: 'Triceps',
  forearms: 'Przedramiona', abs: 'Brzuch', quads: 'Czworogłowe', hams: 'Dwugłowe uda', glutes: 'Pośladki',
  calves: 'Łydki', full: 'Całe ciało', cardio: 'Cardio'
};
F.MUSCLE_COLORS = {
  chest: '#ff5a36', back: '#ff9a1f', shoulders: '#ffc83d', biceps: '#c6f03a', triceps: '#4be28f', forearms: '#2fd3c4',
  abs: '#38b6ff', quads: '#7a8cff', hams: '#b06bff', glutes: '#ff5fb0', calves: '#ff7d7d', full: '#e8eaf0', cardio: '#8b91a0'
};
F.EQUIP = ['Sztanga', 'Hantle', 'Maszyna', 'Wyciąg', 'Kettlebell', 'Masa ciała', 'Drążek', 'Inne'];
F.TYPES = {
  wr: 'Ciężar × powtórzenia', bwr: 'Masa ciała + obciążenie', br: 'Tylko powtórzenia', time: 'Czas'
};

// id, nazwa, partia, sprzęt, typ, złożone(1/0), aliasy (PL/EN, oddzielone średnikiem)
F.SEED = [
  // KLATKA
  ['bench', 'Wyciskanie sztangi leżąc', 'chest', 'Sztanga', 'wr', 1, 'bench press;wyciskanie leżąc;wyciskanie na ławce;wyciskanie sztangi na ławce płaskiej;flat bench;wyciskanie lezac;klata;wyciskanie;wyciskanie sztangi;wyciskanie na klatę;wyciskanie klatka'],
  ['bench_inc', 'Wyciskanie sztangi na skosie dodatnim', 'chest', 'Sztanga', 'wr', 1, 'incline bench press;wyciskanie skos;wyciskanie na ławce skośnej;skos dodatni;incline barbell'],
  ['bench_dec', 'Wyciskanie sztangi na skosie ujemnym', 'chest', 'Sztanga', 'wr', 1, 'decline bench press;skos ujemny'],
  ['db_bench', 'Wyciskanie hantli leżąc', 'chest', 'Hantle', 'wr', 1, 'dumbbell bench press;wyciskanie hantli na ławce;wyciskanie hantli płasko;db bench'],
  ['db_inc', 'Wyciskanie hantli na skosie dodatnim', 'chest', 'Hantle', 'wr', 1, 'incline dumbbell press;wyciskanie hantli skos;db incline'],
  ['chest_mach', 'Wyciskanie na maszynie (klatka)', 'chest', 'Maszyna', 'wr', 1, 'chest press machine;maszyna na klatkę;wyciskanie na suwnicy poziomej;chest press'],
  ['fly_db', 'Rozpiętki z hantlami', 'chest', 'Hantle', 'wr', 0, 'dumbbell fly;rozpiętki;rozpietki;dumbbell flyes'],
  ['fly_cable', 'Rozpiętki na wyciągach (bramka)', 'chest', 'Wyciąg', 'wr', 0, 'cable crossover;cable fly;bramka;brama;rozpiętki na bramie;rozpietki na bramie;rozpiętki na wyciągu;bramy;krzyżowanie linek;wyciągi bramka'],
  ['pec_deck', 'Butterfly (maszyna)', 'chest', 'Maszyna', 'wr', 0, 'pec deck;peck deck;rozpiętki na maszynie;butterfly'],
  ['dips', 'Dipy na poręczach', 'triceps', 'Masa ciała', 'bwr', 1, 'dips;pompki na poręczach;dip;poręcze;parallel bar dips'],
  ['pushup', 'Pompki', 'chest', 'Masa ciała', 'br', 1, 'push up;pushups;push-up;pompka'],
  // PLECY
  ['deadlift', 'Martwy ciąg', 'back', 'Sztanga', 'wr', 1, 'deadlift;martwy ciag;mc;conventional deadlift'],
  ['sumo', 'Martwy ciąg sumo', 'back', 'Sztanga', 'wr', 1, 'sumo deadlift;sumo'],
  ['rdl', 'Rumuński martwy ciąg', 'hams', 'Sztanga', 'wr', 1, 'romanian deadlift;rdl;martwy ciąg rumuński;rumuński mc;martwy ciag na prostych nogach;stiff leg deadlift;sztywne nogi'],
  ['pullup', 'Podciąganie nachwytem', 'back', 'Drążek', 'bwr', 1, 'pull up;pullups;pull-up;podciąganie na drążku;podciaganie;podciąganie'],
  ['chinup', 'Podciąganie podchwytem', 'back', 'Drążek', 'bwr', 1, 'chin up;chinup;chin-up;podciąganie podchwytem'],
  ['lat_pull', 'Ściąganie drążka wyciągu górnego', 'back', 'Wyciąg', 'wr', 1, 'lat pulldown;wyciąg górny;ściąganie drążka do klatki;pulldown;ściąganie drążka;ściąganie linki górnej;lat pull down'],
  ['row_bb', 'Wiosłowanie sztangą', 'back', 'Sztanga', 'wr', 1, 'barbell row;bent over row;wiosłowanie w opadzie;wiosłowanie sztangą w opadzie tułowia;pendlay row;wioslowanie'],
  ['row_db', 'Wiosłowanie hantlą jednorącz', 'back', 'Hantle', 'wr', 1, 'one arm dumbbell row;wiosłowanie hantlą;single arm row;dumbbell row;wiosłowanie hantlami'],
  ['row_cable', 'Wiosłowanie na wyciągu siedząc', 'back', 'Wyciąg', 'wr', 1, 'seated cable row;wiosłowanie siedząc;wyciąg dolny;cable row;przyciąganie linki dolnej'],
  ['row_tbar', 'Wiosłowanie T-bar', 'back', 'Sztanga', 'wr', 1, 't-bar row;t bar row;tbar;wiosłowanie sztangą t'],
  ['row_mach', 'Wiosłowanie na maszynie', 'back', 'Maszyna', 'wr', 1, 'machine row;wiosłowanie maszyna;hammer row'],
  ['pullover', 'Pullover', 'back', 'Hantle', 'wr', 0, 'dumbbell pullover;pull over'],
  ['shrug', 'Szrugsy', 'back', 'Sztanga', 'wr', 0, 'barbell shrug;shrugs;wzruszanie barkami;kaptury;trapezy'],
  ['hyper', 'Prostowanie grzbietu na ławce rzymskiej', 'back', 'Maszyna', 'wr', 0, 'back extension;hyperextension;hiperekstensja;ławka rzymska;prostowanie tułowia'],
  ['facepull', 'Face pull', 'shoulders', 'Wyciąg', 'wr', 0, 'face pulls;przyciąganie linki do twarzy;facepull;facepulls'],
  // BARKI
  ['ohp', 'Wyciskanie żołnierskie (OHP)', 'shoulders', 'Sztanga', 'wr', 1, 'overhead press;ohp;military press;wyciskanie sztangi nad głowę;żołnierskie;wyciskanie sztangi stojąc;shoulder press;wyciskanie zolnierskie'],
  ['db_ohp', 'Wyciskanie hantli nad głowę', 'shoulders', 'Hantle', 'wr', 1, 'dumbbell shoulder press;wyciskanie hantli siedząc;dumbbell overhead press;wyciskanie hantli na barki;wyciskanie hantli nad głową siedząc;wyciskanie hantli siedząc;wyciskanie hantli nad głową'],
  ['arnold', 'Wyciskanie Arnolda', 'shoulders', 'Hantle', 'wr', 1, 'arnold press;arnoldki'],
  ['lateral', 'Wznosy hantli bokiem', 'shoulders', 'Hantle', 'wr', 0, 'lateral raise;side raise;unoszenie hantli bokiem;wznosy bokiem;lateral raises;odwodzenie ramion w bok;barki boczne;boczne barki;boczny akton;unoszenie bokiem;wznosy boczne hantlami;wznosy boczne;wznosy hantli w bok'],
  ['lateral_c', 'Wznosy bokiem na wyciągu', 'shoulders', 'Wyciąg', 'wr', 0, 'cable lateral raise;wznosy na wyciągu bokiem'],
  ['front_raise', 'Wznosy hantli przodem', 'shoulders', 'Hantle', 'wr', 0, 'front raise;unoszenie hantli przodem;wznosy przodem'],
  ['rear_fly', 'Odwrotne rozpiętki (tylny akton)', 'shoulders', 'Hantle', 'wr', 0, 'reverse fly;rear delt fly;rozpiętki tył;wznosy w opadzie;tylny akton;rear delts;reverse pec deck'],
  ['upright', 'Podciąganie sztangi wzdłuż tułowia', 'shoulders', 'Sztanga', 'wr', 0, 'upright row;wiosłowanie do brody'],
  ['sh_mach', 'Wyciskanie na maszynie (barki)', 'shoulders', 'Maszyna', 'wr', 1, 'shoulder press machine;maszyna na barki'],
  ['push_press', 'Push press', 'shoulders', 'Sztanga', 'wr', 1, 'push press'],
  // BICEPS
  ['curl_bb', 'Uginanie ze sztangą', 'biceps', 'Sztanga', 'wr', 0, 'barbell curl;uginanie przedramion ze sztangą;uginanie sztangi;curl ze sztangą;biceps sztanga'],
  ['curl_ez', 'Uginanie ze sztangą łamaną', 'biceps', 'Sztanga', 'wr', 0, 'ez bar curl;ez curl;sztanga łamana;uginanie na łamanej;uginanie ramion ze sztangą łamaną'],
  ['curl_db', 'Uginanie z hantlami', 'biceps', 'Hantle', 'wr', 0, 'dumbbell curl;uginanie hantli;uginanie ramion z hantlami;biceps hantle;alternate dumbbell curl'],
  ['curl_ham', 'Uginanie młotkowe', 'biceps', 'Hantle', 'wr', 0, 'hammer curl;młotki;uginanie chwytem młotkowym;hammer curls'],
  ['curl_inc', 'Uginanie hantli na ławce skośnej', 'biceps', 'Hantle', 'wr', 0, 'incline dumbbell curl;incline curl;uginanie na skosie'],
  ['curl_pre', 'Uginanie na modlitewniku', 'biceps', 'Sztanga', 'wr', 0, 'preacher curl;modlitewnik;uginanie na ławce scotta;scott curl'],
  ['curl_cab', 'Uginanie na wyciągu dolnym', 'biceps', 'Wyciąg', 'wr', 0, 'cable curl;uginanie na wyciągu'],
  ['curl_con', 'Uginanie koncentryczne', 'biceps', 'Hantle', 'wr', 0, 'concentration curl'],
  // TRICEPS
  ['tri_push', 'Prostowanie ramion na wyciągu (drążek)', 'triceps', 'Wyciąg', 'wr', 0, 'triceps pushdown;pushdown;prostowanie na wyciągu;prostowanie ramion na wyciągu górnym;triceps pressdown;pushdown triceps'],
  ['tri_rope', 'Prostowanie ramion z liną', 'triceps', 'Wyciąg', 'wr', 0, 'rope pushdown;rope triceps extension;prostowanie z liną;prostowanie na linie;triceps linka;triceps lina;linka triceps;tricepsy na linie;pushdown linka;prostowanie linki;prostowanie ramion linki;prostowanie ramion na linie'],
  ['skull', 'Wyciskanie francuskie', 'triceps', 'Sztanga', 'wr', 0, 'skull crusher;french press;francuz;wyciskanie francuskie leżąc;skullcrusher;lying triceps extension'],
  ['tri_over', 'Prostowanie ramienia zza głowy', 'triceps', 'Hantle', 'wr', 0, 'overhead triceps extension;french press hantla;wyciskanie francuskie hantlą;prostowanie ramion nad głową;triceps extension'],
  ['cgbp', 'Wyciskanie wąskim chwytem', 'triceps', 'Sztanga', 'wr', 1, 'close grip bench press;wąski chwyt;cgbp;wyciskanie sztangi wąsko;close-grip bench'],
  ['bench_dip', 'Pompki tyłem na ławce', 'triceps', 'Masa ciała', 'br', 0, 'bench dips;dipy na ławce;pompki na ławce'],
  ['kickback', 'Prostowanie ramienia w opadzie', 'triceps', 'Hantle', 'wr', 0, 'triceps kickback;kickback triceps'],
  // PRZEDRAMIONA
  ['wrist_curl', 'Uginanie nadgarstków', 'forearms', 'Sztanga', 'wr', 0, 'wrist curl;nadgarstki'],
  ['farmer', 'Spacer farmera', 'forearms', 'Hantle', 'wr', 1, 'farmers walk;farmer walk;farmer\'s walk;spacer farmera'],
  // BRZUCH
  ['crunch', 'Spięcia brzucha', 'abs', 'Masa ciała', 'br', 0, 'crunch;crunches;brzuszki;spinanie brzucha;skłony'],
  ['sit_up', 'Brzuszki (sit-up)', 'abs', 'Masa ciała', 'br', 0, 'sit up;situp;sit-ups'],
  ['leg_raise', 'Unoszenie nóg w zwisie', 'abs', 'Drążek', 'br', 0, 'hanging leg raise;unoszenie nóg;leg raise;knee raise;unoszenie kolan w zwisie'],
  ['cab_crunch', 'Spięcia brzucha na wyciągu', 'abs', 'Wyciąg', 'wr', 0, 'cable crunch;kneeling cable crunch;brzuszki na wyciągu;allahy;allah;klęczące spięcia na wyciągu;skłony na wyciągu'],
  ['ab_wheel', 'Kółko do brzucha', 'abs', 'Inne', 'br', 0, 'ab wheel;ab roller;rollout;roller;kółko'],
  ['plank', 'Plank (deska)', 'abs', 'Masa ciała', 'time', 0, 'plank;deska;podpór przodem'],
  ['side_plank', 'Plank boczny', 'abs', 'Masa ciała', 'time', 0, 'side plank;deska boczna'],
  ['russian', 'Russian twist', 'abs', 'Masa ciała', 'br', 0, 'russian twist;skręty rosyjskie;skręty tułowia'],
  ['woodchop', 'Drwal na wyciągu', 'abs', 'Wyciąg', 'wr', 0, 'cable woodchop;woodchopper;drwal'],
  // CZWOROGŁOWE
  ['squat', 'Przysiad ze sztangą', 'quads', 'Sztanga', 'wr', 1, 'squat;back squat;przysiad;przysiad ze sztangą na plecach;przysiady;high bar squat;low bar squat;przysiad tylny;przysiad klasyczny'],
  ['front_sq', 'Przysiad przedni', 'quads', 'Sztanga', 'wr', 1, 'front squat;przysiad ze sztangą z przodu'],
  ['hack', 'Hack squat', 'quads', 'Maszyna', 'wr', 1, 'hack squat;przysiad hackenschmidta;hack'],
  ['leg_press', 'Wyciskanie nogami na suwnicy', 'quads', 'Maszyna', 'wr', 1, 'leg press;suwnica;wypychanie na suwnicy;wyciskanie na suwnicy;prasa nożna;wypychanie ciężaru nogami'],
  ['leg_ext', 'Prostowanie nóg na maszynie', 'quads', 'Maszyna', 'wr', 0, 'leg extension;prostowanie nóg siedząc;extension;prostowanie nog'],
  ['lunge', 'Wykroki z hantlami', 'quads', 'Hantle', 'wr', 1, 'lunges;lunge;wykroki;wykrok;walking lunge;chodzone wykroki'],
  ['bulgar', 'Przysiad bułgarski', 'quads', 'Hantle', 'wr', 1, 'bulgarian split squat;split squat;przysiad bulgarski;przysiad na jednej nodze'],
  ['goblet', 'Przysiad goblet', 'quads', 'Kettlebell', 'wr', 1, 'goblet squat;przysiad z kettlem;przysiad z hantlą'],
  ['step_up', 'Wejścia na podwyższenie', 'quads', 'Hantle', 'wr', 1, 'step up;step ups;wejścia na skrzynię;wejscia na stopien'],
  ['smith_sq', 'Przysiad na suwnicy Smitha', 'quads', 'Maszyna', 'wr', 1, 'smith machine squat;smith squat;przysiad smith'],
  // DWUGŁOWE / POŚLADKI
  ['leg_curl', 'Uginanie nóg leżąc', 'hams', 'Maszyna', 'wr', 0, 'lying leg curl;leg curl;uginanie nóg na maszynie;uginanie nóg;uginanie podudzi'],
  ['leg_curl_s', 'Uginanie nóg siedząc', 'hams', 'Maszyna', 'wr', 0, 'seated leg curl'],
  ['good_m', 'Good morning', 'hams', 'Sztanga', 'wr', 1, 'good morning;dzień dobry;skłony ze sztangą'],
  ['nordic', 'Nordic curl', 'hams', 'Masa ciała', 'br', 0, 'nordic hamstring curl;nordic'],
  ['hip_thrust', 'Hip thrust', 'glutes', 'Sztanga', 'wr', 1, 'wypychanie bioder;hip thrust ze sztangą;barbell hip thrust;hipthrust;mostek ze sztangą;glute bridge ze sztangą'],
  ['glute_br', 'Mostek biodrowy', 'glutes', 'Masa ciała', 'wr', 0, 'glute bridge;mostek;unoszenie bioder'],
  ['glute_kick', 'Odwodzenie nogi w tył na wyciągu', 'glutes', 'Wyciąg', 'wr', 0, 'glute kickback;cable kickback;kickback pośladki;odwodzenie w tył;wymachy nogą w tył'],
  ['abduct', 'Odwodzenie ud na maszynie', 'glutes', 'Maszyna', 'wr', 0, 'hip abduction;abductor;odwodzenie nóg;odwodziciele;abdukcja'],
  ['adduct', 'Przywodzenie ud na maszynie', 'quads', 'Maszyna', 'wr', 0, 'hip adduction;adductor;przywodzenie nóg;przywodziciele;addukcja'],
  ['sumo_sq', 'Przysiad sumo z hantlą', 'glutes', 'Hantle', 'wr', 1, 'sumo squat;przysiad sumo'],
  ['frog_pump', 'Frog pump', 'glutes', 'Masa ciała', 'br', 0, 'frog pumps'],
  // ŁYDKI
  ['calf_st', 'Wspięcia na palce stojąc', 'calves', 'Maszyna', 'wr', 0, 'standing calf raise;wspięcia stojąc;łydki stojąc;calf raise;wspiecia na palce'],
  ['calf_se', 'Wspięcia na palce siedząc', 'calves', 'Maszyna', 'wr', 0, 'seated calf raise;łydki siedząc;wspięcia siedząc'],
  ['calf_press', 'Wspięcia na suwnicy', 'calves', 'Maszyna', 'wr', 0, 'calf press;leg press calf raise;łydki na suwnicy'],
  // CAŁE CIAŁO
  ['clean', 'Podrzut sztangi', 'full', 'Sztanga', 'wr', 1, 'power clean;clean;podrzut;hang clean'],
  ['snatch', 'Rwanie sztangi', 'full', 'Sztanga', 'wr', 1, 'snatch;rwanie'],
  ['kb_swing', 'Swing kettlebell', 'full', 'Kettlebell', 'wr', 1, 'kettlebell swing;machy kettlem;swing;kettlebell swings'],
  ['thruster', 'Thruster', 'full', 'Sztanga', 'wr', 1, 'thrusters'],
  ['burpee', 'Burpees', 'full', 'Masa ciała', 'br', 1, 'burpee;burpeesy'],
  ['sled', 'Pchanie sań', 'full', 'Inne', 'wr', 1, 'sled push;prowler;sanie'],
  ['battle', 'Liny (battle ropes)', 'full', 'Inne', 'time', 0, 'battle ropes;liny'],
  // CARDIO
  ['run', 'Bieżnia / bieganie', 'cardio', 'Maszyna', 'time', 0, 'running;treadmill;bieganie;bieżnia;bieznia;bieg'],
  ['bike', 'Rower stacjonarny', 'cardio', 'Maszyna', 'time', 0, 'cycling;stationary bike;rowerek;rower'],
  ['rower', 'Wioślarz (ergometr)', 'cardio', 'Maszyna', 'time', 0, 'rowing machine;ergometr;concept2;wioślarz;wioslarz'],
  ['jump_rope', 'Skakanka', 'cardio', 'Inne', 'time', 0, 'jump rope;skipping;skakanie na skakance'],
  ['stairs', 'Stepper / schody', 'cardio', 'Maszyna', 'time', 0, 'stairmaster;stepper;schody;stair climber'],
  ['elliptical', 'Orbitrek', 'cardio', 'Maszyna', 'time', 0, 'elliptical;cross trainer;crosstrainer'],
  ['incline_walk', 'Marsz pod górę', 'cardio', 'Maszyna', 'time', 0, 'incline walk;incline walking;marsz na bieżni;chodzenie pod górę']
];

// Plany startowe: [nazwa, opis, [[dzień, [[exId, serie, powt, przerwa(s)]...]]...]]
F.TEMPLATES = [
  ['Push / Pull / Legs', 'Klasyk na 3–6 dni. Sprawdza się u każdego, kto chce ciężko i regularnie.', [
    ['Push', [['bench', 4, '6-8', 150], ['ohp', 3, '8-10', 120], ['db_inc', 3, '8-12', 90], ['lateral', 4, '12-15', 60], ['tri_push', 3, '10-12', 75], ['skull', 3, '10-12', 75]]],
    ['Pull', [['deadlift', 3, '5', 180], ['pullup', 4, '6-10', 120], ['row_bb', 3, '8-10', 120], ['facepull', 3, '12-15', 60], ['curl_bb', 3, '8-10', 75], ['curl_ham', 3, '10-12', 60]]],
    ['Legs', [['squat', 4, '6-8', 180], ['rdl', 3, '8-10', 120], ['leg_press', 3, '10-12', 120], ['leg_curl', 3, '10-12', 75], ['calf_st', 4, '12-15', 60], ['cab_crunch', 3, '12-15', 60]]]
  ]],
  ['Góra / Dół (4 dni)', 'Dwa razy w tygodniu każda partia. Dużo siły, dużo objętości.', [
    ['Góra A — siła', [['bench', 5, '5', 180], ['row_bb', 4, '6-8', 150], ['ohp', 3, '6-8', 120], ['lat_pull', 3, '8-10', 90], ['curl_ez', 3, '8-10', 75], ['tri_push', 3, '8-10', 75]]],
    ['Dół A — siła', [['squat', 5, '5', 210], ['rdl', 3, '6-8', 150], ['leg_press', 3, '10', 120], ['leg_curl', 3, '10-12', 75], ['calf_st', 4, '10-12', 60]]],
    ['Góra B — objętość', [['db_inc', 4, '8-12', 90], ['row_cable', 4, '10-12', 90], ['db_ohp', 3, '10-12', 90], ['pullup', 3, '8-12', 90], ['lateral', 4, '12-20', 45], ['curl_inc', 3, '10-12', 60], ['tri_over', 3, '10-12', 60]]],
    ['Dół B — objętość', [['deadlift', 3, '5', 210], ['bulgar', 3, '8-10', 120], ['hack', 3, '10-12', 120], ['hip_thrust', 3, '10-12', 90], ['leg_ext', 3, '12-15', 60], ['calf_se', 4, '12-15', 45]]]
  ]],
  ['Siła 5×5 (A/B)', 'Prosty, brutalny, skuteczny. Dokładaj ciężar co trening.', [
    ['Trening A', [['squat', 5, '5', 180], ['bench', 5, '5', 180], ['row_bb', 5, '5', 150]]],
    ['Trening B', [['squat', 5, '5', 180], ['ohp', 5, '5', 150], ['deadlift', 1, '5', 240]]]
  ]],
  ['Full Body 3×', 'Trzy treningi całego ciała. Idealne na start lub gdy masz mało czasu.', [
    ['Full Body A', [['squat', 3, '8', 150], ['bench', 3, '8', 120], ['row_cable', 3, '10', 90], ['plank', 3, '45', 60]]],
    ['Full Body B', [['deadlift', 3, '5', 180], ['db_ohp', 3, '10', 90], ['lat_pull', 3, '10', 90], ['leg_raise', 3, '12', 60]]],
    ['Full Body C', [['leg_press', 3, '10', 120], ['db_bench', 3, '10', 90], ['row_db', 3, '10', 90], ['curl_db', 2, '12', 60], ['tri_push', 2, '12', 60]]]
  ]],
  ['Pośladki i nogi', 'Skupienie na pośladkach, tyle ud i górze w wersji wspierającej.', [
    ['Pośladki A', [['hip_thrust', 4, '8-10', 120], ['rdl', 3, '8-10', 120], ['bulgar', 3, '10', 90], ['glute_kick', 3, '12-15', 60], ['abduct', 3, '15-20', 45]]],
    ['Nogi + góra', [['squat', 4, '8', 150], ['leg_curl', 3, '10-12', 75], ['lat_pull', 3, '10-12', 90], ['db_ohp', 3, '10-12', 75], ['plank', 3, '45', 45]]],
    ['Pośladki B', [['sumo', 3, '6-8', 150], ['hip_thrust', 3, '10-12', 90], ['step_up', 3, '10', 75], ['glute_br', 3, '15', 45], ['calf_st', 3, '15', 45]]]
  ]]
];

F.QUOTES = [
  'Ciężar nie negocjuje.', 'Zmęczenie mija. Rekord zostaje.', 'Nie czekaj na motywację. Wykonaj plan.',
  'Każde powtórzenie to głos na człowieka, którym chcesz być.', 'Dyscyplina bije talent, gdy talent nie wchodzi na salę.',
  'Dziś jest dzień, w którym stajesz się silniejszy.', 'Sztanga jest uczciwa. Zawsze pokaże, ile wlałeś.',
  'Nie schodź z podestu, dopóki nie zostawisz tam czegoś z siebie.', 'Bądź silniejszy niż wczoraj. Tylko tyle.',
  'Ból treningu jest chwilowy. Żal po odpuszczeniu zostaje.', 'Zbuduj ciało, które udźwignie Twoje ambicje.',
  'Seria, w której chcesz skończyć, to ta, która zmienia wynik.', 'Wielkie rekordy rodzą się w zwykłe wtorki.',
  'Żelazo nie kłamie.', 'Najcięższy ruch to wejście na salę. Resztę już umiesz.', 'Bez wymówek. Bez skrótów. Bez litości dla starego rekordu.',
  'Jedna dobra seria. Potem kolejna.', 'Nie liczysz powtórzeń. Powtórzenia liczą Ciebie.', 'Silna głowa podnosi to, co słabe ciało odpuszcza.'
];

F.RANKS = [
  { n: 'Rekrut', xp: 0 }, { n: 'Żelazny', xp: 400 }, { n: 'Stalowy', xp: 1500 }, { n: 'Tytan', xp: 5000 },
  { n: 'Gladiator', xp: 13000 }, { n: 'Legenda', xp: 32000 }, { n: 'Nieśmiertelny', xp: 80000 }
];

F.DEFAULT_SETTINGS = {
  name: '', unit: 'kg', weeklyGoal: 4, defaultRest: 120, sound: true, vibrate: true, wake: true,
  accent: 'ember', bar: 20, plates: [25, 20, 15, 10, 5, 2.5, 1.25], step: 2.5, lastBackup: 0, installDismissed: 0, autoRest: true
};
