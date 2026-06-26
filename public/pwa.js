// Flay v14.0 - PWA Manager
// Gere l'installation, le service worker et les notifications

const FlayPWA = {
    deferredPrompt: null,
    isInstalled: false,

    async init() {
        if ('serviceWorker' in navigator) {
            try {
                const reg = await navigator.serviceWorker.register('/sw.js');
                console.log('[PWA] Service Worker registered:', reg.scope);

                navigator.serviceWorker.addEventListener('message', (e) => {
                    if (e.data && e.data.type === 'SW_UPDATED') {
                        window.location.reload();
                    }
                });

                reg.addEventListener('updatefound', () => {
                    const newWorker = reg.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            this.showUpdateBanner();
                        }
                    });
                });
            } catch (error) {
                console.error('[PWA] Service Worker registration failed:', error);
            }
        }

        window.addEventListener('beforeinstallprompt', (e) => {
            const btn = document.getElementById('pwa-install-btn');
            if (!btn) return;
            e.preventDefault();
            this.deferredPrompt = e;
            btn.style.display = 'flex';
            btn.onclick = () => this.install();
        });

        if (window.matchMedia('(display-mode: standalone)').matches || 
            window.navigator.standalone === true) {
            this.isInstalled = true;
        }

        setInterval(() => {
            navigator.serviceWorker.getRegistration().then(reg => {
                if (reg) reg.update();
            });
        }, 60000);
    },

    async install() {
        if (!this.deferredPrompt) return;
        this.deferredPrompt.prompt();
        const { outcome } = await this.deferredPrompt.userChoice;
        if (outcome === 'accepted') this.isInstalled = true;
        this.deferredPrompt = null;
        this.hideInstallButton();
    },

    hideInstallButton() {
        const btn = document.getElementById('pwa-install-btn');
        if (btn) btn.style.display = 'none';
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
        if ('Notification' in window && Notification.permission === 'default') {}
    },

    async subscribeToPush() {
        if (!('PushManager' in window)) return null;
        try {
            const reg = await navigator.serviceWorker.getRegistration();
            if (!reg) return null;
            return await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: this.urlBase64ToUint8Array(process.env.VAPID_PUBLIC_KEY || '')
            });
        } catch (error) {
            console.error('[PWA] Push subscription failed:', error);
            return null;
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

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => FlayPWA.init());
} else {
    FlayPWA.init();
}
