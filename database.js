/**
 * Flay Omni - Database Persistence Layer
 * SQLite for CRM, Analytics, Stocks, Invoices
 * Falls back to JSON file if SQLite unavailable
 */

const config = require('./config');

class Database {
    constructor() {
        this.db = null;
        this.jsonFallback = null;
        this.initialized = false;
    }

    async init() {
        try {
            const sql = require('sql.js');
            const fs = require('fs');
            const path = require('path');

            const dataDir = path.join(process.cwd(), 'data');
            if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

            const dbPath = path.join(dataDir, 'flay.db');
            let fileBuffer = null;
            if (fs.existsSync(dbPath)) {
                fileBuffer = fs.readFileSync(dbPath);
            }

            const SQL = await sql();
            this.db = new SQL.Database(fileBuffer || undefined);

            // Create tables
            this.db.run(`
                CREATE TABLE IF NOT EXISTS crm_contacts (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    name TEXT NOT NULL,
                    email TEXT,
                    phone TEXT,
                    company TEXT,
                    tags TEXT DEFAULT '[]',
                    notes TEXT DEFAULT '',
                    stage TEXT DEFAULT 'lead',
                    score INTEGER DEFAULT 0,
                    total_spent REAL DEFAULT 0,
                    reservations_count INTEGER DEFAULT 0,
                    last_contact TEXT,
                    created_at TEXT DEFAULT (datetime('now')),
                    updated_at TEXT DEFAULT (datetime('now'))
                )
            `);

            this.db.run(`
                CREATE TABLE IF NOT EXISTS analytics_events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    event_type TEXT NOT NULL,
                    event_data TEXT DEFAULT '{}',
                    page TEXT,
                    referrer TEXT,
                    device TEXT,
                    browser TEXT,
                    os TEXT,
                    country TEXT,
                    city TEXT,
                    ip TEXT,
                    created_at TEXT DEFAULT (datetime('now'))
                )
            `);

            this.db.run(`
                CREATE TABLE IF NOT EXISTS stock_items (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    product_id TEXT,
                    name TEXT NOT NULL,
                    sku TEXT,
                    quantity INTEGER DEFAULT 0,
                    min_quantity INTEGER DEFAULT 5,
                    cost_price REAL DEFAULT 0,
                    sell_price REAL DEFAULT 0,
                    category TEXT,
                    location TEXT,
                    status TEXT DEFAULT 'in_stock',
                    last_restock TEXT,
                    created_at TEXT DEFAULT (datetime('now')),
                    updated_at TEXT DEFAULT (datetime('now'))
                )
            `);

            this.db.run(`
                CREATE TABLE IF NOT EXISTS invoices (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    invoice_number TEXT NOT NULL,
                    client_name TEXT,
                    client_email TEXT,
                    client_phone TEXT,
                    items TEXT DEFAULT '[]',
                    subtotal REAL DEFAULT 0,
                    tax_rate REAL DEFAULT 18,
                    tax_amount REAL DEFAULT 0,
                    total REAL DEFAULT 0,
                    currency TEXT DEFAULT 'XOF',
                    status TEXT DEFAULT 'draft',
                    paid_at TEXT,
                    due_date TEXT,
                    notes TEXT,
                    created_at TEXT DEFAULT (datetime('now')),
                    updated_at TEXT DEFAULT (datetime('now'))
                )
            `);

            this.db.run(`
                CREATE TABLE IF NOT EXISTS receipts (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    receipt_number TEXT NOT NULL,
                    client_name TEXT,
                    items TEXT DEFAULT '[]',
                    total REAL DEFAULT 0,
                    currency TEXT DEFAULT 'XOF',
                    payment_method TEXT DEFAULT 'cash',
                    status TEXT DEFAULT 'completed',
                    created_at TEXT DEFAULT (datetime('now'))
                )
            `);

            this.db.run(`
                CREATE TABLE IF NOT EXISTS transactions (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    type TEXT NOT NULL,
                    amount REAL NOT NULL,
                    currency TEXT DEFAULT 'XOF',
                    description TEXT,
                    category TEXT,
                    reference TEXT,
                    invoice_id TEXT,
                    receipt_id TEXT,
                    created_at TEXT DEFAULT (datetime('now'))
                )
            `);

            this.db.run(`
                CREATE TABLE IF NOT EXISTS loyalty_points (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    client_id TEXT NOT NULL,
                    points INTEGER DEFAULT 0,
                    total_earned INTEGER DEFAULT 0,
                    total_redeemed INTEGER DEFAULT 0,
                    history TEXT DEFAULT '[]',
                    created_at TEXT DEFAULT (datetime('now')),
                    updated_at TEXT DEFAULT (datetime('now'))
                )
            `);

            this.db.run(`
                CREATE TABLE IF NOT EXISTS coupons (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    code TEXT NOT NULL,
                    type TEXT DEFAULT 'percentage',
                    value REAL DEFAULT 0,
                    min_purchase REAL DEFAULT 0,
                    max_uses INTEGER DEFAULT 0,
                    used_count INTEGER DEFAULT 0,
                    valid_from TEXT,
                    valid_until TEXT,
                    active INTEGER DEFAULT 1,
                    created_at TEXT DEFAULT (datetime('now'))
                )
            `);

            this.db.run(`
                CREATE TABLE IF NOT EXISTS abandoned_carts (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    client_email TEXT,
                    client_name TEXT,
                    items TEXT DEFAULT '[]',
                    total REAL DEFAULT 0,
                    status TEXT DEFAULT 'abandoned',
                    recovered_at TEXT,
                    created_at TEXT DEFAULT (datetime('now'))
                )
            `);

            // Indexes
            this.db.run(`CREATE INDEX IF NOT EXISTS idx_analytics_user ON analytics_events(user_id)`);
            this.db.run(`CREATE INDEX IF NOT EXISTS idx_analytics_type ON analytics_events(event_type)`);
            this.db.run(`CREATE INDEX IF NOT EXISTS idx_analytics_created ON analytics_events(created_at)`);
            this.db.run(`CREATE INDEX IF NOT EXISTS idx_crm_user ON crm_contacts(user_id)`);
            this.db.run(`CREATE INDEX IF NOT EXISTS idx_stock_user ON stock_items(user_id)`);
            this.db.run(`CREATE INDEX IF NOT EXISTS idx_invoices_user ON invoices(user_id)`);
            this.db.run(`CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id)`);

            this.initialized = true;
            this._save();
            console.log('[DB] SQLite initialized successfully');
        } catch (e) {
            console.log(`[DB] SQLite not available, using JSON fallback: ${e.message}`);
            this._initJsonFallback();
            this.initialized = true;
        }
    }

