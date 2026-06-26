const express = require('express');
const { authenticate } = require('../lib/auth');
const waveConnect = require('../wave-connect');
const db = require('../db');
const config = require('../config');
const router = express.Router();

router.get('/info', (req, res) => {
    res.json({
        paymentUrl: config.WAVE_PAYMENT_URL,
        merchant: config.WAVE_MERCHANT,
        phone: config.WAVE_PHONE,
        whatsapp: config.WHATSAPP_LINK
    });
});

router.post('/connect', authenticate, (req, res) => {
    const { paymentLink } = req.body;
    if (!paymentLink) return res.status(400).json({ error: 'Lien Wave requis' });
    const result = waveConnect.setPaymentLink(req.user.id, paymentLink);
    if (result.success) {
        const profile = db.findBy('profiles', 'userId', req.user.id);
        if (profile) {
            profile.wavePaymentLink = paymentLink;
            db.update('profiles', req.user.id, { wavePaymentLink: paymentLink });
        }
    }
    res.status(result.success ? 200 : 400).json(result);
});

router.get('/status', authenticate, (req, res) => {
    res.json(waveConnect.getStatus(req.user.id));
});

router.post('/disconnect', authenticate, (req, res) => {
    const result = waveConnect.removePaymentLink(req.user.id);
    db.update('profiles', req.user.id, { wavePaymentLink: '' });
    res.json(result);
});

router.post('/pay', (req, res) => {
    const { userId, amount, description } = req.body;
    if (!userId || !amount) return res.status(400).json({ error: 'userId et amount requis' });
    const result = waveConnect.createPayment(userId, {
        amount: parseInt(amount),
        description: description || 'Paiement Flay'
    });
    if (result.success && result.paymentUrl) {
        res.redirect(result.paymentUrl);
    } else {
        res.status(400).json({ error: result.error || 'Erreur de paiement' });
    }
});

router.get('/link/:userId', (req, res) => {
    const conn = waveConnect.getPaymentLink(req.params.userId);
    if (!conn) return res.status(404).json({ error: 'Payment link not found' });
    res.json({ paymentLink: conn.paymentLink });
});

module.exports = router;
