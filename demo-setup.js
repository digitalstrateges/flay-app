/**
 * Flay Demo Setup
 * Creates demo account with full access to all features
 * NOT committed to Git - uses environment variables
 */

const crypto = require('crypto');
const authUtils = require('./auth-utils');
const db = require('./db');

const DEMO_EMAIL = process.env.DEMO_EMAIL || 'demo@flay.app';
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'demo123';
const DEMO_ENABLED = process.env.DEMO_ENABLED !== 'false';

class DemoSetup {
    constructor() {
        this.initialized = false;
    }

    async init() {
        if (!DEMO_ENABLED || this.initialized) return;
        
        try {
            await this.ensureDemoAccount();
            this.initialized = true;
            console.log('  Demo account ......... Ready (' + DEMO_EMAIL + ')');
        } catch (e) {
            console.log('  Demo account ......... Skipped (' + e.message + ')');
        }
    }

    async ensureDemoAccount() {
        // Check if demo already exists
        const existing = db.findBy('users', 'email', DEMO_EMAIL);
        if (existing) return existing;

        // Create demo user with Doree plan (highest tier)
        const id = 'demo_' + Date.now();
        const hashed = authUtils.hashPassword(DEMO_PASSWORD);
        
        db.insert('users', {
            id,
            email: DEMO_EMAIL,
            name: 'Aya Koné',
            username: 'demo',
            password: hashed.hash.split(':')[1],
            salt: hashed.salt,
            plan: 'doree',
            planExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            role: 'user',
            avatar: '',
            phone: '+225 07 59 73 19 90',
            language: 'fr',
            isAdmin: 0
        });

        // Create rich profile
        db.insert('profiles', {
            userId: id,
            slug: 'demo',
            theme: 'electric',
            template: 'modern',
            title: 'Photographe Professionnelle',
            bio: 'Photographe specialisee en portraits et evenements. Je capture vos plus beaux moments avec un style moderne et authentique. Basée à Abidjan, je me deplace dans toute la Côte d\'Ivoire.',
            email: DEMO_EMAIL,
            phone: '+225 07 59 73 19 90',
            address: 'Cocody, Abidjan',
            city: 'Abidjan',
            country: 'Côte d\'Ivoire',
            latitude: 5.3600,
            longitude: -4.0083,
            services: JSON.stringify([
                { id: 's1', name: 'Portrait Professionnel', description: 'Seance photo portrait studio ou exterieur', price: 25000, duration: '60 min', category: 'photo' },
                { id: 's2', name: 'Shooting Mariage', description: 'Couverture complete de votre mariage', price: 150000, duration: '8h', category: 'photo' },
                { id: 's3', name: 'Photo Produit', description: 'Photos professionnels pour votre e-commerce', price: 15000, duration: '30 min', category: 'photo' },
                { id: 's4', name: 'Book Model', description: 'Seance photo portfolio pour modeles', price: 50000, duration: '2h', category: 'photo' },
                { id: 's5', name: 'Event Corporate', description: 'Couverture evenements d\'entreprise', price: 80000, duration: '4h', category: 'photo' }
            ]),
            socials: JSON.stringify({
                instagram: '@aya.konphoto',
                facebook: 'AyaKonePhoto',
                tiktok: '@aya.konphoto',
                whatsapp: '+2250759731990'
            }),
            analytics: JSON.stringify({ views: 2847, contacts: 187, reservations: 43 }),
            plan: 'doree',
            avatar: '',
            logo: '',
            banner: '',
            gallery: JSON.stringify([
                '/uploads/gallery/demo_1.jpg',
                '/uploads/gallery/demo_2.jpg',
                '/uploads/gallery/demo_3.jpg',
                '/uploads/gallery/demo_4.jpg',
                '/uploads/gallery/demo_5.jpg',
                '/uploads/gallery/demo_6.jpg'
            ]),
            settings: JSON.stringify({
                allowReservations: true,
                allowPayments: true,
                showPhone: true,
                showEmail: true,
                showAddress: true,
                autoConfirmReservations: false,
                workingHours: { mon: { start: '08:00', end: '18:00' }, tue: { start: '08:00', end: '18:00' }, wed: { start: '08:00', end: '18:00' }, thu: { start: '08:00', end: '18:00' }, fri: { start: '08:00', end: '18:00' }, sat: { start: '09:00', end: '14:00' } }
            }),
            customCss: '',
            customJs: '',
            seo: JSON.stringify({
                title: 'Aya Koné - Photographe Professionnelle | Abidjan',
                description: 'Photographe specialisee en portraits et evenements a Abidjan, Côte d\'Ivoire',
                keywords: 'photographe, abidjan, portrait, mariage, cote divoire'
            })
        });

        // Create products for demo store
        const demoProducts = [
            { name: 'Preset Lightroom - African Vibes', description: 'Pack de 20 presets pour vos photos', price: 5000, category: 'digital', stock: 999, trackInventory: false },
            { name: 'Tirage Photo A4 Premium', description: 'Impression sur papier photo premium', price: 3000, category: 'print', stock: 50, trackInventory: true },
            { name: 'Carnet Photo 20x20', description: 'Album photo sur mesure 20x20cm', price: 15000, category: 'print', stock: 25, trackInventory: true },
            { name: 'Seance Photo Exterieure', description: '2h de seance photo en exterieur', price: 35000, category: 'service', stock: 10, trackInventory: true },
            { name: 'Pack Reseaux Sociaux', description: '10 photos optimisees pour Instagram/TikTok', price: 8000, category: 'digital', stock: 999, trackInventory: false }
        ];

        demoProducts.forEach(p => {
            db.insert('products', {
                id: 'prod_' + crypto.randomBytes(4).toString('hex'),
                userId: id,
                name: p.name,
                description: p.description,
                shortDescription: p.description.substring(0, 80),
                price: p.price,
                comparePrice: 0,
                currency: 'XOF',
                category: p.category,
                images: '[]',
                thumbnail: '',
                sku: 'DEMO-' + p.name.substring(0, 8).toUpperCase().replace(/\s/g, ''),
                stock: p.stock,
                trackInventory: p.trackInventory ? 1 : 0,
                allowBackorder: 0,
                status: 'active',
                featured: 1,
                stats: JSON.stringify({ views: Math.floor(Math.random() * 200) + 50, sales: Math.floor(Math.random() * 20) + 5 }),
                tags: JSON.stringify(['demo', p.category])
            });
        });

        // Create demo reservations
        const statuses = ['confirmed', 'pending', 'completed'];
        for (let i = 0; i < 8; i++) {
            db.insert('reservations', {
                id: 'res_' + crypto.randomBytes(4).toString('hex'),
                userId: id,
                serviceId: 's' + (Math.floor(Math.random() * 5) + 1),
                serviceName: ['Portrait', 'Mariage', 'Photo Produit', 'Book Model', 'Event'][Math.floor(Math.random() * 5)],
                clientName: ['Fatou B.', 'Moussa K.', 'Aïcha D.', 'Ibrahim S.', 'Mariam T.', 'Oumar H.', 'Nana F.', 'Salif C.'][i],
                clientEmail: `client${i+1}@example.com`,
                clientPhone: `+225 07 ${String(Math.floor(Math.random() * 90) + 10)} ${String(Math.floor(Math.random() * 90) + 10)} ${String(Math.floor(Math.random() * 90) + 10)}`,
                date: new Date(Date.now() + (i - 3) * 24 * 60 * 60 * 1000).toISOString(),
                time: ['09:00', '10:30', '14:00', '15:30', '11:00', '16:00', '09:30', '13:00'][i],
                duration: 60,
                price: [25000, 150000, 15000, 50000, 80000, 25000, 15000, 35000][i],
                status: statuses[Math.floor(Math.random() * 3)],
                notes: '',
                createdAt: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000).toISOString()
            });
        }

