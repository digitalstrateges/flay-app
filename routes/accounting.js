/**
 * Flay API Routes - Accounting, Receipts, AI, Stock
 */

const express = require('express');
const router = express.Router();
const accounting = require('../accounting');
const llm = require('../src/llm/engine');
const db = require('../db');

// Auth middleware
function auth(req, res, next) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Token manquant' });
    const authUtils = require('../auth-utils');
    const payload = authUtils.verifyToken(token);
    if (!payload) return res.status(401).json({ error: 'Token invalide' });
    req.userId = payload.userId;
    next();
}

// === RECEIPTS (REÇUS) ===

router.post('/receipts', auth, (req, res) => {
    try {
        const receipt = accounting.createReceipt(req.userId, req.body);
        res.json(receipt);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

router.get('/receipts', auth, (req, res) => {
    const { status, type, from, to } = req.query;
    const result = accounting.listReceipts(req.userId, { status, type, from, to });
    res.json(result);
});

router.get('/receipts/:id', auth, (req, res) => {
    const receipt = accounting.getReceipt(req.userId, req.params.id);
    if (!receipt) return res.status(404).json({ error: 'Recu non trouve' });
    res.json(receipt);
});

router.get('/receipts/:id/html', auth, (req, res) => {
    const receipt = accounting.getReceipt(req.userId, req.params.id);
    if (!receipt) return res.status(404).json({ error: 'Recu non trouve' });
    const user = db.get('users', req.userId);
    const html = accounting.generateReceiptHTML(receipt, {
        businessName: user?.name || 'Votre Entreprise',
        brandColor: '#818cf8'
    });
    res.send(html);
});

router.put('/receipts/:id/pay', auth, (req, res) => {
    const receipt = accounting.markPaid(req.userId, req.params.id, req.body);
    if (!receipt) return res.status(404).json({ error: 'Recu non trouve' });
    res.json(receipt);
});

router.put('/receipts/:id/cancel', auth, (req, res) => {
    const receipt = accounting.cancelReceipt(req.userId, req.params.id);
    if (!receipt) return res.status(404).json({ error: 'Recu non trouve' });
    res.json(receipt);
});

// === TRANSACTIONS (COMPTABILITÉ) ===

router.post('/transactions', auth, (req, res) => {
    try {
        const transaction = accounting.addTransaction(req.userId, req.body);
        res.json(transaction);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

router.get('/transactions', auth, (req, res) => {
    const { type, category, status, from, to } = req.query;
    const transactions = accounting.getTransactions(req.userId, { type, category, status, from, to });
    res.json(transactions);
});

router.get('/transactions/summary', auth, (req, res) => {
    const { period } = req.query;
    const summary = accounting.getFinancialSummary(req.userId, period || 'month');
    res.json(summary);
});

// === INVOICES (FACTURES) ===

router.post('/invoices', auth, (req, res) => {
    try {
        const invoice = accounting.createInvoice(req.userId, req.body);
        res.json(invoice);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

router.get('/invoices/:id/html', auth, (req, res) => {
    const invoices = accounting._load(`invoices_${req.userId}.json`);
    const invoice = invoices.find(i => i.id === req.params.id);
    if (!invoice) return res.status(404).json({ error: 'Facture non trouvee' });
    const user = db.get('users', req.userId);
    const html = accounting.generateInvoiceHTML(invoice, {
        businessName: user?.name || 'Votre Entreprise',
        brandColor: '#818cf8'
    });
    res.send(html);
});

// === AI (GEMINI) ===

router.post('/ai/generate-bio', auth, async (req, res) => {
    try {
        const { name, profession, city, style } = req.body;
        const bio = await llm.generateBio(name || 'Utilisateur', profession || 'Professionnel', city || 'Abidjan', style);
        res.json({ bio });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/ai/generate-services', auth, async (req, res) => {
    try {
        const { profession, context } = req.body;
        const services = await llm.generateServices(profession, context);
        res.json({ services });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/ai/analyze-image', auth, async (req, res) => {
    try {
        const { imageBase64, question } = req.body;
        if (!imageBase64) return res.status(400).json({ error: 'Image requise' });
        const analysis = await llm.analyzeImage(imageBase64, question);
        res.json({ analysis });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/ai/marketing', auth, async (req, res) => {
    try {
        const { businessName, profession, platform, offer } = req.body;
        const content = await llm.generateMarketingContent(businessName, profession, platform, offer);
        res.json({ content });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/ai/analyze-profile', auth, async (req, res) => {
    try {
        const profile = db.get('profiles', req.userId);
        const user = db.get('users', req.userId);
        const analysis = await llm.analyzeProfile({
            name: user?.name,
            title: profile?.title,
            bio: profile?.bio,
            services: profile?.services,
            theme: profile?.theme
        });
        res.json({ analysis });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/ai/chat', auth, async (req, res) => {
    try {
        const { message } = req.body;
        const user = db.get('users', req.userId);
        const profile = db.get('profiles', req.userId);
        const response = await llm.chatResponse(message, {
            businessName: user?.name,
            profession: profile?.title,
            services: (profile?.services || []).map(s => s.name)
        });
        res.json({ response });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// === STOCK MANAGEMENT ===

router.get('/stock', auth, (req, res) => {
    const products = db.findAll('products', 'userId', req.userId) || [];
    const stock = products.map(p => ({
        id: p.id,
        name: p.name,
        sku: p.sku || p.id.substring(0, 8),
        stock: p.stock || 0,
        trackInventory: p.trackInventory || false,
        allowBackorder: p.allowBackorder || false,
        price: p.price || 0,
        lowStockThreshold: p.lowStockThreshold || 5,
        status: (p.stock || 0) <= 0 ? 'out_of_stock' : (p.stock || 0) <= (p.lowStockThreshold || 5) ? 'low_stock' : 'in_stock',
        lastUpdated: p.updatedAt || p.createdAt
    }));
    res.json({
        products: stock,
        summary: {
            total: stock.length,
            inStock: stock.filter(s => s.status === 'in_stock').length,
            lowStock: stock.filter(s => s.status === 'low_stock').length,
            outOfStock: stock.filter(s => s.status === 'out_of_stock').length
        }
    });
});

router.put('/stock/:productId', auth, (req, res) => {
    const product = db.get('products', req.params.productId);
    if (!product || product.userId !== req.userId) {
        return res.status(404).json({ error: 'Produit non trouve' });
    }
    
    const { stock, trackInventory, allowBackorder, lowStockThreshold } = req.body;
    const updates = {};
    if (stock !== undefined) updates.stock = stock;
    if (trackInventory !== undefined) updates.trackInventory = trackInventory;
    if (allowBackorder !== undefined) updates.allowBackorder = allowBackorder;
    if (lowStockThreshold !== undefined) updates.lowStockThreshold = lowStockThreshold;
    
    db.update('products', req.params.productId, updates);
    res.json({ success: true, product: db.get('products', req.params.productId) });
});

router.post('/stock/adjust', auth, (req, res) => {
    const { productId, adjustment, reason } = req.body;
    const product = db.get('products', productId);
    if (!product || product.userId !== req.userId) {
        return res.status(404).json({ error: 'Produit non trouve' });
    }
    
    const newStock = (product.stock || 0) + adjustment;
    if (newStock < 0 && !product.allowBackorder) {
        return res.status(400).json({ error: 'Stock insuffisant' });
    }
    
    db.update('products', productId, { stock: newStock });
    
    // Log stock movement
    const movement = {
        id: `mov_${Date.now()}`,
        productId,
        userId: req.userId,
        adjustment,
        reason: reason || 'Ajustement manuel',
        previousStock: product.stock || 0,
        newStock,
        timestamp: new Date().toISOString()
    };
    db.insert('stock_movements', movement);
    
    res.json({ success: true, newStock });
});

module.exports = router;
