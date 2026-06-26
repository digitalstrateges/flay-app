const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'flay.db');
const JSON_PATH = path.join(__dirname, '..', 'data', 'db.json');

class Database {
    constructor() {
        this.db = null;
        this.tables = new Map();
        this.ready = false;
        this.init();
    }

    init() {
        const dir = path.dirname(DB_PATH);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        try {
            const initSqlJs = require('sql.js');
            initSqlJs().then(SQL => {
                try {
                    if (fs.existsSync(DB_PATH)) {
                        const buffer = fs.readFileSync(DB_PATH);
                        this.db = new SQL.Database(buffer);
                    } else {
                        this.db = new SQL.Database();
                    }
                    this.db.run('PRAGMA journal_mode=WAL');
                    this.db.run('PRAGMA foreign_keys=ON');
                    this.createTables();
                    this.seed();
                    this.ready = true;
                    console.log('  Database ............. SQLite (sql.js)');
                } catch (e) {
                    console.log('  Database ............. Fallback JSON');
                    this.useJSONFallback();
                }
            }).catch(() => {
                console.log('  Database ............. Fallback JSON');
                this.useJSONFallback();
            });
        } catch (e) {
            console.log('  Database ............. Fallback JSON');
            this.useJSONFallback();
        }
    }

    useJSONFallback() {
        this.db = null;
        this.loadFromJSON();
        this.ready = true;
    }

