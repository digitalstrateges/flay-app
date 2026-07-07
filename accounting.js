/**
 * Flay Accounting System
 * Reçus, Comptabilité, Gestion de stocks avancée
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class Accounting {
    constructor() {
        this.dataDir = path.join(__dirname, 'data', 'accounting');
        this.ensureDir();
    }

    ensureDir() {
        if (!fs.existsSync(this.dataDir)) fs.mkdirSync(this.dataDir, { recursive: true });
    }

    _load(file) {
        const p = path.join(this.dataDir, file);
        try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return []; }
    }

    _save(file, data) {
        fs.writeFileSync(path.join(this.dataDir, file), JSON.stringify(data, null, 2));
    }

    _genId(prefix = 'REC') {
        return `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    }

    // === RECEIPTS (REÇUS) ===

    createReceipt(userId, data) {
        const receipts = this._load(`receipts_${userId}.json`);
        const receipt = {
            id: this._genId('REC'),
            userId,
            number: this._nextNumber(receipts, 'REC'),
            type: data.type || 'payment', // payment, donation, refund, subscription
            status: 'issued', // issued, paid, cancelled, refunded
            
            // Client
            client: {
                name: data.clientName || '',
                email: data.clientEmail || '',
                phone: data.clientPhone || '',
                address: data.clientAddress || '',
                city: data.clientCity || ''
            },
            
            // Items
            items: (data.items || []).map((item, i) => ({
                id: i + 1,
                description: item.description || '',
                quantity: item.quantity || 1,
                unitPrice: item.unitPrice || 0,
                discount: item.discount || 0,
                taxRate: item.taxRate || 0.18, // TVA CI 18%
                total: 0
            })),
            
            // Totaux
            subtotal: 0,
            discountTotal: 0,
            taxTotal: 0,
            total: 0,
            currency: data.currency || 'XOF',
            
            // Paiement
            payment: {
                method: data.paymentMethod || 'wave', // wave, cash, om, momo, cb, transfer
                reference: data.paymentReference || '',
                date: data.paymentDate || null,
                status: data.paymentStatus || 'pending'
            },
            
            // Notes
            notes: data.notes || '',
            footer: data.footer || 'Merci pour votre confiance!',
            
            // Meta
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            sentAt: null,
            paidAt: null
        };

        // Calculer les totaux
        this._calculateTotals(receipt);
        
        receipts.push(receipt);
        this._save(`receipts_${userId}.json`, receipts);
        
        return receipt;
    }

    getReceipt(userId, receiptId) {
        const receipts = this._load(`receipts_${userId}.json`);
        return receipts.find(r => r.id === receiptId);
    }

    listReceipts(userId, filters = {}) {
        let receipts = this._load(`receipts_${userId}.json`);
        
        if (filters.status) receipts = receipts.filter(r => r.status === filters.status);
        if (filters.type) receipts = receipts.filter(r => r.type === filters.type);
        if (filters.from) receipts = receipts.filter(r => new Date(r.createdAt) >= new Date(filters.from));
        if (filters.to) receipts = receipts.filter(r => new Date(r.createdAt) <= new Date(filters.to));
        
        // Tri par date décroissante
        receipts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        return {
            receipts,
            total: receipts.length,
            sum: receipts.reduce((s, r) => s + (r.status === 'paid' ? r.total : 0), 0),
            currency: 'XOF'
        };
    }

    updateReceipt(userId, receiptId, updates) {
        const receipts = this._load(`receipts_${userId}.json`);
        const idx = receipts.findIndex(r => r.id === receiptId);
        if (idx === -1) return null;
        
        Object.assign(receipts[idx], updates, { updatedAt: new Date().toISOString() });
        this._calculateTotals(receipts[idx]);
        this._save(`receipts_${userId}.json`, receipts);
        
        return receipts[idx];
    }

    markPaid(userId, receiptId, paymentData = {}) {
        return this.updateReceipt(userId, receiptId, {
            status: 'paid',
            paidAt: new Date().toISOString(),
            payment: {
                ...paymentData,
                status: 'paid',
                date: paymentData.date || new Date().toISOString()
            }
        });
    }

    cancelReceipt(userId, receiptId) {
        return this.updateReceipt(userId, receiptId, { status: 'cancelled' });
    }

    // === ACCOUNTING (COMPTABILITÉ) ===

    addTransaction(userId, data) {
        const transactions = this._load(`transactions_${userId}.json`);
        const transaction = {
            id: this._genId('TXN'),
            userId,
            type: data.type, // income, expense, transfer
            category: data.category || 'general', // sales, subscriptions, services, supplies, rent, marketing, other
            
            description: data.description || '',
            amount: data.amount || 0,
            currency: data.currency || 'XOF',
            
            // Référence
            reference: data.reference || '',
            receiptId: data.receiptId || null,
            orderId: data.orderId || null,
            
            // Paiement
            paymentMethod: data.paymentMethod || 'wave',
            paymentReference: data.paymentReference || '',
            
            // Dates
            date: data.date || new Date().toISOString(),
            dueDate: data.dueDate || null,
            
            // Statut
            status: data.status || 'completed', // pending, completed, cancelled
            
            // Tags
            tags: data.tags || [],
            
            createdAt: new Date().toISOString()
        };

        transactions.push(transaction);
        this._save(`transactions_${userId}.json`, transactions);
        
        return transaction;
    }

    getTransactions(userId, filters = {}) {
        let transactions = this._load(`transactions_${userId}.json`);
        
        if (filters.type) transactions = transactions.filter(t => t.type === filters.type);
        if (filters.category) transactions = transactions.filter(t => t.category === filters.category);
        if (filters.status) transactions = transactions.filter(t => t.status === filters.status);
        if (filters.from) transactions = transactions.filter(t => new Date(t.date) >= new Date(filters.from));
        if (filters.to) transactions = transactions.filter(t => new Date(t.date) <= new Date(filters.to));
        
        transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        return transactions;
    }

    getFinancialSummary(userId, period = 'month') {
        const transactions = this._load(`transactions_${userId}.json`);
        const now = new Date();
        let startDate;

        switch (period) {
            case 'today': startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()); break;
            case 'week': startDate = new Date(now - 7 * 24 * 60 * 60 * 1000); break;
            case 'month': startDate = new Date(now.getFullYear(), now.getMonth(), 1); break;
            case 'year': startDate = new Date(now.getFullYear(), 0, 1); break;
            default: startDate = new Date(0);
        }

        const filtered = transactions.filter(t => 
            new Date(t.date) >= startDate && t.status === 'completed'
        );

        const income = filtered.filter(t => t.type === 'income');
        const expenses = filtered.filter(t => t.type === 'expense');

        const totalIncome = income.reduce((s, t) => s + t.amount, 0);
        const totalExpenses = expenses.reduce((s, t) => s + t.amount, 0);

        // Par catégorie
        const byCategory = {};
        filtered.forEach(t => {
            if (!byCategory[t.category]) byCategory[t.category] = { income: 0, expense: 0 };
            byCategory[t.category][t.type] += t.amount;
        });

        // Par jour (pour graphique)
        const daily = {};
        filtered.forEach(t => {
            const day = t.date.split('T')[0];
            if (!daily[day]) daily[day] = { income: 0, expense: 0 };
            daily[day][t.type] += t.amount;
        });

        return {
            period,
            startDate: startDate.toISOString(),
            endDate: now.toISOString(),
            summary: {
                totalIncome,
                totalExpenses,
                netProfit: totalIncome - totalExpenses,
                transactionCount: filtered.length,
                currency: 'XOF'
            },
            byCategory,
            daily,
            recentTransactions: filtered.slice(0, 10)
        };
    }

    // === INVOICES (FACTURES) ===

    createInvoice(userId, data) {
        const invoices = this._load(`invoices_${userId}.json`);
        const invoice = {
            id: this._genId('INV'),
            userId,
            number: this._nextNumber(invoices, 'INV'),
            status: 'draft', // draft, sent, paid, overdue, cancelled
            
            // Client
            client: {
                name: data.clientName || '',
                email: data.clientEmail || '',
                phone: data.clientPhone || '',
                address: data.clientAddress || ''
            },
            
            // Items
            items: (data.items || []).map((item, i) => ({
                id: i + 1,
                description: item.description || '',
                quantity: item.quantity || 1,
                unitPrice: item.unitPrice || 0,
                discount: item.discount || 0,
                taxRate: item.taxRate || 0.18,
                total: 0
            })),
            
            subtotal: 0,
            discountTotal: 0,
            taxTotal: 0,
            total: 0,
            currency: data.currency || 'XOF',
            
            // Dates
            issueDate: data.issueDate || new Date().toISOString(),
            dueDate: data.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            paidAt: null,
            
            // Paiement
            paymentTerms: data.paymentTerms || 'Paiement a 30 jours',
            paymentMethod: data.paymentMethod || '',
            
            notes: data.notes || '',
            
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        this._calculateTotals(invoice);
        invoices.push(invoice);
        this._save(`invoices_${userId}.json`, invoices);
        
        return invoice;
    }

    generateReceiptHTML(receipt, options = {}) {
        const brandColor = options.brandColor || '#818cf8';
        
        return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Recu ${receipt.number} | Flay</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f1f5f9;padding:2rem;color:#1e293b}
.receipt{max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)}
.header{background:${brandColor};color:#fff;padding:2rem;text-align:center}
.header h1{font-size:1.5rem;margin-bottom:.5rem}
.header .number{opacity:.8;font-size:.9rem}
.status{display:inline-block;padding:.25rem .75rem;border-radius:99px;font-size:.75rem;font-weight:600;margin-top:.5rem}
.status.paid{background:#dcfce7;color:#166534}
.status.issued{background:#fef3c7;color:#92400e}
.status.cancelled{background:#fee2e2;color:#991b1b}
.content{padding:2rem}
.section{margin-bottom:1.5rem}
.section-title{font-size:.75rem;text-transform:uppercase;letter-spacing:.05em;color:#64748b;margin-bottom:.75rem;font-weight:600}
.client-info{display:grid;grid-template-columns:1fr 1fr;gap:.5rem}
.client-info div{font-size:.875rem}
.client-info .label{color:#64748b}
table{width:100%;border-collapse:collapse;font-size:.875rem}
th{text-align:left;padding:.75rem 0;border-bottom:2px solid #e2e8f0;color:#64748b;font-size:.75rem;text-transform:uppercase}
td{padding:.75rem 0;border-bottom:1px solid #f1f5f9}
.amount{text-align:right;font-weight:600}
.totals{margin-top:1rem;text-align:right}
.totals .row{display:flex;justify-content:space-between;padding:.25rem 0;font-size:.875rem}
.totals .row.total{font-size:1.125rem;font-weight:700;border-top:2px solid #e2e8f0;padding-top:.5rem;margin-top:.5rem;color:${brandColor}}
.payment{background:#f8fafc;border-radius:8px;padding:1rem;margin-top:1.5rem}
.payment .method{font-weight:600;text-transform:capitalize}
.footer{text-align:center;padding:1.5rem;background:#f8fafc;color:#64748b;font-size:.8rem}
@media print{body{padding:0}.receipt{box-shadow:none;border-radius:0}}
</style>
</head>
<body>
<div class="receipt">
    <div class="header">
        <h1>Recu de paiement</h1>
        <div class="number">${receipt.number}</div>
        <div class="status ${receipt.status}">${this._statusLabel(receipt.status)}</div>
    </div>
    <div class="content">
        <div class="section">
            <div class="section-title">Emetteur</div>
            <div style="font-weight:600">${options.businessName || 'Votre Entreprise'}</div>
            <div style="color:#64748b;font-size:.875rem">${options.businessAddress || ''}</div>
        </div>
        
        <div class="section">
            <div class="section-title">Client</div>
            <div class="client-info">
                <div><span class="label">Nom: </span>${receipt.client.name || 'N/A'}</div>
                <div><span class="label">Email: </span>${receipt.client.email || 'N/A'}</div>
                <div><span class="label">Tel: </span>${receipt.client.phone || 'N/A'}</div>
                <div><span class="label">Ville: </span>${receipt.client.city || 'N/A'}</div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">Details</div>
            <table>
                <thead><tr><th>Designation</th><th>Qte</th><th>Prix</th><th class="amount">Total</th></tr></thead>
                <tbody>
                    ${receipt.items.map(item => `<tr>
                        <td>${item.description}</td>
                        <td>${item.quantity}</td>
                        <td>${this._formatMoney(item.unitPrice, receipt.currency)}</td>
                        <td class="amount">${this._formatMoney(item.total, receipt.currency)}</td>
                    </tr>`).join('')}
                </tbody>
            </table>
            
            <div class="totals">
                <div class="row"><span>Sous-total</span><span>${this._formatMoney(receipt.subtotal, receipt.currency)}</span></div>
                ${receipt.discountTotal > 0 ? `<div class="row"><span>Remise</span><span>-${this._formatMoney(receipt.discountTotal, receipt.currency)}</span></div>` : ''}
                <div class="row"><span>TVA (18%)</span><span>${this._formatMoney(receipt.taxTotal, receipt.currency)}</span></div>
                <div class="row total"><span>TOTAL</span><span>${this._formatMoney(receipt.total, receipt.currency)}</span></div>
            </div>
        </div>

        ${receipt.payment.status === 'paid' ? `
        <div class="payment">
            <div class="section-title">Paiement recu</div>
            <div><span class="method">${receipt.payment.method}</span> - ${this._formatDate(receipt.paidAt || receipt.payment.date)}</div>
            <div style="color:#64748b;font-size:.8rem">Ref: ${receipt.payment.reference || 'N/A'}</div>
        </div>` : ''}

        ${receipt.notes ? `<div style="margin-top:1rem;padding:1rem;background:#f8fafc;border-radius:8px;font-size:.875rem;color:#64748b">${receipt.notes}</div>` : ''}
    </div>
    <div class="footer">${receipt.footer}<br><small>Genere par Flay - ${this._formatDate(receipt.createdAt)}</small></div>
</div>
</body>
</html>`;
    }

    generateInvoiceHTML(invoice, options = {}) {
        const brandColor = options.brandColor || '#818cf8';
        
        return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Facture ${invoice.number} | Flay</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f1f5f9;padding:2rem;color:#1e293b}
.invoice{max-width:700px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)}
.header{display:flex;justify-content:space-between;align-items:flex-start;padding:2rem;border-bottom:3px solid ${brandColor}}
.brand h1{font-size:1.75rem;color:${brandColor}}
.brand div{color:#64748b;font-size:.875rem;margin-top:.25rem}
.invoice-meta{text-align:right}
.invoice-meta .number{font-size:1.25rem;font-weight:700}
.invoice-meta .date{color:#64748b;font-size:.875rem}
.status-badge{display:inline-block;padding:.25rem .75rem;border-radius:99px;font-size:.75rem;font-weight:600;margin-top:.5rem}
.status-badge.draft{background:#f1f5f9;color:#64748b}
.status-badge.sent{background:#dbeafe;color:#1e40af}
.status-badge.paid{background:#dcfce7;color:#166534}
.status-badge.overdue{background:#fee2e2;color:#991b1b}
.content{padding:2rem}
.parties{display:grid;grid-template-columns:1fr 1fr;gap:2rem;margin-bottom:2rem}
.party .label{font-size:.75rem;text-transform:uppercase;letter-spacing:.05em;color:#64748b;margin-bottom:.5rem;font-weight:600}
.party .name{font-weight:600;margin-bottom:.25rem}
.party div{font-size:.875rem;color:#475569}
table{width:100%;border-collapse:collapse;margin-bottom:1.5rem}
th{text-align:left;padding:.75rem;border-bottom:2px solid #e2e8f0;color:#64748b;font-size:.75rem;text-transform:uppercase}
td{padding:.75rem;border-bottom:1px solid #f1f5f9}
.amount{text-align:right;font-weight:600}
.totals{display:flex;justify-content:flex-end}
.totals-box{width:250px}
.totals .row{display:flex;justify-content:space-between;padding:.3rem 0;font-size:.875rem}
.totals .row.total{font-size:1.25rem;font-weight:700;border-top:2px solid ${brandColor};padding-top:.5rem;margin-top:.5rem;color:${brandColor}}
.terms{margin-top:2rem;padding:1rem;background:#f8fafc;border-radius:8px;font-size:.8rem;color:#64748b}
.footer{text-align:center;padding:1.5rem;background:#f8fafc;color:#64748b;font-size:.8rem;border-top:1px solid #e2e8f0}
@media print{body{padding:0}.invoice{box-shadow:none;border-radius:0}}
</style>
</head>
<body>
<div class="invoice">
    <div class="header">
        <div class="brand">
            <h1>${options.businessName || 'Votre Entreprise'}</h1>
            <div>${options.businessAddress || ''}</div>
            <div>${options.businessEmail || ''}</div>
        </div>
        <div class="invoice-meta">
            <div class="number">${invoice.number}</div>
            <div class="date">Emise le ${this._formatDate(invoice.issueDate)}</div>
            <div class="date">Echeance: ${this._formatDate(invoice.dueDate)}</div>
            <div class="status-badge ${invoice.status}">${this._statusLabel(invoice.status)}</div>
        </div>
    </div>
    <div class="content">
        <div class="parties">
            <div class="party">
                <div class="label">Facturer a</div>
                <div class="name">${invoice.client.name || 'N/A'}</div>
                <div>${invoice.client.email || ''}</div>
                <div>${invoice.client.phone || ''}</div>
                <div>${invoice.client.address || ''}</div>
            </div>
            <div class="party">
                <div class="label">Mode de paiement</div>
                <div>${invoice.paymentTerms}</div>
                <div style="margin-top:.5rem;color:${brandColor};font-weight:600">${this._formatMoney(invoice.total, invoice.currency)}</div>
            </div>
        </div>
        
        <table>
            <thead><tr><th>Designation</th><th>Qte</th><th>Prix unitaire</th><th>Remise</th><th class="amount">Total</th></tr></thead>
            <tbody>
                ${invoice.items.map(item => `<tr>
                    <td>${item.description}</td>
                    <td>${item.quantity}</td>
                    <td>${this._formatMoney(item.unitPrice, invoice.currency)}</td>
                    <td>${item.discount > 0 ? item.discount + '%' : '-'}</td>
                    <td class="amount">${this._formatMoney(item.total, invoice.currency)}</td>
                </tr>`).join('')}
            </tbody>
        </table>
        
        <div class="totals">
            <div class="totals-box">
                <div class="row"><span>Sous-total</span><span>${this._formatMoney(invoice.subtotal, invoice.currency)}</span></div>
                ${invoice.discountTotal > 0 ? `<div class="row"><span>Remise</span><span>-${this._formatMoney(invoice.discountTotal, invoice.currency)}</span></div>` : ''}
                <div class="row"><span>TVA (18%)</span><span>${this._formatMoney(invoice.taxTotal, invoice.currency)}</span></div>
                <div class="row total"><span>TOTAL</span><span>${this._formatMoney(invoice.total, invoice.currency)}</span></div>
            </div>
        </div>

        ${invoice.notes ? `<div class="terms"><strong>Notes:</strong> ${invoice.notes}</div>` : ''}
        ${invoice.payment.status === 'paid' ? `<div class="terms" style="background:#dcfce7;color:#166534"><strong>Paiement recu</strong> le ${this._formatDate(invoice.paidAt)}</div>` : ''}
    </div>
    <div class="footer">Facture generee par Flay - ${this._formatDate(invoice.createdAt)}</div>
</div>
</body>
</html>`;
    }

    // === HELPERS ===

    _calculateTotals(doc) {
        let subtotal = 0;
        let discountTotal = 0;
        let taxTotal = 0;

        doc.items.forEach(item => {
            const lineTotal = item.quantity * item.unitPrice;
            const discount = lineTotal * (item.discount / 100);
            const afterDiscount = lineTotal - discount;
            const tax = afterDiscount * item.taxRate;
            
            item.total = Math.round(afterDiscount + tax);
            subtotal += lineTotal;
            discountTotal += discount;
            taxTotal += tax;
        });

        doc.subtotal = Math.round(subtotal);
        doc.discountTotal = Math.round(discountTotal);
        doc.taxTotal = Math.round(taxTotal);
        doc.total = Math.round(subtotal - discountTotal + taxTotal);
    }

    _nextNumber(items, prefix) {
        const year = new Date().getFullYear();
        const count = items.length + 1;
        return `${prefix}-${year}-${String(count).padStart(4, '0')}`;
    }

    _formatMoney(amount, currency = 'XOF') {
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 0
        }).format(amount);
    }

    _formatDate(dateStr) {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleDateString('fr-FR', {
            day: 'numeric', month: 'long', year: 'numeric'
        });
    }

    _statusLabel(status) {
        const labels = {
            issued: 'Emis', paid: 'Paye', cancelled: 'Annule', refunded: 'Rembourse',
            draft: 'Brouillon', sent: 'Envoye', overdue: 'En retard'
        };
        return labels[status] || status;
    }
}

module.exports = new Accounting();
