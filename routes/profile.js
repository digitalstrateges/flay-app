const express = require('express');
const Profile = require('../models/Profile');
const User = require('../models/User');
const config = require('../config');
const { auth, optionalAuth, requirePlan, rateLimit } = require('../middleware/auth');

const router = express.Router();

// GET /api/profile/my
router.get('/my', auth, (req, res) => {
    try {
        const profile = Profile.findByUserId(req.user.id);
        if (!profile) return res.status(404).json({ message: 'Profil non trouve.' });
        const analytics = Profile.getAnalytics(profile.id);
        res.json({ profile, analytics });
    } catch (error) {
        res.status(500).json({ message: 'Erreur serveur.' });
    }
});

// PUT /api/profile/my
router.put('/my', auth, (req, res) => {
    try {
        const existing = Profile.findByUserId(req.user.id);
        if (!existing) return res.status(404).json({ message: 'Profil non trouve.' });

        // Check slug uniqueness
        if (req.body.slug && req.body.slug !== existing.slug) {
            const conflict = Profile.findBySlug(req.body.slug);
            if (conflict) return res.status(400).json({ message: 'Ce lien est deja utilise.' });
        }

        // Check theme access
        const user = User.findById(req.user.id);
        if (user.plan === 'free' && req.body.theme) {
            const theme = Profile.THEMES[req.body.theme];
            if (theme && theme.premium) {
                return res.status(403).json({ message: 'Theme premium. Upgardez au plan Pro.', upgrade: true });
            }
        }

        // Check template access
        if (req.body.template && req.body.template !== 'minimal') {
            if (user.plan === 'free') {
                return res.status(403).json({ message: 'Templates premium. Upgardez au plan Pro.', upgrade: true });
            }
        }

        const profile = Profile.update(req.user.id, req.body);
        res.json({ profile });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET /api/profile/themes
router.get('/themes', (req, res) => {
    res.json({ themes: Profile.THEMES });
});

// GET /api/profile/templates
router.get('/templates', (req, res) => {
    res.json({ templates: Profile.TEMPLATES });
});

// GET /api/profile/public/:slug
router.get('/public/:slug', optionalAuth, rateLimit(60000, 60), (req, res) => {
    try {
        const profile = Profile.findBySlug(req.params.slug);
        if (!profile) return res.status(404).json({ message: 'Profil non trouve.' });

        // Check if published
        if (!profile.isPublished) return res.status(404).json({ message: 'Profil non publie.' });

        // Check password protection
        if (profile.settings?.passwordProtected) {
            const provided = req.headers['x-profile-password'] || req.query.password;
            if (provided !== profile.settings.password) {
                return res.status(401).json({ message: 'Mot de passe requis.', passwordRequired: true });
            }
        }

        // Record view
        Profile.recordView(profile.slug, req.ip, req.headers.referer);

        const user = User.findById(profile.userId);
        const authorName = user ? user.name : 'Utilisateur';
        const isVerified = user && (user.plan === 'pro' || user.plan === 'premium');
        const isOwner = req.user && req.user.id === profile.userId;

        res.json({
            profile,
            authorName,
            isVerified,
            isOwner,
            planInfo: user ? { plan: user.plan } : null
        });
    } catch (error) {
        res.status(500).json({ message: 'Erreur serveur.' });
    }
});

// POST /api/profile/public/:slug/click
router.post('/public/:slug/click', (req, res) => {
    try {
        const profile = Profile.findBySlug(req.params.slug);
        if (profile) Profile.recordClick(profile.slug);
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ message: 'Erreur serveur.' });
    }
});

// POST /api/profile/public/:slug/share
router.post('/public/:slug/share', (req, res) => {
    try {
        const profile = Profile.findBySlug(req.params.slug);
        if (profile) Profile.recordShare(profile.slug);
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ message: 'Erreur serveur.' });
    }
});

// GET /api/profile/search
router.get('/search', rateLimit(60000, 30), (req, res) => {
    try {
        const { q } = req.query;
        if (!q || q.length < 2) return res.json({ results: [] });
        const results = Profile.search(q).slice(0, 20).map(p => {
            const user = User.findById(p.userId);
            return {
                slug: p.slug,
                title: p.title,
                bio: p.bio,
                location: p.location,
                avatar: p.avatar,
                theme: p.theme,
                views: p.analytics?.views || 0,
                authorName: user ? user.name : 'Utilisateur'
            };
        });
        res.json({ results, total: results.length });
    } catch (error) {
        res.status(500).json({ message: 'Erreur serveur.' });
    }
});

// GET /api/profile/top
router.get('/top', (req, res) => {
    try {
        const top = Profile.getTopProfiles(10).map(p => {
            const user = User.findById(p.userId);
            return {
                slug: p.slug,
                title: p.title,
                location: p.location,
                views: p.analytics?.views || 0,
                authorName: user ? user.name : 'Utilisateur'
            };
        });
        res.json({ top });
    } catch (error) {
        res.status(500).json({ message: 'Erreur serveur.' });
    }
});

// GET /api/profile/stats
router.get('/stats', auth, (req, res) => {
    try {
        const profiles = Profile.getAllByUserId(req.user.id);
        const Reservation = require('../models/Reservation');

        let totalViews = 0, totalClicks = 0, totalShares = 0, totalReservations = 0;
        let allRes = [];
        const dailyViews = {};

        for (const p of profiles) {
            totalViews += p.analytics?.views || 0;
            totalClicks += p.analytics?.clicks || 0;
            totalShares += p.analytics?.shares || 0;
            totalReservations += p.analytics?.reservations || 0;
            allRes = allRes.concat(Reservation.findByProfileId(p.id));

            // Merge daily views
            if (p.analytics?.dailyViews) {
                for (const [date, count] of Object.entries(p.analytics.dailyViews)) {
                    dailyViews[date] = (dailyViews[date] || 0) + count;
                }
            }
        }

        // Last 7 days trend
        const weeklyTrend = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const key = date.toISOString().split('T')[0];
            weeklyTrend.push({ date: key, views: dailyViews[key] || 0 });
        }

        res.json({
            profiles: profiles.length,
            totalViews,
            totalClicks,
            totalShares,
            weeklyTrend,
            reservations: {
                total: allRes.length,
                pending: allRes.filter(r => r.status === 'pending').length,
                confirmed: allRes.filter(r => r.status === 'confirmed').length,
                cancelled: allRes.filter(r => r.status === 'cancelled').length
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Erreur serveur.' });
    }
});

// GET /api/profile/analytics/:id
router.get('/analytics/:id', auth, (req, res) => {
    try {
        const profile = Profile.findByUserId(req.user.id);
        if (!profile || profile.id !== req.params.id) {
            return res.status(404).json({ message: 'Profil non trouve.' });
        }
        const analytics = Profile.getAnalytics(profile.id, parseInt(req.query.days) || 30);
        res.json({ analytics });
    } catch (error) {
        res.status(500).json({ message: 'Erreur serveur.' });
    }
});

module.exports = router;