    _initJsonFallback() {
        const fs = require('fs');
        const path = require('path');
        const dataDir = path.join(process.cwd(), 'data');
        if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

        const jsonPath = path.join(dataDir, 'db.json');
        if (fs.existsSync(jsonPath)) {
            try {
                this.jsonFallback = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
            } catch (e) {
                this.jsonFallback = this._emptyStore();
            }
        } else {
            this.jsonFallback = this._emptyStore();
        }
        this._saveJson = () => {
            fs.writeFileSync(jsonPath, JSON.stringify(this.jsonFallback, null, 2));
        };
    }

    _emptyStore() {
        return {
            crm_contacts: [], analytics_events: [], stock_items: [],
            invoices: [], receipts: [], transactions: [],
            loyalty_points: [], coupons: [], abandoned_carts: []
        };
    }

    _save() {
        if (this.db) {
            try {
                const fs = require('fs');
                const path = require('path');
                const data = this.db.export();
                const buffer = Buffer.from(data);
                fs.writeFileSync(path.join(process.cwd(), 'data', 'flay.db'), buffer);
            } catch (e) { console.log('[DB] Save error:', e.message); }
        }
    }

    // Generic CRUD
    insert(table, row) {
        if (this.db) {
            const cols = Object.keys(row);
            const vals = cols.map(c => row[c]);
            const placeholders = cols.map(() => '?').join(',');
            this.db.run(`INSERT INTO ${table} (${cols.join(',')}) VALUES (${placeholders})`, vals);
            this._save();
            return row;
        } else {
            if (!this.jsonFallback[table]) this.jsonFallback[table] = [];
            this.jsonFallback[table].push(row);
            this._saveJson();
            return row;
        }
    }

    query(table, where = {}, limit = 1000) {
        if (this.db) {
            let sql = `SELECT * FROM ${table}`;
            const params = [];
            const conditions = Object.entries(where).filter(([k, v]) => v !== undefined);
            if (conditions.length > 0) {
                sql += ' WHERE ' + conditions.map(([k]) => `${k} = ?`).join(' AND ');
                params.push(...conditions.map(([, v]) => v));
            }
            sql += ` LIMIT ${limit}`;
            const result = this.db.exec(sql, params);
            return result.length > 0 ? result[0].values.map(row => {
                const obj = {};
                result[0].columns.forEach((col, i) => obj[col] = row[i]);
                return obj;
            }) : [];
        } else {
            let items = this.jsonFallback[table] || [];
            for (const [k, v] of Object.entries(where)) {
                if (v !== undefined) items = items.filter(i => i[k] === v);
            }
            return items.slice(0, limit);
        }
    }

