const express = require('express');
const crypto = require('crypto');
const security = require('../security');
const db = require('../db');
const config = require('../config');
const router = express.Router();

router.post('/register', security.rateLimitMiddleware(900000, 10), async (req, res) => {
  try {
    const { email, password, name, username } = req.body;
    if (!email || !password || !name || !username) return res.status(400).json({ error: 'Champs requis manquants' });
    if (!/^[a-zA-Z0-9_-]{3,30}$/.test(username)) return res.status(400).json({ error: 'Pseudo 3-30 car. (lettres, chiffres, -,_)' });
    if (!security.validateEmail(email)) return res.status(400).json({ error: 'Email invalide' });
    const pwErrors = security.validatePassword(password);
    if (pwErrors.length) return res.status(400).json({ error: 'Mot de passe: ' + pwErrors.join(', ') });

    const existingEmail = db.findBy('users', 'email', email);
    if (existingEmail) return res.status(400).json({ error: 'Email deja utilise' });
    const existingUsername = db.findBy('users', 'username', username);
    if (existingUsername) return res.status(400).json({ error: 'Nom d\'utilisateur deja pris' });

    const id = `user_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const hashed = security.hashPassword(password);
    const tokens = security.generateTokens(id);

    db.insert('users', { id, email, name: security.sanitize(name), username, password: JSON.stringify(hashed), salt: '' });
    db.insert('profiles', { userId: id, slug: username, theme: 'dark', template: 'minimal', email, services: '[]', socials: '{}', analytics: '{}', plan: 'free' });

    res.status(201).json({ user: { id, email, name, username, plan: 'free' }, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, expiresIn: tokens.expiresIn });
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de l\'inscription' });
  }
});

router.post('/login', security.rateLimitMiddleware(900000, 10), async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email et mot de passe requis' });
    if (!security.validateEmail(email)) return res.status(400).json({ error: 'Email invalide' });

    const ip = security.getClientIP(req);
    if (security.isBlocked(ip)) return res.status(429).json({ error: 'Trop de tentatives. IP bloquee 1 heure.', code: 'IP_BLOCKED' });
    if (!security.checkLoginLimit(ip)) return res.status(429).json({ error: 'Trop de tentatives. Reessayez dans 15 min.', code: 'RATE_LIMITED' });

    const user = db.findBy('users', 'email', email);
    if (!user) return res.status(401).json({ error: 'Email ou mot de passe incorrect' });

    let stored;
    try { stored = JSON.parse(user.password); } catch { stored = user.password; }
    let valid;
    if (typeof stored === 'object') { valid = security.verifyPassword(password, stored); }
    else { valid = security.verifyPasswordCompat(password, user.password, user.salt); }

    if (!valid) {
      security.incrementBlock(ip);
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    const tokens = security.generateTokens(user.id);
    db.update('users', user.id, { lastLogin: new Date().toISOString() });
    const profile = db.findBy('profiles', 'userId', user.id);

    res.json({
      user: { id: user.id, email: user.email, name: user.name, username: user.username, plan: user.plan, role: user.role },
      profile,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn
    });
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la connexion' });
  }
});

router.post('/refresh', security.rateLimitMiddleware(60000, 10), async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'Refresh token requis' });
    const payload = security.verifyToken(refreshToken);
    if (!payload || payload.type !== 'refresh') return res.status(401).json({ error: 'Refresh token invalide', code: 'INVALID_REFRESH' });
    const user = db.get('users', payload.userId);
    if (!user) return res.status(401).json({ error: 'Utilisateur introuvable', code: 'USER_NOT_FOUND' });
    const tokens = security.generateTokens(payload.userId);
    res.json({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, expiresIn: tokens.expiresIn });
  } catch (err) {
    res.status(500).json({ error: 'Erreur' });
  }
});

router.post('/logout', security.rateLimitMiddleware(60000, 10), async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token) security.revokeToken(token);
    const { refreshToken } = req.body;
    if (refreshToken) security.revokeToken(refreshToken);
    res.json({ message: 'Deconnecte' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur' });
  }
});

router.post('/forgot-password', security.rateLimitMiddleware(900000, 3), async (req, res) => {
  try {
    if (!req.body.email) return res.status(400).json({ error: 'Email requis' });
    const user = db.findBy('users', 'email', req.body.email);
    if (user) {
      const { token } = security.generateToken({ userId: user.id, type: 'reset' }, 3600);
      const tokenId = `reset_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      db.insert('notifications', {
        id: tokenId, userId: user.id, type: 'password_reset', read: 0,
        title: 'Reinitialisation de mot de passe',
        message: `Votre lien: ${config.SITE_URL}/reset-password.html?token=${token}`
      });
      console.log(`[AUTH] Password reset for ${req.body.email}: /reset-password.html?token=${token}`);
    }
    res.json({ message: 'Si cet email existe, un lien a ete envoye' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur' });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Token et mot de passe requis' });
    const pwErrors = security.validatePassword(password);
    if (pwErrors.length) return res.status(400).json({ error: 'Mot de passe: ' + pwErrors.join(', ') });
    const payload = security.verifyToken(token);
    if (!payload || payload.type !== 'reset') return res.status(400).json({ error: 'Token invalide ou expire' });
    const user = db.get('users', payload.userId);
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
    const hashed = security.hashPassword(password);
    db.update('users', user.id, { password: JSON.stringify(hashed) });
    security.revokeToken(token);
    res.json({ message: 'Mot de passe reinitialise' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur' });
  }
});

router.get('/me', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Token manquant', code: 'NO_TOKEN' });
  const payload = security.verifyToken(token);
  if (!payload) return res.status(401).json({ error: 'Token invalide ou expire', code: 'INVALID_TOKEN' });
  const user = db.get('users', payload.userId);
  if (!user) return res.status(401).json({ error: 'Utilisateur introuvable', code: 'USER_NOT_FOUND' });
  res.json({ user: { id: user.id, email: user.email, name: user.name, username: user.username, plan: user.plan, planExpiry: user.planExpiry, role: user.role } });
});

