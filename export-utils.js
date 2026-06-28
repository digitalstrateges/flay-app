/**
 * Flay Omni - Export Utilities
 * CSV + PDF generation for invoices, receipts, analytics, contacts
 */

const crypto = require('crypto');

class ExportUtils {
    constructor() {
        this.formats = ['csv', 'pdf', 'json'];
    }

    // CSV Export
    toCSV(data, columns = null) {
        if (!data || data.length === 0) return '';
        if (!columns) columns = Object.keys(data[0]);

        const header = columns.map(c => `"${c}"`).join(',');
        const rows = data.map(row =>
            columns.map(c => {
                let val = row[c];
                if (val === null || val === undefined) val = '';
                if (typeof val === 'object') val = JSON.stringify(val);
                val = String(val).replace(/"/g, '""');
                return `"${val}"`;
            }).join(',')
        );

        return [header, ...rows].join('\n');
    }

    // Simple HTML table that prints nicely (can be saved as PDF via browser)
    toHTMLTable(title, data, columns = null, options = {}) {
        if (!columns && data.length > 0) columns = Object.keys(data[0]);
        const { currency = 'XOF', dateField = null } = options;

        const headerRow = columns.map(c => `<th style="background:#818cf8;color:white;padding:12px 16px;text-align:left;font-size:13px;">${c.replace(/_/g, ' ').toUpperCase()}</th>`).join('');

        const bodyRows = data.map(row =>
            '<tr>' + columns.map(c => {
                let val = row[c];
                if (val === null || val === undefined) val = '';
                if (typeof val === 'number' && (c.includes('amount') || c.includes('price') || c.includes('total') || c.includes('cost'))) {
                    val = val.toLocaleString('fr-FR') + ' ' + currency;
                }
                if (c.includes('date') || c.includes('created') || c.includes('updated') || c.includes('paid')) {
                    try {
                        val = new Date(val).toLocaleDateString('fr-FR');
                    } catch (e) {}
                }
                if (typeof val === 'object') val = JSON.stringify(val);
                return `<td style="padding:10px 16px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#334155;">${val}</td>`;
            }).join('') + '</tr>'
        ).join('');

        return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"><title>${title}</title>
<style>
    @media print { body { margin: 0; } @page { margin: 1cm; } }
    body { font-family: -apple-system, system-ui, sans-serif; padding: 40px; color: #1e293b; }
    .header { text-align: center; margin-bottom: 32px; }
    .logo { font-size: 32px; font-weight: 900; background: linear-gradient(135deg,#818cf8,#a78bfa); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    .footer { text-align: center; margin-top: 40px; color: #94a3b8; font-size: 12px; }
    .summary { background: #f8fafc; padding: 16px; border-radius: 8px; margin-top: 16px; text-align: right; }
    .total { font-size: 24px; font-weight: 800; color: #818cf8; }
</style>
</head>
<body>
    <div class="header">
        <div class="logo">Flay</div>
        <div style="color:#64748b;font-size:12px;">DIGITALSTRATEGES</div>
        <h2 style="margin-top:16px;color:#1e293b;">${title}</h2>
        <div style="color:#94a3b8;font-size:12px;">Genere le ${new Date().toLocaleDateString('fr-FR')} a ${new Date().toLocaleTimeString('fr-FR')}</div>
    </div>
    <table>
        <thead><tr>${headerRow}</tr></thead>
        <tbody>${bodyRows}</tbody>
    </table>
    <div class="footer">Flay by DIGITALSTRATEGES | flay.app | +225 07 59 73 19 90</div>
</body>
</html>`;
    }

    // Generate downloadable CSV file
    generateCSVFile(title, data, columns = null) {
        const csv = this.toCSV(data, columns);
        const filename = `${title.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}.csv`;
        const BOM = '\uFEFF'; // UTF-8 BOM for Excel compatibility
        return {
            filename,
            content: BOM + csv,
            contentType: 'text/csv; charset=utf-8',
            size: Buffer.byteLength(BOM + csv)
        };
    }

    // Generate HTML file (can print to PDF)
    generateHTMLFile(title, data, columns = null, options = {}) {
        const html = this.toHTMLTable(title, data, columns, options);
        const filename = `${title.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}.html`;
        return {
            filename,
            content: html,
            contentType: 'text/html; charset=utf-8',
            size: Buffer.byteLength(html)
        };
    }

    // Invoice PDF generation (HTML-based)
    generateInvoice(invoice, items, options = {}) {
        const { currency = 'XOF', businessInfo = {} } = options;
        const taxRate = invoice.tax_rate || 18;
        const subtotal = items.reduce((sum, i) => sum + (i.quantity * i.unit_price), 0);
        const taxAmount = subtotal * (taxRate / 100);
        const total = subtotal + taxAmount;

        const itemRows = items.map((item, idx) => `
            <tr>
                <td style="padding:12px 16px;border-bottom:1px solid #e2e8f0;color:#64748b;">${idx + 1}</td>
                <td style="padding:12px 16px;border-bottom:1px solid #e2e8f0;">${item.description || item.name || ''}</td>
                <td style="padding:12px 16px;border-bottom:1px solid #e2e8f0;text-align:center;">${item.quantity || 1}</td>
                <td style="padding:12px 16px;border-bottom:1px solid #e2e8f0;text-align:right;">${(item.unit_price || 0).toLocaleString('fr-FR')} ${currency}</td>
                <td style="padding:12px 16px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:600;">${((item.quantity || 1) * (item.unit_price || 0)).toLocaleString('fr-FR')} ${currency}</td>
            </tr>
        `).join('');

        return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"><title>Facture ${invoice.invoice_number}</title>
<style>
    @media print { body { margin: 0; } @page { margin: 1.5cm; size: A4; } }
    body { font-family: -apple-system, system-ui, sans-serif; padding: 40px; color: #1e293b; max-width: 800px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
    .logo { font-size: 36px; font-weight: 900; background: linear-gradient(135deg,#818cf8,#a78bfa); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .badge-draft { background: #e2e8f0; color: #64748b; }
    .badge-sent { background: #dbeafe; color: #2563eb; }
    .badge-paid { background: #dcfce7; color: #16a34a; }
    .badge-overdue { background: #fef2f2; color: #dc2626; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px; }
    .info-box { background: #f8fafc; padding: 20px; border-radius: 12px; }
    .info-box h4 { color: #818cf8; margin: 0 0 8px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; }
    .info-box p { margin: 4px 0; color: #64748b; font-size: 14px; }
    .info-box strong { color: #1e293b; }
    table { width: 100%; border-collapse: collapse; margin: 24px 0; }
    th { background: #818cf8; color: white; padding: 12px 16px; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
    .summary { background: #f8fafc; padding: 20px; border-radius: 12px; margin-top: 24px; text-align: right; }
    .summary-row { display: flex; justify-content: flex-end; padding: 6px 0; font-size: 14px; color: #64748b; }
    .summary-row strong { color: #1e293b; margin-left: 32px; min-width: 150px; text-align: right; }
    .total-row { font-size: 20px; font-weight: 800; color: #818cf8; border-top: 2px solid #818cf8; padding-top: 8px; margin-top: 8px; }
    .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 12px; }
    .notes { background: #fffbeb; border: 1px solid #fde68a; padding: 16px; border-radius: 8px; margin-top: 24px; }
    .notes h4 { color: #92400e; margin: 0 0 8px 0; font-size: 12px; text-transform: uppercase; }
    .notes p { color: #92400e; margin: 0; font-size: 13px; }
</style>
</head>
<body>
    <div class="header">
        <div>
            <div class="logo">Flay</div>
            <div style="color:#64748b;font-size:12px;margin-top:4px;">DIGITALSTRATEGES</div>
            ${businessInfo.name ? `<div style="color:#1e293b;font-weight:600;margin-top:8px;">${businessInfo.name}</div>` : ''}
            ${businessInfo.address ? `<div style="color:#64748b;font-size:13px;">${businessInfo.address}</div>` : ''}
            ${businessInfo.phone ? `<div style="color:#64748b;font-size:13px;">${businessInfo.phone}</div>` : ''}
        </div>
        <div style="text-align:right;">
            <h1 style="font-size:28px;margin:0;color:#1e293b;">FACTURE</h1>
            <div style="font-size:14px;color:#64748b;margin-top:4px;">${invoice.invoice_number}</div>
            <span class="badge badge-${invoice.status || 'draft'}" style="margin-top:8px;">${(invoice.status || 'draft').toUpperCase()}</span>
        </div>
    </div>

    <div class="info-grid">
        <div class="info-box">
            <h4>Facture a</h4>
            <p><strong>${invoice.client_name || 'Client'}</strong></p>
            ${invoice.client_email ? `<p>${invoice.client_email}</p>` : ''}
            ${invoice.client_phone ? `<p>${invoice.client_phone}</p>` : ''}
        </div>
        <div class="info-box" style="text-align:right;">
            <h4>Details</h4>
            <p>Date: <strong>${new Date(invoice.created_at).toLocaleDateString('fr-FR')}</strong></p>
            ${invoice.due_date ? `<p>Echeance: <strong>${new Date(invoice.due_date).toLocaleDateString('fr-FR')}</strong></p>` : ''}
            ${invoice.paid_at ? `<p>Payee le: <strong>${new Date(invoice.paid_at).toLocaleDateString('fr-FR')}</strong></p>` : ''}
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th style="width:50px;">#</th>
                <th>Description</th>
                <th style="text-align:center;width:80px;">Qte</th>
                <th style="text-align:right;width:120px;">Prix unitaire</th>
                <th style="text-align:right;width:120px;">Total</th>
            </tr>
        </thead>
        <tbody>${itemRows}</tbody>
    </table>

    <div class="summary">
        <div class="summary-row">Sous-total<strong>${subtotal.toLocaleString('fr-FR')} ${currency}</strong></div>
        <div class="summary-row">TVA (${taxRate}%)<strong>${taxAmount.toLocaleString('fr-FR')} ${currency}</strong></div>
        <div class="summary-row total-row">TOTAL<strong>${total.toLocaleString('fr-FR')} ${currency}</strong></div>
    </div>

    ${invoice.notes ? `<div class="notes"><h4>Notes</h4><p>${invoice.notes}</p></div>` : ''}

    <div class="footer">
        <p>Flay by DIGITALSTRATEGES | flay.app | +225 07 59 73 19 90</p>
        <p style="margin-top:4px;">Merci pour votre confiance !</p>
    </div>
</body>
</html>`;
    }

    // Receipt generation
    generateReceipt(receipt, options = {}) {
        const { currency = 'XOF', businessInfo = {} } = options;
        const items = receipt.items || [];

        const itemRows = items.map((item, idx) => `
            <tr>
                <td style="padding:8px 12px;border-bottom:1px dashed #e2e8f0;">${item.description || item.name || ''}</td>
                <td style="padding:8px 12px;border-bottom:1px dashed #e2e8f0;text-align:center;">${item.quantity || 1}</td>
                <td style="padding:8px 12px;border-bottom:1px dashed #e2e8f0;text-align:right;">${((item.quantity || 1) * (item.unit_price || 0)).toLocaleString('fr-FR')} ${currency}</td>
            </tr>
        `).join('');

        return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"><title>Recu ${receipt.receipt_number}</title>
<style>
    @media print { body { margin: 0; } @page { margin: 1cm; } }
    body { font-family: -apple-system, system-ui, sans-serif; padding: 30px; color: #1e293b; max-width: 400px; margin: 0 auto; }
    .header { text-align: center; margin-bottom: 24px; }
    .logo { font-size: 28px; font-weight: 900; background: linear-gradient(135deg,#818cf8,#a78bfa); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .divider { border: none; border-top: 2px dashed #e2e8f0; margin: 16px 0; }
    table { width: 100%; border-collapse: collapse; }
    .total { font-size: 20px; font-weight: 800; color: #818cf8; text-align: center; padding: 12px 0; border-top: 2px solid #1e293b; margin-top: 8px; }
    .footer { text-align: center; margin-top: 24px; color: #94a3b8; font-size: 11px; }
</style>
</head>
<body>
    <div class="header">
        <div class="logo">Flay</div>
        ${businessInfo.name ? `<div style="font-weight:600;margin-top:4px;">${businessInfo.name}</div>` : ''}
        ${businessInfo.address ? `<div style="font-size:12px;color:#64748b;">${businessInfo.address}</div>` : ''}
    </div>

    <div style="text-align:center;">
        <div style="font-size:12px;color:#64748b;">RECU N°</div>
        <div style="font-weight:700;font-size:16px;">${receipt.receipt_number}</div>
        <div style="font-size:12px;color:#94a3b8;">${new Date(receipt.created_at).toLocaleDateString('fr-FR')} ${new Date(receipt.created_at).toLocaleTimeString('fr-FR')}</div>
    </div>

    <hr class="divider">

    ${receipt.client_name ? `<div style="margin-bottom:12px;"><span style="color:#64748b;">Client:</span> <strong>${receipt.client_name}</strong></div>` : ''}

    <table>${itemRows}</table>

    <div class="total">TOTAL: ${(receipt.total || 0).toLocaleString('fr-FR')} ${currency}</div>

    <div style="text-align:center;font-size:12px;color:#64748b;">
        Paiement: ${(receipt.payment_method || 'cash').toUpperCase()}
    </div>

    <hr class="divider">

    <div class="footer">
        <div>Merci pour votre visite !</div>
        <div style="margin-top:4px;">Flay by DIGITALSTRATEGES</div>
        <div>flay.app | +225 07 59 73 19 90</div>
    </div>
</body>
</html>`;
    }

    // Analytics export
    generateAnalyticsReport(analytics, options = {}) {
        const { period = '30 jours', businessName = '' } = options;

        const byTypeRows = Object.entries(analytics.byType || {}).map(([type, count]) =>
            `<tr><td style="padding:8px 16px;border-bottom:1px solid #e2e8f0;">${type}</td><td style="padding:8px 16px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:600;">${count}</td></tr>`
        ).join('');

        const byDayRows = Object.entries(analytics.byDay || {}).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 30).map(([date, count]) =>
            `<tr><td style="padding:8px 16px;border-bottom:1px solid #e2e8f0;">${date}</td><td style="padding:8px 16px;border-bottom:1px solid #e2e8f0;text-align:right;">${count}</td></tr>`
        ).join('');

        return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"><title>Rapport Analytics - ${period}</title>
<style>
    @media print { body { margin: 0; } @page { margin: 1cm; } }
    body { font-family: -apple-system, system-ui, sans-serif; padding: 40px; color: #1e293b; }
    .logo { font-size: 28px; font-weight: 900; background: linear-gradient(135deg,#818cf8,#a78bfa); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 24px 0; }
    .stat-card { background: #f8fafc; padding: 20px; border-radius: 12px; text-align: center; }
    .stat-value { font-size: 28px; font-weight: 800; color: #818cf8; }
    .stat-label { font-size: 12px; color: #64748b; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    th { background: #818cf8; color: white; padding: 10px 16px; text-align: left; font-size: 12px; }
    .section { margin-top: 32px; }
    .section h3 { color: #1e293b; border-bottom: 2px solid #818cf8; padding-bottom: 8px; }
</style></head><body>
    <div class="logo">Flay</div>
    <h1 style="margin-top:8px;">Rapport Analytics</h1>
    <div style="color:#64748b;">${businessName} | ${period} | Genere le ${new Date().toLocaleDateString('fr-FR')}</div>

    <div class="stats-grid">
        <div class="stat-card"><div class="stat-value">${analytics.total || 0}</div><div class="stat-label">Evenements totaux</div></div>
        <div class="stat-card"><div class="stat-value">${Object.keys(analytics.topPages || {}).length}</div><div class="stat-label">Pages uniques</div></div>
        <div class="stat-card"><div class="stat-value">${Object.keys(analytics.devices || {}).length}</div><div class="stat-label">Types d'appareils</div></div>
    </div>

    ${byTypeRows ? `<div class="section"><h3>Evenements par type</h3><table><thead><tr><th>Type</th><th style="text-align:right;">Nombre</th></tr></thead><tbody>${byTypeRows}</tbody></table></div>` : ''}

    ${byDayRows ? `<div class="section"><h3>Activite par jour</h3><table><thead><tr><th>Date</th><th style="text-align:right;">Evenements</th></tr></thead><tbody>${byDayRows}</tbody></table></div>` : ''}

    <div style="text-align:center;margin-top:40px;color:#94a3b8;font-size:12px;">Flay by DIGITALSTRATEGES | flay.app</div>
</body></html>`;
    }
}

module.exports = new ExportUtils();
