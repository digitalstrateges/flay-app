/**
 * Flay Premium Features
 * Exceptional features for paid plans
 */

const db = require('./db');
const config = require('./config');
const accounting = require('./accounting');
const crypto = require('crypto');

class PremiumFeatures {
    constructor() {
        this.planFeatures = {
            free: {
                themes: 4,
                services: 5,
                reservations: 10,
                contacts: 100,
                products: 20,
                storage: '100 MB',
                invoices: 20,
                aiCredits: 0,
                analytics: 'basic',
                support: 'community',
                customDomain: false,
                whiteLabel: false,
                apiAccess: false,
                webhooks: false,
                multiUser: false,
                loyalty: false,
                coupons: false,
                reviews: false,
                wishlist: false,
                abandonedCart: false,
                seo: 'basic',
                export: false,
                priority: false
            },
            pro: {
                themes: 7,
                services: -1,
                reservations: -1,
                contacts: 500,
                products: 50,
                storage: '1 GB',
                invoices: -1,
                aiCredits: 50,
                analytics: 'advanced',
                support: 'email_48h',
                customDomain: false,
                whiteLabel: false,
                apiAccess: false,
                webhooks: false,
                multiUser: false,
                loyalty: false,
                coupons: true,
                reviews: true,
                wishlist: false,
                abandonedCart: false,
                seo: 'standard',
                export: true,
                priority: false
            },
            premium: {
                themes: 11,
                services: -1,
                reservations: -1,
                contacts: -1,
                products: 200,
                storage: '5 GB',
                invoices: -1,
                aiCredits: 500,
                analytics: 'ai_powered',
                support: 'priority_24h',
                customDomain: true,
                whiteLabel: false,
                apiAccess: true,
                webhooks: true,
                multiUser: false,
                loyalty: true,
                coupons: true,
                reviews: true,
                wishlist: true,
                abandonedCart: true,
                seo: 'advanced',
                export: true,
                priority: true
            },
            doree: {
                themes: 11,
                services: -1,
                reservations: -1,
                contacts: -1,
                products: -1,
                storage: '20 GB',
                invoices: -1,
                aiCredits: -1,
                analytics: 'enterprise',
                support: 'phone_24h',
                customDomain: true,
                whiteLabel: true,
                apiAccess: true,
                webhooks: true,
                multiUser: 3,
                loyalty: true,
                coupons: true,
                reviews: true,
                wishlist: true,
                abandonedCart: true,
                seo: 'enterprise',
                export: true,
                priority: true
            }
        };
    }

    getPlanFeatures(plan) {
        return this.planFeatures[plan] || this.planFeatures.free;
    }

    // Check if user has access to a feature
    hasFeature(userId, feature) {
        const user = db.get('users', userId);
        if (!user) return false;
        
        // Demo bypass
        const demoSetup = require('./demo-setup');
        if (demoSetup.isDemo(userId)) return true;
        
        const features = this.getPlanFeatures(user.plan);
        return features[feature] === true || features[feature] > 0 || features[feature] === -1;
    }

    // Check plan limit
    checkLimit(userId, type, currentCount) {
        const user = db.get('users', userId);
        if (!user) return { allowed: false, reason: 'User not found' };
        
        // Demo bypass
        const demoSetup = require('./demo-setup');
        if (demoSetup.isDemo(userId)) return { allowed: true, remaining: -1 };
        
        const features = this.getPlanFeatures(user.plan);
        const limit = features[type];
        
        if (limit === -1) return { allowed: true, remaining: -1 };
        if (limit === undefined || limit === false) return { allowed: false, reason: `Feature not available in ${user.plan} plan` };
        if (currentCount >= limit) return { allowed: false, reason: `Limit reached (${limit}). Upgrade your plan.`, limit, current: currentCount };
        
        return { allowed: true, remaining: limit - currentCount };
    }

    // === PRO FEATURES ===

