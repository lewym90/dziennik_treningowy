/* FORGE — ciało: realistyczna sylwetka z podświetlanymi partiami. Odcień szarości (assets/body/*.webp) daje rzeźbę mięśni,
   mapa *-id.png mówi, która partia jest w którym pikselu, a kolor nakładamy tutaj, więc działa z każdym kolorem aplikacji. */
(function () {
  const F = window.F; const E = F.esc; const ORDER = F.BODY_ORDER; const cache = {};
  const sexKey = () => F.S.settings.sex === 'f' ? 'f' : 'm';
  const px = img => { const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight; const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0); return g.getImageData(0, 0, c.width, c.height).data; };
  const loadImg = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
  const load = k => cache[k] || (cache[k] = Promise.all([loadImg(`assets/body/${k}.webp`), loadImg(`assets/body/${k}-id.png`)]).then(([a, b]) => ({ w: a.naturalWidth, gray: px(a), id: px(b) })).catch(e => { cache[k] = null; throw e; }));
  const hex = h => { h = String(h).trim().replace('#', ''); if (h.length === 3) h = [...h].map(x => x + x).join(''); return [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16)); };
  const token = t => { const v = t === 'a1' || t === 'a2' ? getComputedStyle(document.documentElement).getPropertyValue('--' + t) : t; return hex(v); };

  async function paint(cv) {
    const sex = cv.dataset.sex || sexKey(), view = cv.dataset.v, file = cv.dataset.f ? sex + '-' + cv.dataset.f : sex;
    const colors = JSON.parse(cv.dataset.c || '{}'), dim = +(cv.dataset.dim || 1); const tint = [null]; ORDER.forEach(n => tint.push(colors[n] ? token(colors[n]) : null));
    let d; try { d = await load(file); } catch (e) { return; }
    const r = cv.dataset.f ? [0, 0, d.w, Math.round(d.gray.length / 4 / d.w)] : F.BODY[sex].r[view];
    cv.width = r[2]; cv.height = r[3]; cv.dataset.vw = view; const g = cv.getContext('2d'), out = g.createImageData(r[2], r[3]), o = out.data;
    for (let y = 0; y < r[3]; y++) for (let x = 0; x < r[2]; x++) {
      const s = ((y + r[1]) * d.w + x + r[0]) * 4, k = (y * r[2] + x) * 4, v = d.gray[s] / 255, c = tint[d.id[s]];
      if (c) { const l = Math.min(1.12, .12 + v * 1.45); o[k] = Math.min(255, c[0] * l); o[k + 1] = Math.min(255, c[1] * l); o[k + 2] = Math.min(255, c[2] * l); }
      else { const q = v * 255 * dim; o[k] = q; o[k + 1] = q * .97; o[k + 2] = q * .94; }
      o[k + 3] = Math.min(255, v * 1800);
    }
    g.putImageData(out, 0, 0); cv.classList.add('in');
  }
  const scan = () => document.querySelectorAll('canvas.bodyc:not([data-done])').forEach(c => { c.dataset.done = '1'; paint(c); });
  let q = 0; new MutationObserver(() => { if (!q) q = requestAnimationFrame(() => { q = 0; scan(); }); }).observe(document.documentElement, { childList: true, subtree: true });

  // dotknięcie partii na mapie
  document.addEventListener('click', async ev => {
    const c = ev.target; if (!c.matches || !c.matches('canvas.bodyc[data-tap]')) return;
    const sex = c.dataset.sex || sexKey(), r = F.BODY[sex].r[c.dataset.v], b = c.getBoundingClientRect(), d = await load(sex);
    const x = Math.round((ev.clientX - b.left) / b.width * r[2]) + r[0], y = Math.round((ev.clientY - b.top) / b.height * r[3]) + r[1];
    for (const [dx, dy] of [[0, 0], [8, 0], [-8, 0], [0, 8], [0, -8]]) { const id = d.id[((y + dy) * d.w + x + dx) * 4]; if (id) { F.act.musTap({ dataset: { m: ORDER[id - 1] } }); return; } }
  });

  F.bodyCv = (view, colors, o = {}) => `<canvas class="bodyc ${o.cls || ''}" data-v="${view}" data-c="${E(JSON.stringify(colors || {}))}"${o.f ? ` data-f="${o.f}"` : ''}${o.dim ? ` data-dim="${o.dim}"` : ''}${o.tap ? ' data-tap="1"' : ''} aria-hidden="true"></canvas>`;

  // sprzęt do ćwiczenia: dokładnie przypisany albo dobrany po nazwie i rodzaju sprzętu
  // Zasada: grafika tylko wtedy, gdy pokazuje dokładnie ten sprzęt, na którym robi się ćwiczenie. Inaczej zostają same mięśnie.
  const EQ = { 0: 'bench cgbp', 1: 'db_inc curl_inc', 2: 'squat front_sq ohp good_m', 3: 'deadlift sumo rdl push_press clean snatch thruster', 4: 'lat_pull', 5: 'row_cable', 6: 'fly_cable lateral_c facepull tri_push tri_rope curl_cab cab_crunch woodchop glute_kick', 7: 'leg_press calf_press', 8: 'leg_ext leg_curl_s', 9: 'chest_mach', 10: 'pullup chinup dips leg_raise', 12: 'curl_ez skull', 13: 'curl_bb row_bb upright shrug wrist_curl', 14: 'row_mach', 15: 'pec_deck', 16: 'sh_mach', 17: 'hack', 18: 'smith_sq', 19: 'leg_curl', 20: 'calf_st', 21: 'calf_se', 22: 'hip_thrust', 23: 'hyper', 24: 'curl_pre', 25: 'db_bench fly_db pullover', 26: 'bench_dec', 27: 'bench_inc', 28: 'abduct adduct', 29: 'row_tbar' };
  const EQ_ID = {}; Object.entries(EQ).forEach(([k, v]) => v.split(' ').forEach(id => { EQ_ID[id] = +k; }));
  // ćwiczenia z bazy 886: tylko nazwy, które jednoznacznie wskazują dany sprzęt
  const EQ_NAME = [[/^(barbell squat|barbell squat to a bench|wide stance barbell squat|narrow stance squats|olympic squat|front squat \(clean grip\))$/, 2], [/^(bench press - powerlifting|wide-grip barbell bench press)$/, 0], [/^wide-grip decline barbell bench press$/, 26], [/ez[- ]bar/, 12], [/^reverse barbell preacher curls$/, 24], [/^(reverse barbell curl|close-grip standing barbell curl|wide-grip standing barbell curl)$/, 13], [/barbell wrist curl$/, 13], [/^narrow stance hack squats$/, 17], [/^(narrow stance leg press|calf press on the leg press machine)$/, 7], [/^thigh adductor$/, 28], [/^machine bench press$/, 9]];
  const eqOf = id => {
    if (EQ_ID[id] != null) return EQ_ID[id]; const ex = F.S.ex.get(id); if (!ex || ex.type === 'time') return -1; const n = String(ex.alias || ex.name).toLowerCase();
    if (/^smith/.test(n)) return 18;
    if (ex.equip === 'Sztanga' || ex.equip === 'Maszyna') { for (const [re, k] of EQ_NAME) if (re.test(n)) return k; return -1; }
    if (ex.equip === 'Hantle' || ex.equip === 'Kettlebell') return 11; // stojak z hantlami i kettlebell: to wciąż ten sam sprzęt
    if (ex.equip === 'Drążek') return /pull-?up|chin-?up|hanging/.test(n) ? 10 : -1;
    if (ex.equip === 'Wyciąg') return /pulldown/.test(n) ? 4 : /seated cable row/.test(n) ? 5 : 6;
    return -1;
  };
  // grafika ćwiczenia: zbliżenie z pracującymi mięśniami, w kolorze aplikacji
  const VIEWS = { chest: ['fu'], abs: ['fu'], shoulders: ['fu', 'bu', 'ar'], biceps: ['fu', 'ar'], forearms: ['ar', 'fu', 'bu'], triceps: ['bu', 'ar'], back: ['bu'], quads: ['lf'], calves: ['lb', 'lf'], hams: ['lb'], glutes: ['lb'] };
  F.exArt = ids => {
    const pri = [], sec = new Set();
    (Array.isArray(ids) ? ids : [ids]).forEach(id => { const x = F.exMuscles(id); x.p.forEach(n => { if (ORDER.includes(n) && !pri.includes(n)) pri.push(n); }); x.s.forEach(n => sec.add(n)); });
    if (!pri.length) { const legs = { quads: 'a1', calves: 'a1', glutes: 'a2', hams: 'a2' }; return `<div class="wk-art full">${F.bodyCv('f', legs, { dim: .8 })}${F.bodyCv('b', legs, { dim: .8 })}</div>`; }
    const armsOnly = pri.every(n => ['biceps', 'triceps', 'forearms'].includes(n)); const score = v => pri.filter(n => VIEWS[n].includes(v)).length;
    let view = armsOnly ? 'ar' : VIEWS[pri[0]][0]; if (!armsOnly) ['fu', 'bu', 'lf', 'lb'].forEach(v => { if (score(v) > score(view)) view = v; });
    const colors = {}; sec.forEach(n => { if (ORDER.includes(n)) colors[n] = 'a2'; }); pri.forEach(n => { colors[n] = 'a1'; });
    const cv = F.bodyCv(view, colors, { f: view, dim: .62 }), eq = !Array.isArray(ids) || ids.length === 1 ? eqOf(Array.isArray(ids) ? ids[0] : ids) : -1;
    return eq >= 0 ? `<div class="wk-art eq" data-a="artSwap" role="button" aria-label="Przełącz sprzęt i mięśnie"><img src="assets/eq/${eq}.webp" alt="" loading="lazy"><div class="ma">${cv}</div></div>` : `<div class="wk-art">${cv}</div>`;
  };
  F.act.artSwap = b => b.classList.toggle('mus');
})();