    createTables() {
        const schema = `
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                salt TEXT NOT NULL,
                plan TEXT DEFAULT 'free',
                planExpiry TEXT,
                planAutoRenew INTEGER DEFAULT 0,
                role TEXT DEFAULT 'user',
                avatar TEXT DEFAULT '',
                phone TEXT DEFAULT '',
                language TEXT DEFAULT 'fr',
                isAdmin INTEGER DEFAULT 0,
                twoFactorSecret TEXT,
                twoFactorEnabled INTEGER DEFAULT 0,
                lastLogin TEXT,
                createdAt TEXT DEFAULT (datetime('now')),
                updatedAt TEXT DEFAULT (datetime('now'))
            );
            CREATE TABLE IF NOT EXISTS profiles (
                id TEXT PRIMARY KEY,
                userId TEXT UNIQUE NOT NULL,
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
                wavePaymentLink TEXT DEFAULT '',
                isPublished INTEGER DEFAULT 1,
                settings TEXT DEFAULT '{}',
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
                payerPhone TEXT DEFAULT '',
                invoiceId TEXT,
                metadata TEXT DEFAULT '{}',
                expiresAt TEXT,
                confirmedAt TEXT,
                createdAt TEXT DEFAULT (datetime('now'))
            );
            CREATE TABLE IF NOT EXISTS reservations (
                id TEXT PRIMARY KEY,
                userId TEXT NOT NULL,
                profileId TEXT,
                clientName TEXT NOT NULL,
                clientEmail TEXT,
                clientPhone TEXT,
                service TEXT,
                date TEXT NOT NULL,
                time TEXT,
                message TEXT DEFAULT '',
                notes TEXT DEFAULT '',
                status TEXT DEFAULT 'pending',
                createdAt TEXT DEFAULT (datetime('now'))
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
                updatedAt TEXT DEFAULT (datetime('now'))
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
                updatedAt TEXT DEFAULT (datetime('now'))
            );
            CREATE TABLE IF NOT EXISTS invoices (
                id TEXT PRIMARY KEY,
                userId TEXT NOT NULL,
                contactId TEXT,
                invoiceNumber TEXT,
                items TEXT DEFAULT '[]',
                subtotal INTEGER DEFAULT 0,
                tax INTEGER DEFAULT 0,
                discount INTEGER DEFAULT 0,
                total INTEGER DEFAULT 0,
                currency TEXT DEFAULT 'XOF',
                status TEXT DEFAULT 'draft',
                dueDate TEXT,
                paidAt TEXT,
                sentAt TEXT,
                createdAt TEXT DEFAULT (datetime('now'))
            );
            CREATE TABLE IF NOT EXISTS notifications (
                id TEXT PRIMARY KEY,
                userId TEXT NOT NULL,
                type TEXT NOT NULL,
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                read INTEGER DEFAULT 0,
                data TEXT DEFAULT '{}',
                createdAt TEXT DEFAULT (datetime('now'))
            );
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                userId TEXT NOT NULL,
                token TEXT NOT NULL,
                ip TEXT,
                userAgent TEXT,
                expiresAt TEXT NOT NULL,
                createdAt TEXT DEFAULT (datetime('now'))
            );
            CREATE TABLE IF NOT EXISTS api_keys (
                id TEXT PRIMARY KEY,
                userId TEXT NOT NULL,
                key TEXT UNIQUE NOT NULL,
                name TEXT DEFAULT '',
                permissions TEXT DEFAULT '["read"]',
                lastUsed TEXT,
                expiresAt TEXT,
                createdAt TEXT DEFAULT (datetime('now'))
            );
            CREATE TABLE IF NOT EXISTS webhooks (
                id TEXT PRIMARY KEY,
                userId TEXT NOT NULL,
                url TEXT NOT NULL,
                events TEXT DEFAULT '[]',
                secret TEXT NOT NULL,
                active INTEGER DEFAULT 1,
                createdAt TEXT DEFAULT (datetime('now'))
            );
            CREATE TABLE IF NOT EXISTS analytics (
                id TEXT PRIMARY KEY,
                userId TEXT NOT NULL,
                profileId TEXT,
                eventType TEXT NOT NULL,
                data TEXT DEFAULT '{}',
                ip TEXT,
                userAgent TEXT,
                referrer TEXT,
                createdAt TEXT DEFAULT (datetime('now'))
            );
            CREATE TABLE IF NOT EXISTS products (
                id TEXT PRIMARY KEY,
                userId TEXT NOT NULL,
                name TEXT NOT NULL,
                description TEXT DEFAULT '',
                shortDescription TEXT DEFAULT '',
                price INTEGER NOT NULL,
                comparePrice INTEGER DEFAULT 0,
                currency TEXT DEFAULT 'XOF',
                category TEXT DEFAULT '',
                categoryId TEXT,
                images TEXT DEFAULT '[]',
                thumbnail TEXT DEFAULT '',
                sku TEXT DEFAULT '',
                stock INTEGER DEFAULT 0,
                trackInventory INTEGER DEFAULT 1,
                allowBackorder INTEGER DEFAULT 0,
                weight INTEGER DEFAULT 0,
                dimensions TEXT DEFAULT '{}',
                variants TEXT DEFAULT '[]',
                options TEXT DEFAULT '[]',
                tags TEXT DEFAULT '[]',
                status TEXT DEFAULT 'active',
                featured INTEGER DEFAULT 0,
                seo TEXT DEFAULT '{}',
                stats TEXT DEFAULT '{}',
                createdAt TEXT DEFAULT (datetime('now')),
                updatedAt TEXT DEFAULT (datetime('now'))
            );
            CREATE TABLE IF NOT EXISTS orders (
                id TEXT PRIMARY KEY,
                userId TEXT NOT NULL,
                items TEXT DEFAULT '[]',
                subtotal INTEGER DEFAULT 0,
                tax INTEGER DEFAULT 0,
                taxRate REAL DEFAULT 0.18,
                shipping INTEGER DEFAULT 0,
                shippingMethod TEXT DEFAULT 'standard',
                shippingZone TEXT DEFAULT '',
                discount INTEGER DEFAULT 0,
                couponCode TEXT,
                total INTEGER NOT NULL,
                currency TEXT DEFAULT 'XOF',
                status TEXT DEFAULT 'pending',
                deliveryStatus TEXT DEFAULT 'pending',
                payment TEXT DEFAULT '{}',
                shippingAddress TEXT DEFAULT '{}',
                billingAddress TEXT DEFAULT '{}',
                notes TEXT DEFAULT '',
                customerNote TEXT DEFAULT '',
                estimatedDelivery TEXT,
                deliveredAt TEXT,
                confirmedAt TEXT,
                createdAt TEXT DEFAULT (datetime('now')),
                updatedAt TEXT DEFAULT (datetime('now'))
            );
            CREATE TABLE IF NOT EXISTS teams (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                ownerId TEXT NOT NULL,
                createdAt TEXT DEFAULT (datetime('now'))
            );
            CREATE TABLE IF NOT EXISTS team_members (
                id TEXT PRIMARY KEY,
                teamId TEXT NOT NULL,
                userId TEXT NOT NULL,
                role TEXT DEFAULT 'member',
                status TEXT DEFAULT 'invited',
                createdAt TEXT DEFAULT (datetime('now'))
            );
            CREATE TABLE IF NOT EXISTS domains (
                id TEXT PRIMARY KEY,
                userId TEXT NOT NULL,
                domain TEXT NOT NULL,
                verified INTEGER DEFAULT 0,
                createdAt TEXT DEFAULT (datetime('now'))
            );
            CREATE TABLE IF NOT EXISTS reviews (
                id TEXT PRIMARY KEY,
                productId TEXT NOT NULL,
                userId TEXT NOT NULL,
                rating INTEGER NOT NULL,
                comment TEXT DEFAULT '',
                createdAt TEXT DEFAULT (datetime('now'))
            );
            CREATE TABLE IF NOT EXISTS coupons (
                id TEXT PRIMARY KEY,
                userId TEXT NOT NULL,
                code TEXT NOT NULL,
                value INTEGER NOT NULL DEFAULT 10,
                type TEXT DEFAULT 'percentage',
                minPurchase INTEGER DEFAULT 0,
                maxUses INTEGER DEFAULT -1,
                usedCount INTEGER DEFAULT 0,
                validFrom TEXT,
                validUntil TEXT,
                active INTEGER DEFAULT 1,
                createdAt TEXT DEFAULT (datetime('now'))
            );
            CREATE TABLE IF NOT EXISTS parcels (
                id TEXT PRIMARY KEY,
                orderId TEXT NOT NULL,
                userId TEXT NOT NULL,
                trackingNumber TEXT NOT NULL UNIQUE,
                carrier TEXT DEFAULT '',
                status TEXT DEFAULT 'preparation',
                origin TEXT DEFAULT '',
                destination TEXT DEFAULT '',
                estimatedDelivery TEXT,
                shippedAt TEXT,
                deliveredAt TEXT,
                notes TEXT DEFAULT '',
                history TEXT DEFAULT '[]',
                createdAt TEXT DEFAULT (datetime('now')),
                updatedAt TEXT DEFAULT (datetime('now'))
            );
            CREATE TABLE IF NOT EXISTS categories (
                id TEXT PRIMARY KEY,
                userId TEXT NOT NULL,
                name TEXT NOT NULL,
                slug TEXT NOT NULL,
                description TEXT DEFAULT '',
                image TEXT DEFAULT '',
                parentId TEXT,
                sort_order INTEGER DEFAULT 0,
                active INTEGER DEFAULT 1,
                createdAt TEXT DEFAULT (datetime('now'))
            );
            CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
            CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
            CREATE INDEX IF NOT EXISTS idx_profiles_slug ON profiles(slug);
            CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(userId);
            CREATE INDEX IF NOT EXISTS idx_reservations_user ON reservations(userId);
            CREATE INDEX IF NOT EXISTS idx_contacts_user ON contacts(userId);
            CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(userId);
            CREATE INDEX IF NOT EXISTS idx_analytics_user ON analytics(userId);
            CREATE INDEX IF NOT EXISTS idx_products_user ON products(userId);
            CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(userId);
            CREATE INDEX IF NOT EXISTS idx_parcels_tracking ON parcels(trackingNumber);
        `;
        this.db.run(schema);
    }

