/**
 * Flay Omni - Analytics Tracker
 * Lightweight client-side + server-side analytics
 * Google Analytics 4 + Meta Pixel + Custom tracking
 */

// Client-side analytics (included in pages)
const CLIENT_ANALYTICS = `
<script>
(function() {
    const FLAY_ANALYTICS = {
        userId: null,
        sessionId: 's_' + Math.random().toString(36).substr(2, 9),
        events: [],

        init(userId) {
            this.userId = userId;
            this.trackPageView();
            // Track page views on navigation
            window.addEventListener('popstate', () => this.trackPageView());
        },

        trackPageView(page) {
            page = page || window.location.pathname;
            this.track('page_view', { page });
        },

        track(eventType, data = {}) {
            const event = {
                event_type: eventType,
                page: window.location.pathname,
                referrer: document.referrer || '',
                device: /Mobi/.test(navigator.userAgent) ? 'mobile' : 'desktop',
                browser: this._getBrowser(),
                os: this._getOS(),
                timestamp: Date.now(),
                ...data
            };
            this.events.push(event);
            this._send(event);
        },

        _send(event) {
            if (!navigator.sendBeacon) return;
            const payload = JSON.stringify({
                user_id: this.userId,
                session_id: this.sessionId,
                ...event
            });
            navigator.sendBeacon('/api/analytics/track', payload);
        },

        _getBrowser() {
            const ua = navigator.userAgent;
            if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome';
            if (ua.includes('Firefox')) return 'Firefox';
            if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
            if (ua.includes('Edg')) return 'Edge';
            return 'Other';
        },

        _getOS() {
            const ua = navigator.userAgent;
            if (ua.includes('Win')) return 'Windows';
            if (ua.includes('Mac')) return 'macOS';
            if (ua.includes('Linux')) return 'Linux';
            if (ua.includes('Android')) return 'Android';
            if (ua.includes('iOS') || ua.includes('iPhone')) return 'iOS';
            return 'Other';
        }
    };

    window.FlayAnalytics = FLAY_ANALYTICS;
})();
</script>
`;

// Google Analytics 4 integration
function ga4Script(measurementId) {
    if (!measurementId) return '';
    return `
<!-- Google Analytics 4 -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${measurementId}"></script>
<script>
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${measurementId}', {
    page_title: document.title,
    custom_map: { dimension1: 'user_id' }
});
</script>`;
}

// Meta Pixel integration
function metaPixelScript(pixelId) {
    if (!pixelId) return '';
    return `
<!-- Meta Pixel -->
<script>
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window,document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${pixelId}');
fbq('track', 'PageView');
</script>
<noscript><img height="1" width="1" style="display:none"
src="https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1"/></noscript>`;
}

// Hotjar integration
function hotjarScript(hjid) {
    if (!hjid) return '';
    return `
<!-- Hotjar -->
<script>
(function(h,o,t,j,a,r){
    h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
    h._hjSettings={hjid:${hjid},hjsv:6};
    a=o.getElementsByTagName('head')[0];
    r=o.createElement('script');r.async=1;
    r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
    a.appendChild(r);
})(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');
</script>`;
}

module.exports = { CLIENT_ANALYTICS, ga4Script, metaPixelScript, hotjarScript };
