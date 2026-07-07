/**
 * Flay Analytics Engine
 * Tracking detaille et insights en temps reel
 */

class AnalyticsEngine {
    constructor() {
        this.events = new Map();
        this.dailyStats = new Map();
        this.realtime = new Map();
        this._startCleanup();
    }

    _startCleanup() {
        setInterval(() => {
            const now = Date.now();
            const maxAge = 24 * 60 * 60 * 1000;
            for (const [userId, events] of this.events) {
                const filtered = events.filter(e => now - new Date(e.timestamp).getTime() < maxAge);
                if (filtered.length === 0) this.events.delete(userId);
                else this.events.set(userId, filtered);
            }
            const cutoff = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            for (const [key] of this.dailyStats) {
                const date = key.split('_').pop();
                if (date < cutoff) this.dailyStats.delete(key);
            }
        }, 300000);
    }

    track(userId, event, data = {}) {
        const eventId = `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const record = {
            id: eventId,
            userId,
            event,
            data,
            timestamp: new Date().toISOString(),
            date: new Date().toISOString().split('T')[0]
        };

        if (!this.events.has(userId)) this.events.set(userId, []);
        const userEvents = this.events.get(userId);
        userEvents.push(record);
        if (userEvents.length > 1000) userEvents.splice(0, userEvents.length - 1000);

        const dailyKey = `${userId}_${record.date}`;
        if (!this.dailyStats.has(dailyKey)) {
            this.dailyStats.set(dailyKey, { views: 0, clicks: 0, shares: 0, reservations: 0, messages: 0 });
        }
        const daily = this.dailyStats.get(dailyKey);
        if (daily[event] !== undefined) daily[event]++;

        this.realtime.set(userId, { lastEvent: event, timestamp: record.timestamp });

        return eventId;
    }

    getStats(userId, period = '30d') {
        const now = new Date();
        const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
        let views = 0, clicks = 0, shares = 0, reservations = 0, messages = 0;
        const daily = [];

        for (let i = 0; i < days; i++) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            const key = `${userId}_${d.toISOString().split('T')[0]}`;
            const stats = this.dailyStats.get(key) || { views: 0, clicks: 0, shares: 0, reservations: 0, messages: 0 };
            views += stats.views;
            clicks += stats.clicks;
            shares += stats.shares;
            reservations += stats.reservations;
            messages += stats.messages;
            daily.unshift({ date: d.toISOString().split('T')[0], ...stats });
        }

        const ctr = views > 0 ? ((clicks / views) * 100).toFixed(1) : 0;
        const convRate = clicks > 0 ? ((reservations / clicks) * 100).toFixed(1) : 0;

        return {
            totalViews: views,
            totalClicks: clicks,
            totalShares: shares,
            totalReservations: reservations,
            totalMessages: messages,
            ctr,
            conversionRate: convRate,
            daily,
            period,
            topDay: daily.reduce((max, d) => d.views > (max?.views || 0) ? d : max, null)
        };
    }

    getRealtime(userId) {
        return this.realtime.get(userId) || null;
    }

    getRecentEvents(userId, limit = 20) {
        const events = this.events.get(userId) || [];
        return events.slice(-limit).reverse();
    }

    getHourlyBreakdown(userId) {
        const hourly = Array(24).fill(0);
        const events = this.events.get(userId) || [];
        events.forEach(e => {
            const hour = new Date(e.timestamp).getHours();
            hourly[hour]++;
        });
        return hourly;
    }

    getReferrers(userId) {
        const referrers = {};
        const events = this.events.get(userId) || [];
        events.forEach(e => {
            if (e.data.referrer) {
                referrers[e.data.referrer] = (referrers[e.data.referrer] || 0) + 1;
            }
        });
        return Object.entries(referrers)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([name, count]) => ({ name, count }));
    }

    getDeviceBreakdown(userId) {
        const devices = { mobile: 0, desktop: 0, tablet: 0, other: 0 };
        const events = this.events.get(userId) || [];
        events.forEach(e => {
            if (e.data.userAgent) {
                const ua = e.data.userAgent.toLowerCase();
                if (/mobile|android|iphone/i.test(ua)) devices.mobile++;
                else if (/tablet|ipad/i.test(ua)) devices.tablet++;
                else if (/desktop|windows|mac|linux/i.test(ua)) devices.desktop++;
                else devices.other++;
            }
        });
        return devices;
    }
}

module.exports = new AnalyticsEngine();
