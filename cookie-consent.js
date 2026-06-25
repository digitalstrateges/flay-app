/**
 * Flay Omni - Cookie Consent Manager
 * Banner RGPD conforme avec gestion des preferences
 */

class CookieConsent {
    constructor() {
        this.config = {
            cookieName: '_flay_consent',
            expiry: 365,
            position: 'bottom',
            theme: 'dark',
            colors: {
                bar: '#15152a',
                text: '#ffffff',
                button: '#667eea',
                buttonHover: '#5a6fd6',
                link: '#a0a0c0'
            },
            categories: [
                {
                    id: 'essential',
                    name: 'Essentiels',
                    description: 'Cookies necessaires au fonctionnement du site. Impossible de desactiver.',
                    required: true,
                    default: true
                },
                {
                    id: 'analytics',
                    name: 'Analytics',
                    description: 'Nous aident a comprendre comment les visiteurs utilisent le site.',
                    required: false,
                    default: false
                },
                {
                    id: 'marketing',
                    name: 'Marketing',
                    description: 'Utilises pour afficher des publicites pertinentes.',
                    required: false,
                    default: false
                },
                {
                    id: 'personalization',
                    name: 'Personnalisation',
                    description: 'Permettent de personnaliser votre experience.',
                    required: false,
                    default: false
                }
            ],
            texts: {
                fr: {
                    title: 'Nous utilisons des cookies',
                    message: 'Ce site utilise des cookies pour ameliorer votre experience. Vous pouvez personnaliser vos preferences.',
                    acceptAll: 'Tout accepter',
                    rejectAll: 'Tout refuser',
                    save: 'Enregistrer',
                    settings: 'Parametres',
                    close: 'Fermer',
                    readMore: 'En savoir plus',
                    privacy: 'Politique de confidentialite'
                },
                en: {
                    title: 'We use cookies',
                    message: 'This site uses cookies to improve your experience. You can customize your preferences.',
                    acceptAll: 'Accept all',
                    rejectAll: 'Reject all',
                    save: 'Save',
                    settings: 'Settings',
                    close: 'Close',
                    readMore: 'Learn more',
                    privacy: 'Privacy Policy'
                }
            }
        };
        this.consents = new Map();
    }

    getBannerHTML(lang = 'fr', profileTheme = 'dark') {
        const t = this.config.texts[lang] || this.config.texts.fr;
        const isLight = profileTheme === 'light';
        const bg = isLight ? '#ffffff' : this.config.colors.bar;
        const textColor = isLight ? '#1a1a2e' : this.config.colors.text;
        const borderColor = isLight ? '#e0e0e0' : '#252545';

        return `
<div id="flay-cookie-banner" style="
    position:fixed;bottom:0;left:0;right:0;z-index:99999;
    background:${bg};color:${textColor};
    border-top:1px solid ${borderColor};
    padding:20px 24px;
    box-shadow:0 -4px 20px rgba(0,0,0,0.3);
    font-family:'Inter',system-ui,sans-serif;
    animation:flay-slide-up 0.4s ease;
    display:none;
">
    <style>
        @keyframes flay-slide-up { from { transform:translateY(100%); opacity:0; } to { transform:translateY(0); opacity:1; } }
        .flay-cookie-btn { padding:10px 20px;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;border:none;transition:all 0.2s;font-family:inherit; }
        .flay-cookie-btn:hover { transform:translateY(-1px); }
        .flay-cookie-btn-primary { background:${this.config.colors.button};color:white; }
        .flay-cookie-btn-primary:hover { background:${this.config.colors.buttonHover}; }
        .flay-cookie-btn-secondary { background:transparent;color:${textColor};border:1px solid ${borderColor}; }
        .flay-cookie-btn-secondary:hover { border-color:${this.config.colors.button}; }
        .flay-cookie-btn-text { background:transparent;color:${this.config.colors.link};border:none;font-size:13px; }
        .flay-cookie-categories { display:none;margin-top:16px;border-top:1px solid ${borderColor};padding-top:16px; }
        .flay-cookie-cat { display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid ${borderColor}; }
        .flay-cookie-cat:last-child { border:none; }
        .flay-cookie-cat-info { flex:1;margin-right:16px; }
        .flay-cookie-cat-name { font-weight:600;font-size:14px; }
        .flay-cookie-cat-desc { font-size:12px;color:${isLight ? '#666' : '#a0a0c0'};margin-top:2px; }
        .flay-cookie-toggle { position:relative;width:44px;height:24px;cursor:pointer; }
        .flay-cookie-toggle input { opacity:0;width:0;height:0; }
        .flay-cookie-toggle .slider { position:absolute;inset:0;background:${borderColor};border-radius:12px;transition:0.3s; }
        .flay-cookie-toggle .slider:before { content:'';position:absolute;width:18px;height:18px;left:3px;bottom:3px;background:white;border-radius:50%;transition:0.3s; }
        .flay-cookie-toggle input:checked + .slider { background:${this.config.colors.button}; }
        .flay-cookie-toggle input:checked + .slider:before { transform:translateX(20px); }
        .flay-cookie-toggle input:disabled + .slider { opacity:0.5;cursor:not-allowed; }
    </style>
    <div style="max-width:900px;margin:0 auto;">
        <div id="flay-cookie-main">
            <div style="display:flex;align-items:flex-start;gap:16px;flex-wrap:wrap;">
                <div style="flex:1;min-width:300px;">
                    <div style="font-size:16px;font-weight:700;margin-bottom:8px;">${t.title}</div>
                    <div style="font-size:14px;color:${isLight ? '#666' : '#a0a0c0'};line-height:1.6;">${t.message}</div>
                </div>
                <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
                    <button class="flay-cookie-btn flay-cookie-btn-primary" onclick="FlayConsent.acceptAll()">${t.acceptAll}</button>
                    <button class="flay-cookie-btn flay-cookie-btn-secondary" onclick="FlayConsent.rejectAll()">${t.rejectAll}</button>
                    <button class="flay-cookie-btn flay-cookie-btn-text" onclick="FlayConsent.toggleSettings()">${t.settings}</button>
                </div>
            </div>
        </div>
        <div id="flay-cookie-settings" class="flay-cookie-categories">
            ${this.config.categories.map(cat => `
            <div class="flay-cookie-cat">
                <div class="flay-cookie-cat-info">
                    <div class="flay-cookie-cat-name">${cat.name}</div>
                    <div class="flay-cookie-cat-desc">${cat.description}</div>
                </div>
                <label class="flay-cookie-toggle">
                    <input type="checkbox" id="flay-consent-${cat.id}" ${cat.required || cat.default ? 'checked' : ''} ${cat.required ? 'disabled' : ''} onchange="FlayConsent.update('${cat.id}', this.checked)">
                    <span class="slider"></span>
                </label>
            </div>
            `).join('')}
            <div style="margin-top:16px;text-align:right;">
                <button class="flay-cookie-btn flay-cookie-btn-primary" onclick="FlayConsent.save()">${t.save}</button>
            </div>
        </div>
    </div>
</div>`;
    }

