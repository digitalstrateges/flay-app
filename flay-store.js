/**
 * Flay Omni - Flay Store
 * Boutique interne pour acheter des fonctionnalites/espaces supplementaires
 * Disponible uniquement pour les abonnes payants
 */

const crypto = require('crypto');

class FlayStore {
    constructor() {
        this.purchases = new Map();
        this.items = this._initItems();
    }

    _initItems() {
        return {
            // === PACKS ARTICLES BOUTIQUE ===
            'articles_100': {
                id: 'articles_100',
                name: '+100 Articles Boutique',
                description: 'Ajoutez 100 articles supplementaires a votre boutique en ligne',
                price: 2000,
                currency: 'XOF',
                category: 'articles',
                icon: '📦',
                applicablePlans: ['doree'],
                effect: { field: 'products', added: 100 },
                popular: true
            },
            'articles_50': {
                id: 'articles_50',
                name: '+50 Articles Boutique',
                description: 'Ajoutez 50 articles supplementaires a votre boutique',
                price: 1500,
                currency: 'XOF',
                category: 'articles',
                icon: '📦',
                applicablePlans: ['premium', 'doree'],
                effect: { field: 'products', added: 50 }
            },
            'articles_25': {
                id: 'articles_25',
                name: '+25 Articles Boutique',
                description: 'Ajoutez 25 articles supplementaires',
                price: 1000,
                currency: 'XOF',
                category: 'articles',
                icon: '📦',
                applicablePlans: ['pro', 'premium', 'doree'],
                effect: { field: 'products', added: 25 }
            },

            // === PACKS SERVICES ===
            'services_20': {
                id: 'services_20',
                name: '+20 Services',
                description: 'Ajoutez 20 services supplementaires a votre profil',
                price: 1500,
                currency: 'XOF',
                category: 'services',
                icon: '🔧',
                applicablePlans: ['pro', 'premium', 'doree'],
                effect: { field: 'services', added: 20 }
            },
            'services_50': {
                id: 'services_50',
                name: '+50 Services',
                description: 'Ajoutez 50 services supplementaires',
                price: 3000,
                currency: 'XOF',
                category: 'services',
                icon: '🔧',
                applicablePlans: ['premium', 'doree'],
                effect: { field: 'services', added: 50 }
            },

            // === PACKS STOCKAGE ===
            'storage_1gb': {
                id: 'storage_1gb',
                name: '+1 GB Stockage',
                description: 'Espace de stockage supplementaire de 1 Go',
                price: 2000,
                currency: 'XOF',
                category: 'storage',
                icon: '💾',
                applicablePlans: ['pro', 'premium', 'doree'],
                effect: { field: 'storage', added: '1 GB' }
            },
            'storage_5gb': {
                id: 'storage_5gb',
                name: '+5 GB Stockage',
                description: 'Espace de stockage supplementaire de 5 Go',
                price: 8000,
                currency: 'XOF',
                category: 'storage',
                icon: '💾',
                applicablePlans: ['premium', 'doree'],
                effect: { field: 'storage', added: '5 GB' }
            },
            'storage_10gb': {
                id: 'storage_10gb',
                name: '+10 GB Stockage',
                description: 'Espace de stockage supplementaire de 10 Go',
                price: 15000,
                currency: 'XOF',
                category: 'storage',
                icon: '💾',
                applicablePlans: ['doree'],
                effect: { field: 'storage', added: '10 GB' }
            },

            // === PACKS CONTACTS ===
            'contacts_500': {
                id: 'contacts_500',
                name: '+500 Contacts CRM',
                description: 'Ajoutez 500 contacts supplementaires dans votre CRM',
                price: 2000,
                currency: 'XOF',
                category: 'contacts',
                icon: '👥',
                applicablePlans: ['pro', 'premium', 'doree'],
                effect: { field: 'contacts', added: 500 }
            },
            'contacts_1000': {
                id: 'contacts_1000',
                name: '+1000 Contacts CRM',
                description: 'Ajoutez 1000 contacts supplementaires',
                price: 3500,
                currency: 'XOF',
                category: 'contacts',
                icon: '👥',
                applicablePlans: ['premium', 'doree'],
                effect: { field: 'contacts', added: 1000 }
            },

            // === PACKS RESERVATIONS ===
            'reservations_100': {
                id: 'reservations_100',
                name: '+100 Reservations/mois',
                description: '100 reservations supplementaires par mois',
                price: 2000,
                currency: 'XOF',
                category: 'reservations',
                icon: '📅',
                applicablePlans: ['pro', 'premium', 'doree'],
                effect: { field: 'reservations', added: 100 }
            },

            // === PACKS GALERIE ===
            'gallery_50': {
                id: 'gallery_50',
                name: '+50 Photos Galerie',
                description: 'Ajoutez 50 photos supplementaires a votre galerie',
                price: 2000,
                currency: 'XOF',
                category: 'gallery',
                icon: '🖼️',
                applicablePlans: ['pro', 'premium', 'doree'],
                effect: { field: 'gallery', added: 50 }
            },
            'gallery_100': {
                id: 'gallery_100',
                name: '+100 Photos Galerie',
                description: 'Ajoutez 100 photos supplementaires',
                price: 3500,
                currency: 'XOF',
                category: 'gallery',
                icon: '🖼️',
                applicablePlans: ['premium', 'doree'],
                effect: { field: 'gallery', added: 100 }
            },

            // === PACKS UTILISATEURS ===
            'users_2': {
                id: 'users_2',
                name: '+2 Utilisateurs',
                description: 'Ajoutez 2 utilisateurs supplementaires a votre equipe',
                price: 10000,
                currency: 'XOF',
                category: 'users',
                icon: '👤',
                applicablePlans: ['doree'],
                effect: { field: 'users', added: 2 }
            },
            'users_5': {
                id: 'users_5',
                name: '+5 Utilisateurs',
                description: 'Ajoutez 5 utilisateurs supplementaires',
                price: 20000,
                currency: 'XOF',
                category: 'users',
                icon: '👤',
                applicablePlans: ['doree'],
                effect: { field: 'users', added: 5 }
            },

            // === FEATURES SPECIALES ===
            'feature_sms_100': {
                id: 'feature_sms_100',
                name: '100 SMS Notifications',
                description: 'Envoyez 100 SMS de notification a vos clients',
                price: 3000,
                currency: 'XOF',
                category: 'features',
                icon: '📱',
                applicablePlans: ['pro', 'premium', 'doree'],
                effect: { field: 'sms', added: 100 }
            },
            'feature_sms_500': {
                id: 'feature_sms_500',
                name: '500 SMS Notifications',
                description: 'Envoyez 500 SMS de notification',
                price: 12000,
                currency: 'XOF',
                category: 'features',
                icon: '📱',
                applicablePlans: ['premium', 'doree'],
                effect: { field: 'sms', added: 500 }
            },
            'feature_email_1000': {
                id: 'feature_email_1000',
                name: '1000 Emails Marketing',
                description: 'Envoyez 1000 emails marketing a vos contacts',
                price: 5000,
                currency: 'XOF',
                category: 'features',
                icon: '📧',
                applicablePlans: ['premium', 'doree'],
                effect: { field: 'emails', added: 1000 }
            },
            'feature_ai_100': {
                id: 'feature_ai_100',
                name: '100 Requetes IA',
                description: '100 requetes IA supplementaires pour la generation de contenu',
                price: 3000,
                currency: 'XOF',
                category: 'features',
                icon: '🤖',
                applicablePlans: ['pro', 'premium', 'doree'],
                effect: { field: 'aiQueries', added: 100 }
            },
            'feature_custom_css': {
                id: 'feature_custom_css',
                name: 'CSS Personnalise',
                description: 'Personnalisez完全ement le CSS de votre page',
                price: 5000,
                currency: 'XOF',
                category: 'features',
                icon: '🎨',
                applicablePlans: ['pro', 'premium', 'doree'],
                effect: { field: 'customCss', added: true },
                oneTime: true
            },
            'feature_custom_domain': {
                id: 'feature_custom_domain',
                name: 'Domaine Personnalise',
                description: 'Utilisez votre propre nom de domaine',
                price: 10000,
                currency: 'XOF',
                category: 'features',
                icon: '🌐',
                applicablePlans: ['pro', 'premium'],
                effect: { field: 'customDomain', added: true },
                oneTime: true
            },
            'feature_seo_pro': {
                id: 'feature_seo_pro',
                name: 'SEO Pro',
                description: 'Avance SEO optimization + meta tags automatiques',
                price: 5000,
                currency: 'XOF',
                category: 'features',
                icon: '🔍',
                applicablePlans: ['pro'],
                effect: { field: 'seoPro', added: true },
                oneTime: true
            },
            'feature_priority_support': {
                id: 'feature_priority_support',
                name: 'Support Prioritaire 1 mois',
                description: 'Support prioritaire par telephone pendant 1 mois',
                price: 5000,
                currency: 'XOF',
                category: 'features',
                icon: '🎧',
                applicablePlans: ['pro'],
                effect: { field: 'prioritySupport', added: true },
                duration: 30 // days
            },
            'feature_white_label': {
                id: 'feature_white_label',
                name: 'White Label',
                description: 'Retirez la marque Flay et utilisez la votre',
                price: 15000,
                currency: 'XOF',
                category: 'features',
                icon: '🏷️',
                applicablePlans: ['premium'],
                effect: { field: 'whiteLabel', added: true },
                oneTime: true
            },
            'feature_multi_users_2': {
                id: 'feature_multi_users_2',
                name: '+2 Utilisateurs Premium',
                description: 'Ajoutez 2 utilisateurs a votre compte Premium',
                price: 10000,
                currency: 'XOF',
                category: 'features',
                icon: '👥',
                applicablePlans: ['premium'],
                effect: { field: 'users', added: 2 }
            },

            // === THEMES EXCLUSIFS ===
            'theme_national_pack': {
                id: 'theme_national_pack',
                name: 'Pack Themes Nationaux',
                description: 'Debloquez tous les themes nationaux africains (12 themes)',
                price: 3000,
                currency: 'XOF',
                category: 'themes',
                icon: '🌍',
                applicablePlans: ['pro', 'premium', 'doree'],
                effect: { field: 'nationalThemes', added: true },
                oneTime: true
            },
            'theme_seasonal_pack': {
                id: 'theme_seasonal_pack',
                name: 'Pack Themes Saisonniers',
                description: 'Themes Noel, Halloween, Love, Royal, Cyber, Pastel...',
                price: 2000,
                currency: 'XOF',
                category: 'themes',
                icon: '🎄',
                applicablePlans: ['pro', 'premium', 'doree'],
                effect: { field: 'seasonalThemes', added: true },
                oneTime: true
            },

            // === PACKS COMPLETS ===
            'boost_week': {
                id: 'boost_week',
                name: 'Boost 1 Semaine',
                description: 'Mise en avant de votre profil pendant 7 jours',
                price: 5000,
                currency: 'XOF',
                category: 'boost',
                icon: '🚀',
                applicablePlans: ['pro', 'premium', 'doree'],
                effect: { field: 'boost', added: true },
                duration: 7
            },
            'boost_month': {
                id: 'boost_month',
                name: 'Boost 1 Mois',
                description: 'Mise en avant de votre profil pendant 30 jours',
                price: 15000,
                currency: 'XOF',
                category: 'boost',
                icon: '🚀',
                applicablePlans: ['pro', 'premium', 'doree'],
                effect: { field: 'boost', added: true },
                duration: 30
            }
        };
    }

