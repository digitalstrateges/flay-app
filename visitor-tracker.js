/**
 * Flay Omni - Visitor Tracking Engine
 * Tracking des visiteurs/clients de nos utilisateurs
 * Cookies, fingerprinting, sessions, heatmaps
 */

const crypto = require('crypto');

class VisitorTracker {
    constructor() {
        this.visitors = new Map();        // visitorId -> visitor data
        this.sessions = new Map();         // sessionId -> session data
        this.pageviews = [];               // all pageviews
        this.clicks = [];                  // all click events
        this.heatmaps = new Map();         // userId -> heatmap data
        this.cookies = new Map();          // visitorId -> cookies set
        this.referrers = new Map();        // userId -> referrer data
        this.realtime = new Map();         // userId -> realtime visitors
        this.goals = new Map();            // userId -> conversion goals
        this.funnels = new Map();          // userId -> funnel data
    }

    // === COOKIE MANAGEMENT ===
    generateCookieId() {
        return `flay_vid_${crypto.randomBytes(16).toString('hex')}`;
    }

    getCookieConfig() {
        return {
            name: '_flay_vid',
            maxAge: 365 * 24 * 60 * 60,  // 1 an
            path: '/',
            sameSite: 'Lax',
            httpOnly: false,
            secure: true
        };
    }

    getConsentCookieConfig() {
        return {
            name: '_flay_consent',
            maxAge: 365 * 24 * 60 * 60,
            path: '/',
            sameSite: 'Lax',
            httpOnly: false,
            secure: true
        };
    }

    // === VISITOR IDENTIFICATION ===
    identifyVisitor(visitorId, data = {}) {
        if (!this.visitors.has(visitorId)) {
            this.visitors.set(visitorId, {
                id: visitorId,
                firstVisit: new Date().toISOString(),
                lastVisit: new Date().toISOString(),
                visits: 0,
                pageviews: 0,
                duration: 0,
                devices: [],
                browsers: [],
                locations: [],
                referrers: [],
                consents: {},
                tags: [],
                score: 0,
                ...data
            });
        }
        const visitor = this.visitors.get(visitorId);
        visitor.lastVisit = new Date().toISOString();
        visitor.visits++;
        return visitor;
    }

    // === SESSION TRACKING ===
    startSession(visitorId, userId, data = {}) {
        const sessionId = `sess_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        const session = {
            id: sessionId,
            visitorId,
            userId,
            start: new Date().toISOString(),
            end: null,
            duration: 0,
            pageviews: 0,
            pages: [],
            referrer: data.referrer || '',
            medium: data.medium || 'direct',
            source: data.source || '',
            campaign: data.campaign || '',
            device: data.device || 'unknown',
            browser: data.browser || 'unknown',
            os: data.os || 'unknown',
            screen: data.screen || '',
            language: data.language || 'fr',
            country: data.country || '',
            city: data.city || '',
            ip: data.ip || '',
            active: true,
            scrollDepth: 0,
            interactions: 0,
            converted: false
        };
        this.sessions.set(sessionId, session);

        // Update realtime
        if (!this.realtime.has(userId)) this.realtime.set(userId, new Set());
        this.realtime.get(userId).add(sessionId);

        return session;
    }

    endSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) return null;
        session.end = new Date().toISOString();
        session.duration = (new Date(session.end) - new Date(session.start)) / 1000;
        session.active = false;

        // Remove from realtime
        const rt = this.realtime.get(session.userId);
        if (rt) rt.delete(sessionId);

        return session;
    }

    // === PAGEVIEW TRACKING ===
    trackPageview(visitorId, userId, data = {}) {
        const view = {
            id: `pv_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
            visitorId,
            userId,
            page: data.page || '/',
            title: data.title || '',
            referrer: data.referrer || '',
            timestamp: new Date().toISOString(),
            duration: 0,
            scrollDepth: 0,
            device: data.device || 'unknown',
            browser: data.browser || 'unknown',
            country: data.country || '',
            city: data.city || '',
            exit: false
        };
        this.pageviews.push(view);

        // Update visitor
        const visitor = this.visitors.get(visitorId);
        if (visitor) visitor.pageviews++;

