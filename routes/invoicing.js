const express = require('express');
const { authenticate } = require('../lib/auth');
const invoicing = require('../invoicing');
const db = require('../db');
const router = express.Router();

router.get('/', authenticate, (req, res) => {
    res.json({ invoices: invoicing.getUserInvoices(req.user.id) });
});

router.post('/', authenticate, (req, res) => {
    const premiumFeatures = require('../premium-features');
    const userInvoices = db.findAll('invoices', 'userId', req.user.id) || [];
    const check = premiumFeatures.checkLimit(req.user.id, 'invoices', userInvoices.length);
    if (!check.allowed) return res.status(403).json({ error: check.reason, code: 'PLAN_LIMIT', limit: check.limit, current: check.current });
    const invoice = invoicing.create(req.user.id, req.body);
    res.status(201).json({ invoice });
});

router.put('/:id', authenticate, (req, res) => {
    const invoice = invoicing.update(req.params.id, req.body);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    res.json({ invoice });
});

router.post('/:id/pay', authenticate, (req, res) => {
    const invoice = invoicing.markPaid(req.params.id);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    res.json({ invoice });
});

router.post('/:id/send', authenticate, (req, res) => {
    const invoice = invoicing.markSent(req.params.id);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    res.json({ invoice });
});

router.get('/stats', authenticate, (req, res) => {
    res.json({ stats: invoicing.getStats(req.user.id) });
});

router.get('/:id/html', authenticate, (req, res) => {
    const invoice = invoicing.get(req.params.id);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    const profile = db.findBy('profiles', 'userId', req.user.id);
    const html = invoicing.generateHTML(invoice, req.user, profile);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
});

module.exports = router;
