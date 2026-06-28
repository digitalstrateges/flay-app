/**
 * Flay Omni - Export Routes
 * CSV, PDF, HTML export endpoints
 */

const express = require('express');
const router = express.Router();
const exportUtils = require('../export-utils');
const db = require('../db');
const { authenticate } = require('../lib/auth');

// Export invoices
router.get('/invoices', authenticate, (req, res) => {
    try {
        const invoices = db.findAll('invoices', 'userId', req.user.id) || [];
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
router.get('/receipts', authenticate, (req, res) => {
    try {
        const receipts = db.findAll('receipts', 'userId', req.user.id) || [];
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
router.get('/transactions', authenticate, (req, res) => {
    try {
        const txns = db.findAll('transactions', 'userId', req.user.id) || [];
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
router.get('/contacts', authenticate, (req, res) => {
    try {
        const contacts = db.findAll('crm_contacts', 'userId', req.user.id) || [];
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
router.get('/stock', authenticate, (req, res) => {
    try {
        const stock = db.findAll('products', 'userId', req.user.id) || [];
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
router.get('/analytics', authenticate, (req, res) => {
    try {
        const events = db.findAll('analytics_events', 'userId', req.user.id) || [];
        const html = exportUtils.toHTMLTable('Analytics', events);
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename=rapport_analytics_${Date.now()}.html`);
        res.send(html);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Generate single invoice HTML
router.get('/invoice/:invoiceId', authenticate, (req, res) => {
    try {
        const invoice = db.get('invoices', req.params.invoiceId);
        if (!invoice || invoice.userId !== req.user.id) {
            return res.status(404).json({ error: 'Facture non trouvee' });
        }
        const items = JSON.parse(invoice.items || '[]');
        const html = exportUtils.generateInvoice(invoice, items);
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(html);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Generate single receipt HTML
router.get('/receipt/:receiptId', authenticate, (req, res) => {
    try {
        const receipt = db.get('receipts', req.params.receiptId);
        if (!receipt || receipt.userId !== req.user.id) {
            return res.status(404).json({ error: 'Recu non trouve' });
        }
        const html = exportUtils.generateReceipt(receipt);
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(html);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
