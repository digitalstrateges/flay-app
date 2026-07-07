const express = require('express');
const crypto = require('crypto');
const config = require('../config');
const db = require('../db');
const router = express.Router();

function auth(req, res, next) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Token manquant' });
    try {
        const authUtils = require('../auth-utils');
        const payload = authUtils.verifyToken(token);
        if (!payload) return res.status(401).json({ error: 'Token invalide' });
        req.userId = payload.userId;
        next();
    } catch { res.status(401).json({ error: 'Token invalide' }); }
}

// Initier un paiement d'abonnement
router.post('/subscribe', auth, (req, res) => {
    const { plan, interval } = req.body;
    const planConfig = config.PLANS[plan];
    if (!planConfig || plan === 'free') return res.status(400).json({ error: 'Plan invalide' });

    const user = db.get('users', req.userId);
    if (!user) return res.status(401).json({ error: 'Non trouve' });

    const amount = interval === 'annual' ? (planConfig.priceAnnual || planConfig.price * 12) : planConfig.price;
    const paymentId = `flay_pay_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;

    const payment = {
        id: paymentId,
        userId: user.id,
        plan,
        interval: interval || 'monthly',
        amount,
        currency: 'XOF',
        status: 'pending',
        payerName: user.name,
        payerPhone: user.phone || '',
        payerEmail: user.email,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        metadata: JSON.stringify({ plan, interval: interval || 'monthly' })
    };
    db.insert('payments', payment);

    const waveLink = config.WAVE_PAYMENT_URL;
    const whatsapp = config.WHATSAPP_LINK
        ? `${config.WHATSAPP_LINK}?text=${encodeURIComponent(
            `FLAY-PAY CONFIRMATION\nBonjour DIGITALSTRATEGES,\n\nJ'ai effectue le paiement pour le plan ${planConfig.name} (${amount.toLocaleString()} FCFA).\nReference Flay-Pay: ${paymentId}\n\nVoici mon ID de transaction Wave : [INSEREZ VOTRE ID]\n\nMerci de bien vouloir activer mon abonnement.\n\nNom: ${user.name}\nEmail: ${user.email}\nTel: ${user.phone || ''}`
          )}`
        : null;

    res.json({
        payment,
        waveLink,
        whatsappLink: whatsapp,
        instructions: {
            etape1: 'Cliquez sur le lien Wave pour payer',
            etape2: `Apres paiement, copiez l'ID de transaction Wave`,
            etape3: `Cliquez sur le lien WhatsApp pour envoyer la confirmation avec votre ID Wave`
        }
    });
});

// Verifier et confirmer un paiement (admin ou user avec Wave ID)
router.post('/verify', auth, (req, res) => {
    const { paymentId, waveTransactionId } = req.body;
    if (!paymentId) return res.status(400).json({ error: 'ID de paiement requis' });
    if (!waveTransactionId) return res.status(400).json({ error: 'ID de transaction Wave requis' });

    const payment = db.get('payments', paymentId);
    if (!payment) return res.status(404).json({ error: 'Paiement non trouve' });
    if (payment.status !== 'pending') return res.status(400).json({ error: 'Deja traite' });

    payment.status = 'pending_verification';
    payment.waveRef = waveTransactionId;
    payment.verifiedAt = new Date().toISOString();
    db.update('payments', paymentId, {
        status: 'pending_verification',
        waveRef: waveTransactionId,
        verifiedAt: payment.verifiedAt
    });

    const user = db.get('users', payment.userId);
    const adminMsg = config.WHATSAPP_LINK
        ? `${config.WHATSAPP_LINK}?text=${encodeURIComponent(
            `NOUVEAU PAIEMENT FLAY-PAY\n\nPaiement en attente de verification.\nReference: ${paymentId}\nPlan: ${payment.plan}\nMontant: ${(payment.amount || 0).toLocaleString()} FCFA\nWave ID: ${waveTransactionId}\n\nClient: ${payment.payerName || user?.name || ''}\nEmail: ${payment.payerEmail || user?.email || ''}\nTel: ${payment.payerPhone || user?.phone || ''}\n\n→ Se connecter au dashboard pour confirmer.`
          )}`
        : null;

    res.json({
        success: true,
        message: 'Verification envoyee en attente de confirmation',
        payment: { ...payment, status: 'pending_verification' },
        adminWhatsappLink: adminMsg
    });
});

