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
   that address. */
var VERSION = '4.1';
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
  if (q.mode === 'navigate') {
    if (rel !== '' && rel !== 'index.html') return;                      /* only the app's page */
    e.respondWith(new Promise(function (res) {
      var done = false, tm = null;
      var fromCache = function () { return caches.open(CACHE).then(function (c) { return c.match(pageKey()); }); };
      tm = setTimeout(function () { fromCache().then(function (r) { if (r && !done) { done = true; res(r); } }); }, 4000);
      fetch(q.url, { cache: 'no-cache', credentials: 'same-origin', redirect: 'manual' }).then(function (r) {   /* past the HTTP cache (GitHub Pages: 10 min), revalidated: a new index.html on the next open */
        if (r && r.ok && r.type === 'basic') { var cp = r.clone(); caches.open(CACHE).then(function (c) { return c.put(pageKey(), cp); }).catch(function () {}); }
        if (!done) { done = true; clearTimeout(tm); res(r); }
      }, function () {
        fromCache().then(function (r) { if (!done) { done = true; clearTimeout(tm); res(r || Response.error()); } });
      });
    }));
    return;
  }
  if (!u.search && SHELL.indexOf(rel) >= 0 && rel !== './') {
    e.respondWith(caches.open(CACHE).then(function (c) { return c.match(q).then(function (r) { return r || fetch(q); }); }));
  }
});
self.addEventListener('push', function (e) {
  var d = {}; try { d = e.data ? e.data.json() : {}; } catch (x) { try { d = { b: e.data.text() }; } catch (y) { d = {}; } }
  if (!d || typeof d !== 'object') d = {};
  var o = { body: String(d.b || ''), icon: 'icon-192.png', tag: String(d.tag || 'wb'), data: { u: String(d.u || '') } };
  e.waitUntil(self.registration.showNotification(String(d.t || 'Wind Brain'), o));
});
self.addEventListener('notificationclick', function (e) {
  var h = String((e.notification && e.notification.data && e.notification.data.u) || '');
  if (!/^#(d\d{4}-\d{2}-\d{2}|mb|all|loc|about|perf|m\d{4}-\d{2}|s\d{4})$/.test(h)) h = '';
  try { e.notification.close(); } catch (x) {}
  var url = pageKey() + h;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (L) {
    var c = null; for (var i = 0; i < L.length; i++) { if (L[i].url.indexOf(self.registration.scope) === 0) { c = L[i]; break; } }
    if (c) { try { c.postMessage({ wb: 'open', h: h }); } catch (x) {} return c.focus ? c.focus().catch(function () {}) : null; }
    return self.clients.openWindow ? self.clients.openWindow(url) : null;
  }));
});
