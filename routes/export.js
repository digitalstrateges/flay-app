/**
 * Flay Omni - Export Routes
 * CSV, PDF, HTML export endpoints
 */

const express = require('express');
const router = express.Router();
const exportUtils = require('../export-utils');
const db = require('../database');
const { authenticate } = require('../middleware');

// Export invoices
router.get('/invoices/:userId', authenticate, (req, res) => {
    try {
        const invoices = db.query('invoices', { user_id: req.params.userId });
        const format = req.query.format || 'csv';

        if (format === 'html') {
            const html = exportUtils.toHTMLTable('Factures', invoices, null, { currency: 'XOF' });
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename=factures_${Date.now()}.html`);
            return res.send(html);
        }
        if (format === 'json') return res.json(invoices);

        const csv = exportUtils.toCSV(invoices);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename=factures_${Date.now()}.csv`);
        res.send('\uFEFF' + csv);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Export receipts
router.get('/receipts/:userId', authenticate, (req, res) => {
    try {
        const receipts = db.query('receipts', { user_id: req.params.userId });
        const format = req.query.format || 'csv';

        if (format === 'html') {
            const html = exportUtils.toHTMLTable('Recus', receipts);
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename=recus_${Date.now()}.html`);
            return res.send(html);
        }
        const csv = exportUtils.toCSV(receipts);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename=recus_${Date.now()}.csv`);
        res.send('\uFEFF' + csv);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Export transactions
router.get('/transactions/:userId', authenticate, (req, res) => {
    try {
        const txns = db.query('transactions', { user_id: req.params.userId });
        const format = req.query.format || 'csv';

        if (format === 'html') {
            const html = exportUtils.toHTMLTable('Transactions', txns);
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename=transactions_${Date.now()}.html`);
            return res.send(html);
        }
        const csv = exportUtils.toCSV(txns);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename=transactions_${Date.now()}.csv`);
        res.send('\uFEFF' + csv);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Export CRM contacts
router.get('/contacts/:userId', authenticate, (req, res) => {
    try {
        const contacts = db.query('crm_contacts', { user_id: req.params.userId });
        const format = req.query.format || 'csv';

        if (format === 'html') {
            const html = exportUtils.toHTMLTable('Contacts CRM', contacts);
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename=contacts_${Date.now()}.html`);
            return res.send(html);
        }
        const csv = exportUtils.toCSV(contacts);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename=contacts_${Date.now()}.csv`);
        res.send('\uFEFF' + csv);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Export stock
router.get('/stock/:userId', authenticate, (req, res) => {
    try {
        const stock = db.query('stock_items', { user_id: req.params.userId });
        const format = req.query.format || 'csv';

        if (format === 'html') {
            const html = exportUtils.toHTMLTable('Stock', stock);
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename=stock_${Date.now()}.html`);
            return res.send(html);
        }
        const csv = exportUtils.toCSV(stock);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename=stock_${Date.now()}.csv`);
        res.send('\uFEFF' + csv);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Export analytics report
router.get('/analytics/:userId', authenticate, (req, res) => {
    try {
        const analytics = db.getAnalytics(req.params.userId, parseInt(req.query.days) || 30);
        const html = exportUtils.generateAnalyticsReport(analytics, {
            period: `${req.query.days || 30} jours`
        });
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename=rapport_analytics_${Date.now()}.html`);
        res.send(html);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Generate single invoice HTML
router.get('/invoice/:userId/:invoiceId', authenticate, (req, res) => {
    try {
        const invoices = db.query('invoices', { id: req.params.invoiceId, user_id: req.params.userId });
        if (invoices.length === 0) return res.status(404).json({ error: 'Facture non trouvee' });
        const invoice = invoices[0];
        const items = JSON.parse(invoice.items || '[]');
        const html = exportUtils.generateInvoice(invoice, items);
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(html);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Generate single receipt HTML
router.get('/receipt/:userId/:receiptId', authenticate, (req, res) => {
    try {
        const receipts = db.query('receipts', { id: req.params.receiptId, user_id: req.params.userId });
        if (receipts.length === 0) return res.status(404).json({ error: 'Recu non trouve' });
        const html = exportUtils.generateReceipt(receipts[0]);
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(html);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
