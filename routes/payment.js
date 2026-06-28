const express = require('express');
const crypto = require('crypto');
const authUtils = require('../auth-utils');
const db = require('../db');
const config = require('../config');
const router = express.Router();

router.get('/wave-info', (req, res) => {
    res.json({ paymentUrl: config.WAVE_PAYMENT_URL, merchant: config.WAVE_MERCHANT_NAME, phone: config.WAVE_MERCHANT_PHONE, whatsapp: config.WHATSAPP_LINK });
});

router.post('/initiate', async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Token manquant' });
    const payload = authUtils.verifyToken(token);
    if (!payload) return res.status(401).json({ error: 'Token invalide' });
    const user = db.get('users', payload.userId);
    if (!user) return res.status(401).json({ error: 'Non trouve' });

    const plan = config.PLANS[req.body.plan];
    if (!plan || !plan.price) return res.status(400).json({ error: 'Plan invalide' });

    const paymentId = `pay_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const payment = {
        id: paymentId, userId: user.id, plan: req.body.plan, amount: plan.price, currency: 'XOF',
        status: 'pending', payerName: user.name, payerPhone: req.body.phone || '',
        createdAt: new Date().toISOString(), waveUrl: config.WAVE_PAYMENT_URL
    };
    db.insert('payments', payment);
    res.json({ payment, waveUrl: config.WAVE_PAYMENT_URL, whatsappLink: `${config.WHATSAPP_LINK}?text=${encodeURIComponent(`Bonjour, j'ai effectue le paiement pour le plan ${plan.name}. Reference: ${paymentId}`)}` });
});

router.get('/', (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Token manquant' });
    const payload = authUtils.verifyToken(token);
    if (!payload) return res.status(401).json({ error: 'Token invalide' });
    const payments = db.findAll('payments', 'userId', payload.userId);
    res.json({ payments });
});

router.get('/stats', (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Token manquant' });
    const payload = authUtils.verifyToken(token);
    if (!payload) return res.status(401).json({ error: 'Token invalide' });
    const payments = db.findAll('payments', 'userId', payload.userId);
    let total = 0, confirmed = 0, pending = 0, amount = 0;
    for (const p of payments) {
        total++;
        if (p.status === 'confirmed') { confirmed++; amount += p.amount; }
        else if (p.status === 'pending') pending++;
    }
    res.json({ total, confirmed, pending, totalAmount: amount });
});

router.post('/:id/confirm', async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Token manquant' });
    const payload = authUtils.verifyToken(token);
    if (!payload) return res.status(401).json({ error: 'Token invalide' });

    const payment = db.get('payments', req.params.id);
    if (!payment) return res.status(404).json({ error: 'Paiement non trouve' });
    if (payment.userId !== payload.userId) return res.status(403).json({ error: 'Acces refuse' });
    if (payment.status !== 'pending') return res.status(400).json({ error: 'Deja traite' });

    payment.status = 'confirmed';
    payment.confirmedAt = new Date().toISOString();
    payment.waveRef = `WAVE-${Date.now()}`;
    db.update('payments', payment.id, { status: 'confirmed', confirmedAt: payment.confirmedAt, waveRef: payment.waveRef });

    const user = db.get('users', payment.userId);
    if (user) {
        const newExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        db.update('users', user.id, { plan: payment.plan, planExpiry: newExpiry });
    }
    const profile = db.findBy('profiles', 'userId', payment.userId);
    if (profile) db.update('profiles', profile.userId, { plan: payment.plan });
    res.json({ payment, message: 'Paiement confirme et plan active' });
});

router.post('/:id/cancel', async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Token manquant' });
    const payload = authUtils.verifyToken(token);
    if (!payload) return res.status(401).json({ error: 'Token invalide' });
    const payment = db.get('payments', req.params.id);
    if (!payment) return res.status(404).json({ error: 'Paiement non trouve' });
    db.update('payments', payment.id, { status: 'cancelled' });
    res.json({ payment: { ...payment, status: 'cancelled' }, message: 'Paiement annule' });
});

// --- Payment Gateway Status ---
router.get('/gateway/status', (req, res) => {
    const paymentGateway = require('../payment-gateway');
    res.json(paymentGateway.getStatus());
});

// --- Unified Payment Create ---
router.post('/create', async (req, res) => {
    const paymentGateway = require('../payment-gateway');
    const { amount, description, customerName, customerPhone, customerEmail, gateway, type, metadata } = req.body;
    if (!amount || amount < 100) return res.status(400).json({ error: 'Montant minimum: 100 FCFA' });
    const result = await paymentGateway.createPayment({
        amount: parseInt(amount), description: description || 'Paiement Flay',
        customerName: customerName || '', customerPhone: customerPhone || '',
        customerEmail: customerEmail || '', gateway: gateway || undefined,
        type: type || 'one_time', metadata: metadata || {}
    });
    if (result.success) {
        res.json({ success: true, payment: result.payment, paymentUrl: result.payment?.paymentUrl, isFallback: result.isFallback || false });
    } else {
        res.status(400).json({ success: false, error: result.error });
    }
});

// --- Check payment status ---
router.get('/:ref/status', async (req, res) => {
    const paymentGateway = require('../payment-gateway');
    const payment = paymentGateway.getPayment(req.params.ref);
    if (!payment) {
        const dbPayment = db.get('payments', req.params.ref);
        return res.json({ payment: dbPayment });
    }
    if (payment.gateway === 'wave' && payment.id !== payment.ref) {
        const status = await paymentGateway.checkStatus(payment.id);
        return res.json({ payment, liveStatus: status });
    }
    res.json({ payment });
});

module.exports = router;
