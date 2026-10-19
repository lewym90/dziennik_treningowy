/* FORGE — wykresy SVG (bez bibliotek): linia z obszarem, słupki, pierścień, mapa ciepła */
(function () {
  const F = window.F; let gid = 0;
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

  function niceRange(min, max, ticks = 4) {
    if (min === max) { min = min * 0.9; max = max * 1.1 + 1; }
    const span = max - min, step0 = span / ticks, mag = Math.pow(10, Math.floor(Math.log10(step0)));
    const norm = step0 / mag; const step = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag;
    const lo = Math.floor(min / step) * step, hi = Math.ceil(max / step) * step;
    const t = []; for (let v = lo; v <= hi + step / 2; v += step) t.push(+v.toFixed(6));
    return { lo, hi, t };
  }

  F.chart = {
    // pts: [{x: ts, y: number, tip: string}]
    line(pts, o = {}) {
      const W = o.w || 340, H = o.h || 190, pl = 38, pr = 12, pt = 14, pb = 26;
      if (!pts.length) return `<div class="chart-empty">${window.icon('chart-line', 28)}<p>Brak danych do wykresu.</p></div>`;
      const id = 'g' + (++gid);
      const ys = pts.map(p => p.y); let { lo, hi, t } = niceRange(Math.min(...ys), Math.max(...ys));
      if (o.zero) { lo = 0; }
      const xs = pts.map(p => p.x); const x0 = Math.min(...xs), x1 = Math.max(...xs);
      const X = v => pl + (x1 === x0 ? (W - pl - pr) / 2 : (v - x0) / (x1 - x0) * (W - pl - pr));
      const Y = v => pt + (1 - (v - lo) / (hi - lo || 1)) * (H - pt - pb);
      let d = '', area = '';
      const P = pts.map(p => [X(p.x), Y(p.y)]);
      if (P.length === 1) { d = `M${P[0][0] - 20},${P[0][1]}L${P[0][0] + 20},${P[0][1]}`; }
      else {
        d = 'M' + P[0][0].toFixed(1) + ',' + P[0][1].toFixed(1);
        for (let i = 1; i < P.length; i++) { const [ax, ay] = P[i - 1], [bx, by] = P[i], cx = (ax + bx) / 2; d += `C${cx.toFixed(1)},${ay.toFixed(1)} ${cx.toFixed(1)},${by.toFixed(1)} ${bx.toFixed(1)},${by.toFixed(1)}`; }
        area = d + `L${P[P.length - 1][0].toFixed(1)},${H - pb}L${P[0][0].toFixed(1)},${H - pb}Z`;
      }
      let grid = ''; t.forEach(v => { const y = Y(v); grid += `<line x1="${pl}" x2="${W - pr}" y1="${y}" y2="${y}" class="gl"/><text x="${pl - 6}" y="${y + 3.5}" class="ax" text-anchor="end">${F.fmtNum(v, v % 1 ? 1 : 0)}</text>`; });
      // etykiety osi X (do 5)
      let xl = ''; const n = Math.min(5, pts.length);
      for (let i = 0; i < n; i++) { const p = { x: n === 1 || x1 === x0 ? x0 : x0 + (x1 - x0) * i / (n - 1) }; if (x1 === x0 && i > 0) break; xl += `<text x="${X(p.x)}" y="${H - 7}" class="ax" text-anchor="${i === 0 && n > 1 ? 'start' : i === n - 1 && n > 1 ? 'end' : 'middle'}">${F.fmtDateShort(p.x)}</text>`; }
      let dots = ''; pts.forEach((p, i) => {
        const [cx, cy] = P[i]; const pr_ = p.pr ? 'pr' : '';
        dots += `<g class="pt ${pr_}" data-tip="${esc(p.tip || F.fmtNum(p.y))}" data-x="${cx.toFixed(1)}" data-y="${cy.toFixed(1)}"><circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="14" fill="transparent"/><circle class="dot" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${pts.length > 40 ? 2 : 3.6}"/></g>`;
      });
      return `<div class="chart" style="--cw:${W}"><svg viewBox="0 0 ${W} ${H}" class="svg-line" role="img">
        <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--a1)" stop-opacity=".45"/><stop offset="1" stop-color="var(--a1)" stop-opacity="0"/></linearGradient>
        <linearGradient id="${id}s" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="var(--a2)"/><stop offset="1" stop-color="var(--a1)"/></linearGradient></defs>
        ${grid}${area ? `<path d="${area}" fill="url(#${id})" class="area"/>` : ''}
        <path d="${d}" pathLength="1" class="ln" stroke="url(#${id}s)"/>${dots}${xl}</svg><div class="tip" hidden></div></div>`;
    },

    // items: [{label, value, tip, hl}]
    bars(items, o = {}) {
      const W = o.w || 340, H = o.h || 150, pl = 6, pr = 6, pb = 22, pt = 18;
      const max = Math.max(...items.map(i => i.value), 1); const n = items.length; const bw = (W - pl - pr) / n;
      let s = '';
      items.forEach((it, i) => {
        const h = it.value / max * (H - pb - pt), x = pl + i * bw + bw * 0.16, w = bw * 0.68, y = H - pb - h;
        s += `<g class="pt" data-tip="${esc(it.tip || F.fmtNum(it.value, 0))}"><rect x="${pl + i * bw}" y="0" width="${bw}" height="${H}" fill="transparent"/>
          <rect class="bar ${it.hl ? 'hl' : ''}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${Math.max(h, it.value ? 2 : 0).toFixed(1)}" rx="2" style="animation-delay:${i * 28}ms"/></g>`;
        if (o.labelEvery ? i % o.labelEvery === 0 || i === n - 1 : true) s += `<text x="${(pl + i * bw + bw / 2).toFixed(1)}" y="${H - 6}" class="ax" text-anchor="middle">${esc(it.label)}</text>`;
        if (o.values && it.value) s += `<text x="${(pl + i * bw + bw / 2).toFixed(1)}" y="${(y - 5).toFixed(1)}" class="ax v" text-anchor="middle">${esc(o.values(it))}</text>`;
      });
      return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" class="svg-bars" role="img"><line x1="${pl}" x2="${W - pr}" y1="${H - pb}" y2="${H - pb}" class="gl"/>${s}</svg><div class="tip" hidden></div></div>`;
    },

    // poziome słupki: [{label, value, color}]
    hbars(items) {
      const max = Math.max(...items.map(i => i.value), 1);
      return `<div class="hbars">${items.map((it, i) => `<div class="hb"><span class="hb-l">${esc(it.label)}</span><span class="hb-t"><i style="width:${(it.value / max * 100).toFixed(1)}%;background:${it.color || 'var(--a1)'};animation-delay:${i * 50}ms"></i></span><b>${esc(it.text != null ? it.text : it.value)}</b></div>`).join('')}</div>`;
    },

    ring(pct, size = 96, stroke = 10, inner = '') {
      const r = (size - stroke) / 2, c = 2 * Math.PI * r, id = 'r' + (++gid);
      return `<div class="ring" style="width:${size}px;height:${size}px"><svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--a2)"/><stop offset="1" stop-color="var(--a1)"/></linearGradient></defs>
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" class="rg-bg" stroke-width="${stroke}" fill="none"/>
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" class="rg-fg" stroke="url(#${id})" stroke-width="${stroke}" fill="none" stroke-linecap="round" stroke-dasharray="${c}" style="--c:${c};--o:${c * (1 - Math.min(1, Math.max(0, pct)))}" transform="rotate(-90 ${size / 2} ${size / 2})"/></svg><div class="ring-in">${inner}</div></div>`;
    },

    // mapa ciepła: ostatnie N tygodni, kolumny = tygodnie, wiersze = dni (pn..nd)
    heat(weeks = 18) {
      const byDay = {}; F.S.sessions.forEach(s => { const k = F.dayKey(s.start); byDay[k] = (byDay[k] || 0) + 1; });
      const start = F.startOfWeek(Date.now()) - (weeks - 1) * 7 * 864e5; const cell = 15, gap = 3, W = weeks * (cell + gap) + 18, H = 7 * (cell + gap) + 16;
      let s = ''; const today = F.startOfDay(Date.now());
      ['P', 'W', 'Ś', 'C', 'P', 'S', 'N'].forEach((l, i) => { if (i % 2 === 0) s += `<text x="0" y="${16 + i * (cell + gap) + 11}" class="ax">${l}</text>`; });
      let lastM = -1;
      for (let w = 0; w < weeks; w++) {
        const wd = new Date(start + w * 7 * 864e5); if (wd.getMonth() !== lastM) { lastM = wd.getMonth(); s += `<text x="${18 + w * (cell + gap)}" y="9" class="ax">${F.MON[lastM]}</text>`; }
        for (let d = 0; d < 7; d++) {
          const ts = start + (w * 7 + d) * 864e5; if (ts > today) continue; const c = byDay[F.dayKey(ts)] || 0;
          s += `<rect x="${18 + w * (cell + gap)}" y="${16 + d * (cell + gap)}" width="${cell}" height="${cell}" rx="3" class="hc h${Math.min(c, 3)}" style="animation-delay:${(w * 7 + d) * 4}ms"><title>${F.fmtDate(ts)}${c ? ' — ' + c + ' trening' : ''}</title></rect>`;
        }
      }
      return `<div class="heat"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Aktywność treningowa">${s}</svg></div>`;
    },

    // delegowana obsługa podpowiedzi
    bindTips(root) {
      root.addEventListener('pointerdown', ev => {
        const g = ev.target.closest('.pt'); const ch = ev.target.closest('.chart'); if (!ch) return;
        const tip = ch.querySelector('.tip'); if (!g) { tip.hidden = true; return; }
        ch.querySelectorAll('.pt.on').forEach(e => e.classList.remove('on')); g.classList.add('on');
        tip.textContent = g.dataset.tip; tip.hidden = false;
        const r = ch.getBoundingClientRect(), gr = g.getBoundingClientRect();
        let x = gr.left + gr.width / 2 - r.left; x = Math.max(40, Math.min(r.width - 40, x));
        tip.style.left = x + 'px'; tip.style.top = Math.max(0, gr.top - r.top - 8) + 'px';
      });
    }
  };
})();
