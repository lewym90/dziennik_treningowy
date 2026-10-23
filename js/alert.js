/* FORGE — przerwa działa też przy zablokowanym telefonie / zminimalizowanej aplikacji.
   1) cichy, zapętlony dźwięk utrzymuje stronę przy życiu i pokazuje na ekranie blokady odliczanie (Media Session),
   2) po końcu przerwy: głośny sygnał + wibracja + powiadomienie systemowe. */
(function () {
  const F = window.F; const S = () => F.S.settings;
  let audio = null, urls = {}, endTimer = 0, active = false;

  function wav(samples, rate = 22050) {
    const n = samples.length, b = new DataView(new ArrayBuffer(44 + n * 2)); const w = (o, s) => [...s].forEach((c, i) => b.setUint8(o + i, c.charCodeAt(0)));
    w(0, 'RIFF'); b.setUint32(4, 36 + n * 2, true); w(8, 'WAVEfmt '); b.setUint32(16, 16, true); b.setUint16(20, 1, true); b.setUint16(22, 1, true);
    b.setUint32(24, rate, true); b.setUint32(28, rate * 2, true); b.setUint16(32, 2, true); b.setUint16(34, 16, true); w(36, 'data'); b.setUint32(40, n * 2, true);
    for (let i = 0; i < n; i++) b.setInt16(44 + i * 2, samples[i], true);
    return URL.createObjectURL(new Blob([b], { type: 'audio/wav' }));
  }
  function silence() { const a = new Int16Array(22050); for (let i = 0; i < a.length; i++) a[i] = (i & 1) ? 1 : -1; return wav(a); } // 1 s, prawie cisza
  function alarm() { // 3 głośne sygnały
    const rate = 22050, out = []; const tone = (f, d) => { const n = Math.floor(rate * d); for (let i = 0; i < n; i++) { const env = Math.min(1, i / 200, (n - i) / 400); out.push(Math.sign(Math.sin(2 * Math.PI * f * i / rate)) * 14000 * env); } for (let i = 0; i < rate * .08; i++) out.push(0); };
    tone(880, .22); tone(880, .22); tone(1320, .5); return wav(Int16Array.from(out));
  }
  const on = () => S().lockRest === true; // odliczanie na ekranie blokady (cichy dźwięk — wstrzymuje muzykę z innych aplikacji)
  const wantNotif = () => S().notifRest !== false;
  const ms = () => ('mediaSession' in navigator) ? navigator.mediaSession : null;

  function ensureAudio() {
    if (!audio) { audio = new Audio(); audio.setAttribute('playsinline', ''); audio.preload = 'auto'; urls.sil = urls.sil || silence(); urls.alarm = urls.alarm || alarm(); }
    return audio;
  }
  function setSession() {
    const m = ms(), r = F.rest; if (!m || !r) return;
    try {
      m.metadata = new MediaMetadata({ title: 'Przerwa', artist: r.label ? 'FORGE · ' + r.label : 'FORGE', album: 'Trening', artwork: [{ src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' }, { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' }] });
      m.playbackState = 'playing';
      const pos = Math.max(0, Math.min(r.total, r.total - (r.end - Date.now()) / 1000));
      m.setPositionState({ duration: r.total, playbackRate: 1, position: pos });
    } catch (e) { }
  }
  function handlers() {
    const m = ms(); if (!m) return; const set = (a, f) => { try { m.setActionHandler(a, f); } catch (e) { } };
    set('seekforward', () => F.restAdd(15)); set('seekbackward', () => F.restAdd(-15));
    set('nexttrack', () => F.restSkipNow && F.restSkipNow()); set('previoustrack', () => F.restAdd(-15));
    set('pause', () => { audio && audio.play().catch(() => { }); }); set('play', () => { audio && audio.play().catch(() => { }); }); // nie da się „zapauzować” przerwy
    set('stop', null);
  }
  function startKeepAlive() {
    if (!on()) return; const a = ensureAudio();
    try { if (a.src !== urls.sil) { a.src = urls.sil; } a.loop = true; a.volume = 1; const p = a.play(); if (p && p.catch) p.catch(() => { }); active = true; handlers(); setSession(); } catch (e) { }
  }
  function stopKeepAlive(delay = 0) {
    active = false; const m = ms();
    setTimeout(() => { if (active || !audio) return; try { audio.pause(); audio.removeAttribute('src'); audio.load(); } catch (e) { } if (m) { try { m.playbackState = 'none'; m.metadata = null; } catch (e) { } } }, delay);
  }
  async function ensurePermission() {
    try { if ('Notification' in window && Notification.permission === 'default' && !F._askedNotif) { F._askedNotif = true; await Notification.requestPermission(); } } catch (e) { }
  }
  async function notify() {
    try {
      if (!('Notification' in window) || Notification.permission !== 'granted') return;
      const reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration();
      const o = { body: 'Do roboty — czas na kolejną serię.', tag: 'forge-rest', renotify: true, icon: 'icons/icon-192.png', badge: 'icons/favicon-32.png', vibrate: [300, 120, 300, 120, 500], requireInteraction: false, data: { url: './#/workout' } };
      if (reg) await reg.showNotification('Przerwa skończona', o); else new Notification('Przerwa skończona', o);
    } catch (e) { }
  }
  function closeNotif() { try { navigator.serviceWorker.getRegistration().then(r => r && r.getNotifications({ tag: 'forge-rest' }).then(l => l.forEach(n => n.close()))); } catch (e) { } }

  // ---- własny serwer Web Push (VPS): zaplanowane powiadomienie przez Apple/Google, bez grania w tle ----
  const PKEY = 'forge.push', DEF_URL = 'https://188-68-247-55.sslip.io/forge-push';
  const pcfg = () => { try { return JSON.parse(localStorage.getItem(PKEY)) || null; } catch (e) { return null; } };
  const pset = v => { try { v ? localStorage.setItem(PKEY, JSON.stringify(v)) : localStorage.removeItem(PKEY); } catch (e) { } };
  const pSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  const standalone = () => (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  const b64 = x => { const p = '='.repeat((4 - x.length % 4) % 4); const r = atob((x + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(r, c => c.charCodeAt(0)); };
  const newId = () => { const a = new Uint8Array(18); crypto.getRandomValues(a); return btoa(String.fromCharCode(...a)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, ''); };
  async function papi(cfg, path, body, method = 'POST', simple = false) {
    // „prosty” request (text/plain, token w treści): bez zapytania wstępnego, więc idzie szybko i dociera nawet przy zamykaniu aplikacji
    const init = simple ? { method, headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ ...(body || {}), token: cfg.token }), keepalive: true }
      : { method, headers: { 'Content-Type': 'application/json', ...(cfg.token ? { Authorization: 'Bearer ' + cfg.token } : {}) }, body: method === 'POST' ? JSON.stringify(body || {}) : undefined };
    const r = await fetch(cfg.url + path, init).catch(() => { throw new Error('Nie mogę połączyć się z serwerem. Sprawdź adres i internet.'); });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(j.error || 'Błąd ' + r.status), { status: r.status });
    return j;
  }
  async function pushConnect(url, code) {
    if (!pSupported()) throw new Error('Ta przeglądarka nie obsługuje powiadomień push. Na iPhonie dodaj FORGE do ekranu początkowego.');
    url = String(url || '').trim().replace(/\/+$/, '');
    if (!/^https:\/\//.test(url)) throw new Error('Adres musi zaczynać się od https://');
    if (Notification.permission !== 'granted') { const p = await Notification.requestPermission(); if (p !== 'granted') throw new Error('Najpierw zezwól na powiadomienia.'); }
    const { publicKey } = await papi({ url }, '/vapid', null, 'GET');
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription(); if (sub) { try { await sub.unsubscribe(); } catch (e) { } }
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(publicKey) });
    const prev = pcfg();
    const attempt = async reuse => {
      const c = { url, deviceId: reuse && prev && prev.deviceId ? prev.deviceId : newId(), token: reuse && prev ? prev.token || '' : '', code: String(code || '').trim(), at: Date.now() };
      const res = await papi(c, '/subscribe', { deviceId: c.deviceId, setup: c.code, subscription: sub.toJSON() });
      if (res.token) c.token = res.token; return c;
    };
    let c; try { c = await attempt(true); } catch (e) { if (e.status === 401) c = await attempt(false); else throw e; }
    pset(c); return c;
  }
  let pSkipSent = false;
  async function pushSchedule() {
    const c = pcfg(); if (!c || !F.rest) return; pSkipSent = false;
    const sec = (F.rest.end - Date.now()) / 1000 - .4;
    try {
      if (sec < 3) await papi(c, '/cancel', { deviceId: c.deviceId }, 'POST', true);
      else await papi(c, '/timer', { deviceId: c.deviceId, sec: Math.round(sec), title: 'Przerwa skończona', body: (F.rest.label ? F.rest.label + ' · c' : 'C') + 'zas na kolejną serię.' }, 'POST', true);
    } catch (e) { if (e.status === 401) { const ok = await rejoin(c); if (ok) pushSchedule(); } }
  }
  async function pushCancel() { const c = pcfg(); if (!c) return; try { await papi(c, '/cancel', { deviceId: c.deviceId }, 'POST', true); } catch (e) { } }
  async function rejoin(c) { // serwer nie zna już telefonu: zarejestruj ponownie zapamiętanym kodem
    try { const reg = await navigator.serviceWorker.ready; const sub = await reg.pushManager.getSubscription(); if (!sub || !c.code) return false; const res = await papi({ url: c.url }, '/subscribe', { deviceId: c.deviceId, setup: c.code, subscription: sub.toJSON() }); if (!res.token) return false; c.token = res.token; pset(c); return true; } catch (e) { return false; }
  }
  F.act.pushConnect = async b => {
    const url = (F.$('#pu-url') || {}).value, code = (F.$('#pu-code') || {}).value; if (b) b.disabled = true;
    try { await pushConnect(url, code); F.toast('Połączono z serwerem. Dotknij „Wyślij test”.', 'hot'); } catch (e) { F.toast(e.message || 'Nie udało się połączyć'); }
    if (b) b.disabled = false; F.render(true);
  };
  F.act.pushTest = async () => { const c = pcfg(); if (!c) return; try { await papi(c, '/test', { deviceId: c.deviceId }); F.toast('Wysłano. Za chwilę powinno przyjść powiadomienie.'); } catch (e) { F.toast(e.message || 'Nie udało się wysłać'); } };
  F.act.pushOff = async () => { const c = pcfg(); pset(null); try { if (c) await papi(c, '/unsubscribe', { deviceId: c.deviceId }); } catch (e) { } try { const reg = await navigator.serviceWorker.ready; const sub = await reg.pushManager.getSubscription(); if (sub) await sub.unsubscribe(); } catch (e) { } F.toast('Rozłączono'); F.render(true); };
  F.pushHtml = () => {
    const c = pcfg(), ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const warn = ios && !standalone() ? `<p class="dim small" style="color:var(--a1)">Na iPhonie powiadomienia działają tylko z aplikacji dodanej do ekranu początkowego (Safari → Udostępnij → Do ekranu początkowego), otwartej stamtąd.</p>` : '';
    return `<section class="card cut"><div class="stp"><span><b>Powiadomienia z serwera</b><small>Zalecane. Koniec przerwy dociera przez Apple/Google, także przy zablokowanym telefonie. Nie rusza muzyki.</small></span><span class="chip ${c ? 'on' : ''}">${c ? 'Połączono' : 'Wyłączone'}</span></div>${warn}
      ${c ? `<div class="btn-row"><button class="btn ghost" data-a="pushTest">Wyślij test</button><button class="btn ghost" data-a="pushOff">Rozłącz</button></div>`
      : `<label class="fld"><span>Adres serwera</span><input id="pu-url" value="${F.esc(DEF_URL)}" inputmode="url" autocapitalize="off" autocorrect="off"></label><label class="fld"><span>Kod połączenia (z instalatora)</span><input id="pu-code" autocapitalize="off" autocorrect="off" placeholder="np. aB3dE9xYz1"></label><div class="btn-row"><button class="btn" data-a="pushConnect">Połącz i zezwól na powiadomienia</button></div>`}</section>`;
  };

  // ---- ntfy: zdalne, zaplanowane powiadomienie bez własnego serwera ----
  const NTFY = 'https://ntfy.sh';
  const ntfyOn = () => !!(S().ntfyOn && S().ntfyTopic) && !pcfg();
  F.ntfyNewTopic = () => { const a = new Uint8Array(12); crypto.getRandomValues(a); return 'forge-' + [...a].map(x => (x % 36).toString(36)).join(''); };
  async function ntfySchedule() {
    if (!ntfyOn() || !F.rest) return; const sec = Math.round((F.rest.end - Date.now()) / 1000);
    try {
      if (sec < 10) { await ntfyCancel(); return; } // minimum serwera to 10 s
      await fetch(NTFY + '/', { method: 'POST', body: JSON.stringify({ topic: S().ntfyTopic, sequence_id: 'rest', title: 'Przerwa skończona', message: 'Do roboty — czas na kolejną serię.', priority: 4, tags: ['stopwatch'], delay: sec + 's' }) });
    } catch (e) { }
  }
  async function ntfyCancel() { if (!ntfyOn()) return; try { await fetch(NTFY + '/' + S().ntfyTopic + '/rest', { method: 'DELETE' }); } catch (e) { } }
  F.act.ntfyTest = async () => {
    if (!S().ntfyTopic) return F.toast('Najpierw włącz powiadomienia ntfy');
    try { const r = await fetch(NTFY + '/', { method: 'POST', body: JSON.stringify({ topic: S().ntfyTopic, title: 'FORGE', message: 'Działa. Tak będzie wyglądać koniec przerwy.', priority: 4, tags: ['white_check_mark'] }) }); F.toast(r.ok ? 'Wysłano. Sprawdź telefon.' : 'Nie udało się wysłać (' + r.status + ')'); } catch (e) { F.toast('Brak internetu — nie udało się wysłać'); }
  };
  F.act.ntfyToggle = () => { const st = S(); st.ntfyOn = !st.ntfyOn; if (st.ntfyOn && !st.ntfyTopic) st.ntfyTopic = F.ntfyNewTopic(); F.saveSettings(); F.render(true); };
  F.act.ntfyNew = () => { S().ntfyTopic = F.ntfyNewTopic(); F.saveSettings(); F.render(true); };
  F.act.ntfyCopy = () => { try { navigator.clipboard.writeText(S().ntfyTopic); F.toast('Skopiowano nazwę tematu'); } catch (e) { F.toast(S().ntfyTopic); } };
  // ---- iOS: systemowy minutnik przez Skróty (odliczanie na ekranie blokady i w Dynamic Island) ----
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  F.act.iosTimerToggle = () => { S().iosTimer = !S().iosTimer; F.saveSettings(); F.render(true); };
  F.act.iosTimerTest = () => { runShortcut(30); };
  function runShortcut(sec) { try { location.href = 'shortcuts://run-shortcut?name=' + encodeURIComponent('FORGE Przerwa') + '&input=text&text=' + Math.round(sec); } catch (e) { } }
  F.ntfyHtml = () => {
    const s = S(), on = !!s.ntfyOn, ios = isIOS;
    return `<section class="card cut"><label class="sw"><span><b>Powiadomienia przez ntfy</b><small>Najpewniejsze przy zablokowanym telefonie. Nie przerywa muzyki.</small></span><button class="${on ? 'chip on' : 'chip'}" data-a="ntfyToggle" style="min-width:64px">${on ? 'Włączone' : 'Włącz'}</button></label>
      ${on ? `<ol class="dim small" style="padding-left:18px;margin:10px 0;line-height:1.5"><li>Zainstaluj bezpłatną aplikację <b>ntfy</b> z ${ios ? 'App Store' : 'App Store lub Google Play'} i zezwól jej na powiadomienia.</li><li>W ntfy dotknij „+” i wpisz temat: <b style="user-select:all;word-break:break-all">${F.esc(s.ntfyTopic)}</b></li><li>Dotknij „Wyślij test” — powinno przyjść powiadomienie.</li></ol>
      <div class="btn-row"><button class="btn ghost" data-a="ntfyCopy">Kopiuj temat</button><button class="btn ghost" data-a="ntfyTest">Wyślij test</button></div>
      <div class="btn-row"><a class="btn ghost" href="ntfy://ntfy.sh/${F.esc(s.ntfyTopic)}">Otwórz w ntfy</a><button class="btn ghost" data-a="ntfyNew">Nowy temat</button></div>
      <p class="dim small">Na iPhonie przychodzi przez systemowe powiadomienia Apple, więc działa przy zablokowanym ekranie i nie rusza muzyki.</p><p class="dim small">Usługa ntfy.sh dostaje tylko losową nazwę tematu i tekst „Przerwa skończona” — nic o Twoich treningach. Temat jest jak hasło, więc nikomu go nie podawaj.</p>` : ''}</section>
      ${ios ? `<section class="card cut"><label class="sw"><span><b>Minutnik na ekranie blokady (Skróty)</b><small>Eksperymentalne. Systemowy minutnik z odliczaniem na ekranie blokady. Przy każdej przerwie na chwilę otworzy się aplikacja Skróty.</small></span><button class="${s.iosTimer ? 'chip on' : 'chip'}" data-a="iosTimerToggle" style="min-width:64px">${s.iosTimer ? 'Włączone' : 'Włącz'}</button></label>
      ${s.iosTimer ? `<ol class="dim small" style="padding-left:18px;margin:10px 0;line-height:1.5"><li>Otwórz aplikację <b>Skróty</b>, dotknij „+” i nazwij skrót dokładnie: <b>FORGE Przerwa</b></li><li>Dodaj akcję <b>Rozpocznij minutnik</b>, ustaw jednostkę na <b>sekundy</b>, a jako wartość wybierz <b>Dane wejściowe skrótu</b>.</li><li>Wróć tu i dotknij „Test (30 s)”.</li></ol><div class="btn-row"><button class="btn ghost" data-a="iosTimerTest">Test (30 s)</button></div>` : ''}</section>` : ''}`;
  };

  // ---- podpięcie pod stoper ----
  const _start = F.restStart, _stop = F.restStop, _add = F.restAdd;
  F.restStart = (sec, label) => { _start(sec, label); if (F.rest) { closeNotif(); startKeepAlive(); if (wantNotif()) ensurePermission(); armEnd(); ntfySchedule(); pushSchedule(); if (S().iosTimer && isIOS && F.rest.total >= 10) runShortcut(F.rest.total); } };
  F.restAdd = s => { _add(s); if (F.rest) { setSession(); armEnd(); ntfySchedule(); pushSchedule(); } };
  F.restSkipNow = () => { if (F.rest) F.restStop(false); };
  F.restStop = finished => {
    const was = !!F.rest; clearTimeout(endTimer); _stop(finished); if (was && !finished) { ntfyCancel(); pushCancel(); }
    if (!was) return;
    if (finished && wantNotif() && !ntfyOn() && !pcfg() && (document.hidden || !document.hasFocus())) notify();
    if (finished && on() && active) { // głośny sygnał w tle (tylko w trybie z odliczaniem na ekranie blokady)
      try { const a = ensureAudio(); a.loop = false; a.src = urls.alarm; a.play().catch(() => { }); } catch (e) { }
      stopKeepAlive(2200);
    } else stopKeepAlive(0);
  };
  // zegar z dokładnością do ułamka sekundy, nawet gdy przeglądarka spowolni interwał
  function armEnd() { clearTimeout(endTimer); if (!F.rest) return; endTimer = setTimeout(() => { if (F.rest) F.tickRest(); }, Math.max(0, F.rest.end - Date.now()) + 30); }
  // aplikacja na wierzchu tuż przed końcem: sygnał gra sama, więc anulujemy powiadomienie z serwera (bez dubla)
  const _tick = F.tickRest;
  F.tickRest = () => { if (F.rest && !pSkipSent && pcfg() && !document.hidden && document.hasFocus() && F.rest.end - Date.now() < 2200) { pSkipSent = true; pushCancel(); } _tick(); };
  document.addEventListener('visibilitychange', () => { if (F.rest && !document.hidden) setSession(); });
  // zgoda na powiadomienia przy włączeniu opcji w ustawieniach
  document.addEventListener('change', e => { const t = e.target; if (t && t.dataset && t.dataset.k === 'notifRest' && t.checked) { F._askedNotif = false; ensurePermission(); } });
})();
