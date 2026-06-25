const fs = require('fs');
const path = require('path');
const { genId, generateQRCode, generateShareLink, sanitizeHtml } = require('../auth-utils');
const config = require('../config');

const DB_PATH = path.join(__dirname, '..', 'data', 'profiles.json');

function readDB() {
    if (!fs.existsSync(DB_PATH)) return [];
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}

function writeDB(data) {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
}

const THEMES = {
    dark: { name: 'Dark', bg: '#0a0a0f', card: '#1a1a2e', accent: '#6c63ff', text: '#e0e0e0', premium: false },
    light: { name: 'Light', bg: '#ffffff', card: '#f5f5f5', accent: '#6c63ff', text: '#333333', premium: false },
    sunset: { name: 'Sunset', bg: '#1a0a0a', card: '#2e1a1a', accent: '#e94560', text: '#e0e0e0', premium: true },
    ocean: { name: 'Ocean', bg: '#0a1a2e', card: '#1a2e4e', accent: '#4ecdc4', text: '#e0e0e0', premium: true },
    gold: { name: 'Gold', bg: '#1a1a0a', card: '#2e2e1a', accent: '#ffc107', text: '#e0e0e0', premium: true },
    emerald: { name: 'Emerald', bg: '#0a1a0a', card: '#1a2e1a', accent: '#2ecc71', text: '#e0e0e0', premium: true },
    rose: { name: 'Rose', bg: '#1a0a14', card: '#2e1a24', accent: '#e84393', text: '#e0e0e0', premium: true },
    midnight: { name: 'Midnight', bg: '#0a0a1a', card: '#1a1a3e', accent: '#a855f7', text: '#e0e0e0', premium: true },
    coral: { name: 'Coral', bg: '#1a0f0a', card: '#2e1f1a', accent: '#ff7f50', text: '#e0e0e0', premium: true },
    electric: { name: 'Electric', bg: '#0a0a1e', card: '#1a1a3e', accent: '#00d4ff', text: '#e0e0e0', premium: true },
    forest: { name: 'Forest', bg: '#0a1a0a', card: '#1a3e1a', accent: '#00ff88', text: '#e0e0e0', premium: true }
};

const TEMPLATES = {
    minimal: { name: 'Minimal', layout: 'centered', features: ['avatar', 'title', 'services', 'contact'] },
    creative: { name: 'Creatif', layout: 'masonry', features: ['avatar', 'gallery', 'services', 'socials', 'contact'] },
    business: { name: 'Business', layout: 'grid', features: ['avatar', 'title', 'services', 'testimonials', 'contact'] },
    portfolio: { name: 'Portfolio', layout: 'showcase', features: ['avatar', 'gallery', 'services', 'stats', 'contact'] }
};

class Profile {
    static THEMES = THEMES;
    static TEMPLATES = TEMPLATES;

    static findByUserId(userId) {
        return readDB().find(p => p.userId === userId);
    }
    static findBySlug(slug) {
        return readDB().find(p => p.slug === slug);
    }