    // JSON fields per table for auto-deserialization
    static JSON_FIELDS = {
        profiles: ['services', 'socials', 'analytics', 'seo', 'gallery', 'geoLocation', 'settings', 'tags'],
        payments: ['metadata'],
        products: ['images', 'variants', 'tags', 'stats'],
        orders: ['items', 'shipping', 'payment'],
        parcels: ['history'],
        invoices: ['items'],
        contacts: ['tags'],
        notifications: ['data'],
        api_keys: ['permissions'],
        webhooks: ['events'],
        analytics: ['data'],
        deals: ['notes'],
        coupons: ['metadata']
    };

    _parseRow(table, row) {
        if (!row || typeof row !== 'object') return row;
        const fields = Database.JSON_FIELDS[table] || [];
        const parsed = { ...row };
        for (const field of fields) {
            if (typeof parsed[field] === 'string') {
                try { parsed[field] = JSON.parse(parsed[field]); }
                catch { /* keep as string */ }
            }
        }
        return parsed;
    }

    _parseRows(table, rows) {
        if (!rows) return rows;
        return rows.map(r => this._parseRow(table, r));
    }

    // --- Internal helpers ---
    _store(table) {
        if (!this.tables.has(table)) this.tables.set(table, new Map());
        return this.tables.get(table);
    }

