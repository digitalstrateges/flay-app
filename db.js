/**
 * Flay v4.0 - Database Module
 * SQLite via better-sqlite3 compatible wrapper (zero-dep fallback)
 * Persistance complete des donnees
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'flay.db');

class Database {
    constructor() {
        this.db = null;
        this.memory = new Map();
        this.useMemory = true;
        this.init();
    }

    init() {
        try {
            const dir = path.dirname(DB_PATH);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

            // Try SQLite
            try {
                const Database = require('better-sqlite3');
                this.db = new Database(DB_PATH);
                this.db.pragma('journal_mode = WAL');
                this.db.pragma('foreign_keys = ON');
                this.useMemory = false;
                this.createTables();
                console.log('  Database ............. SQLite (' + DB_PATH + ')');
            } catch (e) {
                console.log('  Database ............. In-Memory (better-sqlite3 non installe)');
                this.loadFromJSON();
            }
        } catch (e) {
            console.log('  Database ............. In-Memory');
        }
    }

    createTables() {
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                salt TEXT NOT NULL,
                plan TEXT DEFAULT 'free',
                planExpiry TEXT,
                role TEXT DEFAULT 'user',
                avatar TEXT DEFAULT '',
                phone TEXT DEFAULT '',
                language TEXT DEFAULT 'fr',
                twoFactorSecret TEXT,
                twoFactorEnabled INTEGER DEFAULT 0,
                lastLogin TEXT,
                createdAt TEXT DEFAULT (datetime('now')),
                updatedAt TEXT DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS profiles (
                userId TEXT PRIMARY KEY,
                slug TEXT UNIQUE NOT NULL,
                theme TEXT DEFAULT 'dark',
                template TEXT DEFAULT 'minimal',
                bio TEXT DEFAULT '',
                title TEXT DEFAULT '',
                location TEXT DEFAULT '',
                phone TEXT DEFAULT '',
                email TEXT DEFAULT '',
                avatar TEXT DEFAULT '',
                logo TEXT DEFAULT '',
                signature TEXT DEFAULT '',
                banner TEXT DEFAULT '',
                services TEXT DEFAULT '[]',
                socials TEXT DEFAULT '{}',
                geoLocation TEXT,
                gallery TEXT DEFAULT '[]',
                website TEXT DEFAULT '',
                analytics TEXT DEFAULT '{}',
                seo TEXT DEFAULT '{}',
                customCss TEXT DEFAULT '',
                customJs TEXT DEFAULT '',
                plan TEXT DEFAULT 'free',
                createdAt TEXT DEFAULT (datetime('now')),
                updatedAt TEXT DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS payments (
                id TEXT PRIMARY KEY,
                userId TEXT NOT NULL,
                plan TEXT NOT NULL,
                amount INTEGER NOT NULL,
                currency TEXT DEFAULT 'XOF',
                status TEXT DEFAULT 'pending',
                waveRef TEXT,
                payerName TEXT,
                whatsapp TEXT,
                period TEXT DEFAULT 'monthly',
                createdAt TEXT DEFAULT (datetime('now')),
                confirmedAt TEXT,
                FOREIGN KEY (userId) REFERENCES users(id)
            );

            CREATE TABLE IF NOT EXISTS reservations (
                id TEXT PRIMARY KEY,
                userId TEXT NOT NULL,
                clientName TEXT NOT NULL,
                clientEmail TEXT,
                clientPhone TEXT,
                service TEXT,
                date TEXT NOT NULL,
                time TEXT,
                notes TEXT DEFAULT '',
                status TEXT DEFAULT 'pending',
                createdAt TEXT DEFAULT (datetime('now')),
                FOREIGN KEY (userId) REFERENCES users(id)
            );

            CREATE TABLE IF NOT EXISTS contacts (
                id TEXT PRIMARY KEY,
                userId TEXT NOT NULL,
                name TEXT NOT NULL,
                email TEXT,
                phone TEXT,
                company TEXT DEFAULT '',
                tags TEXT DEFAULT '[]',
                notes TEXT DEFAULT '',
                dealValue INTEGER DEFAULT 0,
                status TEXT DEFAULT 'lead',
                createdAt TEXT DEFAULT (datetime('now')),
                updatedAt TEXT DEFAULT (datetime('now')),
                FOREIGN KEY (userId) REFERENCES users(id)
            );

            CREATE TABLE IF NOT EXISTS deals (
                id TEXT PRIMARY KEY,
                userId TEXT NOT NULL,
                contactId TEXT,
                title TEXT NOT NULL,
                value INTEGER DEFAULT 0,
                currency TEXT DEFAULT 'XOF',
                stage TEXT DEFAULT 'lead',
                notes TEXT DEFAULT '',
                expectedClose TEXT,
                createdAt TEXT DEFAULT (datetime('now')),
                updatedAt TEXT DEFAULT (datetime('now')),
                FOREIGN KEY (userId) REFERENCES users(id)
            );

            CREATE TABLE IF NOT EXISTS invoices (
                id TEXT PRIMARY KEY,
                userId TEXT NOT NULL,
                contactId TEXT,
                items TEXT DEFAULT '[]',
                subtotal INTEGER DEFAULT 0,
                tax INTEGER DEFAULT 0,
                discount INTEGER DEFAULT 0,
                total INTEGER DEFAULT 0,
                currency TEXT DEFAULT 'XOF',
                status TEXT DEFAULT 'draft',
                dueDate TEXT,
                paidAt TEXT,
                createdAt TEXT DEFAULT (datetime('now')),
                FOREIGN KEY (userId) REFERENCES users(id)
            );

            CREATE TABLE IF NOT EXISTS notifications (
                id TEXT PRIMARY KEY,
                userId TEXT NOT NULL,
                type TEXT NOT NULL,
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                read INTEGER DEFAULT 0,
                data TEXT DEFAULT '{}',
                createdAt TEXT DEFAULT (datetime('now')),
                FOREIGN KEY (userId) REFERENCES users(id)
            );

            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                userId TEXT NOT NULL,
                token TEXT NOT NULL,
                ip TEXT,
                userAgent TEXT,
                expiresAt TEXT NOT NULL,
                createdAt TEXT DEFAULT (datetime('now')),
                FOREIGN KEY (userId) REFERENCES users(id)
            );

            CREATE TABLE IF NOT EXISTS api_keys (
                id TEXT PRIMARY KEY,
                userId TEXT NOT NULL,
                key TEXT UNIQUE NOT NULL,
                name TEXT DEFAULT '',
                permissions TEXT DEFAULT '["read"]',
                lastUsed TEXT,
                expiresAt TEXT,
                createdAt TEXT DEFAULT (datetime('now')),
                FOREIGN KEY (userId) REFERENCES users(id)
            );

            CREATE TABLE IF NOT EXISTS webhooks (
                id TEXT PRIMARY KEY,
                userId TEXT NOT NULL,
                url TEXT NOT NULL,
                events TEXT DEFAULT '[]',
                secret TEXT NOT NULL,
                active INTEGER DEFAULT 1,
                createdAt TEXT DEFAULT (datetime('now')),
                FOREIGN KEY (userId) REFERENCES users(id)
            );

            CREATE TABLE IF NOT EXISTS analytics (
                id TEXT PRIMARY KEY,
                userId TEXT NOT NULL,
                eventType TEXT NOT NULL,
                data TEXT DEFAULT '{}',
                ip TEXT,
                userAgent TEXT,
                referrer TEXT,
                createdAt TEXT DEFAULT (datetime('now')),
                FOREIGN KEY (userId) REFERENCES users(id)
            );

            CREATE TABLE IF NOT EXISTS ab_tests (
                id TEXT PRIMARY KEY,
                userId TEXT NOT NULL,
                name TEXT NOT NULL,
                variants TEXT DEFAULT '[]',
                status TEXT DEFAULT 'draft',
                winner TEXT,
                createdAt TEXT DEFAULT (datetime('now')),
                FOREIGN KEY (userId) REFERENCES users(id)
            );

            CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
            CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
            CREATE INDEX IF NOT EXISTS idx_profiles_slug ON profiles(slug);
            CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(userId);
            CREATE INDEX IF NOT EXISTS idx_reservations_user ON reservations(userId);
            CREATE INDEX IF NOT EXISTS idx_contacts_user ON contacts(userId);
            CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(userId);
            CREATE INDEX IF NOT EXISTS idx_analytics_user ON analytics(userId);
            CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
        `);
    }

    // Generic CRUD
    get(table, id) {
        if (this.useMemory) {
            const store = this.memory.get(table) || new Map();
            return store.get(id) || null;
        }
        return this.db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id) || null;
    }

    getAll(table, filter = {}) {
        if (this.useMemory) {
            const store = this.memory.get(table) || new Map();
            let results = Array.from(store.values());
            for (const [key, value] of Object.entries(filter)) {
                results = results.filter(r => r[key] === value);
            }
            return results;
        }
        const conditions = Object.keys(filter).map(k => `${k} = ?`).join(' AND ');
        const values = Object.values(filter);
        if (conditions) {
            return this.db.prepare(`SELECT * FROM ${table} WHERE ${conditions}`).all(...values);
        }
        return this.db.prepare(`SELECT * FROM ${table}`).all();
    }

    find(table, predicate) {
        const all = this.getAll(table);
        return all.find(predicate) || null;
    }

    insert(table, data) {
        const id = data.id || `${table}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        const record = { ...data, id, createdAt: data.createdAt || new Date().toISOString() };

        if (this.useMemory) {
            if (!this.memory.has(table)) this.memory.set(table, new Map());
            this.memory.get(table).set(id, record);
            this.saveToJSON();
            return record;
        }

        const keys = Object.keys(record);
        const placeholders = keys.map(() => '?').join(', ');
        this.db.prepare(`INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`).run(...Object.values(record));
        return record;
    }

    update(table, id, data) {
        data.updatedAt = new Date().toISOString();

        if (this.useMemory) {
            const store = this.memory.get(table) || new Map();
            const existing = store.get(id);
            if (!existing) return null;
            const updated = { ...existing, ...data, id };
            store.set(id, updated);
            this.saveToJSON();
            return updated;
        }

        const sets = Object.keys(data).map(k => `${k} = ?`).join(', ');
        this.db.prepare(`UPDATE ${table} SET ${sets} WHERE id = ?`).run(...Object.values(data), id);
        return this.get(table, id);
    }

    delete(table, id) {
        if (this.useMemory) {
            const store = this.memory.get(table) || new Map();
            const deleted = store.delete(id);
            this.saveToJSON();
            return deleted;
        }
        return this.db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id).changes > 0;
    }

    count(table, filter = {}) {
        if (this.useMemory) {
            return this.getAll(table, filter).length;
        }
        const conditions = Object.keys(filter).map(k => `${k} = ?`).join(' AND ');
        const values = Object.values(filter);
        if (conditions) {
            return this.db.prepare(`SELECT COUNT(*) as count FROM ${table} WHERE ${conditions}`).get(...values).count;
        }
        return this.db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get().count;
    }

    // JSON persistence fallback
    saveToJSON() {
        try {
            const data = {};
            for (const [table, store] of this.memory) {
                data[table] = Array.from(store.values());
            }
            fs.writeFileSync(path.join(__dirname, 'data', 'db.json'), JSON.stringify(data, null, 2));
        } catch (e) { }
    }

    loadFromJSON() {
        try {
            const file = path.join(__dirname, 'data', 'db.json');
            if (fs.existsSync(file)) {
                const data = JSON.parse(fs.readFileSync(file, 'utf8'));
                for (const [table, records] of Object.entries(data)) {
                    const store = new Map();
                    records.forEach(r => store.set(r.id, r));
                    this.memory.set(table, store);
                }
            }
        } catch (e) { }
    }

    seed() {
        // Seed demo data if empty
        if (this.count('users') === 0) {
            const authUtils = require('./auth-utils');
            const demoId = 'demo-user-001';
            const demoPass = authUtils.hashPassword('demo123');

            this.insert('users', {
                id: demoId, email: 'demo@flay.app', name: 'Jean Koffi', username: 'jean-koffi',
                password: demoPass.hash.split(':')[1], salt: demoPass.salt,
                plan: 'premium', planExpiry: '2026-12-31', role: 'admin'
            });

            this.insert('profiles', {
                userId: demoId, slug: 'jean-koffi', theme: 'dark', template: 'business',
                bio: 'Photographe professionnel base a Abidjan. Specialise dans les mariages, portraits et evenements corporate.',
                title: 'Photographe Pro', location: 'Abidjan, Cote d\'Ivoire',
                phone: '+2250759731990', email: 'jean@flay.app',
                services: JSON.stringify([
                    { name: 'Mariage', description: 'Couverture complete', price: '75 000 FCFA' },
                    { name: 'Portrait Pro', description: 'Photo professionnelle', price: '15 000 FCFA' },
                    { name: 'Evenementiel', description: 'Reportage corporate', price: '50 000 FCFA' }
                ]),
                socials: JSON.stringify({ facebook: '', instagram: '', twitter: '', linkedin: '' }),
                analytics: JSON.stringify({ totalViews: 342, totalClicks: 89, totalShares: 23, totalReservations: 12 }),
                plan: 'premium'
            });

            this.insert('payments', {
                id: 'pay-demo-001', userId: demoId, plan: 'premium', amount: 15000,
                status: 'confirmed', waveRef: 'WAVE-DEMO-001', payerName: 'Jean Koffi',
                confirmedAt: new Date().toISOString()
            });

            console.log('  Demo data ........... Cree (demo@flay.app / demo123)');
        }
    }
}

module.exports = new Database();