        return view;
    }

    exitPage(pageviewId, duration, scrollDepth) {
        const pv = this.pageviews.find(p => p.id === pageviewId);
        if (pv) {
            pv.duration = duration;
            pv.scrollDepth = scrollDepth;
            pv.exit = true;
        }
    }

    // === CLICK TRACKING ===
    trackClick(visitorId, userId, data = {}) {
        const click = {
            id: `clk_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
            visitorId,
            userId,
            element: data.element || '',
            text: data.text || '',
            url: data.url || '',
            page: data.page || '/',
            x: data.x || 0,
            y: data.y || 0,
            timestamp: new Date().toISOString()
        };
        this.clicks.push(click);
        return click;
    }

    // === HEATMAP DATA ===
    trackHeatmap(userId, page, data) {
        const key = `${userId}_${page}`;
        if (!this.heatmaps.has(key)) {
            this.heatmaps.set(key, { userId, page, clicks: [], scrolls: [], areas: [] });
        }
        const hm = this.heatmaps.get(key);
        hm.clicks.push({ x: data.x, y: data.y, timestamp: new Date().toISOString() });
    }

    getHeatmap(userId, page) {
        return this.heatmaps.get(`${userId}_${page}`) || null;
    }

    // === CONSENT MANAGEMENT ===
    setConsent(visitorId, consent) {
        const visitor = this.visitors.get(visitorId);
        if (visitor) {
            visitor.consents = {
                analytics: consent.analytics !== false,
                marketing: consent.marketing || false,
                personalization: consent.personalization || false,
                timestamp: new Date().toISOString()
            };
        }
        return visitor?.consents || {};
    }

    hasConsent(visitorId, type) {
        const visitor = this.visitors.get(visitorId);
        return visitor?.consents?.[type] || false;
    }

    // === REFERRER TRACKING ===
    trackReferrer(userId, referrer, medium, source) {
        if (!this.referrers.has(userId)) this.referrers.set(userId, []);
        this.referrers.get(userId).push({
            referrer, medium, source,
            timestamp: new Date().toISOString()
        });
    }

    // === CONVERSION GOALS ===
    createGoal(userId, data) {
        const id = `goal_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        const goal = {
            id, userId,
            name: data.name || 'Conversion',
            type: data.type || 'pageview',
            url: data.url || '',
            element: data.element || '',
            value: data.value || 0,
            conversions: 0,
            createdAt: new Date().toISOString()
        };
        if (!this.goals.has(userId)) this.goals.set(userId, []);
        this.goals.get(userId).push(goal);
        return goal;
    }

    trackConversion(goalId, visitorId) {
        for (const [, goals] of this.goals) {
            const goal = goals.find(g => g.id === goalId);
            if (goal) {
                goal.conversions++;
                const visitor = this.visitors.get(visitorId);
                if (visitor) visitor.score += goal.value || 10;
                return true;
            }
        }
        return false;
    }

    // === FUNNEL TRACKING ===
    createFunnel(userId, data) {
        const id = `funnel_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        const funnel = {
            id, userId,
            name: data.name || 'Funnel',
            steps: data.steps || [],
            visitors: {},
            createdAt: new Date().toISOString()
        };
        if (!this.funnels.has(userId)) this.funnels.set(userId, []);
        this.funnels.get(userId).push(funnel);
        return funnel;
    }

    trackFunnelStep(funnelId, visitorId, stepIndex) {
        for (const [, funnels] of this.funnels) {
            const funnel = funnels.find(f => f.id === funnelId);
            if (funnel) {
                if (!funnel.visitors[visitorId]) funnel.visitors[visitorId] = [];
                funnel.visitors[visitorId].push({ step: stepIndex, timestamp: new Date().toISOString() });
                return true;
            }
        }
        return false;
    }

    // === ANALYTICS ===
    getVisitorStats(userId, period = '30d') {
        const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        const userSessions = [...this.sessions.values()].filter(s => s.userId === userId && new Date(s.start) >= since);
        const userPageviews = this.pageviews.filter(p => p.userId === userId && new Date(p.timestamp) >= since);
        const userClicks = this.clicks.filter(c => c.userId === userId && new Date(c.timestamp) >= since);

        const uniqueVisitors = new Set(userSessions.map(s => s.visitorId)).size;
        const totalSessions = userSessions.length;
        const totalPageviews = userPageviews.length;
        const totalClicks = userClicks.length;

        const avgDuration = userSessions.length > 0
            ? userSessions.reduce((sum, s) => sum + (s.duration || 0), 0) / userSessions.length
            : 0;

        const bounceRate = totalSessions > 0
            ? ((userSessions.filter(s => s.pageviews <= 1).length / totalSessions) * 100).toFixed(1)
            : 0;

        const avgPagesPerSession = totalSessions > 0
            ? (totalPageviews / totalSessions).toFixed(1)
            : 0;

        // Top pages
        const pageCounts = {};
        userPageviews.forEach(p => { pageCounts[p.page] = (pageCounts[p.page] || 0) + 1; });
        const topPages = Object.entries(pageCounts).sort(([,a], [,b]) => b - a).slice(0, 10).map(([page, views]) => ({ page, views }));

        // Devices
        const devices = { mobile: 0, desktop: 0, tablet: 0 };
        userSessions.forEach(s => {
            if (s.device === 'mobile') devices.mobile++;
            else if (s.device === 'tablet') devices.tablet++;
            else devices.desktop++;
        });

        // Browsers
        const browserCounts = {};
        userSessions.forEach(s => { browserCounts[s.browser] = (browserCounts[s.browser] || 0) + 1; });
        const browsers = Object.entries(browserCounts).sort(([,a], [,b]) => b - a).slice(0, 5).map(([name, count]) => ({ name, count }));

        // Referrers
        const refCounts = {};
        userSessions.forEach(s => {
            if (s.referrer) {
                try {
                    const domain = new URL(s.referrer).hostname;
                    refCounts[domain] = (refCounts[domain] || 0) + 1;
                } catch {}
            }
        });
        const referrers = Object.entries(refCounts).sort(([,a], [,b]) => b - a).slice(0, 10).map(([name, count]) => ({ name, count }));

        // Locations
        const locCounts = {};
        userSessions.forEach(s => {
            if (s.country) locCounts[s.country] = (locCounts[s.country] || 0) + 1;
        });
        const locations = Object.entries(locCounts).sort(([,a], [,b]) => b - a).slice(0, 10).map(([name, count]) => ({ name, count }));

        // Hourly breakdown
        const hourly = Array(24).fill(0);
        userPageviews.forEach(p => {
            const h = new Date(p.timestamp).getHours();
            hourly[h]++;
        });

        // Daily breakdown
        const daily = [];
        for (let i = 0; i < days; i++) {
            const d = new Date(Date.now() - (days - 1 - i) * 24 * 60 * 60 * 1000);
            const dateStr = d.toISOString().split('T')[0];
            const dayPV = userPageviews.filter(p => p.timestamp.startsWith(dateStr)).length;
            const daySessions = userSessions.filter(s => s.start.startsWith(dateStr)).length;
            daily.push({ date: dateStr, pageviews: dayPV, sessions: daySessions });
        }

        // Goals
        const goals = (this.goals.get(userId) || []).map(g => ({
            id: g.id, name: g.name, conversions: g.conversions
        }));

        return {
            uniqueVisitors,
            totalSessions,
            totalPageviews,
            totalClicks,
            avgDuration: Math.round(avgDuration),
            bounceRate,
            avgPagesPerSession,
            topPages,
            devices,
            browsers,
            referrers,
            locations,
            hourly,
            daily,
            goals,
            period
        };
    }

    // === REALTIME ===
    getRealtimeVisitors(userId) {
        const active = this.realtime.get(userId);
        if (!active) return [];
        const visitors = [];
        for (const sessionId of active) {
            const session = this.sessions.get(sessionId);
            if (session && session.active) {
                visitors.push({
                    sessionId: session.id,
                    visitorId: session.visitorId,
                    page: session.pages[session.pages.length - 1] || '/',
                    device: session.device,
                    browser: session.browser,
                    country: session.country,
                    duration: Math.round((Date.now() - new Date(session.start)) / 1000),
                    enteredAt: session.start
                });
            }
        }
        return visitors;
    }

    getRealtimeCount(userId) {
        return this.realtime.get(userId)?.size || 0;
    }

    // === VISITOR PROFILE ===
    getVisitorProfile(visitorId) {
        return this.visitors.get(visitorId) || null;
    }

    getUserVisitors(userId, limit = 50) {
        const visitors = [];
        for (const [, v] of this.visitors) {
            // Check if visitor has sessions with this userId
            for (const [, s] of this.sessions) {
                if (s.visitorId === visitorId && s.userId === userId) {
                    visitors.push(v);
                    break;
                }
            }
        }
        return visitors.slice(0, limit).sort((a, b) => new Date(b.lastVisit) - new Date(a.lastVisit));
    }

    // === UTILITY ===
    parseUserAgent(ua) {
        if (!ua) return { browser: 'unknown', os: 'unknown', device: 'unknown' };
        const lower = ua.toLowerCase();
        let browser = 'other';
        if (lower.includes('chrome') && !lower.includes('edg')) browser = 'Chrome';
        else if (lower.includes('firefox')) browser = 'Firefox';
        else if (lower.includes('safari') && !lower.includes('chrome')) browser = 'Safari';
        else if (lower.includes('edg')) browser = 'Edge';
        else if (lower.includes('opera') || lower.includes('opr')) browser = 'Opera';

        let os = 'other';
        if (lower.includes('windows')) os = 'Windows';
        else if (lower.includes('mac')) os = 'macOS';
        else if (lower.includes('linux')) os = 'Linux';
        else if (lower.includes('android')) os = 'Android';
        else if (lower.includes('iphone') || lower.includes('ipad')) os = 'iOS';

        let device = 'desktop';
        if (lower.includes('mobile') || lower.includes('android') || lower.includes('iphone')) device = 'mobile';
        else if (lower.includes('ipad') || lower.includes('tablet')) device = 'tablet';

        return { browser, os, device };
    }

    // === CLEANUP ===
    cleanup(maxAgeDays = 90) {
        const cutoff = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000);
        this.pageviews = this.pageviews.filter(p => new Date(p.timestamp) >= cutoff);
        this.clicks = this.clicks.filter(c => new Date(c.timestamp) >= cutoff);
    }
}

module.exports = new VisitorTracker();
