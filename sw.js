/* Wind Brain — the service worker of the wrapper v4.1 (2026-10-24; brief-fix8 §2 b). Scope: the site's root.
   THE SHELL: this page, its two manifests and the icons are kept in a versioned cache (wb-shell-<VERSION>); a new VERSION is a new cache, and the old
   ones are deleted when it takes over. The page (any navigation in scope) comes from the network first — the copy is used when the network fails or
   takes over 4 s — so a new index.html is seen on the next visit; the icons and manifests come from the cache. NOTHING ELSE IS TOUCHED: the script's
   requests (script.google.com, googleusercontent) and every other origin go to the network exactly as without a service worker; the kept app and its
   data stay in the page's own storage, as v4.0 keeps them.
   AN UPDATE: the page registers this file with updateViaCache 'none', so the browser fetches it on every visit; a changed file installs, skips waiting
   and claims the open pages, and the next visit runs on it.
   NOTIFICATIONS: a push carries {t, b, u, tag, id} (the title, the alert's text, the day's deep link #d<date>, a tag per day); it is shown at once
   (the browsers require it). A tap focuses the open app and asks it to show that day (a message the page answers in its own frame), or opens the app at
   that address.
   v4.2 (2026-10-28): every notification ALERTS (renotify with its tag: a newer one for the same day no longer replaces the older silently); once it is
   SHOWN the worker tells the app — ?rcpt=<the message's id> to the app's address (the APP_URL line of the kept index.html; the id only, nothing else) —
   and the open pages ({wb:'shown', id}); when the browser changes the subscription (pushsubscriptionchange) the worker subscribes again with the same
   key and tells the app (?resub=1 {old: the old endpoint, sub: the new one}), so the app's row follows it with no one's tap.
   v4.4 (2026-11-03, with the app v4.45; brief-fix17 C): a spot's notification carries #loc:<spot> (#loc:dor, #loc:caesarea, #loc:eilat), and a tap opens
   that spot; every other address as before. VERSION stays 4.2: the shell's files are unchanged, so its cache is kept.
   v4.5 (2026-11-10, with the app v4.56; brief-fix28 item 2 — SPEED): THIS PAGE FROM THE CACHE FIRST, AND THE KEPT APP. The page (index.html) is given
   from the cache at once and fetched again in the background (stale-while-revalidate, past the HTTP cache): a new index.html is used on the next
   open, and a weak or blocked connection to GitHub no longer holds the open (v4.1-v4.4 waited for the network up to 4 s). With nothing cached yet
   the network answers, the cache when it fails. The kept app's script (kept/app-<version>.js, which the page writes into the wb-app cache) is
   given from that cache only — it is in no file on the site; a missing one answers 404 and the page fetches the app again. kept/probe.js is a
   one-line script that tells the page this browser gives a srcdoc frame's requests to the worker (only then is the app kept in two parts); the page
   first asks this worker's version ({wb:'swv'}), so a probe is never answered by an older worker. VERSION 4.5: a new
   shell cache (the page changed), the old one deleted when this worker takes over; wb-app is kept across versions of this worker. */