    getScript() {
        return `
<script>
(function() {
    const FlayConsent = {
        consent: null,
        banner: null,

        init() {
            this.banner = document.getElementById('flay-cookie-banner');
            this.consent = this.getCookie('_flay_consent');
            if (!this.consent) {
                setTimeout(() => { if (this.banner) this.banner.style.display = 'block'; }, 1000);
            } else {
                this.applyConsent(JSON.parse(this.consent));
            }
        },

        getCookie(name) {
            const v = document.cookie.match('(^|;) ?' + name + '=([^;]*)(;|$)');
            return v ? v[2] : null;
        },

        setCookie(name, value, days) {
            const d = new Date();
            d.setTime(d.getTime() + days * 86400000);
            document.cookie = name + '=' + value + ';expires=' + d.toUTCString() + ';path=/;SameSite=Lax';
        },

        acceptAll() {
            this.consent = { essential: true, analytics: true, marketing: true, personalization: true, timestamp: Date.now() };
            this.setCookie('_flay_consent', JSON.stringify(this.consent), 365);
            this.applyConsent(this.consent);
            this.hide();
        },

        rejectAll() {
            this.consent = { essential: true, analytics: false, marketing: false, personalization: false, timestamp: Date.now() };
            this.setCookie('_flay_consent', JSON.stringify(this.consent), 365);
            this.applyConsent(this.consent);
            this.hide();
        },

        save() {
            const cats = ['essential', 'analytics', 'marketing', 'personalization'];
            this.consent = { essential: true, timestamp: Date.now() };
            cats.forEach(c => {
                if (c !== 'essential') {
                    this.consent[c] = document.getElementById('flay-consent-' + c)?.checked || false;
                }
            });
            this.setCookie('_flay_consent', JSON.stringify(this.consent), 365);
            this.applyConsent(this.consent);
            this.hide();
        },

        update(category, value) {
            // Toggle handled by save button
        },

        toggleSettings() {
            const settings = document.getElementById('flay-cookie-settings');
            settings.style.display = settings.style.display === 'block' ? 'none' : 'block';
        },

        hide() {
            if (this.banner) this.banner.style.display = 'none';
        },

        applyConsent(consent) {
            if (consent.analytics) {
                // Enable analytics tracking
                window._flayAnalytics = true;
            }
            if (consent.marketing) {
                // Enable marketing scripts
                window._flayMarketing = true;
            }
            if (consent.personalization) {
                // Enable personalization
                window._flayPersonalization = true;
            }

            // Send consent to server
            try {
                const visitorId = this.getCookie('_flay_vid');
                if (visitorId) {
                    fetch('/api/tracking/consent', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ visitorId, consent })
                    });
                }
            } catch(e) {}
        },

        getConsent() {
            return this.consent ? JSON.parse(this.consent) : null;
        }
    };

    window.FlayConsent = FlayConsent;
    document.addEventListener('DOMContentLoaded', () => FlayConsent.init());
})();
</script>`;
    }

