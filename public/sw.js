const CACHE = 'flay-v20';
const PRECACHE = 'flay-precache-v20';

self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(PRECACHE).then(cache => cache.addAll([
            '/',
            '/index.html',
            '/login.html',
            '/register.html',
            '/dashboard.html',
            '/pwa.js',
            '/logo-animated.svg',
            '/manifest.json'
        ])).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys()
            .then(ks => Promise.all(
                ks.filter(k => k !== CACHE && k !== PRECACHE).map(k => caches.delete(k))
            ))
            .then(() => self.clients.claim())
            .then(() => self.clients.matchAll())
            .then(clients => {
                clients.forEach(c => c.postMessage({ type: 'SW_UPDATED' }));
            })
    );
});

self.addEventListener('message', e => {
    if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', e => {
    const url = new URL(e.request.url);
    if (url.pathname.includes('/api/')) return;
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

    if (e.request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname === '/') {
        e.respondWith(
            fetch(e.request).then(res => {
                const clone = res.clone();
                caches.open(CACHE).then(c => c.put(e.request, clone));
                return res;
            }).catch(() => caches.match(e.request).then(cached => cached || caches.match('/')))
        );
        return;
    }

    e.respondWith(
        caches.match(e.request).then(cached => {
            const fetching = fetch(e.request).then(res => {
                if (res.ok && res.type === 'basic') {
                    const clone = res.clone();
                    caches.open(CACHE).then(c => c.put(e.request, clone));
                }
                return res;
            }).catch(() => cached);
            return cached || fetching;
        })
    );
});
