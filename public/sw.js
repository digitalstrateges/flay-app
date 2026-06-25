/**
 * Flay v4.0 - Service Worker
 * PWA installable avec cache intelligent
 */

const CACHE_NAME = 'flay-v4.0.0';
const STATIC_CACHE = 'flay-static-v4';
const DYNAMIC_CACHE = 'flay-dynamic-v4';

const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/login.html',
    '/register.html',
    '/dashboard.html',
    '/editor.html',
    '/studio.html',
    '/payment.html',
    '/analytics.html',
    '/visitors.html',
    '/crm.html',
    '/settings.html',
    '/admin.html',
    '/reservations.html',
    '/manifest.json',
    '/logo-animated.svg'
];

// Install
self.addEventListener('install', event => {
    console.log('[SW] Installing Flay v4.0...');
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => {
                console.log('[SW] Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => self.skipWaiting())
    );
});

// Activate
self.addEventListener('activate', event => {
    console.log('[SW] Activating Flay v4.0...');
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
                    .map(key => {
                        console.log('[SW] Deleting old cache:', key);
                        return caches.delete(key);
                    })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch - Network first, fallback to cache
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') return;

    // Skip API calls
    if (url.pathname.startsWith('/api/')) return;

    // Skip WebSocket
    if (url.pathname.startsWith('/ws')) return;

    event.respondWith(
        fetch(request)
            .then(response => {
                // Clone the response
                const responseClone = response.clone();

                // Cache successful responses
                if (response.status === 200) {
                    caches.open(DYNAMIC_CACHE).then(cache => {
                        cache.put(request, responseClone);
                    });
                }

                return response;
            })
            .catch(() => {
                // Fallback to cache
                return caches.match(request).then(cachedResponse => {
                    if (cachedResponse) return cachedResponse;

                    // Return offline page for navigation
                    if (request.mode === 'navigate') {
                        return caches.match('/index.html');
                    }

                    return new Response('Offline', { status: 503 });
                });
            })
    );
});

// Push notifications
self.addEventListener('push', event => {
    const data = event.data ? event.data.json() : {};
    const title = data.title || 'Flay';
    const options = {
        body: data.body || 'Nouvelle notification',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-96x96.png',
        vibrate: [100, 50, 100],
        data: data.url || '/',
        actions: [
            { action: 'open', title: 'Ouvrir', icon: '/icons/icon-96x96.png' },
            { action: 'dismiss', title: 'Fermer', icon: '/icons/icon-96x96.png' }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

// Notification click
self.addEventListener('notificationclick', event => {
    event.notification.close();

    if (event.action === 'dismiss') return;

    event.waitUntil(
        clients.matchAll({ type: 'window' }).then(windowClients => {
            // Focus existing window
            for (const client of windowClients) {
                if (client.url.includes('flay') && 'focus' in client) {
                    return client.focus();
                }
            }
            // Open new window
            if (clients.openWindow) {
                return clients.openWindow(event.notification.data || '/');
            }
        })
    );
});

// Background sync
self.addEventListener('sync', event => {
    if (event.tag === 'sync-data') {
        event.waitUntil(syncData());
    }
});

async function syncData() {
    // Sync offline data when connection is restored
    console.log('[SW] Syncing data...');
}

// Message handler
self.addEventListener('message', event => {
    if (event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
