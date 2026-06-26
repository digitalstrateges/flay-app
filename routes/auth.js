const express = require('express');
const crypto = require('crypto');
const authUtils = require('../auth-utils');
const db = require('../db');
const config = require('../config');
const { rateLimit } = require('../middleware/auth');
const router = express.Router();

router.post('/register', rateLimit(config.RATE_LIMITS?.auth?.window || 900000, config.RATE_LIMITS?.auth?.max || 10), async (req, res) => {
    try {
        const { email, password, name, username } = req.body;
        if (!email || !password || !name || !username) return res.status(400).json({ error: 'Champs requis manquants' });
        if (password.length < 6) return res.status(400).json({ error: 'Mot de passe trop court (min 6)' });
        if (!/^[a-zA-Z0-9_-]+$/.test(username) || username.length < 3) return res.status(400).json({ error: 'Nom d\'utilisateur invalide' });

        const existingEmail = db.findBy('users', 'email', email);
        if (existingEmail) return res.status(400).json({ error: 'Email deja utilise' });
        const existingUsername = db.findBy('users', 'username', username);
        if (existingUsername) return res.status(400).json({ error: 'Nom d\'utilisateur deja pris' });

        const id = `user_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        const hashed = authUtils.hashPassword(password);
        const tokens = authUtils.generateTokens(id);

        db.insert('users', {
            id, email, name, username, password: hashed.hash.split(':')[1], salt: hashed.salt,
            plan: 'free', role: 'user'
        });
        db.insert('profiles', {
            userId: id, slug: username, theme: 'dark', template: 'minimal', email,
            services: '[]', socials: '{}', analytics: '{}', plan: 'free'
        });

        res.status(201).json({ user: { id, email, name, username, plan: 'free' }, ...tokens });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/login', rateLimit(config.RATE_LIMITS?.auth?.window || 900000, config.RATE_LIMITS?.auth?.max || 15), async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'Email et mot de passe requis' });

        const user = db.findBy('users', 'email', email);
        if (!user || !authUtils.verifyPassword(password, user.password, user.salt)) {
            return res.status(400).json({ error: 'Identifiants incorrects' });
        }

        const tokens = authUtils.generateTokens(user.id);
        const profile = db.findBy('profiles', 'userId', user.id);
        res.json({
            user: { id: user.id, email: user.email, name: user.name, username: user.username, plan: user.plan },
            profile,
            ...tokens
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/refresh', async (req, res) => {
    try {
        if (!req.body.refreshToken) return res.status(400).json({ error: 'Refresh token requis' });
        const payload = authUtils.verifyToken(req.body.refreshToken);
        if (!payload) return res.status(401).json({ error: 'Token invalide' });
        const tokens = authUtils.generateTokens(payload.userId);
        res.json(tokens);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/forgot-password', async (req, res) => {
    try {
        if (!req.body.email) return res.status(400).json({ error: 'Email requis' });
        const user = db.findBy('users', 'email', req.body.email);
        if (user) {
            const resetToken = authUtils.generateToken({ userId: user.id, type: 'reset' }, '1h');
            console.log(`[AUTH] Reset token for ${req.body.email}: /reset-password.html?token=${resetToken}`);
        }
        res.json({ message: 'Si cet email existe, un lien a ete envoye' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/reset-password', async (req, res) => {
    try {
        const { token, password } = req.body;
        if (!token || !password) return res.status(400).json({ error: 'Token et mot de passe requis' });
        const payload = authUtils.verifyToken(token);
        if (!payload || payload.type !== 'reset') return res.status(400).json({ error: 'Token invalide' });
        const user = db.get('users', payload.userId);
        if (!user) return res.status(404).json({ error: 'Utilisateur non trouve' });
        const hashed = authUtils.hashPassword(password);
        db.update('users', user.id, { password: hashed.hash.split(':')[1], salt: hashed.salt });
        res.json({ message: 'Mot de passe reinitialise' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/me', (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Token manquant' });
    const payload = authUtils.verifyToken(token);
    if (!payload) return res.status(401).json({ error: 'Token invalide' });
    const user = db.get('users', payload.userId);
    if (!user) return res.status(401).json({ error: 'Utilisateur non trouve' });
    res.json({ user: { id: user.id, email: user.email, name: user.name, username: user.username, plan: user.plan, planExpiry: user.planExpiry } });
});

router.put('/password', async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Token manquant' });
    const payload = authUtils.verifyToken(token);
    if (!payload) return res.status(401).json({ error: 'Token invalide' });
    const user = db.get('users', payload.userId);
    if (!user) return res.status(401).json({ error: 'Utilisateur non trouve' });

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Mot de passe actuel et nouveau requis' });
    if (newPassword.length < 6) return res.status(400).json({ error: 'Nouveau mot de passe trop court (min 6)' });
    if (!authUtils.verifyPassword(currentPassword, user.password, user.salt)) {
        return res.status(400).json({ error: 'Mot de passe actuel incorrect' });
    }
    const hashed = authUtils.hashPassword(newPassword);
    db.update('users', user.id, { password: hashed.hash.split(':')[1], salt: hashed.salt });
    res.json({ message: 'Mot de passe mis a jour' });
});

router.delete('/account', async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Token manquant' });
    const payload = authUtils.verifyToken(token);
    if (!payload) return res.status(401).json({ error: 'Token invalide' });
    const user = db.get('users', payload.userId);
    if (!user) return res.status(401).json({ error: 'Utilisateur non trouve' });
    if (!req.body.password || !authUtils.verifyPassword(req.body.password, user.password, user.salt)) {
        return res.status(400).json({ error: 'Mot de passe requis pour supprimer le compte' });
    }
    db.delete('users', user.id);
    db.delete('profiles', user.id);
    db.deleteWhere('payments', 'userId', user.id);
    db.deleteWhere('reservations', 'userId', user.id);
    res.json({ message: 'Compte supprime avec succes' });
});

router.post('/export', async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Token manquant' });
    const payload = authUtils.verifyToken(token);
    if (!payload) return res.status(401).json({ error: 'Token invalide' });
    const user = db.get('users', payload.userId);
    if (!user) return res.status(401).json({ error: 'Non trouve' });
    const profile = db.findBy('profiles', 'userId', user.id);
    const payments = db.findAll('payments', 'userId', user.id);
    const reservations = db.findAll('reservations', 'userId', user.id);
    res.json({ user: { id: user.id, email: user.email, name: user.name, username: user.username, plan: user.plan }, profile, payments, reservations, exportedAt: new Date().toISOString() });
});

module.exports = router;