var VERSION = '4.5';
var APPC = 'wb-app';
var CACHE = 'wb-shell-' + VERSION;
var SHELL = ['./', 'manifest.webmanifest', 'manifest-owner.webmanifest', 'icon-180.png', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png'];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL.map(function (u) { return new Request(u, { cache: 'reload' }); })); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k.indexOf('wb-shell-') === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); }));
});
function pageKey() { return new URL('./', self.registration.scope).href; }
self.addEventListener('fetch', function (e) {
  var q = e.request; if (q.method !== 'GET') return;
  var u; try { u = new URL(q.url); } catch (x) { return; }
  if (u.origin !== self.location.origin) return;                         /* never the script's requests, never another origin */
  var scope = new URL(self.registration.scope); if (u.pathname.indexOf(scope.pathname) !== 0) return;
  var rel = u.pathname.slice(scope.pathname.length);
  if (rel === 'kept/probe.js') {                                     /* v4.5: the page asks once whether a srcdoc frame's script reaches this worker */
    e.respondWith(new Response("try{parent.postMessage('wb-swok','*')}catch(e){}", { headers: { 'Content-Type': 'application/javascript; charset=utf-8' } }));
    return;
  }
  if (rel.indexOf('kept/') === 0) {                                     /* v4.5: the kept app's script, from its cache only */
    e.respondWith(caches.open(APPC).then(function (c) { return c.match(new URL(rel, self.registration.scope).href); }).then(function (r) { return r || new Response('', { status: 404 }); }, function () { return new Response('', { status: 404 }); }));
    return;
  }
  if (q.mode === 'navigate') {
    if (rel !== '' && rel !== 'index.html') return;                      /* only the app's page */
    var fromNet = function () { return fetch(q.url, { cache: 'no-cache', credentials: 'same-origin', redirect: 'manual' }).then(function (r) {   /* past the HTTP cache (GitHub Pages: 10 min), revalidated */
      if (r && r.ok && r.type === 'basic') { var cp = r.clone(); return caches.open(CACHE).then(function (c) { return c.put(pageKey(), cp); }).catch(function () {}).then(function () { return r; }); }
      return r; }); };
    e.respondWith(caches.open(CACHE).then(function (c) { return c.match(pageKey()); }).then(function (hit) {
      if (hit) { e.waitUntil(fromNet().catch(function () {})); return hit; }   /* v4.5: the cached page at once; the network's copy for the next open */
      return fromNet().catch(function () { return caches.open(CACHE).then(function (c) { return c.match(pageKey()); }).then(function (r) { return r || Response.error(); }); });
    }, function () { return fetch(q); }));
    return;
  }
  if (!u.search && SHELL.indexOf(rel) >= 0 && rel !== './') {
    e.respondWith(caches.open(CACHE).then(function (c) { return c.match(q).then(function (r) { return r || fetch(q); }); }));
  }
});
self.addEventListener('message', function (e) {                       /* v4.5 (after the judges): the page asks which worker controls it before it probes */
  var d = e && e.data; if (!d || d.wb !== 'swv') return;
  var p = (e.ports && e.ports[0]) || e.source; try { if (p) p.postMessage({ wb: 'swv', v: VERSION }); } catch (x) {}
});
self.addEventListener('push', function (e) {
  var d = {}; try { d = e.data ? e.data.json() : {}; } catch (x) { try { d = { b: e.data.text() }; } catch (y) { d = {}; } }
  if (!d || typeof d !== 'object') d = {};
  var id = /^q[0-9a-f]{12}$/.test(String(d.id || '')) ? String(d.id) : '';
  var o = { body: String(d.b || ''), icon: 'icon-192.png', tag: String(d.tag || 'wb'), renotify: true, data: { u: String(d.u || ''), id: id } };
  e.waitUntil(self.registration.showNotification(String(d.t || 'Wind Brain'), o).then(function () { return id ? shown(id) : null; }));
});
function appUrl() {   /* the app's /exec address, as the kept index.html names it */
  return caches.open(CACHE).then(function (c) { return c.match(pageKey()); }).then(function (r) { return r ? r.text() : ''; }).then(function (t) {
    var m = /var APP_URL = "(https?:\/\/[^"]+)"/.exec(t || ''); return m ? m[1] : null; }).catch(function () { return null; });
}
function shown(id) {   /* the receipt: the id only, to the app; and the open pages told */
  var tell = self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (L) { L.forEach(function (c) { try { c.postMessage({ wb: 'shown', id: id }); } catch (x) {} }); }).catch(function () {});
  var send = appUrl().then(function (u) { if (!u) return null; return fetch(u + '?rcpt=' + encodeURIComponent(id), { method: 'GET', mode: 'no-cors', credentials: 'omit', cache: 'no-store' }).catch(function () {}); });
  return Promise.all([tell, send]).catch(function () {});
}
self.addEventListener('pushsubscriptionchange', function (e) {
  var old = e.oldSubscription || null, nu = e.newSubscription || null;
  var key = old && old.options ? old.options.applicationServerKey : null;
  e.waitUntil((nu ? Promise.resolve(nu) : (key ? self.registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key }) : Promise.resolve(null))).then(function (s) {
    if (!s || !old || !old.endpoint) return null; var j = s.toJSON ? s.toJSON() : null; if (!j || !j.endpoint || !j.keys) return null;
    return appUrl().then(function (u) { if (!u) return null;
      return fetch(u + '?resub=1', { method: 'POST', mode: 'no-cors', credentials: 'omit', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ old: old.endpoint, sub: { endpoint: j.endpoint, keys: { p256dh: j.keys.p256dh, auth: j.keys.auth } } }) }).catch(function () {}); });
  }).catch(function () {}));
});
self.addEventListener('notificationclick', function (e) {
  var h = String((e.notification && e.notification.data && e.notification.data.u) || '');
  if (!/^#(d\d{4}-\d{2}-\d{2}|mb|all|loc|loc:[a-z]+|about|perf|m\d{4}-\d{2}|s\d{4})$/.test(h)) h = '';   /* v4.4 (with the app v4.45): a spot's notification opens that spot, #loc:dor */
  try { e.notification.close(); } catch (x) {}
  var url = pageKey() + h;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (L) {
    var c = null; for (var i = 0; i < L.length; i++) { if (L[i].url.indexOf(self.registration.scope) === 0) { c = L[i]; break; } }
    if (c) { try { c.postMessage({ wb: 'open', h: h }); } catch (x) {} return c.focus ? c.focus().catch(function () {}) : null; }
    return self.clients.openWindow ? self.clients.openWindow(url) : null;
  }));
});