    getItems(planSlug) {
        return Object.values(this.items).filter(item => {
            if (!item.applicablePlans.includes(planSlug)) return false;
            return true;
        });
    }

    getItemsByCategory(planSlug) {
        const items = this.getItems(planSlug);
        const categories = {};
        items.forEach(item => {
            if (!categories[item.category]) categories[item.category] = [];
            categories[item.category].push(item);
        });
        return categories;
    }

    getItem(itemId) {
        return this.items[itemId] || null;
    }

    async purchase(userId, planSlug, itemId, paymentMethod = 'wave') {
        const item = this.items[itemId];
        if (!item) return { success: false, error: 'Article introuvable' };
        if (!item.applicablePlans.includes(planSlug)) {
            return { success: false, error: `Cet article n'est pas disponible pour le plan ${planSlug}` };
        }

        // Check if already purchased (one-time items)
        if (item.oneTime) {
            const existing = Array.from(this.purchases.values()).find(
                p => p.userId === userId && p.itemId === itemId && p.status === 'completed'
            );
            if (existing) return { success: false, error: 'Cet article a deja ete achete' };
        }

        const purchase = {
            id: `purchase_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
            userId,
            planSlug,
            itemId,
            itemName: item.name,
            amount: item.price,
            currency: item.currency,
            paymentMethod,
            status: 'pending',
            effect: item.effect,
            duration: item.duration || null,
            createdAt: new Date().toISOString()
        };

        this.purchases.set(purchase.id, purchase);

        // Generate payment URL
        const paymentUrl = this._generatePaymentUrl(purchase);

        return {
            success: true,
            purchaseId: purchase.id,
            amount: item.price,
            currency: item.currency,
            paymentUrl,
            item: { name: item.name, icon: item.icon, description: item.description }
        };
    }

    _generatePaymentUrl(purchase) {
        const baseUrl = process.env.BASE_URL || 'https://flay.app';
        return `${baseUrl}/api/flay-store/pay/${purchase.id}`;
    }

    async confirmPayment(purchaseId) {
        const purchase = this.purchases.get(purchaseId);
        if (!purchase) return { success: false, error: 'Achat introuvable' };

        purchase.status = 'completed';
        purchase.paidAt = new Date().toISOString();
        this.purchases.set(purchaseId, purchase);

        return { success: true, purchase };
    }

    getUserPurchases(userId, limit = 50) {
        return Array.from(this.purchases.values())
            .filter(p => p.userId === userId)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, limit);
    }

    getActiveBoosts(userId) {
        const now = new Date();
        return Array.from(this.purchases.values())
            .filter(p => {
                if (p.userId !== userId || p.status !== 'completed') return false;
                if (p.effect.field !== 'boost') return false;
                const item = this.items[p.itemId];
                if (!item) return false;
                const expiry = new Date(new Date(p.paidAt).getTime() + (item.duration || 7) * 86400000);
                return expiry > now;
            });
    }

    getTotalRevenue() {
        return Array.from(this.purchases.values())
            .filter(p => p.status === 'completed')
            .reduce((sum, p) => sum + p.amount, 0);
    }

    getStats() {
        const all = Array.from(this.purchases.values());
        return {
            total: all.length,
            completed: all.filter(p => p.status === 'completed').length,
            pending: all.filter(p => p.status === 'pending').length,
            revenue: this.getTotalRevenue(),
            byCategory: all.reduce((acc, p) => {
                const item = this.items[p.itemId];
                const cat = item?.category || 'other';
                if (!acc[cat]) acc[cat] = { count: 0, revenue: 0 };
                acc[cat].count++;
                if (p.status === 'completed') acc[cat].revenue += p.amount;
                return acc;
            }, {})
        };
    }
}

module.exports = new FlayStore();