        // Create demo invoices
        for (let i = 0; i < 5; i++) {
            const amount = [25000, 150000, 15000, 50000, 80000][i];
            db.insert('invoices', {
                id: 'inv_' + crypto.randomBytes(4).toString('hex'),
                userId: id,
                number: `INV-2026-${String(i + 1).padStart(4, '0')}`,
                clientName: ['Fatou B.', 'Moussa K.', 'Aïcha D.', 'Ibrahim S.', 'Mariam T.'][i],
                clientEmail: `client${i+1}@example.com`,
                items: JSON.stringify([{ description: ['Portrait', 'Mariage', 'Photo Produit', 'Book Model', 'Event'][i], quantity: 1, unitPrice: amount, total: amount }]),
                subtotal: amount,
                tax: Math.round(amount * 0.18),
                taxRate: 0.18,
                total: Math.round(amount * 1.18),
                currency: 'XOF',
                status: ['paid', 'paid', 'sent', 'paid', 'pending'][i],
                paymentMethod: 'wave',
                issueDate: new Date(Date.now() - (5 - i) * 7 * 24 * 60 * 60 * 1000).toISOString(),
                dueDate: new Date(Date.now() + (i + 1) * 7 * 24 * 60 * 60 * 1000).toISOString(),
                paidAt: ['paid', 'paid', null, 'paid', null][i] ? new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000).toISOString() : null,
                notes: '',
                createdAt: new Date(Date.now() - (5 - i) * 7 * 24 * 60 * 60 * 1000).toISOString()
            });
        }

        // Create demo contacts (CRM)
        const contacts = [
            { name: 'Fatou Bamba', email: 'fatou@example.com', phone: '+225 07 12 34 56', company: 'Boutique Chic', status: 'client' },
            { name: 'Moussa Koné', email: 'moussa@example.com', phone: '+225 07 23 45 67', company: 'Tech CI', status: 'lead' },
            { name: 'Aïcha Diallo', email: 'aicha@example.com', phone: '+225 07 34 56 78', company: 'Beaute Naturelle', status: 'client' },
            { name: 'Ibrahim Sanogo', email: 'ibrahim@example.com', phone: '+225 07 45 67 89', company: 'Event Plus', status: 'partner' },
            { name: 'Mariam Traoré', email: 'mariam@example.com', phone: '+225 07 56 78 90', company: 'Fashion Abidjan', status: 'lead' }
        ];

        contacts.forEach((c, i) => {
            db.insert('contacts', {
                id: 'contact_' + crypto.randomBytes(4).toString('hex'),
                userId: id,
                name: c.name,
                email: c.email,
                phone: c.phone,
                company: c.company,
                status: c.status,
                tags: JSON.stringify(['demo', c.status]),
                notes: '',
                interactions: JSON.stringify([
                    { type: 'call', date: new Date(Date.now() - i * 3 * 24 * 60 * 60 * 1000).toISOString(), note: 'Appel de decouverte' }
                ]),
                createdAt: new Date(Date.now() - (10 - i) * 7 * 24 * 60 * 60 * 1000).toISOString()
            });
        });

        return { id, email: DEMO_EMAIL };
    }

    // Check if a user is the demo account
    isDemo(userId) {
        const user = db.get('users', userId);
        return user && user.email === DEMO_EMAIL;
    }

    // Demo account has access to all features
    hasFeature(userId, feature) {
        if (this.isDemo(userId)) return true;
        return false;
    }

    // Demo bypasses all plan limits
    getLimit(userId, limit) {
        if (this.isDemo(userId)) return -1; // unlimited
        return null; // use normal limits
    }
}

module.exports = new DemoSetup();