// Admin : confirmer un paiement
router.post('/confirm', auth, (req, res) => {
    const user = db.get('users', req.userId);
    if (!user?.isAdmin) return res.status(403).json({ error: 'Admin uniquement' });

    const { paymentId } = req.body;
    const payment = db.get('payments', paymentId);
    if (!payment) return res.status(404).json({ error: 'Paiement non trouve' });
    if (payment.status === 'confirmed') return res.status(400).json({ error: 'Deja confirme' });

    payment.status = 'confirmed';
    payment.confirmedAt = new Date().toISOString();
    db.update('payments', paymentId, { status: 'confirmed', confirmedAt: payment.confirmedAt });

    const subscriber = db.get('users', payment.userId);
    if (subscriber) {
        const expiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        db.update('users', subscriber.id, {
            plan: payment.plan,
            planExpiry: expiry.toISOString(),
            planAutoRenew: 1
        });
        const profile = db.findBy('profiles', 'userId', subscriber.id);
        if (profile) {
            db.update('profiles', profile.id || profile.userId, { plan: payment.plan });
        }
    }

    res.json({
        success: true,
        message: `Abonnement ${payment.plan} active avec succes pour 30 jours`,
        payment: { ...payment, status: 'confirmed', confirmedAt: payment.confirmedAt }
    });
});

// Admin : refuser un paiement
router.post('/reject', auth, (req, res) => {
    const user = db.get('users', req.userId);
    if (!user?.isAdmin) return res.status(403).json({ error: 'Admin uniquement' });

    const { paymentId } = req.body;
    const payment = db.get('payments', paymentId);
    if (!payment) return res.status(404).json({ error: 'Paiement non trouve' });

    db.update('payments', paymentId, { status: 'rejected' });
    res.json({ success: true, message: 'Paiement rejete' });
});

// Admin : lister tous les paiements en attente
router.get('/pending', auth, (req, res) => {
    const user = db.get('users', req.userId);
    if (!user?.isAdmin) return res.status(403).json({ error: 'Admin uniquement' });
    const all = db.getAll('payments') || [];
    const pending = all.filter(p => p.status === 'pending_verification' || p.status === 'pending');
    res.json({ payments: pending });
});

// Mes paiements
router.get('/my-payments', auth, (req, res) => {
    const payments = db.findAll('payments', 'userId', req.userId) || [];
    const sorted = payments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ payments: sorted });
});

// Statut de mon abonnement
router.get('/my-subscription', auth, (req, res) => {
    const user = db.get('users', req.userId);
    if (!user) return res.status(401).json({ error: 'Non trouve' });
    const activePayments = (db.findAll('payments', 'userId', req.userId) || [])
        .filter(p => p.status === 'confirmed')
        .sort((a, b) => new Date(b.confirmedAt) - new Date(a.confirmedAt));

    const planConfig = config.PLANS[user.plan] || config.PLANS.free;
    const expiry = user.planExpiry ? new Date(user.planExpiry) : null;
    const isActive = expiry && expiry > new Date();

    res.json({
        plan: user.plan,
        planName: planConfig.name,
        priceLabel: planConfig.priceLabel,
        isActive,
        autoRenew: !!user.planAutoRenew,
        expiry: user.planExpiry || null,
        daysLeft: expiry ? Math.ceil((expiry - new Date()) / 86400000) : 0,
        features: planConfig.features,
        limits: planConfig.limits,
        lastPayment: activePayments[0] || null,
        paymentHistory: activePayments.slice(0, 12)
    });
});

// Resiliation abonnement
router.post('/cancel-subscription', auth, (req, res) => {
    const user = db.get('users', req.userId);
    if (!user) return res.status(401).json({ error: 'Non trouve' });
    db.update('users', user.id, { planAutoRenew: 0 });
    res.json({ success: true, message: 'Renouvellement automatique desactive, votre abonnement expire a la fin de la periode en cours' });
});

// Generer le lien de paiement Wave avec montant
router.get('/wave-link', (req, res) => {
    const { plan, interval } = req.query;
    const planConfig = config.PLANS[plan];
    if (!planConfig || plan === 'free') return res.status(400).json({ error: 'Plan invalide' });
    const amount = interval === 'annual' ? (planConfig.priceAnnual || planConfig.price * 12) : planConfig.price;
    res.json({
        waveUrl: config.WAVE_PAYMENT_URL,
        amount,
        plan: planConfig.name,
        whatsapp: config.WHATSAPP_LINK
    });
});

// Info Flay-Pay
router.get('/info', (req, res) => {
    res.json({
        name: 'Flay-Pay by DIGITALSTRATEGES',
        version: '1.0',
        gateway: 'Wave Business',
        paymentUrl: config.WAVE_PAYMENT_URL,
        whatsapp: config.WHATSAPP_LINK,
        plans: Object.entries(config.PLANS).filter(([k]) => k !== 'free').map(([k, v]) => ({
            id: k, name: v.name, price: v.price, priceLabel: v.priceLabel,
            priceAnnual: v.priceAnnual, priceAnnualLabel: v.priceAnnualLabel,
            features: v.features
        }))
    });
});

module.exports = router;