    static create(userId, data = {}) {
        const profiles = readDB();
        if (profiles.find(p => p.userId === userId)) throw new Error('Un profil existe deja');

        const slug = (data.slug || 'mon-profil').toLowerCase();
        const baseUrl = config.BASE_URL;

        const profile = {
            id: genId(),
            userId,
            slug,
            title: sanitizeHtml(data.title || 'Mon Profil Pro'),
            subtitle: sanitizeHtml(data.subtitle || ''),
            bio: sanitizeHtml(data.bio || ''),
            avatar: data.avatar || '',
            coverImage: data.coverImage || '',
            phone: data.phone || '',
            email: data.email || '',
            location: data.location || '',
            website: data.website || '',
            socials: { facebook: '', instagram: '', linkedin: '', whatsapp: '', twitter: '', tiktok: '', youtube: '', ...(data.socials || {}) },
            services: data.services || [],
            testimonials: data.testimonials || [],
            gallery: data.gallery || [],
            theme: data.theme || 'dark',
            template: data.template || 'minimal',
            customCss: data.customCss || '',
            customColors: data.customColors || null,
            language: data.language || 'fr',
            seo: {
                title: data.title || 'Mon Profil Pro',
                description: data.bio || '',
                image: data.avatar || '',
                keywords: []
            },
            analytics: {
                views: 0,
                clicks: 0,
                shares: 0,
                reservations: 0,
                uniqueVisitors: 0,
                dailyViews: {},
                referrers: {}
            },
            settings: {
                showViews: true,
                showReservations: true,
                showContact: true,
                showSocials: true,
                showServices: true,
                enableBooking: true,
                customDomain: '',
                passwordProtected: false,
                password: ''
            },
            qrCode: generateQRCode(`${baseUrl}/p/${slug}`),
            shareLink: generateShareLink(slug, baseUrl),
            isPublished: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        profiles.push(profile);
        writeDB(profiles);
        return profile;
    }

    static update(userId, data) {
        const profiles = readDB();
        const idx = profiles.findIndex(p => p.userId === userId);
        if (idx === -1) return null;

        const slug = (data.slug || profiles[idx].slug).toLowerCase();
        const baseUrl = config.BASE_URL;

        // Sanitize string fields
        ['title', 'subtitle', 'bio', 'location'].forEach(field => {
            if (data[field]) data[field] = sanitizeHtml(data[field]);
        });

        profiles[idx] = {
            ...profiles[idx],
            ...data,
            slug,
            qrCode: generateQRCode(`${baseUrl}/p/${slug}`),
            shareLink: generateShareLink(slug, baseUrl),
            seo: {
                ...profiles[idx].seo,
                title: data.title || profiles[idx].title,
                description: data.bio || profiles[idx].bio,
                image: data.avatar || profiles[idx].avatar
            },
            updatedAt: new Date().toISOString()
        };
        writeDB(profiles);
        return profiles[idx];
    }

    static recordView(slug, ip, referrer) {
        const profiles = readDB();
        const idx = profiles.findIndex(p => p.slug === slug);
        if (idx === -1) return;

        const today = new Date().toISOString().split('T')[0];
        if (!profiles[idx].analytics.dailyViews) profiles[idx].analytics.dailyViews = {};
        profiles[idx].analytics.dailyViews[today] = (profiles[idx].analytics.dailyViews[today] || 0) + 1;
        profiles[idx].analytics.views = (profiles[idx].analytics.views || 0) + 1;

        if (referrer) {
            if (!profiles[idx].analytics.referrers) profiles[idx].analytics.referrers = {};
            profiles[idx].analytics.referrers[referrer] = (profiles[idx].analytics.referrers[referrer] || 0) + 1;
        }

        writeDB(profiles);
    }

    static recordClick(slug) {
        const profiles = readDB();
        const idx = profiles.findIndex(p => p.slug === slug);
        if (idx !== -1) {
            profiles[idx].analytics.clicks = (profiles[idx].analytics.clicks || 0) + 1;
            writeDB(profiles);
        }
    }

    static recordShare(slug) {
        const profiles = readDB();
        const idx = profiles.findIndex(p => p.slug === slug);
        if (idx !== -1) {
            profiles[idx].analytics.shares = (profiles[idx].analytics.shares || 0) + 1;
            writeDB(profiles);
        }
    }

    static recordReservation(slug) {
        const profiles = readDB();
        const idx = profiles.findIndex(p => p.slug === slug);
        if (idx !== -1) {
            profiles[idx].analytics.reservations = (profiles[idx].analytics.reservations || 0) + 1;
            writeDB(profiles);
        }
    }

    static getAllByUserId(userId) {
        return readDB().filter(p => p.userId === userId);
    }

    static getTopProfiles(limit = 10) {
        return readDB().sort((a, b) => (b.analytics?.views || 0) - (a.analytics?.views || 0)).slice(0, limit);
    }

    static search(query) {
        const q = query.toLowerCase();
        return readDB().filter(p =>
            p.title.toLowerCase().includes(q) ||
            p.bio.toLowerCase().includes(q) ||
            p.location.toLowerCase().includes(q) ||
            p.slug.toLowerCase().includes(q)
        );
    }

    static getAnalytics(profileId, days = 30) {
        const profile = readDB().find(p => p.id === profileId);
        if (!profile) return null;

        const dailyViews = profile.analytics?.dailyViews || {};
        const last30Days = [];
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const key = date.toISOString().split('T')[0];
            last30Days.push({ date: key, views: dailyViews[key] || 0 });
        }

        return {
            totalViews: profile.analytics?.views || 0,
            totalClicks: profile.analytics?.clicks || 0,
            totalShares: profile.analytics?.shares || 0,
            totalReservations: profile.analytics?.reservations || 0,
            dailyViews: last30Days,
            referrers: profile.analytics?.referrers || {}
        };
    }

    static delete(userId) {
        const profiles = readDB();
        const filtered = profiles.filter(p => p.userId !== userId);
        if (filtered.length === profiles.length) return false;
        writeDB(filtered);
        return true;
    }
}

module.exports = Profile;
