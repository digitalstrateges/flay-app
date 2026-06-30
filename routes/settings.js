const express = require('express');
const crypto = require('crypto');
const { authenticate } = require('../lib/auth');
const db = require('../db');
const twoFactor = require('../two-factor');
const socialAuth = require('../social-auth');
const teamManager = require('../team-manager');
const domainManager = require('../domain-manager');
const notifications = require('../notifications');
const emailSystem = require('../email-system');
const smsSystem = require('../sms-system');
const abTesting = require('../ab-testing');
const router = express.Router();

// --- 2FA ---
router.post('/2fa/setup', authenticate, (req, res) => {
    const { secret, otpauthUrl } = twoFactor.generateSecret(req.user.id);
    const qrCode = twoFactor.getQRCodeDataURL(secret, req.user.email);
    res.json({ secret, otpauthUrl, qrCode });
});

router.post('/2fa/verify', authenticate, (req, res) => {
    const result = twoFactor.enable(req.user.id, req.body.token);
    if (result) return res.json(result);
    res.status(400).json({ error: 'Code invalide' });
});

router.post('/2fa/disable', authenticate, (req, res) => {
    twoFactor.disable(req.user.id);
    res.json({ message: '2FA desactivee' });
});

router.get('/2fa/status', authenticate, (req, res) => {
    res.json({ enabled: twoFactor.isEnabled(req.user.id) });
});

// --- Social Auth ---
router.get('/auth/providers', (req, res) => {
    res.json({ providers: socialAuth.getProviders() });
});

router.post('/auth/social/callback', authenticate, (req, res) => {
    const result = socialAuth.simulateCallback(req.user.id, req.body.provider);
    res.json({ account: result });
});

router.get('/auth/social/linked', authenticate, (req, res) => {
    res.json({ accounts: socialAuth.getLinkedAccounts(req.user.id) });
});

router.delete('/auth/social/:provider', authenticate, (req, res) => {
    socialAuth.unlinkAccount(req.user.id, req.params.provider);
    res.json({ message: 'Compte deconnecte' });
});

// --- Notifications ---
router.get('/notifications', authenticate, (req, res) => {
    res.json({ notifications: notifications.getUserNotifications(req.user.id), unread: notifications.getUnreadCount(req.user.id) });
});

router.post('/notifications/:id/read', authenticate, (req, res) => {
    notifications.markRead(req.user.id, req.params.id);
    res.json({ ok: true });
});

router.post('/notifications/read-all', authenticate, (req, res) => {
    notifications.markAllRead(req.user.id);
    res.json({ ok: true });
});

router.get('/notifications/stream', authenticate, (req, res) => {
    notifications.registerSSE(req.user.id, res);
});

// --- Email ---
router.post('/email/send', authenticate, async (req, res) => {
    const result = await emailSystem.send(req.body.to, req.body.template, req.body.data || {}, req.body.options || {});
    res.json(result);
});

router.get('/email/history', authenticate, (req, res) => {
    res.json({ emails: emailSystem.getUserEmails(req.user.id) });
});

// --- SMS ---
router.post('/sms/send', authenticate, async (req, res) => {
    const result = await smsSystem.send(req.body.phone, req.body.template, req.body.variables || {});
    res.json(result);
});

router.get('/sms/history', authenticate, (req, res) => {
    res.json({ sms: smsSystem.getUserSMS(req.user.id) });
});

// --- Team ---
router.post('/team', authenticate, (req, res) => {
    const team = teamManager.createTeam(req.user.id, { ...req.body, ownerName: req.user.name });
    res.status(201).json({ team });
});

router.get('/team', authenticate, (req, res) => {
    res.json({ teams: teamManager.getUserTeams(req.user.id) });
});

router.get('/team/:id/members', authenticate, (req, res) => {
    res.json({ members: teamManager.getTeamMembers(req.params.id), stats: teamManager.getTeamStats(req.params.id) });
});

router.post('/team/:id/invite', authenticate, (req, res) => {
    const invite = teamManager.inviteMember(req.params.id, req.body.email, req.body.role, req.user.id);
    res.status(201).json({ invite });
});

router.post('/team/invite/:inviteId/accept', authenticate, (req, res) => {
    const member = teamManager.acceptInvite(req.params.inviteId, req.user.id);
    res.json({ member });
});

router.delete('/team/:teamId/member/:memberId', authenticate, (req, res) => {
    teamManager.removeMember(req.params.memberId);
    res.json({ message: 'Membre supprime' });
});

