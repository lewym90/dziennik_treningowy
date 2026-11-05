/* FORGE — service worker: działanie offline, odświeżanie w tle, odbiór plików z menu „Udostępnij” */
const VERSION = 'forge-v1.15.0';
const LIBS = 'forge-libs-1'; // moduły OCR i PDF (ok. 11 MB): osobna pamięć, która przetrwa aktualizacje aplikacji; zmień numer przy podmianie plików w vendor/
const CORE = ['./', 'index.html', 'manifest.webmanifest', 'css/styles.css',
  'js/icons.js', 'js/data.js', 'js/exinfo.js', 'js/exdb.js', 'js/kb.js', 'js/features.js', 'js/kcal.js', 'js/body-data.js', 'js/body.js', 'js/alert.js', 'js/inputs.js', 'js/core.js', 'js/charts.js', 'js/ui.js', 'js/parser.js', 'js/app.js', 'js/views2.js', 'js/workout.js', 'js/importer.js', 'js/planner.js', 'js/cardio.js', 'js/wizard.js', 'js/coach.js', 'js/guide.js', 'js/main.js',
  'assets/ach/0.webp', 'assets/ach/1.webp', 'assets/ach/10.webp', 'assets/ach/11.webp', 'assets/ach/12.webp', 'assets/ach/13.webp', 'assets/ach/14.webp', 'assets/ach/2.webp', 'assets/ach/3.webp', 'assets/ach/4.webp', 'assets/ach/5.webp', 'assets/ach/6.webp', 'assets/ach/7.webp', 'assets/ach/8.webp', 'assets/ach/9.webp', 'assets/bg/burst.webp', 'assets/bg/hero.webp', 'assets/bg/logo.webp', 'assets/bg/share.webp', 'assets/bg/splash.webp', 'assets/bg/sum.webp', 'assets/bg/tex.webp', 'assets/body/f-ar-id.png', 'assets/body/f-ar.webp', 'assets/body/f-bu-id.png', 'assets/body/f-bu.webp', 'assets/body/f-fu-id.png', 'assets/body/f-fu.webp', 'assets/body/f-id.png', 'assets/body/f-lb-id.png', 'assets/body/f-lb.webp', 'assets/body/f-lf-id.png', 'assets/body/f-lf.webp', 'assets/body/f.webp', 'assets/body/m-ar-id.png', 'assets/body/m-ar.webp', 'assets/body/m-bu-id.png', 'assets/body/m-bu.webp', 'assets/body/m-fu-id.png', 'assets/body/m-fu.webp', 'assets/body/m-id.png', 'assets/body/m-lb-id.png', 'assets/body/m-lb.webp', 'assets/body/m-lf-id.png', 'assets/body/m-lf.webp', 'assets/body/m.webp', 'assets/eq/0.webp', 'assets/eq/1.webp', 'assets/eq/2.webp', 'assets/eq/3.webp', 'assets/eq/4.webp', 'assets/eq/5.webp', 'assets/eq/6.webp', 'assets/eq/7.webp', 'assets/eq/8.webp', 'assets/eq/9.webp', 'assets/eq/10.webp', 'assets/eq/11.webp', 'assets/empty/0.webp', 'assets/empty/1.webp', 'assets/empty/2.webp', 'assets/empty/3.webp', 'assets/empty/4.webp', 'assets/empty/5.webp', 'assets/guide/0.webp', 'assets/guide/1.webp', 'assets/guide/10.webp', 'assets/guide/11.webp', 'assets/guide/12.webp', 'assets/guide/13.webp', 'assets/guide/2.webp', 'assets/guide/3.webp', 'assets/guide/4.webp', 'assets/guide/5.webp', 'assets/guide/6.webp', 'assets/guide/7.webp', 'assets/guide/8.webp', 'assets/guide/9.webp', 'assets/ic/0.webp', 'assets/ic/1.webp', 'assets/ic/10.webp', 'assets/ic/11.webp', 'assets/ic/2.webp', 'assets/ic/3.webp', 'assets/ic/4.webp', 'assets/ic/5.webp', 'assets/ic/6.webp', 'assets/ic/7.webp', 'assets/ic/8.webp', 'assets/ic/9.webp', 'assets/mus/0.webp', 'assets/mus/1.webp', 'assets/mus/10.webp', 'assets/mus/11.webp', 'assets/mus/12.webp', 'assets/mus/2.webp', 'assets/mus/3.webp', 'assets/mus/4.webp', 'assets/mus/5.webp', 'assets/mus/6.webp', 'assets/mus/7.webp', 'assets/mus/8.webp', 'assets/mus/9.webp', 'assets/rank/0.webp', 'assets/rank/1.webp', 'assets/rank/2.webp', 'assets/rank/3.webp', 'assets/rank/4.webp', 'assets/rank/5.webp', 'assets/rank/6.webp', 'assets/wiz/0.webp', 'assets/wiz/1.webp', 'assets/wiz/2.webp', 'assets/wiz/3.webp', 'assets/wiz/4.webp', 'assets/wiz/5.webp', 'assets/wiz/6.webp', 'assets/wiz/7.webp',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png', 'icons/favicon-32.png',
  'fonts/barlow-condensed-latin-600-normal.woff2', 'fonts/barlow-condensed-latin-700-normal.woff2', 'fonts/barlow-condensed-latin-800-normal.woff2',
  'fonts/barlow-condensed-latin-600-italic.woff2', 'fonts/barlow-condensed-latin-700-italic.woff2', 'fonts/barlow-condensed-latin-800-italic.woff2',
  'fonts/barlow-condensed-latin-ext-600-normal.woff2', 'fonts/barlow-condensed-latin-ext-700-normal.woff2', 'fonts/barlow-condensed-latin-ext-800-normal.woff2',
  'fonts/barlow-condensed-latin-ext-600-italic.woff2', 'fonts/barlow-condensed-latin-ext-700-italic.woff2', 'fonts/barlow-condensed-latin-ext-800-italic.woff2',
  'fonts/barlow-latin-400-normal.woff2', 'fonts/barlow-latin-500-normal.woff2', 'fonts/barlow-latin-600-normal.woff2',
  'fonts/barlow-latin-ext-400-normal.woff2', 'fonts/barlow-latin-ext-500-normal.woff2', 'fonts/barlow-latin-ext-600-normal.woff2'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const libs = await caches.open(LIBS);
    for (const k of await caches.keys()) {
      if (k.startsWith('forge-libs') && k !== LIBS) { await caches.delete(k); continue; }
      if (!k.startsWith('forge-v') || k === VERSION) continue;
      // moduły pobrane przez starsze wersje przenosimy, żeby nie pobierać ich drugi raz
      const old = await caches.open(k);
      for (const r of await old.keys()) { if (r.url.includes('/vendor/')) { const res = await old.match(r); if (res) await libs.put(r, res); } }
      await caches.delete(k);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request; const url = new URL(req.url);
  if (req.method === 'POST' && url.pathname.endsWith('/share-target')) {
    e.respondWith((async () => {
      try {
        const fd = await req.formData(); const files = fd.getAll('files'); const c = await caches.open('forge-share');
        for (const f of files) await c.put(new Request(new URL('shared/' + encodeURIComponent(f.name || 'plik'), self.registration.scope).href), new Response(f, { headers: { 'Content-Type': f.type || 'application/octet-stream' } }));
      } catch (err) { }
      return Response.redirect(new URL('./#/import?shared=1', self.registration.scope).href, 303);
    })());
    return;
  }
  // zdjęcia ćwiczeń (Free Exercise DB): pobierane raz, potem działają offline
  if (req.method === 'GET' && /^(cdn\.jsdelivr\.net|raw\.githubusercontent\.com)$/.test(url.hostname) && /free-exercise-db/.test(url.pathname)) {
    e.respondWith((async () => {
      const cache = await caches.open('forge-media'); const hit = await cache.match(req); if (hit) return hit;
      try { const res = await fetch(req); if (res && res.ok) cache.put(req, res.clone()); return res; } catch (err) { return new Response('', { status: 504 }); }
    })());
    return;
  }
  if (req.method !== 'GET' || url.origin !== location.origin || req.headers.has('range')) return;
  const heavy = url.pathname.includes('/vendor/') || url.pathname.includes('/fonts/');
  e.respondWith((async () => {
    const cache = await caches.open(url.pathname.includes('/vendor/') ? LIBS : VERSION);
    const hit = await cache.match(req, { ignoreSearch: req.mode === 'navigate' });
    if (hit && heavy) return hit;
    const net = fetch(req).then(res => { if (res && res.ok && res.type === 'basic') cache.put(req, res.clone()); return res; });
    if (hit) { net.catch(() => { }); return hit; }
    try { return await net; } catch (err) {
      if (req.mode === 'navigate') { const idx = await cache.match('index.html'); if (idx) return idx; }
      return new Response('Offline', { status: 503, statusText: 'Offline' });
    }
  })());
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) { if ('focus' in c) return c.focus(); }
    return self.clients.openWindow((e.notification.data && e.notification.data.url) || './');
  }));
});

// Push z serwera FORGE: { title, body, tag, url }. iOS wymaga pokazania powiadomienia przy każdym pushu.
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { try { d = { body: e.data.text() }; } catch (__) { d = {}; } }
  e.waitUntil(self.registration.showNotification(d.title || 'FORGE', { body: d.body || '', icon: 'icons/icon-192.png', badge: 'icons/favicon-32.png', tag: d.tag || 'forge-rest', renotify: true, vibrate: [300, 120, 300, 120, 500], data: { url: d.url || './#/workout' } }));
});