    _run(sql, params = []) {
        if (this.db) {
            try { return this.db.run(sql, params); }
            catch (e) { console.error(`[DB] SQL error: ${e.message}`, { sql, params }); return null; }
        }
        return null;
    }

    _exec(sql) {
        if (this.db) {
            try { this.db.run(sql); }
            catch (e) { console.error(`[DB] SQL exec error: ${e.message}`); }
        }
    }

    _getTableFromSQL(sql) {
        const match = sql.match(/FROM\s+(\w+)/i);
        return match ? match[1] : null;
    }

    _query(sql, params = []) {
        if (this.db) {
            try {
                const stmt = this.db.prepare(sql);
                if (!stmt) return [];
                stmt.bind(params);
                const results = [];
                while (stmt.step()) results.push(stmt.getAsObject());
                stmt.free();
                const table = this._getTableFromSQL(sql);
                return table ? this._parseRows(table, results) : results;
            } catch (e) {
                console.error(`[DB] Query error: ${e.message}`, { sql, params });
                return [];
            }
        }
        return [];
    }

    _queryOne(sql, params = []) {
        const results = this._query(sql, params);
        return results.length > 0 ? results[0] : null;
    }

    _serialize(obj) {
        if (obj === null || obj === undefined) return obj;
        if (typeof obj === 'object') return JSON.stringify(obj);
        return obj;
    }

    _deserialize(value) {
        if (!value || typeof value !== 'string') return value;
        try { return JSON.parse(value); }
        catch { return value; }
    }

    // --- Public CRUD API ---

    get(table, id) {
        if (!this.db) {
            const store = this._store(table);
            const record = store.get(id);
            return record ? this._parseRow(table, { ...record }) : null;
        }
        const result = this._queryOne(`SELECT * FROM ${table} WHERE id = ?`, [id]);
        return result || null;
    }

    getAll(table, filter = {}) {
        if (!this.db) {
            const store = this._store(table);
            let results = Array.from(store.values());
            for (const [key, value] of Object.entries(filter)) {
                results = results.filter(r => r[key] === value);
            }
            return this._parseRows(table, results);
        }
        const conditions = Object.keys(filter).map(k => `${k} = ?`).join(' AND ');
        const values = Object.values(filter);
        if (conditions) return this._query(`SELECT * FROM ${table} WHERE ${conditions}`, values);
        return this._query(`SELECT * FROM ${table}`);
    }

    findBy(table, field, value) {
        if (!this.db) {
            const store = this._store(table);
            for (const record of store.values()) {
                if (record[field] === value) return this._parseRow(table, { ...record });
            }
            return null;
        }
        return this._queryOne(`SELECT * FROM ${table} WHERE ${field} = ?`, [value]) || null;
    }

    findAll(table, field, value) {
        if (!this.db) {
            const store = this._store(table);
            return this._parseRows(table, Array.from(store.values()).filter(r => r[field] === value));
        }
        return this._query(`SELECT * FROM ${table} WHERE ${field} = ?`, [value]);
    }

