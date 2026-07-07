const db = require('./db');
const crypto = require('crypto');

class Marketplace {
    getVendors(page = 1, perPage = 20) {
        const users = db.getAll('users');
        const vendors = users.filter(u => {
            const profile = db.findBy('profiles', 'userId', u.id);
            const products = db.findAll('products', 'userId', u.id);
            return products.some(p => p.status === 'active');
        }).map(u => {
            const profile = db.findBy('profiles', 'userId', u.id);
            const products = db.findAll('products', 'userId', u.id);
            const activeProducts = products.filter(p => p.status === 'active');
            const orders = db.findAll('orders', 'userId', u.id);
            const totalSales = orders.filter(o => ['confirmed', 'processing', 'shipped', 'delivered'].includes(o.status))
                .reduce((s, o) => s + o.total, 0);
            return {
                id: u.id, name: u.name, slug: profile?.slug || u.username,
                avatar: profile?.avatar || '',
                bio: profile?.bio || '',
                location: profile?.location || '',
                productCount: activeProducts.length,
                totalSales,
                storeUrl: `/store/${u.id}`,
                profileUrl: `/${profile?.slug || u.username}`
            };
        });
        vendors.sort((a, b) => b.totalSales - a.totalSales);
        const total = vendors.length;
        const start = (page - 1) * perPage;
        return {
            items: vendors.slice(start, start + perPage),
            pagination: { total, page, perPage, totalPages: Math.ceil(total / perPage) }
        };
    }

    generateReferralCode(userId) {
        const existing = db.findBy('referrals', 'userId', userId);
        if (existing) return existing;
        const code = (userId.substring(0, 4) + crypto.randomBytes(3).toString('hex')).toUpperCase();
        const referral = db.insert('referrals', {
            id: `ref_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
            userId, code,
            totalReferrals: 0, totalCommission: 0, paidCommission: 0,
            createdAt: new Date().toISOString()
        });
        return referral;
    }

    getReferralCode(userId) {
        return db.findBy('referrals', 'userId', userId);
    }

    trackReferral(referralCode, referredUserId) {
        const ref = db.findBy('referrals', 'code', referralCode);
        if (!ref) return { error: 'Code invalide' };
        const existing = db.findAll('referral_conversions', 'referredUserId', referredUserId);
        if (existing.some(e => e.referralId === ref.id)) return { error: 'Deja parraine' };
        const conversion = db.insert('referral_conversions', {
            id: `conv_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
            referralId: ref.id, referrerUserId: ref.userId, referredUserId,
            status: 'pending', commission: 0,
            createdAt: new Date().toISOString()
        });
        db.update('referrals', ref.id, { totalReferrals: (ref.totalReferrals || 0) + 1 });
        return conversion;
    }

    addCommission(referralCode, amount) {
        const ref = db.findBy('referrals', 'code', referralCode);
        if (!ref) return { error: 'Code invalide' };
        const commissionRate = 0.05;
        const commission = Math.round(amount * commissionRate);
        db.update('referrals', ref.id, {
            totalCommission: (ref.totalCommission || 0) + commission
        });
        const conversions = db.findAll('referral_conversions', 'referralId', ref.id);
        const latest = conversions[conversions.length - 1];
        if (latest) {
            db.update('referral_conversions', latest.id, { commission, status: 'paid' });
        }
        return { commission, rate: commissionRate };
    }

    getReferralStats(userId) {
        const ref = db.findBy('referrals', 'userId', userId);
        if (!ref) return { code: null, totalReferrals: 0, totalCommission: 0, paidCommission: 0, conversions: [] };
        const conversions = db.findAll('referral_conversions', 'referrerUserId', userId);
        return {
            code: ref.code,
            totalReferrals: ref.totalReferrals || 0,
            totalCommission: ref.totalCommission || 0,
            paidCommission: ref.paidCommission || 0,
            shareUrl: `/register?ref=${ref.code}`,
            conversions: conversions.map(c => ({
                status: c.status, commission: c.commission,
                createdAt: c.createdAt, referredUserId: c.referredUserId
            }))
        };
    }

