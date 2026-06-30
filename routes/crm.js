const express = require('express');
const { authenticate } = require('../lib/auth');
const crm = require('../crm');
const db = require('../db');
const router = express.Router();

router.get('/contacts', authenticate, (req, res) => {
    const filters = {};
    if (req.query.status) filters.status = req.query.status;
    if (req.query.search) filters.search = req.query.search;
    res.json({ contacts: crm.getUserContacts(req.user.id, filters) });
});

router.post('/contacts', authenticate, (req, res) => {
    const premiumFeatures = require('../premium-features');
    const userContacts = db.findAll('contacts', 'userId', req.user.id) || [];
    const check = premiumFeatures.checkLimit(req.user.id, 'contacts', userContacts.length);
    if (!check.allowed) return res.status(403).json({ error: check.reason, code: 'PLAN_LIMIT', limit: check.limit, current: check.current });
    const contact = crm.addContact(req.user.id, req.body);
    res.status(201).json({ contact });
});

router.put('/contacts/:id', authenticate, (req, res) => {
    const contact = crm.updateContact(req.params.id, req.body);
    if (!contact) return res.status(404).json({ error: 'Contact not found' });
    res.json({ contact });
});

router.delete('/contacts/:id', authenticate, (req, res) => {
    crm.deleteContact(req.params.id);
    res.json({ message: 'Contact supprime' });
});

router.get('/contacts/:id/interactions', authenticate, (req, res) => {
    res.json({ interactions: crm.getInteractions(req.params.id) });
});

router.post('/contacts/:id/interactions', authenticate, (req, res) => {
    const interaction = crm.addInteraction(req.params.id, req.body.type, req.body);
    res.status(201).json({ interaction });
});

router.get('/deals', authenticate, (req, res) => {
    res.json({ deals: crm.getUserDeals(req.user.id) });
});

router.post('/deals', authenticate, (req, res) => {
    const deal = crm.createDeal(req.user.id, req.body);
    res.status(201).json({ deal });
});

router.put('/deals/:id', authenticate, (req, res) => {
    const deal = crm.updateDeal(req.params.id, req.body);
    if (!deal) return res.status(404).json({ error: 'Deal not found' });
    res.json({ deal });
});

router.get('/pipeline', authenticate, (req, res) => {
    res.json({ pipeline: crm.getPipeline(req.user.id) });
});

router.get('/stats', authenticate, (req, res) => {
    res.json({ stats: crm.getStats(req.user.id) });
});

router.get('/export', authenticate, (req, res) => {
    const format = req.query.format || 'csv';
    const data = crm.exportContacts(req.user.id, format);
    res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=contacts.${format}`);
    res.send(data);
});

module.exports = router;
