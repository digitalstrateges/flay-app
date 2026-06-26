const express = require('express');
const { authenticate } = require('../lib/auth');
const webhookManager = require('../webhooks');
const paymentGateway = require('../payment-gateway');
const db = require('../db');
const router = express.Router();

// --- Webhook CRUD ---
router.get('/', authenticate, (req, res) => {
    res.json({ webhooks: webhookManager.getWebhooks(req.user.id) });
});

router.post('/', authenticate, (req, res) => {
    if (!req.body.url) return res.status(400).json({ error: 'URL requise' });
    const id = webhookManager.register(req.user.id, req.body.url, req.body.events || ['*']);
    res.status(201).json({ webhookId: id, message: 'Webhook enregistre' });
});

router.delete('/:id', authenticate, (req, res) => {
    webhookManager.unregister(req.params.id);
    res.json({ message: 'Webhook supprime' });
});

router.get('/:id/logs', authenticate, (req, res) => {
    res.json({ logs: webhookManager.getLogs(req.params.id) });
});

// --- Payment Webhooks (Wave) ---
router.post('/wave', async (req, res) => {
    const rawBody = JSON.stringify(req.body);
    const signature = req.headers['wave-signature'] || req.headers['x-wave-signature'] || '';

    if (!paymentGateway.verifyWebhook(rawBody, signature, 'wave')) {
        console.error('[WEBHOOK] Wave signature invalide');
        return res.status(403).json({ error: 'Signature invalide' });
    }

    const event = req.body;
    const result = paymentGateway.handleWebhook(event, 'wave');
    console.log(`[WEBHOOK Wave] ${result.status} - ${result.externalId || result.sessionId || 'unknown'}`);

    if (result.status === 'confirmed') {
        processConfirmedPayment(result.externalId, result);
    }
    res.json({ received: true });
});

// --- Helper ---
function processConfirmedPayment(externalId, eventData) {
    for (const [id, payment] of db.getAll('payments').entries()) {
        if (payment.ref === externalId || payment.externalId === externalId) {
            if (payment.status !== 'confirmed') {
                payment.status = 'confirmed';
                payment.confirmedAt = eventData.confirmedAt;
                payment.gatewayRef = eventData.sessionId || eventData.transactionId;
                db.update('payments', id, payment);

                const user = db.get('users', payment.userId);
                if (user) {
                    user.plan = payment.plan;
                    user.planExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
                    db.update('users', user.id, { plan: user.plan, planExpiry: user.planExpiry });
                }
                const profile = db.findBy('profiles', 'userId', payment.userId);
                if (profile) {
                    profile.plan = payment.plan;
                    db.update('profiles', profile.userId, { plan: payment.plan });
                }
                console.log(`[PAY] Payment ${id} confirmed for user ${payment.userId}`);
            }
            return;
        }
    }
}

module.exports = router;