    update(table, id, updates) {
        if (this.db) {
            const sets = Object.keys(updates).map(k => `${k} = ?`);
            const vals = Object.values(updates);
            this.db.run(`UPDATE ${table} SET ${sets.join(', ')}, updated_at = datetime('now') WHERE id = ?`, [...vals, id]);
            this._save();
        } else {
            const items = this.jsonFallback[table] || [];
            const idx = items.findIndex(i => i.id === id);
            if (idx >= 0) {
                Object.assign(items[idx], updates, { updated_at: new Date().toISOString() });
                this._saveJson();
            }
        }
    }

    delete(table, id) {
        if (this.db) {
            this.db.run(`DELETE FROM ${table} WHERE id = ?`, [id]);
            this._save();
        } else {
            const items = this.jsonFallback[table] || [];
            this.jsonFallback[table] = items.filter(i => i.id !== id);
            this._saveJson();
        }
    }

    count(table, where = {}) {
        if (this.db) {
            let sql = `SELECT COUNT(*) as count FROM ${table}`;
            const params = [];
            const conditions = Object.entries(where).filter(([k, v]) => v !== undefined);
            if (conditions.length > 0) {
                sql += ' WHERE ' + conditions.map(([k]) => `${k} = ?`).join(' AND ');
                params.push(...conditions.map(([, v]) => v));
            }
            const result = this.db.exec(sql, params);
            return result.length > 0 ? result[0].values[0][0] : 0;
        } else {
            let items = this.jsonFallback[table] || [];
            for (const [k, v] of Object.entries(where)) {
                if (v !== undefined) items = items.filter(i => i[k] === v);
            }
            return items.length;
        }
    }

    sum(table, column, where = {}) {
        if (this.db) {
            let sql = `SELECT SUM(${column}) as total FROM ${table}`;
            const params = [];
            const conditions = Object.entries(where).filter(([k, v]) => v !== undefined);
            if (conditions.length > 0) {
                sql += ' WHERE ' + conditions.map(([k]) => `${k} = ?`).join(' AND ');
                params.push(...conditions.map(([, v]) => v));
            }
            const result = this.db.exec(sql, params);
            return result.length > 0 ? (result[0].values[0][0] || 0) : 0;
        } else {
            let items = this.jsonFallback[table] || [];
            for (const [k, v] of Object.entries(where)) {
                if (v !== undefined) items = items.filter(i => i[k] === v);
            }
            return items.reduce((sum, i) => sum + (i[column] || 0), 0);
        }
    }

    // Analytics helpers
    trackEvent(userId, eventType, data = {}) {
        return this.insert('analytics_events', {
            id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
            user_id: userId,
            event_type: eventType,
            event_data: JSON.stringify(data),
            page: data.page || '',
            referrer: data.referrer || '',
            device: data.device || '',
            browser: data.browser || '',
            os: data.os || '',
            country: data.country || '',
            city: data.city || '',
            ip: data.ip || '',
            created_at: new Date().toISOString()
        });
    }

    getAnalytics(userId, days = 30) {
        const since = new Date(Date.now() - days * 86400000).toISOString();
        const events = this.query('analytics_events', { user_id: userId }, 10000);

        const filtered = events.filter(e => e.created_at >= since);

        // Group by type
        const byType = {};
        filtered.forEach(e => {
            if (!byType[e.event_type]) byType[e.event_type] = 0;
            byType[e.event_type]++;
        });

        // Group by day
        const byDay = {};
        filtered.forEach(e => {
            const day = e.created_at.substring(0, 10);
            if (!byDay[day]) byDay[day] = 0;
            byDay[day]++;
        });

        // Top pages
        const pages = {};
        filtered.filter(e => e.page).forEach(e => {
            if (!pages[e.page]) pages[e.page] = 0;
            pages[e.page]++;
        });

        // Devices
        const devices = {};
        filtered.filter(e => e.device).forEach(e => {
            if (!devices[e.device]) devices[e.device] = 0;
            devices[e.device]++;
        });

        return {
            total: filtered.length,
            byType,
            byDay,
            topPages: Object.entries(pages).sort((a, b) => b[1] - a[1]).slice(0, 10),
            devices,
            period: `${days} days`
        };
    }
}

module.exports = new Database();
