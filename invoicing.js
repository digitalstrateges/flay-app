/**
 * Flay Omni - Facturation / Invoicing
 * Generation de factures PDF automatiques
 */

const crypto = require('crypto');

class InvoiceManager {
    constructor() {
        this.invoices = new Map();
        this.templates = new Map();
    }

    create(userId, data) {
        const id = `INV-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
        const invoice = {
            id, userId,
            number: data.number || this.generateNumber(userId),
            client: {
                name: data.clientName || '',
                email: data.clientEmail || '',
                phone: data.clientPhone || '',
                address: data.clientAddress || ''
            },
            items: data.items || [],
            subtotal: 0,
            taxRate: data.taxRate || 0,
            tax: 0,
            discount: data.discount || 0,
            total: 0,
            currency: data.currency || 'XOF',
            status: 'draft',
            dueDate: data.dueDate || null,
            notes: data.notes || '',
            paymentLink: data.paymentLink || '',
            createdAt: new Date().toISOString(),
            paidAt: null
        };
        this.calculateTotals(invoice);
        this.invoices.set(id, invoice);
        return invoice;
    }

    calculateTotals(invoice) {
        invoice.subtotal = invoice.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
        invoice.tax = invoice.subtotal * (invoice.taxRate / 100);
        invoice.total = invoice.subtotal + invoice.tax - invoice.discount;
    }

    generateNumber(userId) {
        const count = this.getUserInvoices(userId).length + 1;
        return `FV-${String(count).padStart(4, '0')}`;
    }

    update(invoiceId, data) {
        const invoice = this.invoices.get(invoiceId);
        if (!invoice) return null;
        Object.assign(invoice, data);
        if (data.items) this.calculateTotals(invoice);
        return invoice;
    }

    get(invoiceId) {
        return this.invoices.get(invoiceId) || null;
    }

    getUserInvoices(userId, status = null) {
        const invoices = [];
        for (const [, inv] of this.invoices) {
            if (inv.userId !== userId) continue;
            if (status && inv.status !== status) continue;
            invoices.push(inv);
        }
        return invoices.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    markPaid(invoiceId) {
        const inv = this.invoices.get(invoiceId);
        if (!inv) return null;
        inv.status = 'paid';
        inv.paidAt = new Date().toISOString();
        return inv;
    }

    markSent(invoiceId) {
        const inv = this.invoices.get(invoiceId);
        if (!inv) return null;
        inv.status = 'sent';
        return inv;
    }

    cancel(invoiceId) {
        const inv = this.invoices.get(invoiceId);
        if (!inv) return null;
        inv.status = 'cancelled';
        return inv;
    }

    getStats(userId) {
        let total = 0, paid = 0, pending = 0, overdue = 0, totalAmount = 0, paidAmount = 0;
        for (const [, inv] of this.invoices) {
            if (inv.userId !== userId) continue;
            total++;
            totalAmount += inv.total;
            if (inv.status === 'paid') { paid++; paidAmount += inv.total; }
            else if (inv.status === 'sent') pending++;
            else if (inv.status === 'overdue') overdue++;
        }
        return { total, paid, pending, overdue, totalAmount, paidAmount };
    }

    generateHTML(invoice, user, profile) {
        const items = invoice.items.map(item => `
            <tr>
                <td style="padding:12px;border-bottom:1px solid #eee;">${item.description}</td>
                <td style="padding:12px;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td>
                <td style="padding:12px;border-bottom:1px solid #eee;text-align:right;">${item.price.toLocaleString()} ${invoice.currency}</td>
                <td style="padding:12px;border-bottom:1px solid #eee;text-align:right;font-weight:600;">${(item.quantity * item.price).toLocaleString()} ${invoice.currency}</td>
            </tr>
        `).join('');

        return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<style>
    @page { margin: 20mm; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1a1a2e; margin: 0; padding: 40px; }
    .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
    .brand { font-size: 28px; font-weight: 900; color: #667eea; }
    .invoice-title { font-size: 32px; font-weight: 800; color: #1a1a2e; }
    .invoice-number { font-size: 14px; color: #666; margin-top: 4px; }
    .meta { display: flex; justify-content: space-between; margin-bottom: 40px; }
    .meta-block h3 { font-size: 12px; text-transform: uppercase; color: #999; letter-spacing: 1px; margin-bottom: 8px; }
    .meta-block p { font-size: 14px; line-height: 1.6; margin: 2px 0; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    th { background: #667eea; color: white; padding: 12px; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
    th:nth-child(2), th:nth-child(3), th:nth-child(4) { text-align: right; }
    .totals { display: flex; justify-content: flex-end; }
    .totals-table { width: 300px; }
    .totals-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; }
    .totals-row.total { border-top: 2px solid #667eea; padding-top: 12px; font-size: 18px; font-weight: 800; color: #667eea; }
    .status { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .status-draft { background: #f0f0f0; color: #666; }
    .status-sent { background: #dbeafe; color: #2563eb; }
    .status-paid { background: #dcfce7; color: #16a34a; }
    .status-overdue { background: #fee2e2; color: #dc2626; }
    .footer { margin-top: 60px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; font-size: 12px; color: #999; }
    .payment-link { display: inline-block; margin-top: 16px; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; }
    .notes { margin-top: 20px; padding: 16px; background: #f8f9fa; border-radius: 8px; font-size: 13px; color: #666; }
</style>
</head>
<body>
    <div class="header">
        <div>
            <div class="brand">Flay</div>
            <div style="font-size:12px;color:#999;">DIGITALSTRATEGES</div>
        </div>
        <div style="text-align:right;">
            <div class="invoice-title">FACTURE</div>
            <div class="invoice-number">${invoice.number}</div>
            <div style="margin-top:8px;"><span class="status status-${invoice.status}">${invoice.status.toUpperCase()}</span></div>
        </div>
    </div>

    <div class="meta">
        <div class="meta-block">
            <h3>Emetteur</h3>
            <p><strong>${user.name}</strong></p>
            ${profile?.phone ? `<p>${profile.phone}</p>` : ''}
            ${profile?.email ? `<p>${profile.email}</p>` : ''}
            ${profile?.location ? `<p>${profile.location}</p>` : ''}
        </div>
        <div class="meta-block" style="text-align:right;">
            <h3>Client</h3>
            <p><strong>${invoice.client.name}</strong></p>
            ${invoice.client.email ? `<p>${invoice.client.email}</p>` : ''}
            ${invoice.client.phone ? `<p>${invoice.client.phone}</p>` : ''}
            ${invoice.client.address ? `<p>${invoice.client.address}</p>` : ''}
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th>Description</th>
                <th style="text-align:center;">Qte</th>
                <th style="text-align:right;">Prix unitaire</th>
                <th style="text-align:right;">Total</th>
            </tr>
        </thead>
        <tbody>${items}</tbody>
    </table>

    <div class="totals">
        <div class="totals-table">
            <div class="totals-row"><span>Sous-total</span><span>${invoice.subtotal.toLocaleString()} ${invoice.currency}</span></div>
            ${invoice.taxRate > 0 ? `<div class="totals-row"><span>TVA (${invoice.taxRate}%)</span><span>${invoice.tax.toLocaleString()} ${invoice.currency}</span></div>` : ''}
            ${invoice.discount > 0 ? `<div class="totals-row"><span>Remise</span><span>-${invoice.discount.toLocaleString()} ${invoice.currency}</span></div>` : ''}
            <div class="totals-row total"><span>TOTAL</span><span>${invoice.total.toLocaleString()} ${invoice.currency}</span></div>
        </div>
    </div>

    ${invoice.paymentLink ? `<div style="text-align:center;margin-top:30px;"><a href="${invoice.paymentLink}" class="payment-link">Payer maintenant</a></div>` : ''}

    ${invoice.notes ? `<div class="notes"><strong>Notes:</strong> ${invoice.notes}</div>` : ''}

    <div class="footer">
        <p>Facture generee via Flay - DIGITALSTRATEGES</p>
        <p>Contact: +225 07 59 73 19 90 | flay.app</p>
    </div>
</body>
</html>`;
    }
}

module.exports = new InvoiceManager();
