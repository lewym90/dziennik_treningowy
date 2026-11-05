/* FORGE — ciało: realistyczna sylwetka z podświetlanymi partiami. Odcień szarości (assets/body/*.webp) daje rzeźbę mięśni,
   mapa *-id.png mówi, która partia jest w którym pikselu, a kolor nakładamy tutaj, więc działa z każdym kolorem aplikacji. */
(function () {
  const F = window.F; const E = F.esc; const ORDER = F.BODY_ORDER; const cache = {};
  const sexKey = () => F.S.settings.sex === 'f' ? 'f' : 'm';
  const px = img => { const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight; const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0); return g.getImageData(0, 0, c.width, c.height).data; };
  const loadImg = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
  const load = sex => cache[sex] || (cache[sex] = Promise.all([loadImg(`assets/body/${sex}.webp`), loadImg(`assets/body/${sex}-id.png`)]).then(([a, b]) => ({ w: a.naturalWidth, gray: px(a), id: px(b) })).catch(e => { cache[sex] = null; throw e; }));
  const hex = h => { h = String(h).trim().replace('#', ''); if (h.length === 3) h = [...h].map(x => x + x).join(''); return [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16)); };
  const token = t => { const v = t === 'a1' || t === 'a2' ? getComputedStyle(document.documentElement).getPropertyValue('--' + t) : t; return hex(v); };

  async function paint(cv) {
    const sex = cv.dataset.sex || sexKey(), view = cv.dataset.v, m = F.BODY[sex]; const r = cv.dataset.crop ? cv.dataset.crop.split(',').map(Number) : m.r[view];
    const colors = JSON.parse(cv.dataset.c || '{}'), dim = +(cv.dataset.dim || 1); const tint = [null]; ORDER.forEach(n => tint.push(colors[n] ? token(colors[n]) : null));
    let d; try { d = await load(sex); } catch (e) { return; }
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

  F.bodyCv = (view, colors, o = {}) => `<canvas class="bodyc ${o.cls || ''}" data-v="${view}" data-c="${E(JSON.stringify(colors || {}))}"${o.crop ? ` data-crop="${o.crop.join(',')}"` : ''}${o.dim ? ` data-dim="${o.dim}"` : ''}${o.tap ? ' data-tap="1"' : ''} aria-hidden="true"></canvas>`;

  // grafika ćwiczenia: wybiera stronę ciała i kadr na pracujących mięśniach
  F.exArt = (ids, aspect = 2) => {
    const sex = sexKey(), m = F.BODY[sex]; const pri = new Set(), sec = new Set();
    (Array.isArray(ids) ? ids : [ids]).forEach(id => { const x = F.exMuscles(id); x.p.forEach(n => pri.add(n)); x.s.forEach(n => sec.add(n)); });
    const P = [...pri].filter(n => ORDER.includes(n)); const count = v => P.filter(n => m.bb[v + '-' + n]).length;
    if (!P.length) { // całe ciało i cardio: pełna sylwetka
      const legs = { quads: 'a1', calves: 'a1', glutes: 'a2', hams: 'a2' }; return `<div class="wk-art full">${F.bodyCv('f', legs, { dim: .8 })}${F.bodyCv('b', legs, { dim: .8 })}</div>`;
    }
    const v = count('b') > count('f') ? 'b' : 'f'; const colors = {}; sec.forEach(n => { if (ORDER.includes(n)) colors[n] = 'a2'; }); P.forEach(n => { colors[n] = 'a1'; });
    const R = m.r[v], boxes = P.map(n => m.bb[v + '-' + n]).filter(Boolean); let x0 = Math.min(...boxes.map(b => b[0])), y0 = Math.min(...boxes.map(b => b[1])), x1 = Math.max(...boxes.map(b => b[0] + b[2])), y1 = Math.max(...boxes.map(b => b[1] + b[3]));
    let w = Math.max(x1 - x0 + 70, 340), h = Math.max(y1 - y0 + 70, 200); if (w / h < aspect) w = h * aspect; else h = w / aspect;
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2; const ww = Math.min(w, m.w), hh = Math.min(h, m.h);
    const cxl = Math.max(0, Math.min(m.w - ww, cx - ww / 2)), cyl = Math.max(0, Math.min(m.h - hh, cy - hh / 2));
    return `<div class="wk-art">${F.bodyCv(v, colors, { crop: [Math.round(cxl), Math.round(cyl), Math.round(ww), Math.round(hh)], dim: .62 })}</div>`;
  };
})();