    // Advanced Analytics Dashboard
    getAdvancedAnalytics(userId, period = '30d') {
        const user = db.get('users', userId);
        const features = this.getPlanFeatures(user?.plan || 'free');
        
        if (features.analytics === 'basic') {
            return { error: 'Upgrade to Pro for advanced analytics' };
        }

        const analytics = db.findAll('analytics', 'userId', userId) || [];
        const now = new Date();
        const days = parseInt(period) || 30;
        const startDate = new Date(now - days * 24 * 60 * 60 * 1000);
        
        const filtered = analytics.filter(a => new Date(a.createdAt) >= startDate);
        
        // By day
        const byDay = {};
        filtered.forEach(a => {
            const day = a.createdAt.split('T')[0];
            if (!byDay[day]) byDay[day] = { views: 0, contacts: 0, reservations: 0, revenue: 0 };
            byDay[day][a.eventType] = (byDay[day][a.eventType] || 0) + 1;
        });

        // By hour
        const byHour = new Array(24).fill(0);
        filtered.forEach(a => {
            const hour = new Date(a.createdAt).getHours();
            byHour[hour]++;
        });

        // Top referrers
        const referrers = {};
        filtered.forEach(a => {
            if (a.referrer) {
                try {
                    const domain = new URL(a.referrer).hostname;
                    referrers[domain] = (referrers[domain] || 0) + 1;
                } catch(e) {
                    const domain = (a.referrer || '').split('/')[2] || a.referrer;
                    if (domain) referrers[domain] = (referrers[domain] || 0) + 1;
                }
            }
        });

        // Devices
        const devices = { mobile: 0, desktop: 0, tablet: 0 };
        filtered.forEach(a => {
            const ua = (a.userAgent || '').toLowerCase();
            if (ua.includes('mobile')) devices.mobile++;
            else if (ua.includes('tablet')) devices.tablet++;
            else devices.desktop++;
        });

        // Geographic
        const cities = {};
        filtered.forEach(a => {
            const city = a.data?.city || 'Inconnu';
            cities[city] = (cities[city] || 0) + 1;
        });

        return {
            period,
            total: filtered.length,
            byDay,
            byHour,
            topReferrers: Object.entries(referrers).sort((a, b) => b[1] - a[1]).slice(0, 10),
            devices,
            topCities: Object.entries(cities).sort((a, b) => b[1] - a[1]).slice(0, 10),
            conversionRate: filtered.filter(a => a.eventType === 'reservation').length / Math.max(filtered.length, 1),
            features: features.analytics
        };
    }

    // === PREMIUM FEATURES ===

    // Abandoned Cart Recovery
    getAbandonedCarts(userId) {
        const features = this.getPlanFeatures(db.get('users', userId)?.plan || 'free');
        if (!features.abandonedCart) return [];
        
        const cart = db.findBy('carts', 'userId', userId);
        if (!cart || !cart.items || !cart.items.length) return [];
        const now = new Date();
        const threshold = new Date(now - 24 * 60 * 60 * 1000);
        const updated = new Date(cart.updatedAt || cart.createdAt);
        if (updated < threshold && !cart.converted) return [cart];
        return [];
    }

    // Loyalty Program
    getLoyaltyPoints(userId) {
        const features = this.getPlanFeatures(db.get('users', userId)?.plan || 'free');
        if (!features.loyalty) return { error: 'Loyalty program requires Premium plan' };
        
        const orders = db.findAll('orders', 'userId', userId) || [];
        let points = 0;
        
        orders.forEach(order => {
            if (order.status === 'completed' || order.status === 'delivered') {
                points += Math.floor((order.total || 0) / 1000);
            }
        });

        return {
            points,
            level: points >= 1000 ? 'Gold' : points >= 500 ? 'Silver' : 'Bronze',
            nextLevel: points >= 1000 ? null : points >= 500 ? 'Gold' : 'Silver',
            pointsToNext: points >= 1000 ? 0 : points >= 500 ? 1000 - points : 500 - points,
            rewards: [
                { name: 'Remise 10%', points: 100, cost: 100 },
                { name: 'Remise 20%', points: 200, cost: 200 },
                { name: 'Service gratuit', points: 500, cost: 500 },
                { name: 'Remise 50%', points: 800, cost: 800 }
            ]
        };
    }

