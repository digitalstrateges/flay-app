// Flay Super App v1.02 - PWA Manager
// Gere l'installation, le service worker et les notifications

const FlayPWA = {
    deferredPrompt: null,
    _installed: false,
    vapidPublicKey: null,

    async init() {
        this._installed = this.isInstalled();

        if ('serviceWorker' in navigator) {
            try {
                const reg = await navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' });
                console.log('[PWA] Service Worker registered:', reg.scope);

                let preventUpdate = false;

                navigator.serviceWorker.addEventListener('message', (e) => {
                    if (e.data && e.data.type === 'SW_UPDATED') {
                        if (!preventUpdate) window.location.reload();
                    }
                });

                reg.addEventListener('updatefound', () => {
                    const newWorker = reg.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed') {
                            if (navigator.serviceWorker.controller) {
                                this.showUpdateBanner();
                            }
                        }
                    });
                });

                if (reg.waiting) {
                    this.showUpdateBanner();
                }
            } catch (error) {
                console.error('[PWA] Service Worker registration failed:', error);
            }
        }

        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            this.tryShowInstallPrompt();
        });

        window.matchMedia('(display-mode: standalone)').addEventListener('change', (e) => {
            this._installed = e.matches;
        });

        setInterval(() => {
            navigator.serviceWorker.getRegistration().then(reg => {
                if (reg) reg.update();
            });
        }, 60000);

        // Fetch VAPID public key from server
        try {
            const res = await fetch('/api/push/vapid-public-key');
            if (res.ok) {
                const data = await res.json();
                this.vapidPublicKey = data.publicKey;
            }
        } catch (e) {
            console.warn('[PWA] Could not fetch VAPID key');
        }
    },

    isInstalled() {
        return window.matchMedia('(display-mode: standalone)').matches ||
               window.navigator.standalone === true;
    },

    tryShowInstallPrompt() {
        if (!this.deferredPrompt) return;
        if (this.isInstalled()) return;
        const dismissed = localStorage.getItem('flay_pwa_dismissed');
        if (dismissed) {
            const sevenDays = 7 * 24 * 60 * 60 * 1000;
            if (Date.now() - parseInt(dismissed) < sevenDays) return;
            localStorage.removeItem('flay_pwa_dismissed');
        }
        const btn = document.getElementById('pwa-install-btn');
        const dashBtn = document.getElementById('pwa-install-btn-dashboard');
        if (btn) btn.style.display = 'flex';
        if (dashBtn) dashBtn.style.display = 'inline-flex';
    },

    showInstallPrompt() {
        if (this.isInstalled()) {
            console.log('[PWA] Already installed');
            return;
        }
        if (!this.deferredPrompt) {
            console.log('[PWA] Install prompt not available yet');
            return;
        }
        this.deferredPrompt.prompt();
        this.deferredPrompt.userChoice.then(({ outcome }) => {
            if (outcome === 'accepted') {
                this._installed = true;
                this.hideInstallButtons();
            } else {
                localStorage.setItem('flay_pwa_dismissed', Date.now().toString());
            }
            this.deferredPrompt = null;
            this.hideInstallButtons();
        });
    },

    hideInstallButtons() {
        const btns = document.querySelectorAll('#pwa-install-btn, #pwa-install-btn-dashboard');
        btns.forEach(b => { if (b) b.style.display = 'none'; });
    },

    showUpdateBanner() {
        if (document.getElementById('pwa-update-banner')) return;
        const banner = document.createElement('div');
        banner.id = 'pwa-update-banner';
        banner.innerHTML = `
            <div style="position:fixed;bottom:20px;left:20px;right:20px;background:#15152a;border:1px solid #252545;border-radius:12px;padding:16px;display:flex;align-items:center;justify-content:space-between;z-index:9999;box-shadow:0 10px 40px rgba(0,0,0,.3)">
                <span style="font-size:14px;color:#fff">Nouvelle version disponible</span>
                <button id="pwa-update-btn" style="padding:8px 16px;background:#818cf8;color:white;border:none;border-radius:8px;font-weight:600;cursor:pointer">Mettre a jour</button>
            </div>
        `;
        document.body.appendChild(banner);
        document.getElementById('pwa-update-btn').onclick = () => this.updateApp();
    },

    async updateApp() {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg && reg.waiting) {
            reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
        window.location.reload();
    },

    async requestNotificationPermission() {
        if (!('Notification' in window)) return 'denied';
        if (Notification.permission === 'granted') return 'granted';
        if (Notification.permission === 'denied') return 'denied';
        const result = await Notification.requestPermission();
        return result;
    },

    async subscribeToPush() {
        if (!('PushManager' in window)) return null;
        if (!this.vapidPublicKey) {
            console.warn('[PWA] No VAPID public key available');
            return null;
        }
        try {
            const reg = await navigator.serviceWorker.getRegistration();
            if (!reg) return null;

            const permission = await this.requestNotificationPermission();
            if (permission !== 'granted') return null;

            const subscription = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey)
            });

            const token = localStorage.getItem('flay_token');
            await fetch('/api/push/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                body: JSON.stringify({ subscription: subscription.toJSON() })
            });

            return subscription;
        } catch (error) {
            console.error('[PWA] Push subscription failed:', error);
            return null;
        }
    },

    async unsubscribeFromPush() {
        try {
            const reg = await navigator.serviceWorker.getRegistration();
            if (!reg) return false;
            const subscription = await reg.pushManager.getSubscription();
            if (!subscription) return false;
            const endpoint = subscription.endpoint;
            await subscription.unsubscribe();

            const token = localStorage.getItem('flay_token');
            await fetch('/api/push/unsubscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                body: JSON.stringify({ endpoint })
            });

            return true;
        } catch (error) {
            console.error('[PWA] Unsubscribe failed:', error);
            return false;
        }
    },

    async isSubscribed() {
        try {
            const reg = await navigator.serviceWorker.getRegistration();
            if (!reg) return false;
            const subscription = await reg.pushManager.getSubscription();
            return !!subscription;
        } catch {
            return false;
        }
    },

    urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }
};

window.FlayPWA = FlayPWA;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => FlayPWA.init());
} else {
    FlayPWA.init();
}
