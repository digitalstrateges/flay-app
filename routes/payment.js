const express = require('express');
const config = require('../config');
const User = require('../models/User');
const Payment = require('../models/Payment');
const { auth, rateLimit, auditLog } = require('../middleware/auth');

const router = express.Router();

// GET /api/payment/wave-info
router.get('/wave-info', (req, res) => {
    res.json({
        paymentUrl: config.WAVE_PAYMENT_URL,
        merchant: config.WAVE_MERCHANT,
        phone: config.WAVE_PHONE,
        email: config.WAVE_EMAIL,
        instructions: [
            '1. Ouvrez l\'application Wave sur votre telephone',
            '2. Scannez le QR code ou envoyez l\'argent a DIGITALSTRATEGE BUSINESS',
            '3. Incluez votre nom dans la reference du paiement',
            '4. Envoyez la preuve de paiement sur WhatsApp',
            '5. Votre plan sera active dans les 5 minutes'
        ]
    });
});

// GET /api/payment/plans
router.get('/plans', (req, res) => {
    const plansWithOwnership = {};
    for (const [key, plan] of Object.entries(config.PLANS)) {
        plansWithOwnership[key] = {
            ...plan,
            popular: key === 'pro',
            recommended: key === 'pro'
        };
    }
    res.json({ plans: plansWithOwnership });
});

// POST /api/payment/initiate
router.post('/initiate', auth, auditLog('INITIATE_PAYMENT'), (req, res) => {
    try {
        const { plan, payerName, payerPhone, payerEmail } = req.body;
        if (!config.PLANS[plan]) return res.status(400).json({ message: 'Plan invalide.' });
        if (plan === 'free') return res.status(400).json({ message: 'Le plan gratuit est deja actif.' });

        const user = User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'Utilisateur non trouve.' });

        // Check if user already has this plan active
        if (user.plan === plan && User.isPlanActive(user.id)) {
            return res.status(400).json({ message: 'Vous avez deja ce plan actif.' });
        }

        const planInfo = config.PLANS[plan];

        // Cancel any pending payments for this user
        const pendingPayments = Payment.findByUserId(req.user.id).filter(p => p.status === 'pending');
        pendingPayments.forEach(p => Payment.cancel(p.id));

        const payment = Payment.create({
            userId: req.user.id,
            plan,
            payerName: payerName || user.name,
            payerPhone: payerPhone || user.phone,
            payerEmail: payerEmail || user.email,
            metadata: {
                previousPlan: user.plan,
                source: 'web'
            }
        });

        res.json({
            payment,
            plan: planInfo,
            waveUrl: config.WAVE_PAYMENT_URL,
            merchant: config.WAVE_MERCHANT,
            instructions: [
                `Montant a payer: ${planInfo.priceLabel}`,
                `Beneficiaire: ${config.WAVE_MERCHANT}`,
                `Reference: ${payment.invoiceId}`,
                'Gardez la preuve de paiement pour confirmation'
            ],
            expiresAt: payment.expiresAt
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST /api/payment/confirm
router.post('/confirm', auth, auditLog('CONFIRM_PAYMENT'), (req, res) => {
    try {
        const { paymentId, waveRef } = req.body;
        const payment = Payment.findById(paymentId);
        if (!payment) return res.status(404).json({ message: 'Paiement non trouve.' });
        if (payment.userId !== req.user.id) return res.status(403).json({ message: 'Acces refuse.' });
        if (payment.status !== 'pending') return res.status(400).json({ message: 'Ce paiement est deja traite.' });

        // Check expiry
        if (new Date(payment.expiresAt) < new Date()) {
            Payment.cancel(paymentId);
            return res.status(400).json({ message: 'Paiement expire. Creez un nouveau paiement.' });
        }

        // Confirm payment
        Payment.confirm(paymentId, waveRef);

        // Upgrade user plan
        const expiry = new Date();
        expiry.setMonth(expiry.getMonth() + 1);
        User.upgradePlan(req.user.id, payment.plan, expiry.toISOString());

        const user = User.findById(req.user.id);
        const planInfo = config.PLANS[payment.plan];

        res.json({
            message: `Plan ${planInfo.name} active avec succes !`,
            plan: payment.plan,
            planName: planInfo.name,
            expiry: expiry.toISOString(),
            invoice: Payment.getInvoice(payment.invoiceId)
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST /api/payment/cancel
router.post('/cancel', auth, auditLog('CANCEL_SUBSCRIPTION'), (req, res) => {
    try {
        const user = User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'Utilisateur non trouve.' });
        if (user.plan === 'free') return res.status(400).json({ message: 'Pas d\'abonnement a annuler.' });

        User.cancelPlan(req.user.id);

        res.json({
            message: 'Abonnement annule. Il restera actif jusqu\'a la date d\'expiration.',
            expiresAt: user.planExpiry
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST /api/payment/downgrade
router.post('/downgrade', auth, auditLog('DOWNGRADE'), (req, res) => {
    try {
        User.downgradePlan(req.user.id);
        res.json({ message: 'Retour au plan Gratuit effectue.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET /api/payment/history
router.get('/history', auth, (req, res) => {
    try {
        const payments = Payment.findByUserId(req.user.id);
        const invoices = Payment.getUserInvoices(req.user.id);
        res.json({ payments, invoices });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET /api/payment/invoice/:id
router.get('/invoice/:id', auth, (req, res) => {
    try {
        const invoice = Payment.getInvoice(req.params.id);
        if (!invoice) return res.status(404).json({ message: 'Facture non trouvee.' });
        if (invoice.userId !== req.user.id) return res.status(403).json({ message: 'Acces refuse.' });
        res.json({ invoice });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET /api/payment/admin/all
router.get('/admin/all', auth, (req, res) => {
    try {
        const user = User.findById(req.user.id);
        if (!user || user.email !== 'admin@flay.app') return res.status(403).json({ message: 'Acces admin requis.' });
        res.json({
            payments: Payment.getAll(),
            stats: Payment.getStats(),
            userStats: User.getStats()
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
