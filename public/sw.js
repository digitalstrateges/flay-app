const CACHE = 'flay-v22';
const PRECACHE = 'flay-precache-v22';
const OFFLINE_URL = '/offline.html';

self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(PRECACHE).then(cache => cache.addAll([
            '/',
            '/index.html',
            '/login.html',
            '/register.html',
            '/dashboard.html',
            '/notifications.html',
            '/offline.html',
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
            .then(() => {
                // Cleanup: delete caches with more than 50 items
                return caches.keys().then(ks => {
                    return Promise.all(ks.map(k => {
                        return caches.open(k).then(cache => {
                            return cache.keys().then(keys => {
                                if (keys.length > 50) {
                                    console.log('[SW] Cache', k, 'has', keys.length, 'items, deleting');
                                    return caches.delete(k);
                                }
                            });
                        });
                    }));
                });
            })
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

self.addEventListener('push', e => {
    let data = { title: 'Flay', body: '', icon: '/logo-192.png', badge: '/badge-72.png', data: {} };
    try {
        if (e.data) {
            const parsed = e.data.json();
            data = { ...data, ...parsed };
        }
    } catch (err) {
        data.body = e.data ? e.data.text() : '';
    }

    const options = {
        body: data.body,
        icon: data.icon,
        badge: data.badge,
        data: data.data || {},
        actions: data.actions || [],
        vibrate: [200, 100, 200],
        tag: 'flay-notification',
        renotify: true,
        requireInteraction: true
    };

    e.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

self.addEventListener('notificationclick', e => {
    e.notification.close();

    const action = e.action;
    const data = e.notification.data || {};
    let url = '/notifications.html';

    if (action === 'view' && data.id) {
        url = '/notifications.html';
    } else if (action === 'confirm' && data.id) {
        url = '/dashboard.html?page=reservations';
    } else if (action === 'renew') {
        url = '/payment.html';
    } else if (data.url) {
        url = data.url;
    }

    e.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
            for (const client of clientList) {
                if (client.url.includes(url.split('?')[0]) && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) return clients.openWindow(url);
        })
    );
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
            }).catch(() => {
                return caches.match(e.request).then(cached => {
                    return cached || caches.match(OFFLINE_URL);
                });
            })
        );
        return;
    }

    const isJS = url.pathname.endsWith('.js');
    const isCSS = url.pathname.endsWith('.css');

    if (isJS || isCSS) {
        e.respondWith(
            fetch(e.request).then(res => {
                if (res.ok && res.type === 'basic') {
                    const clone = res.clone();
                    caches.open(CACHE).then(c => c.put(e.request, clone));
                }
                return res;
            }).catch(() => caches.match(e.request))
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
