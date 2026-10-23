/* FORGE — pomocnicy interfejsu: arkusze, toasty, efekty, dźwięk, stoper przerw */
(function () {
  const F = window.F;
  const ic = (n, s, c) => window.icon(n, s, c);
  F.$ = (s, r) => (r || document).querySelector(s);
  F.$$ = (s, r) => [...(r || document).querySelectorAll(s)];
  F.esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  F.act = {}; F.bind = {};
  F.sleep = ms => new Promise(r => setTimeout(r, ms));
  F.norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

  /* ---------- haptyka i dźwięk ---------- */
  F.haptic = p => { try { if (F.S.settings.vibrate && navigator.vibrate) navigator.vibrate(p); } catch (e) { } };
  let actx = null;
  F.beep = (pattern = [[880, .12], [880, .12], [1320, .3]]) => {
    if (!F.S.settings.sound) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume();
      let t = actx.currentTime + .02;
      pattern.forEach(([f, d]) => {
        const o = actx.createOscillator(), g = actx.createGain(); o.type = 'square'; o.frequency.value = f;
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.16, t + .01); g.gain.exponentialRampToValueAtTime(.001, t + d);
        o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + d + .02); t += d + .06;
      });
    } catch (e) { }
  };
  F.unlockAudio = () => { try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume(); } catch (e) { } };
  document.addEventListener('pointerdown', F.unlockAudio, { once: true });

  /* ---------- toast ---------- */
  F.toast = (msg, kind = '', ms = 2600) => {
    const root = F.$('#toast-root'); const t = document.createElement('div'); t.className = 'toast ' + kind; t.innerHTML = msg;
    root.appendChild(t); requestAnimationFrame(() => t.classList.add('in'));
    setTimeout(() => { t.classList.remove('in'); setTimeout(() => t.remove(), 300); }, ms);
  };

  /* ---------- arkusz dolny ---------- */
  let sheetEl = null, sheetClose = null;
  F.sheet = (html, o = {}) => {
    F.closeSheet(true);
    const root = F.$('#sheet-root');
    root.innerHTML = `<div class="sheet-bg" data-a="closeSheet"></div><div class="sheet ${o.cls || ''}" role="dialog" aria-modal="true"><div class="sheet-grab"></div>${o.title ? `<div class="sheet-h"><h2>${o.title}</h2><button class="ibtn" data-a="closeSheet" aria-label="Zamknij">${ic('x', 20)}</button></div>` : ''}<div class="sheet-b">${html}</div></div>`;
    sheetEl = root.querySelector('.sheet'); sheetClose = o.onclose || null; document.body.classList.add('sheet-open');
    requestAnimationFrame(() => { root.classList.add('open'); });
    return sheetEl;
  };
  F.closeSheet = (silent) => {
    const root = F.$('#sheet-root'); if (!sheetEl) return; root.classList.remove('open'); document.body.classList.remove('sheet-open');
    const cb = sheetClose; sheetEl = null; sheetClose = null; setTimeout(() => { if (!sheetEl) root.innerHTML = ''; }, 260); if (cb && !silent) cb();
  };
  F.act.closeSheet = () => F.closeSheet();

  F.confirm = ({ title, text, ok = 'Potwierdź', cancel = 'Anuluj', danger = false }) => new Promise(res => {
    let done = false; const fin = v => { if (done) return; done = true; res(v); };
    F.sheet(`<p class="sheet-p">${text || ''}</p><div class="btn-row"><button class="btn ghost" data-a="cfNo">${cancel}</button><button class="btn ${danger ? 'danger' : 'primary'}" data-a="cfYes">${ok}</button></div>`, { title, cls: 'compact', onclose: () => fin(false) });
    F.act.cfYes = () => { fin(true); F.closeSheet(true); }; F.act.cfNo = () => { fin(false); F.closeSheet(true); };
  });
  F.prompt = ({ title, label, value = '', ok = 'Zapisz', type = 'text', placeholder = '' }) => new Promise(res => {
    let done = false; const fin = v => { if (done) return; done = true; res(v); };
    const el = F.sheet(`<label class="fld"><span>${label || ''}</span><input id="pr-in" type="${type}" value="${F.esc(value)}" placeholder="${F.esc(placeholder)}" autocomplete="off"></label><div class="btn-row"><button class="btn ghost" data-a="prNo">Anuluj</button><button class="btn primary" data-a="prYes">${ok}</button></div>`, { title, cls: 'compact', onclose: () => fin(null) });
    const inp = el.querySelector('#pr-in'); setTimeout(() => { inp.focus(); inp.select(); }, 280);
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') F.act.prYes(); });
    F.act.prYes = () => { fin(inp.value.trim()); F.closeSheet(true); }; F.act.prNo = () => { fin(null); F.closeSheet(true); };
  });

  /* ---------- efekty cząsteczkowe (iskry) ---------- */
  let fx, fctx, parts = [], raf = 0;
  F.burst = (x, y, n = 36, power = 1) => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    fx = fx || F.$('#fx'); if (!fx) return; fctx = fctx || fx.getContext('2d');
    const dpr = Math.min(2, devicePixelRatio || 1); if (fx.width !== innerWidth * dpr) { fx.width = innerWidth * dpr; fx.height = innerHeight * dpr; }
    const cs = getComputedStyle(document.documentElement); const cols = [cs.getPropertyValue('--a1').trim() || '#ff4b1f', cs.getPropertyValue('--a2').trim() || '#ff9a1f', '#ffd34d', '#ffffff'];
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = (2 + Math.random() * 7) * power;
      parts.push({ x: x * dpr, y: y * dpr, vx: Math.cos(a) * v * dpr, vy: (Math.sin(a) * v - 3) * dpr, l: 1, d: .012 + Math.random() * .016, s: (1.5 + Math.random() * 3) * dpr, c: cols[i % cols.length], w: Math.random() < .5 });
    }
    if (!raf) raf = requestAnimationFrame(loop);
  };
  function loop() {
    fctx.clearRect(0, 0, fx.width, fx.height); const dpr = Math.min(2, devicePixelRatio || 1);
    parts = parts.filter(p => p.l > 0);
    parts.forEach(p => {
      p.vy += .22 * dpr; p.x += p.vx; p.y += p.vy; p.vx *= .985; p.l -= p.d;
      fctx.globalAlpha = Math.max(0, p.l); fctx.fillStyle = p.c; fctx.shadowColor = p.c; fctx.shadowBlur = 8 * dpr;
      if (p.w) { fctx.fillRect(p.x, p.y, p.s * 2.4, p.s * .8); } else { fctx.beginPath(); fctx.arc(p.x, p.y, p.s, 0, 7); fctx.fill(); }
    });
    if (parts.length) raf = requestAnimationFrame(loop); else { raf = 0; fctx.clearRect(0, 0, fx.width, fx.height); }
  }
  F.burstAt = (el, n, p) => { const r = el.getBoundingClientRect(); F.burst(r.left + r.width / 2, r.top + r.height / 2, n, p); };

  /* ---------- licznik animowany ---------- */
  F.countUp = (root) => {
    F.$$('[data-count]', root).forEach(el => {
      const to = parseFloat(el.dataset.count), dec = +(el.dataset.dec || 0), suf = el.dataset.suf || '';
      if (isNaN(to)) return; if (matchMedia('(prefers-reduced-motion: reduce)').matches || to === 0) { el.textContent = F.fmtNum(to, dec) + suf; return; }
      const t0 = performance.now(), dur = 900;
      const step = t => { const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3); el.textContent = F.fmtNum(to * e, dec) + suf; if (k < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    });
  };

  /* ---------- stoper przerw ---------- */
  // F.rest = { end, total, label } ; stan zapisujemy w F.S.draft.rest, gdy trwa trening
  F.rest = null; let restTick = 0;
  F.restStart = (sec, label) => {
    if (sec <= 0) return;
    F.rest = { end: Date.now() + sec * 1000, total: sec, label: label || '' };
    persistRest(); restLoop(); F.updateDock(); if (F.onRestChange) F.onRestChange();
  };
  F.restAdd = s => { if (!F.rest) return; F.rest.end += s * 1000; F.rest.total = Math.max(F.rest.total + s, 5); if (F.rest.end < Date.now()) F.restStop(); persistRest(); F.tickRest(); };
  F.restStop = (finished) => {
    F.rest = null; persistRest(); clearInterval(restTick); restTick = 0;
    if (finished) { F.beep(); F.haptic([300, 120, 300, 120, 500]); F.toast(ic('timer', 16) + ' Przerwa skończona. Do roboty.', 'hot'); }
    F.updateDock(); if (F.onRestChange) F.onRestChange(); F.releaseNoteTimer();
  };
  F.releaseNoteTimer = () => { };
  function persistRest() { if (F.S.draft) { F.S.draft.rest = F.rest; F.saveDraft(); } }
  function restLoop() { clearInterval(restTick); restTick = setInterval(F.tickRest, 250); F.tickRest(); }
  F.tickRest = () => {
    if (!F.rest) return; const left = Math.ceil((F.rest.end - Date.now()) / 1000);
    if (left <= 0) { F.restStop(true); return; }
    const pct = 1 - (F.rest.end - Date.now()) / (F.rest.total * 1000);
    F.$$('[data-rest-time]').forEach(el => el.textContent = F.fmtDur(left));
    F.$$('[data-rest-bar]').forEach(el => el.style.transform = `scaleX(${Math.max(0, 1 - pct)})`);
    F.$$('[data-rest-ring]').forEach(el => { const c = +el.getAttribute('stroke-dasharray'); el.style.strokeDashoffset = c * pct; });
    if (left <= 3 && left !== F._lastTick) { F._lastTick = left; F.beep([[660, .05]]); F.haptic(40); }
  };
  F.resumeRest = () => { if (F.S.draft && F.S.draft.rest && F.S.draft.rest.end > Date.now()) { F.rest = F.S.draft.rest; restLoop(); } else if (F.S.draft) { F.S.draft.rest = null; } };
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { F.tickRest(); if (F.S.draft && F.wakeWant) F.wakeLock(); } });

  /* ---------- Wake Lock ---------- */
  let wl = null, nsv = null; F.wakeWant = false;
  // Zapasowy sposób dla iOS (starsze wersje nie trzymają blokady ekranu w aplikacji z ekranu początkowego):
  // niewidoczny, wyciszony film bez ścieżki dźwiękowej w pętli. Nie rusza muzyki z innych aplikacji.
  const NOSLEEP = 'data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAMzbW9vdgAAAGxtdmhkAAAAAAAAAAAAAAAAAAAD6AAAB9AAAQAAAQAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAl10cmFrAAAAXHRraGQAAAADAAAAAAAAAAAAAAABAAAAAAAAB9AAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAABAAAAAABAAAAAQAAAAAAAkZWR0cwAAABxlbHN0AAAAAAAAAAEAAAfQAAAAAAABAAAAAAHVbWRpYQAAACBtZGhkAAAAAAAAAAAAAAAAAABAAAAAgABVxAAAAAAALWhkbHIAAAAAAAAAAHZpZGUAAAAAAAAAAAAAAABWaWRlb0hhbmRsZXIAAAABgG1pbmYAAAAUdm1oZAAAAAEAAAAAAAAAAAAAACRkaW5mAAAAHGRyZWYAAAAAAAAAAQAAAAx1cmwgAAAAAQAAAUBzdGJsAAAAuHN0c2QAAAAAAAAAAQAAAKhhdmMxAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAABAAEABIAAAASAAAAAAAAAABFUxhdmM2MC4zMS4xMDIgbGlieDI2NAAAAAAAAAAAAAAAGP//AAAALmF2Y0MBQsAK/+EAFmdCwArZHsBEAAADAAQAAAMAEDxImSABAAVoy4PLIAAAABBwYXNwAAAAAQAAAAEAAAAUYnRydAAAAAAAAAqAAAAKgAAAABhzdHRzAAAAAAAAAAEAAAAEAAAgAAAAABRzdHNzAAAAAAAAAAEAAAABAAAAHHN0c2MAAAAAAAAAAQAAAAEAAAAEAAAAAQAAACRzdHN6AAAAAAAAAAAAAAAEAAACgwAAAAoAAAAKAAAACQAAABRzdGNvAAAAAAAAAAEAAANjAAAAYnVkdGEAAABabWV0YQAAAAAAAAAhaGRscgAAAAAAAAAAbWRpcmFwcGwAAAAAAAAAAAAAAAAtaWxzdAAAACWpdG9vAAAAHWRhdGEAAAABAAAAAExhdmY2MC4xNi4xMDAAAAAIZnJlZQAAAqhtZGF0AAACcAYF//9s3EXpvebZSLeWLNgg2SPu73gyNjQgLSBjb3JlIDE2NCByMzEwOCAzMWUxOWY5IC0gSC4yNjQvTVBFRy00IEFWQyBjb2RlYyAtIENvcHlsZWZ0IDIwMDMtMjAyMyAtIGh0dHA6Ly93d3cudmlkZW9sYW4ub3JnL3gyNjQuaHRtbCAtIG9wdGlvbnM6IGNhYmFjPTAgcmVmPTMgZGVibG9jaz0xOjA6MCBhbmFseXNlPTB4MToweDExMSBtZT1oZXggc3VibWU9NyBwc3k9MSBwc3lfcmQ9MS4wMDowLjAwIG1peGVkX3JlZj0xIG1lX3JhbmdlPTE2IGNocm9tYV9tZT0xIHRyZWxsaXM9MSA4eDhkY3Q9MCBjcW09MCBkZWFkem9uZT0yMSwxMSBmYXN0X3Bza2lwPTEgY2hyb21hX3FwX29mZnNldD0tMiB0aHJlYWRzPTEgbG9va2FoZWFkX3RocmVhZHM9MSBzbGljZWRfdGhyZWFkcz0wIG5yPTAgZGVjaW1hdGU9MSBpbnRlcmxhY2VkPTAgYmx1cmF5X2NvbXBhdD0wIGNvbnN0cmFpbmVkX2ludHJhPTAgYmZyYW1lcz0wIHdlaWdodHA9MCBrZXlpbnQ9MjUwIGtleWludF9taW49MiBzY2VuZWN1dD00MCBpbnRyYV9yZWZyZXNoPTAgcmNfbG9va2FoZWFkPTQwIHJjPWNyZiBtYnRyZWU9MSBjcmY9MjMuMCBxY29tcD0wLjYwIHFwbWluPTAgcXBtYXg9NjkgcXBzdGVwPTQgaXBfcmF0aW89MS40MCBhcT0xOjEuMDAAgAAAAAtliIQFPJigAD+/gAAAAAZBmjgKeoAAAAAGQZpUAp6gAAAABUGaYBL1';
  const isIOSdev = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  function noSleepOn() {
    try {
      if (!nsv) { nsv = document.createElement('video'); nsv.setAttribute('playsinline', ''); nsv.setAttribute('webkit-playsinline', ''); nsv.setAttribute('muted', ''); nsv.muted = true; nsv.loop = true; nsv.setAttribute('aria-hidden', 'true'); nsv.style.cssText = 'position:fixed;left:0;top:0;width:2px;height:2px;opacity:.02;pointer-events:none;z-index:-1'; nsv.src = NOSLEEP; document.body.appendChild(nsv); }
      const p = nsv.play(); if (p && p.catch) p.catch(() => { });
    } catch (e) { }
  }
  function noSleepOff() { try { if (nsv) nsv.pause(); } catch (e) { } }
  F.wakeLock = async () => {
    F.wakeWant = true; if (!F.S.settings.wake) return;
    let ok = false;
    try { if ('wakeLock' in navigator) { if (!wl) { wl = await navigator.wakeLock.request('screen'); wl.addEventListener('release', () => { wl = null; }); } ok = true; } } catch (e) { }
    if (!ok || isIOSdev) noSleepOn(); // iOS: dla pewności oba sposoby naraz
  };
  F.wakeRelease = async () => { F.wakeWant = false; noSleepOff(); try { if (wl) await wl.release(); } catch (e) { } wl = null; };
  // film wystartuje dopiero po dotknięciu ekranu, jeśli system nie pozwolił na autostart (np. po odświeżeniu)
  document.addEventListener('pointerdown', () => { if (F.wakeWant && F.S.settings.wake && nsv && nsv.paused) noSleepOn(); }, { passive: true });

  /* ---------- dock „Trening w toku” ---------- */
  F.updateDock = () => {
    const dock = F.$('#dock'); if (!dock) return; const d = F.S.draft; const onW = (location.hash || '').startsWith('#/workout');
    if (!d || onW) { dock.innerHTML = ''; dock.classList.remove('on'); return; }
    const done = d.exercises.reduce((a, e) => a + e.sets.filter(s => s.done).length, 0);
    dock.innerHTML = `<a href="#/workout" class="dock-in"><span class="dock-pulse"></span><span class="dock-t"><b>Trening w toku</b><small>${F.esc(d.name || 'Trening')} · ${done} serii</small></span>${F.rest ? `<span class="dock-rest">${ic('timer', 16)}<b data-rest-time>0:00</b></span>` : ''}<span class="dock-time" data-wtime>${F.fmtDur((Date.now() - d.start) / 1000)}</span>${ic('chevron-right', 18)}${F.rest ? '<i class="dock-bar" data-rest-bar></i>' : ''}</a>`;
    dock.classList.add('on'); F.tickRest();
  };
  setInterval(() => { const d = F.S.draft; if (!d) return; const s = F.fmtDur((Date.now() - d.start) / 1000); F.$$('[data-wtime]').forEach(el => el.textContent = s); }, 1000);
})();
