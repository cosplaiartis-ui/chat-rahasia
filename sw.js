self.addEventListener('install',e=>e.waitUntil(caches.open('cr1').then(c=>c.addAll(['./','index.html','app.js','crypto.js','net.js','nostr.js']))));
self.addEventListener('fetch',e=>e.respondWith(fetch(e.request).catch(()=>caches.match(e.request))));
