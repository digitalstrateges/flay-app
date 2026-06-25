const express = require('express');
const crypto = require('crypto');
const { signToken, genId } = require('../auth-utils');
const User = require('../models/User');
const Profile = require('../models/Profile');
const config = require('../config');
const { auth, rateLimit, validateBody, auditLog } = require('../middleware/auth');

const router = express.Router();

// Rate limit auth routes
router.use(rateLimit(config.RATE_LIMITS.auth.window, config.RATE_LIMITS.auth.max));

// POST /api/auth/register
router.post('/register', validateBody({
    name: { required: true, min: 2, max: 100 },
    email: { required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    username: { required: true, min: 3, max: 30, pattern: /^[a-zA-Z0-9_-]+$/ },
    password: { required: true, min: 6 }
}), auditLog('REGISTER'), async (req, res) => {
    try {
        const { name, email, username, password } = req.body;

        const user = User.create({ name, email, username, password });
        Profile.create(user.id, { slug: username, title: `${name} - Profil Flay`, email });

        const token = signToken({ id: user.id }, config.JWT_SECRET, 30 * 24 * 60 * 60); // 30 days
        const refreshToken = signToken({ id: user.id, type: 'refresh' }, config.JWT_REFRESH_SECRET, 90 * 24 * 60 * 60); // 90 days

        // Store session
        User.addSession(user.id, {
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            token: token.substring(0, 20) + '...'
        });

        res.status(201).json({
            message: 'Compte cree avec succes !',
            token,
            refreshToken,
            user,
            expiresIn: 30 * 24 * 60 * 60
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// POST /api/auth/login
router.post('/login', validateBody({
    email: { required: true },
    password: { required: true }
}), auditLog('LOGIN'), async (req, res) => {
    try {
        const { email, password, remember } = req.body;

        const user = User.verify(email, password);
        if (!user) return res.status(401).json({ message: 'Email ou mot de passe incorrect.' });

        const expiresIn = remember ? 90 * 24 * 60 * 60 : 30 * 24 * 60 * 60; // 90 or 30 days
        const token = signToken({ id: user.id }, config.JWT_SECRET, expiresIn);
        const refreshToken = signToken({ id: user.id, type: 'refresh' }, config.JWT_REFRESH_SECRET, 90 * 24 * 60 * 60);

        User.addSession(user.id, {
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            token: token.substring(0, 20) + '...'
        });

        const profile = Profile.findByUserId(user.id);
        const daysLeft = User.getPlanDaysLeft(user.id);

        res.json({
            token,
            refreshToken,
            user,
            profile,
            planInfo: {
                plan: user.plan,
                daysLeft,
                isActive: User.isPlanActive(user.id)
            },
            expiresIn
        });
    } catch (error) {
        res.status(500).json({ message: 'Erreur serveur.' });
    }
});

// POST /api/auth/refresh
router.post('/refresh', (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) return res.status(400).json({ message: 'Refresh token requis.' });

        const decoded = require('../auth-utils').verifyToken(refreshToken, config.JWT_REFRESH_SECRET);
        if (!decoded || decoded.type !== 'refresh') {
            return res.status(401).json({ message: 'Refresh token invalide.' });
        }

        const user = User.findById(decoded.id);
        if (!user) return res.status(404).json({ message: 'Utilisateur non trouve.' });

        const token = signToken({ id: user.id }, config.JWT_SECRET, 30 * 24 * 60 * 60);
        const newRefreshToken = signToken({ id: user.id, type: 'refresh' }, config.JWT_REFRESH_SECRET, 90 * 24 * 60 * 60);

        res.json({ token, refreshToken: newRefreshToken });
    } catch (error) {
        res.status(401).json({ message: 'Token invalide.' });
    }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', validateBody({ email: { required: true } }), auditLog('FORGOT_PASSWORD'), (req, res) => {
    try {
        const { email } = req.body;
        const user = User.findByEmail(email);

        // Always return success to prevent email enumeration
        if (!user) {
            return res.json({ message: 'Si cet email existe, un lien de reinitialisation a ete envoye.' });
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        User.setResetToken(user.id, resetToken);

        // In production, send email here
        console.log(`[PASSWORD RESET] User: ${user.email} | Token: ${resetToken}`);

        res.json({
            message: 'Si cet email existe, un lien de reinitialisation a ete envoye.',
            // In dev only - remove in production
            debug: { resetToken, resetUrl: `${config.BASE_URL}/reset-password?token=${resetToken}` }
        });
    } catch (error) {
        res.status(500).json({ message: 'Erreur serveur.' });
    }
});

// POST /api/auth/reset-password
router.post('/reset-password', validateBody({
    token: { required: true },
    password: { required: true, min: 6 }
}), auditLog('RESET_PASSWORD'), (req, res) => {
    try {
        const { token, password } = req.body;

        const user = User.resetPassword(token, password);
        if (!user) return res.status(400).json({ message: 'Token invalide ou expire.' });

        res.json({ message: 'Mot de passe reinitialise avec succes.' });
    } catch (error) {
        res.status(500).json({ message: 'Erreur serveur.' });
    }
});

// GET /api/auth/me
router.get('/me', auth, (req, res) => {
    try {
        const user = User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'Utilisateur non trouve.' });

        const { password: _, ...safeUser } = user;
        const profile = Profile.findByUserId(user.id);
        const daysLeft = User.getPlanDaysLeft(user.id);
        const invoices = require('../models/Payment').getUserInvoices(user.id);

        res.json({
            user: safeUser,
            profile,
            planInfo: {
                plan: user.plan,
                daysLeft,
                isActive: User.isPlanActive(user.id),
                expiry: user.planExpiry,
                autoRenew: user.planAutoRenew
            },
            invoices: invoices.slice(0, 5)
        });
    } catch (error) {
        res.status(500).json({ message: 'Erreur serveur.' });
    }
});

// PUT /api/auth/me
router.put('/me', auth, auditLog('UPDATE_PROFILE'), (req, res) => {
    try {
        const allowed = ['name', 'email', 'language', 'avatar', 'phone', 'location', 'bio', 'notifications'];
        const updateData = {};
        allowed.forEach(field => {
            if (req.body[field] !== undefined) updateData[field] = req.body[field];
        });

        const user = User.update(req.user.id, updateData);
        if (!user) return res.status(404).json({ message: 'Utilisateur non trouve.' });
        res.json({ user });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// PUT /api/auth/password
router.put('/password', auth, validateBody({
    currentPassword: { required: true },
    newPassword: { required: true, min: 6 }
}), auditLog('CHANGE_PASSWORD'), (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = User.findById(req.user.id);

        if (!require('../auth-utils').verifyPassword(currentPassword, user.password)) {
            return res.status(400).json({ message: 'Mot de passe actuel incorrect.' });
        }

        User.update(req.user.id, { password: require('../auth-utils').hashPassword(newPassword) });
        res.json({ message: 'Mot de passe mis a jour.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET /api/auth/plans
router.get('/plans', (req, res) => {
    res.json({ plans: config.PLANS });
});

// GET /api/auth/sessions
router.get('/sessions', auth, (req, res) => {
    const user = User.findById(req.user.id);
    res.json({ sessions: user?.sessions || [] });
});

// DELETE /api/auth/sessions/:id
router.delete('/sessions/:id', auth, (req, res) => {
    User.removeSession(req.user.id, req.params.id);
    res.json({ message: 'Session supprimee.' });
});

module.exports = router;