    generateVendorsPage(vendors) {
        const items = vendors.items || [];
        return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
        <title>Marche Flay | Decouvrez les vendeurs</title><link rel="manifest" href="/manifest.json"><style>
        *{margin:0;padding:0;box-sizing:border-box}:root{--bg:#0a0a1a;--card:#12121f;--text:#e2e8f0;--muted:#64748b;--primary:#818cf8;--border:#1e293b}
        body{background:var(--bg);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,sans-serif}
        .container{max-width:1200px;margin:0 auto;padding:2rem 1rem}
        h1{font-size:2rem;text-align:center;margin-bottom:.5rem;background:linear-gradient(135deg,#818cf8,#a855f7);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
        .subtitle{text-align:center;color:var(--muted);margin-bottom:2rem}
        .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1.5rem}
        .card{background:var(--card);border-radius:16px;border:1px solid var(--border);padding:1.5rem;text-decoration:none;color:inherit;transition:transform .2s}
        .card:hover{transform:translateY(-4px);box-shadow:0 8px 32px rgba(0,0,0,.3)}
        .card-header{display:flex;align-items:center;gap:1rem;margin-bottom:1rem}
        .avatar{width:48px;height:48px;border-radius:50%;object-fit:cover;background:#1e293b;display:flex;align-items:center;justify-content:center;font-size:1.25rem;font-weight:700;color:var(--primary)}
        .card-name{font-size:1.1rem;font-weight:600}.card-bio{color:var(--muted);font-size:.85rem;margin-bottom:1rem;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
        .card-stats{display:flex;gap:1rem;font-size:.8rem;color:var(--muted)}.card-stats span{display:flex;align-items:center;gap:.3rem}
        .empty{text-align:center;padding:4rem 1rem;color:var(--muted)}
        .pagination{display:flex;gap:.5rem;justify-content:center;margin-top:2rem}
        .pagination a{padding:.5rem 1rem;border:1px solid var(--border);border-radius:8px;color:var(--text);text-decoration:none}
        .pagination a:hover{background:var(--primary);color:#fff;border-color:var(--primary)}
        nav{display:flex;justify-content:space-between;align-items:center;padding:1rem 2rem;background:rgba(0,0,0,.3);backdrop-filter:blur(12px);border-bottom:1px solid var(--border)}
        nav a{color:var(--text);text-decoration:none}.nav-links{display:flex;gap:1rem}
        .nav-links a{color:var(--muted);font-size:.9rem}.nav-links a:hover{color:var(--text)}
        @media(max-width:600px){.grid{grid-template-columns:1fr}}
        </style></head><body>
        <nav><a href="/" style="font-weight:700">Flay</a><div class="nav-links"><a href="/vendors">Marche</a></div></nav>
        <div class="container"><h1>🛍️ Marche Flay</h1>
        <p class="subtitle">Decouvrez les boutiques et vendeurs</p>
        ${items.length ? '<div class="grid">' + items.map(v => '<a href="' + v.storeUrl + '" class="card"><div class="card-header">' +
            (v.avatar ? '<img src="' + v.avatar + '" class="avatar">' : '<div class="avatar">' + (v.name || '?')[0] + '</div>') +
            '<div><div class="card-name">' + v.name + '</div>' + (v.location ? '<span style="font-size:.75rem;color:var(--muted)">' + v.location + '</span>' : '') + '</div></div>' +
            (v.bio ? '<div class="card-bio">' + v.bio.substring(0, 120) + '</div>' : '') +
            '<div class="card-stats"><span>📦 ' + v.productCount + ' produits</span><span>💰 ' + v.totalSales.toLocaleString() + ' F</span></div></a>').join('') + '</div>' :
            '<div class="empty"><p>Aucun vendeur pour le moment</p></div>'}
        ${vendors.pagination?.totalPages > 1 ? '<div class="pagination">' + Array.from({length: vendors.pagination.totalPages}, (_, i) => '<a href="?page=' + (i+1) + '" class="' + (i+1 === vendors.pagination.page ? 'active' : '') + '">' + (i+1) + '</a>').join('') + '</div>' : ''}
        </div></body></html>`;
    }
}

module.exports = new Marketplace();
