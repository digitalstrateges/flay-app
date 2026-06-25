const fs = require('fs');
const path = require('path');
const { genId, generateInvoiceId } = require('../auth-utils');
const config = require('../config');

const DB_PATH = path.join(__dirname, '..', 'data', 'payments.json');
const INVOICES_PATH = path.join(__dirname, '..', 'data', 'invoices.json');

function readDB(file) {
    if (!fs.existsSync(file)) return [];
    return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeDB(file, data) {
    const dir = path.dirname(file);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

class Payment {
    static create(data) {
        const payments = readDB(DB_PATH);
        const planInfo = config.PLANS[data.plan];

        const payment = {
            id: genId(),
            userId: data.userId,
            plan: data.plan,
            amount: planInfo ? planInfo.price : 0,
            currency: 'XOF',
            status: 'pending',
            method: 'wave',
            waveRef: data.waveRef || '',
            payerName: data.payerName || '',
            payerPhone: data.payerPhone || '',
            payerEmail: data.payerEmail || '',
            invoiceId: generateInvoiceId(),
            metadata: data.metadata || {},
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        payments.push(payment);
        writeDB(DB_PATH, payments);

        // Create invoice
        Payment.createInvoice(payment);

        return payment;
    }

    static createInvoice(payment) {
        const invoices = readDB(INVOICES_PATH);
        const planInfo = config.PLANS[payment.plan];

        const invoice = {
            id: payment.invoiceId,
            paymentId: payment.id,
            userId: payment.userId,
            plan: payment.plan,
            planName: planInfo ? planInfo.name : payment.plan,
            amount: payment.amount,
            currency: payment.currency,
            status: payment.status === 'confirmed' ? 'paid' : 'pending',
            payer: {
                name: payment.payerName,
                email: payment.payerEmail,
                phone: payment.payerPhone
            },
            merchant: {
                name: config.WAVE_MERCHANT,
                phone: config.WAVE_PHONE,
                email: config.WAVE_EMAIL
            },
            items: [{
                description: `Abonnement Flay ${planInfo ? planInfo.name : payment.plan} - 1 mois`,
                amount: payment.amount
            }],
            tax: 0,
            total: payment.amount,
            paidAt: payment.status === 'confirmed' ? new Date().toISOString() : null,
            createdAt: payment.createdAt
        };

        invoices.push(invoice);
        writeDB(INVOICES_PATH, invoices);
        return invoice;
    }

    static confirm(id, waveRef) {
        const payments = readDB(DB_PATH);
        const idx = payments.findIndex(p => p.id === id);
        if (idx === -1) return null;

        payments[idx].status = 'confirmed';
        payments[idx].waveRef = waveRef || payments[idx].waveRef;
        payments[idx].confirmedAt = new Date().toISOString();
        payments[idx].updatedAt = new Date().toISOString();
        writeDB(DB_PATH, payments);

        // Update invoice
        const invoices = readDB(INVOICES_PATH);
        const invIdx = invoices.findIndex(i => i.paymentId === id);
        if (invIdx !== -1) {
            invoices[invIdx].status = 'paid';
            invoices[invIdx].paidAt = new Date().toISOString();
            writeDB(INVOICES_PATH, invoices);
        }

        return payments[idx];
    }

    static cancel(id) {
        const payments = readDB(DB_PATH);
        const idx = payments.findIndex(p => p.id === id);
        if (idx === -1) return null;

        payments[idx].status = 'cancelled';
        payments[idx].cancelledAt = new Date().toISOString();
        payments[idx].updatedAt = new Date().toISOString();
        writeDB(DB_PATH, payments);
        return payments[idx];
    }

    static findByUserId(userId) {
        return readDB(DB_PATH).filter(p => p.userId === userId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    static findById(id) {
        return readDB(DB_PATH).find(p => p.id === id);
    }

    static findPending() {
        return readDB(DB_PATH).filter(p => p.status === 'pending');
    }

    static findExpired() {
        return readDB(DB_PATH).filter(p => p.status === 'pending' && new Date(p.expiresAt) < new Date());
    }

    static getInvoice(invoiceId) {
        return readDB(INVOICES_PATH).find(i => i.id === invoiceId);
    }

    static getUserInvoices(userId) {
        return readDB(INVOICES_PATH).filter(i => i.userId === userId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    static getAll() {
        return readDB(DB_PATH).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    static getStats() {
        const payments = readDB(DB_PATH);
        const now = new Date();
        const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
        const confirmed = payments.filter(p => p.status === 'confirmed');
        const thisMonth = confirmed.filter(p => new Date(p.confirmedAt || p.createdAt) > thirtyDaysAgo);

        return {
            totalPayments: payments.length,
            confirmed: confirmed.length,
            pending: payments.filter(p => p.status === 'pending').length,
            cancelled: payments.filter(p => p.status === 'cancelled').length,
            totalRevenue: confirmed.reduce((sum, p) => sum + (p.amount || 0), 0),
            monthlyRevenue: thisMonth.reduce((sum, p) => sum + (p.amount || 0), 0),
            byPlan: {
                pro: confirmed.filter(p => p.plan === 'pro').length,
                premium: confirmed.filter(p => p.plan === 'premium').length
            }
        };
    }

    static cleanupExpired() {
        const expired = Payment.findExpired();
        expired.forEach(p => Payment.cancel(p.id));
        return expired.length;
    }
}

module.exports = Payment;
