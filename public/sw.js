const CACHE = 'flay-v102';
const PRECACHE = 'flay-static-v3';
const OFFLINE_URL = '/offline.html';

const PRECACHE_URLS = [
  '/', '/index.html', '/login.html', '/register.html',
  '/forgot-password.html', '/reset-password.html',
  '/dashboard.html', '/offline.html', '/scanner.html', '/digitalstrateges',
  '/pwa.js', '/manifest.json', '/favicon.svg'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(PRECACHE).then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks =>
      Promise.all(ks.map(k => {
        if (k !== CACHE && k !== PRECACHE) return caches.delete(k);
      }))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('message', e => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('push', e => {
  let data = { title: 'Flay', body: '', icon: '/favicon.svg', badge: '/favicon.svg', data: {} };
  try { if (e.data) Object.assign(data, e.data.json()); } catch { data.body = e.data?.text() || ''; }
  e.waitUntil(self.registration.showNotification(data.title, {
    body: data.body, icon: data.icon, badge: data.badge,
    data: data.data, vibrate: [200, 100, 200],
    tag: 'flay-notification', renotify: true, requireInteraction: true
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const action = e.action || 'open';
  const data = e.notification.data || {};
  const urls = {
    view: '/notifications.html',
    confirm: '/dashboard.html?tab=reservations',
    renew: '/pricing',
    open: data.url || '/'
  };
  const url = urls[action] || '/';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const match = list.find(c => c.url.includes(url.split('?')[0]));
      return match ? match.focus() : clients.openWindow(url);
    })
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.pathname.includes('/api/') || e.request.url.includes('chrome-extension')) return;
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  if (e.request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname === '/') {
    e.respondWith(
      fetch(e.request).then(res => {
        const clone = res.clone();
        if (res.ok) caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      }).catch(() =>
        caches.match(e.request).then(cached => cached || caches.match(OFFLINE_URL))
      )
    );
    return;
  }

  const ext = url.pathname.split('.').pop();
  if (['js', 'css', 'svg', 'png', 'jpg', 'webp', 'woff2'].includes(ext)) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        const fetchPromise = fetch(e.request).then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return res;
        }).catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(cached => {
      const fetchPromise = fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