    // SEO Analysis
    analyzeSEO(userId) {
        const profile = db.findBy('profiles', 'userId', userId);
        const features = this.getPlanFeatures(db.get('users', userId)?.plan || 'free');
        
        const issues = [];
        const recommendations = [];
        let score = 100;

        if (!profile) return { score: 0, issues: ['No profile found'], recommendations: ['Create a profile'], plan: features.seo };

        if (!profile.title) { issues.push('Missing page title'); score -= 20; }
        if (!profile.bio || profile.bio.length < 50) { issues.push('Bio too short'); score -= 15; }
        const seoData = typeof profile.seo === 'string' ? JSON.parse(profile.seo || '{}') : (profile.seo || {});
        if (!seoData.description) { issues.push('Missing meta description'); score -= 15; }
        if (!seoData.keywords) { issues.push('Missing keywords'); score -= 10; }
        if (!profile.avatar) { issues.push('No profile photo'); score -= 10; }
        const gallery = typeof profile.gallery === 'string' ? JSON.parse(profile.gallery || '[]') : (profile.gallery || []);
        if (!gallery.length || gallery.length < 3) { issues.push('Gallery needs more images'); score -= 5; }

        if (features.seo === 'advanced' || features.seo === 'enterprise') {
            recommendations.push('Add structured data (JSON-LD)');
            recommendations.push('Optimize for local SEO');
            recommendations.push('Add Open Graph tags');
            recommendations.push('Create FAQ section');
        }

        return {
            score: Math.max(0, score),
            issues,
            recommendations,
            plan: features.seo
        };
    }

    // === DOREE FEATURES ===

    // Multi-user Management
    getTeamMembers(userId) {
        const features = this.getPlanFeatures(db.get('users', userId)?.plan || 'free');
        if (!features.multiUser) return { error: 'Team management requires Dorée plan' };
        
        const members = db.findAll('team_members', 'ownerId', userId) || [];
        return {
            maxMembers: features.multiUser,
            members,
            roles: ['admin', 'editor', 'viewer']
        };
    }

    // White Label Report
    generateWhiteLabelReport(userId, data) {
        const features = this.getPlanFeatures(db.get('users', userId)?.plan || 'free');
        if (!features.whiteLabel) return { error: 'White label requires Dorée plan' };
        
        const user = db.get('users', userId);
        const profile = db.findBy('profiles', 'userId', userId);
        
        return {
            branding: {
                companyName: data.companyName || user?.name,
                logo: data.logo || profile?.logo,
                color: data.color || '#818cf8',
                footer: data.footer || `Powered by ${user?.name}`
            },
            report: data.report || {},
            generatedAt: new Date().toISOString()
        };
    }

    // Advanced Coupons
    createAdvancedCoupon(userId, data) {
        const features = this.getPlanFeatures(db.get('users', userId)?.plan || 'free');
        if (!features.coupons) return { error: 'Coupons require Pro plan or higher' };
        
        const coupon = {
            id: 'coupon_' + crypto.randomBytes(4).toString('hex'),
            userId,
            code: data.code || crypto.randomBytes(4).toString('hex').toUpperCase(),
            type: data.type || 'percentage', // percentage, fixed, freeShipping
            value: data.value || 10,
            minPurchase: data.minPurchase || 0,
            maxUses: data.maxUses || -1,
            usedCount: 0,
            validFrom: data.validFrom || new Date().toISOString(),
            validUntil: data.validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            applicableProducts: data.applicableProducts || [],
            applicableCategories: data.applicableCategories || [],
            combineWithOther: data.combineWithOther || false,
            active: true,
            createdAt: new Date().toISOString()
        };

        db.insert('coupons', coupon);
        return coupon;
    }

    // Abandoned Cart Email (simulated)
    sendCartRecoveryEmail(userId, cartId) {
        const features = this.getPlanFeatures(db.get('users', userId)?.plan || 'free');
        if (!features.abandonedCart) return { error: 'Cart recovery requires Premium plan' };
        
        // In production, this would send actual emails
        console.log(`[CART-RECOVERY] Sending recovery email for cart ${cartId}`);
        return { sent: true, message: 'Recovery email queued' };
    }
}

module.exports = new PremiumFeatures();