    getTrackingScript(userId) {
        return `
<script>
(function() {
    const FlayTracker = {
        visitorId: null,
        sessionId: null,
        pageviewId: null,
        startTime: Date.now(),
        scrollMax: 0,
        userId: '${userId}',

        init() {
            this.visitorId = this.getOrCreateVisitorId();
            this.sessionId = this.generateId('sess');
            this.setupScrollTracking();
            this.setupClickTracking();
            this.setupExitTracking();
            this.trackPageview();
            this.sendBeacon('session_start', {});
        },

        getOrCreateVisitorId() {
            let vid = this.getCookie('_flay_vid');
            if (!vid) {
                vid = this.generateId('vid');
                this.setCookie('_flay_vid', vid, 365);
            }
            return vid;
        },

        generateId(prefix) {
            return prefix + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
        },

        getCookie(name) {
            const v = document.cookie.match('(^|;) ?' + name + '=([^;]*)(;|$)');
            return v ? v[2] : null;
        },

        setCookie(name, value, days) {
            const d = new Date();
            d.setTime(d.getTime() + days * 86400000);
            document.cookie = name + '=' + value + ';expires=' + d.toUTCString() + ';path=/;SameSite=Lax';
        },

        trackPageview() {
            const data = {
                visitorId: this.visitorId,
                sessionId: this.sessionId,
                userId: this.userId,
                page: window.location.pathname,
                title: document.title,
                referrer: document.referrer,
                device: this.getDevice(),
                browser: this.getBrowser(),
                screen: window.screen.width + 'x' + window.screen.height,
                language: navigator.language
            };
            this.sendBeacon('pageview', data);
        },

        setupScrollTracking() {
            let maxScroll = 0;
            window.addEventListener('scroll', () => {
                const scroll = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100);
                if (scroll > maxScroll) {
                    maxScroll = scroll;
                    this.scrollMax = maxScroll;
                }
            });
        },

        setupClickTracking() {
            document.addEventListener('click', (e) => {
                const target = e.target.closest('a, button, [data-track]');
                if (!target) return;
                const data = {
                    visitorId: this.visitorId,
                    userId: this.userId,
                    element: target.tagName.toLowerCase(),
                    text: (target.textContent || '').trim().substring(0, 100),
                    url: target.href || '',
                    page: window.location.pathname,
                    x: e.clientX,
                    y: e.clientY
                };
                this.sendBeacon('click', data);
            });
        },

        setupExitTracking() {
            window.addEventListener('beforeunload', () => {
                const duration = (Date.now() - this.startTime) / 1000;
                const data = {
                    visitorId: this.visitorId,
                    sessionId: this.sessionId,
                    userId: this.userId,
                    page: window.location.pathname,
                    duration: Math.round(duration),
                    scrollDepth: this.scrollMax
                };
                navigator.sendBeacon('/api/tracking/exit', JSON.stringify(data));
            });
        },

        sendBeacon(event, data) {
            try {
                const consent = JSON.parse(this.getCookie('_flay_consent') || '{}');
                if (event !== 'session_start' && !consent.analytics) return;

                if (navigator.sendBeacon) {
                    const blob = new Blob([JSON.stringify({ event, ...data, timestamp: new Date().toISOString() })], { type: 'application/json' });
                    navigator.sendBeacon('/api/tracking/track', blob);
                } else {
                    fetch('/api/tracking/track', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ event, ...data }),
                        keepalive: true
                    });
                }
            } catch(e) {}
        },

        getDevice() {
            const ua = navigator.userAgent;
            if (/mobile|android|iphone/i.test(ua)) return 'mobile';
            if (/tablet|ipad/i.test(ua)) return 'tablet';
            return 'desktop';
        },

        getBrowser() {
            const ua = navigator.userAgent;
            if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome';
            if (ua.includes('Firefox')) return 'Firefox';
            if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
            if (ua.includes('Edg')) return 'Edge';
            return 'Other';
        }
    };

    window.FlayTracker = FlayTracker;
    document.addEventListener('DOMContentLoaded', () => FlayTracker.init());
})();
</script>`;
    }
}

module.exports = new CookieConsent();
