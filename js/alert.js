/* FORGE — koniec przerwy przy zablokowanym telefonie.
   Telefon usypia aplikację, więc koniec przerwy zapowiada serwer Web Push (server/): po zaliczeniu serii aplikacja mówi mu
   „za N sekund”, a on wysyła powiadomienie przez Apple/Google. Nic nie gra w tle, więc muzyka nie jest przerywana.
   Bez połączenia z serwerem zostaje zwykłe powiadomienie z aplikacji (działa, gdy system jej nie uśpi). */
(function () {
  const F = window.F; const S = () => F.S.settings; let endTimer = 0;
  const wantNotif = () => S().notifRest !== false;

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
  const PKEY = 'forge.push', DEF_URL = 'https://188-68-247-201.sslip.io/forge-push', OLD_URL = 'https://188-68-247-55.sslip.io/forge-push';
  const pcfg = () => { try { const c = JSON.parse(localStorage.getItem(PKEY)) || null; if (c && c.url === OLD_URL) { c.url = DEF_URL; localStorage.setItem(PKEY, JSON.stringify(c)); } return c; } catch (e) { return null; } };
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


  // ---- iOS: systemowy minutnik przez Skróty (odliczanie na ekranie blokady i w Dynamic Island) ----
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  F.act.iosTimerToggle = () => { S().iosTimer = !S().iosTimer; F.saveSettings(); F.render(true); };
  F.act.iosTimerTest = () => { runShortcut(30); };
  function runShortcut(sec) { try { location.href = 'shortcuts://run-shortcut?name=' + encodeURIComponent('FORGE Przerwa') + '&input=text&text=' + Math.round(sec); } catch (e) { } }
  F.iosHtml = () => {
    const s = S(); if (!isIOS) return '';
    return `<section class="card cut"><label class="sw"><span><b>Minutnik na ekranie blokady (Skróty)</b><small>Eksperymentalne. Systemowy minutnik z odliczaniem na ekranie blokady. Przy każdej przerwie na chwilę otworzy się aplikacja Skróty.</small></span><button class="${s.iosTimer ? 'chip on' : 'chip'}" data-a="iosTimerToggle" style="min-width:64px">${s.iosTimer ? 'Włączone' : 'Włącz'}</button></label>
      ${s.iosTimer ? `<ol class="dim small" style="padding-left:18px;margin:10px 0;line-height:1.5"><li>Otwórz aplikację <b>Skróty</b>, dotknij „+” i nazwij skrót dokładnie: <b>FORGE Przerwa</b></li><li>Dodaj akcję <b>Rozpocznij minutnik</b>, ustaw jednostkę na <b>sekundy</b>, a jako wartość wybierz <b>Dane wejściowe skrótu</b>.</li><li>Wróć tu i dotknij „Test (30 s)”.</li></ol><div class="btn-row"><button class="btn ghost" data-a="iosTimerTest">Test (30 s)</button></div>` : ''}</section>`;
  };

  // ---- podpięcie pod stoper ----
  const _start = F.restStart, _stop = F.restStop, _add = F.restAdd;
  F.restStart = (sec, label) => { _start(sec, label); if (F.rest) { closeNotif(); if (wantNotif()) ensurePermission(); armEnd(); pushSchedule(); if (S().iosTimer && isIOS && F.rest.total >= 10) runShortcut(F.rest.total); } };
  F.restAdd = s => { _add(s); if (F.rest) { armEnd(); pushSchedule(); } };
  F.restSkipNow = () => { if (F.rest) F.restStop(false); };
  F.restStop = finished => {
    const was = !!F.rest; clearTimeout(endTimer); _stop(finished); if (!was) return;
    if (!finished) pushCancel();
    else if (wantNotif() && !pcfg() && (document.hidden || !document.hasFocus())) notify();
  };
  // zegar z dokładnością do ułamka sekundy, nawet gdy przeglądarka spowolni interwał
  function armEnd() { clearTimeout(endTimer); if (!F.rest) return; endTimer = setTimeout(() => { if (F.rest) F.tickRest(); }, Math.max(0, F.rest.end - Date.now()) + 30); }
  // aplikacja na wierzchu tuż przed końcem: sygnał gra sama, więc anulujemy powiadomienie z serwera (bez dubla)
  const _tick = F.tickRest;
  F.tickRest = () => { if (F.rest && !pSkipSent && pcfg() && !document.hidden && document.hasFocus() && F.rest.end - Date.now() < 2200) { pSkipSent = true; pushCancel(); } _tick(); };
  // zgoda na powiadomienia przy włączeniu opcji w ustawieniach
  document.addEventListener('change', e => { const t = e.target; if (t && t.dataset && t.dataset.k === 'notifRest' && t.checked) { F._askedNotif = false; ensurePermission(); } });
})();
