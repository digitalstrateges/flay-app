// Flay v14.0 - PWA Manager
// Gere l'installation, le service worker et les notifications

const FlayPWA = {
    deferredPrompt: null,
    isInstalled: false,

    async init() {
        // Register service worker
        if ('serviceWorker' in navigator) {
            try {
                const reg = await navigator.serviceWorker.register('/sw.js');
                console.log('[PWA] Service Worker registered:', reg.scope);
                
                // Check for updates
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

        // Listen for install prompt
        window.addEventListener('beforeinstallprompt', (e) => {
            const btn = document.getElementById('pwa-install-btn');
            if (!btn) return;
            e.preventDefault();
            this.deferredPrompt = e;
            btn.style.display = 'flex';
            btn.onclick = () => this.install();
        });

        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches || 
            window.navigator.standalone === true) {
            this.isInstalled = true;
            console.log('[PWA] App is installed');
        }

        // Request notification permission
        this.requestNotificationPermission();
    },

    async install() {
        if (!this.deferredPrompt) return;
        
        this.deferredPrompt.prompt();
        const { outcome } = await this.deferredPrompt.userChoice;
        
        if (outcome === 'accepted') {
            console.log('[PWA] App installed');
            this.isInstalled = true;
        }
        
        this.deferredPrompt = null;
        this.hideInstallButton();
    },

    hideInstallButton() {
        const btn = document.getElementById('pwa-install-btn');
        if (btn) btn.style.display = 'none';
    },

    showUpdateBanner() {
        const banner = document.createElement('div');
        banner.id = 'pwa-update-banner';
        banner.innerHTML = `
            <div style="position:fixed;bottom:20px;left:20px;right:20px;background:var(--card);border:1px solid var(--border);border-radius:12px;padding:16px;display:flex;align-items:center;justify-content:space-between;z-index:9999;box-shadow:0 10px 40px rgba(0,0,0,.3)">
                <span style="font-size:14px">Nouvelle version disponible</span>
                <button onclick="FlayPWA.updateApp()" style="padding:8px 16px;background:var(--primary);color:white;border:none;border-radius:8px;font-weight:600;cursor:pointer">Mettre a jour</button>
            </div>
        `;
        document.body.appendChild(banner);
    },

    async updateApp() {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg && reg.waiting) {
            reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
        window.location.reload();
    },

    async requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            // Don't auto-request, wait for user action
        }
    },

    async subscribeToPush() {
        if (!('PushManager' in window)) return null;
        
        try {
            const reg = await navigator.serviceWorker.getRegistration();
            if (!reg) return null;

            const subscription = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: this.urlBase64ToUint8Array(
                    process.env.VAPID_PUBLIC_KEY || ''
                )
            });

            return subscription;
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

// Auto-init on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => FlayPWA.init());
} else {
    FlayPWA.init();
}