router.put('/team/:teamId/member/:memberId/role', authenticate, (req, res) => {
    teamManager.updateMemberRole(req.params.memberId, req.body.role);
    res.json({ message: 'Role mis a jour' });
});

// --- Domains ---
router.post('/domains', authenticate, (req, res) => {
    const domain = domainManager.addDomain(req.user.id, req.body);
    res.status(201).json({ domain, dns: domainManager.getDNSInstructions(domain) });
});

router.get('/domains', authenticate, (req, res) => {
    res.json({ domains: domainManager.getUserDomains(req.user.id) });
});

router.post('/domains/:id/verify', authenticate, (req, res) => {
    const domain = domainManager.verifyDomain(req.params.id);
    res.json({ domain });
});

router.delete('/domains/:id', authenticate, (req, res) => {
    domainManager.removeDomain(req.params.id);
    res.json({ message: 'Domaine supprime' });
});

// --- API Keys ---
router.get('/api-keys', authenticate, (req, res) => {
    const keys = db.findAll('api_keys', 'userId', req.user.id);
    res.json({ apiKeys: keys.map(k => ({ ...k, secret: undefined })) });
});

router.post('/api-keys', authenticate, (req, res) => {
    const id = `key_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const secret = crypto.randomBytes(32).toString('hex');
    const key = db.insert('api_keys', {
        id, userId: req.user.id, name: req.body.name || 'API Key',
        key: `flay_${crypto.randomBytes(16).toString('hex')}`, secret, active: true
    });
    res.status(201).json({ apiKey: key, message: 'Sauvegardez cette cle, elle ne sera plus affichee' });
});

router.delete('/api-keys/:id', authenticate, (req, res) => {
    db.delete('api_keys', req.params.id);
    res.json({ message: 'Cle supprimee' });
});

// --- AB Testing ---
router.get('/ab/experiments', authenticate, (req, res) => {
    res.json({ experiments: abTesting.getUserExperiments(req.user.id) });
});

router.post('/ab/experiments', authenticate, (req, res) => {
    const id = abTesting.createExperiment(req.user.id, req.body.name, req.body.variants);
    res.status(201).json({ experimentId: id });
});

router.get('/ab/experiments/:id/results', authenticate, (req, res) => {
    res.json({ results: abTesting.getResults(req.params.id) });
});

// --- Card ---
router.post('/card/generate', authenticate, (req, res) => {
    const businessCard = require('../business-card');
    const profile = db.findBy('profiles', 'userId', req.user.id);
    const front = businessCard.generateFront(profile, req.user, req.body.theme || profile?.theme);
    const back = businessCard.generateBack(profile, req.user, req.body.theme || profile?.theme);
    res.json({ front, back, copies: req.body.copies || 10 });
});

router.get('/card/print-preview', authenticate, (req, res) => {
    const businessCard = require('../business-card');
    const profile = db.findBy('profiles', 'userId', req.user.id);
    const front = businessCard.generateFront(profile, req.user, profile?.theme);
    const back = businessCard.generateBack(profile, req.user, profile?.theme);
    const printPage = businessCard.generatePrintPage(front, back, 10);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(printPage);
});

// --- Upload ---
router.post('/upload', authenticate, (req, res) => {
    const fs = require('fs');
    const path = require('path');
    const contentType = req.headers['content-type'] || '';
    if (!contentType.includes('multipart/form-data')) {
        return res.status(400).json({ error: 'Format: multipart/form-data' });
    }
    const matches = req.rawBody?.match(/data:([^;]+);base64,(.+)/);
    if (!matches) return res.status(400).json({ error: 'Donnees invalides' });
    const mimeType = matches[1];
    const base64 = matches[2];
    const buffer = Buffer.from(base64, 'base64');
    if (buffer.length > 5 * 1024 * 1024) return res.status(400).json({ error: 'Fichier trop volumineux (max 5 MB)' });
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(mimeType)) return res.status(400).json({ error: 'Type de fichier non autorise' });
    if (buffer[0] !== 0xFF && buffer[0] !== 0x89 && buffer[0] !== 0x47 && buffer[0] !== 0x52) {
        return res.status(400).json({ error: 'Contenu du fichier invalide' });
    }
    const ext = mimeType.split('/')[1] || 'jpg';
    const filename = `${req.user.id}_${Date.now()}.${ext}`;
    const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    fs.writeFileSync(path.join(uploadsDir, filename), buffer);
    res.json({ url: `/uploads/${filename}`, filename, mimeType, size: buffer.length });
});

module.exports = router;