    insert(table, data) {
        const id = data.id || `${table.slice(0, -1)}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        const now = new Date().toISOString();
        const record = { ...data, id, createdAt: data.createdAt || now };

        if (!this.db) {
            const store = this._store(table);
            store.set(id, { ...record });
            this.saveToJSON();
            return { ...record };
        }

        const keys = Object.keys(record);
        const placeholders = keys.map(() => '?').join(', ');
        const values = keys.map(k => {
            const v = record[k];
            return (typeof v === 'object' && v !== null) ? JSON.stringify(v) : v;
        });
        try {
            this.db.run(`INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`, values);
            return this.get(table, id);
        } catch (e) {
            console.error(`[DB] Insert error: ${e.message}`, { table, id });
            return null;
        }
    }

    update(table, id, data) {
        const now = new Date().toISOString();
        data.updatedAt = now;

        if (!this.db) {
            const store = this._store(table);
            const existing = store.get(id);
            if (!existing) return null;
            const updated = { ...existing, ...data, id };
            store.set(id, updated);
            this.saveToJSON();
            return { ...updated };
        }

        const sets = Object.keys(data).map(k => `${k} = ?`).join(', ');
        const values = Object.keys(data).map(k => {
            const v = data[k];
            return (typeof v === 'object' && v !== null) ? JSON.stringify(v) : v;
        });
        try {
            this.db.run(`UPDATE ${table} SET ${sets} WHERE id = ?`, [...values, id]);
            return this.get(table, id);
        } catch (e) {
            console.error(`[DB] Update error: ${e.message}`, { table, id });
            return null;
        }
    }

    delete(table, id) {
        if (!this.db) {
            const store = this._store(table);
            const deleted = store.delete(id);
            if (deleted) this.saveToJSON();
            return deleted;
        }
        try {
            this.db.run(`DELETE FROM ${table} WHERE id = ?`, [id]);
            return true;
        } catch (e) {
            console.error(`[DB] Delete error: ${e.message}`);
            return false;
        }
    }

    deleteWhere(table, field, value) {
        if (!this.db) {
            const store = this._store(table);
            let count = 0;
            for (const [id, record] of store) {
                if (record[field] === value) { store.delete(id); count++; }
            }
            if (count > 0) this.saveToJSON();
            return count;
        }
        try {
            this.db.run(`DELETE FROM ${table} WHERE ${field} = ?`, [value]);
            return true;
        } catch (e) {
            console.error(`[DB] DeleteWhere error: ${e.message}`);
            return false;
        }
    }

    count(table, filter = {}) {
        if (!this.db) {
            return this.getAll(table, filter).length;
        }
        const conditions = Object.keys(filter).map(k => `${k} = ?`).join(' AND ');
        const values = Object.values(filter);
        if (conditions) {
            const result = this._queryOne(`SELECT COUNT(*) as count FROM ${table} WHERE ${conditions}`, values);
            return result ? result.count : 0;
        }
        const result = this._queryOne(`SELECT COUNT(*) as count FROM ${table}`);
        return result ? result.count : 0;
    }

    search(table, field, query, limit = 20) {
        if (!this.db) {
            const store = this._store(table);
            const lower = query.toLowerCase();
            return Array.from(store.values())
                .filter(r => (r[field] || '').toLowerCase().includes(lower))
                .slice(0, limit);
        }
        return this._query(`SELECT * FROM ${table} WHERE ${field} LIKE ? LIMIT ?`, [`%${query}%`, limit]);
    }

    exec(sql) {
        if (this.db) {
            try { this.db.run(sql); return true; }
            catch (e) { console.error(`[DB] Exec error: ${e.message}`); return false; }
        }
        return false;
    }

    query(sql, params = []) {
        return this._query(sql, params);
    }

    queryOne(sql, params = []) {
        return this._queryOne(sql, params);
    }

    // --- Persistence ---
    saveToJSON() {
        try {
            const data = {};
            for (const [table, store] of this.tables) {
                data[table] = Array.from(store.values());
            }
            fs.writeFileSync(JSON_PATH, JSON.stringify(data, null, 2));
        } catch (e) { /* silent */ }
    }

    loadFromJSON() {
        try {
            if (fs.existsSync(JSON_PATH)) {
                const data = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
                for (const [table, records] of Object.entries(data)) {
                    const store = new Map();
                    records.forEach(r => store.set(r.id, r));
                    this.tables.set(table, store);
                }
            }
        } catch (e) { /* silent */ }
    }

    save() {
        if (this.db) {
            try {
                const data = this.db.export();
                const buffer = Buffer.from(data);
                fs.writeFileSync(DB_PATH, buffer);
            } catch (e) { console.error('[DB] Save error:', e.message); }
        }
    }

    // --- Seed ---
    seed() {
        if (this.count('users') > 0) return;
        const authUtils = require('../auth-utils');
        const demoId = 'demo-user-001';
        const demoPass = authUtils.hashPassword('demo123');

        this.insert('users', {
            id: demoId, email: 'demo@flay.app', name: 'Jean Koffi', username: 'jean-koffi',
            password: demoPass.hash.split(':')[1], salt: demoPass.salt,
            plan: 'premium', planExpiry: '2026-12-31', role: 'user', isAdmin: 1
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
            socials: JSON.stringify({ facebook: '', instagram: '', twitter: '', linkedin: '', tiktok: '', youtube: '' }),
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

module.exports = new Database();