router.put('/password', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Token manquant' });
  const payload = security.verifyToken(token);
  if (!payload) return res.status(401).json({ error: 'Token invalide' });
  const user = db.get('users', payload.userId);
  if (!user) return res.status(401).json({ error: 'Utilisateur introuvable' });
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Mot de passe actuel et nouveau requis' });
  const pwErrors = security.validatePassword(newPassword);
  if (pwErrors.length) return res.status(400).json({ error: 'Mot de passe: ' + pwErrors.join(', ') });

  let stored;
  try { stored = JSON.parse(user.password); } catch { stored = user.password; }
  let valid;
  if (typeof stored === 'object') { valid = security.verifyPassword(currentPassword, stored); }
  else { valid = security.verifyPasswordCompat(currentPassword, user.password, user.salt); }
  if (!valid) return res.status(400).json({ error: 'Mot de passe actuel incorrect' });

  const hashed = security.hashPassword(newPassword);
  db.update('users', user.id, { password: JSON.stringify(hashed) });
  res.json({ message: 'Mot de passe mis a jour' });
});

router.delete('/account', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Token manquant' });
  const payload = security.verifyToken(token);
  if (!payload) return res.status(401).json({ error: 'Token invalide' });
  const user = db.get('users', payload.userId);
  if (!user) return res.status(401).json({ error: 'Utilisateur introuvable' });
  if (!req.body.password) return res.status(400).json({ error: 'Mot de passe requis' });
  let stored;
  try { stored = JSON.parse(user.password); } catch { stored = user.password; }
  let valid;
  if (typeof stored === 'object') { valid = security.verifyPassword(req.body.password, stored); }
  else { valid = security.verifyPasswordCompat(req.body.password, user.password, user.salt); }
  if (!valid) return res.status(400).json({ error: 'Mot de passe incorrect' });

  security.revokeToken(token);
  db.delete('users', user.id);
  db.delete('profiles', user.id);
  const delTables = ['payments', 'reservations', 'contacts', 'deals', 'invoices', 'orders', 'products', 'analytics', 'notifications', 'sessions', 'coupons', 'parcels', 'reviews', 'team_members', 'domains'];
  for (const t of delTables) { try { db.deleteWhere(t, 'userId', user.id); } catch {} }
  try { db.deleteWhere('referrals', 'referrerId', user.id); } catch {}
  res.json({ message: 'Compte supprime' });
});

router.post('/export', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Token manquant' });
  const payload = security.verifyToken(token);
  if (!payload) return res.status(401).json({ error: 'Token invalide' });
  const user = db.get('users', payload.userId);
  if (!user) return res.status(401).json({ error: 'Introuvable' });
  const profile = db.findBy('profiles', 'userId', user.id);
  res.json({ user: { id: user.id, email: user.email, name: user.name, username: user.username, plan: user.plan }, profile, exportedAt: new Date().toISOString() });
});

module.exports = router;
