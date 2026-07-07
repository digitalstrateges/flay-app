const fs = require('fs');
const path = require('path');
const { genId, hashPassword, verifyPassword, validateEmail, sanitizeHtml } = require('../auth-utils');

const DB_PATH = path.join(__dirname, '..', 'data', 'users.json');

function readDB() {
    if (!fs.existsSync(DB_PATH)) return [];
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}

function writeDB(data) {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
}

class User {
    static findById(id) {
        return readDB().find(u => u.id === id);
    }
    static findByEmail(email) {
        return readDB().find(u => u.email === email.toLowerCase());
    }
    static findByUsername(username) {
        return readDB().find(u => u.username === username.toLowerCase());
    }
    static findByResetToken(token) {
        return readDB().find(u => u.resetToken === token && u.resetExpiry > Date.now());
    }

    static create({ name, email, username, password }) {
        const users = readDB();
        const emailLower = email.toLowerCase();
        const usernameLower = username.toLowerCase();

        if (users.find(u => u.email === emailLower)) throw new Error('Cet email est deja utilise');
        if (users.find(u => u.username === usernameLower)) throw new Error('Ce nom d\'utilisateur est deja pris');
        if (!validateEmail(email)) throw new Error('Email invalide');
        if (usernameLower.length < 3) throw new Error('Username: 3 caracteres minimum');

        const user = {
            id: genId(),
            name: sanitizeHtml(name.trim()),
            email: emailLower,
            username: usernameLower,
            password: hashPassword(password),
            plan: 'free',
            planExpiry: null,
            planAutoRenew: false,
            language: 'fr',
            avatar: '',
            bio: '',
            phone: '',
            location: '',
            website: '',
            socials: {},
            emailVerified: false,
            emailVerifyToken: null,
            resetToken: null,
            resetExpiry: null,
            lastLogin: null,
            loginCount: 0,
            twoFactorEnabled: false,
            twoFactorSecret: null,
            sessions: [],
            apiKeys: [],
            notifications: {
                email: true,
                reservations: true,
                renewals: true
            },
            metadata: {
                registrationIp: '',
                userAgent: '',
                referrer: ''
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        users.push(user);
        writeDB(users);
        const { password: _, ...safeUser } = user;
        return safeUser;
    }

    static verify(email, password) {
        const user = readDB().find(u => u.email === email.toLowerCase());
        if (!user) return null;
        if (!verifyPassword(password, user.password)) return null;

        // Update login info
        const users = readDB();
        const idx = users.findIndex(u => u.id === user.id);
        if (idx !== -1) {
            users[idx].lastLogin = new Date().toISOString();
            users[idx].loginCount = (users[idx].loginCount || 0) + 1;
            writeDB(users);
        }

        const { password: _, ...safeUser } = user;
        return safeUser;
    }

    static update(id, data) {
        const users = readDB();
        const idx = users.findIndex(u => u.id === id);
        if (idx === -1) return null;

        // Sanitize inputs
        if (data.name) data.name = sanitizeHtml(data.name);
        if (data.bio) data.bio = sanitizeHtml(data.bio);
        if (data.email) data.email = data.email.toLowerCase();
        if (data.username) data.username = data.username.toLowerCase();

        users[idx] = { ...users[idx], ...data, updatedAt: new Date().toISOString() };
        writeDB(users);
        const { password: _, ...safeUser } = users[idx];
        return safeUser;
    }

    static upgradePlan(userId, plan, expiry) {
        return User.update(userId, {
            plan,
            planExpiry: expiry || (() => { const d = new Date(); d.setMonth(d.getMonth() + 1); return d.toISOString(); })()
        });
    }

    static downgradePlan(userId) {
        return User.update(userId, { plan: 'free', planExpiry: null, planAutoRenew: false });
    }

    static cancelPlan(userId) {
        const user = User.findById(userId);
        if (!user) return null;
        // Keep plan active until expiry, then downgrade
        return User.update(userId, { planAutoRenew: false });
    }

    static isPlanActive(userId) {
        const user = User.findById(userId);
        if (!user) return false;
        if (user.plan === 'free') return true;
        if (!user.planExpiry) return false;
        return new Date(user.planExpiry) > new Date();
    }

    static getPlanDaysLeft(userId) {
        const user = User.findById(userId);
        if (!user || user.plan === 'free') return -1;
        if (!user.planExpiry) return 0;
        const diff = new Date(user.planExpiry) - new Date();
        return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    }

    static setResetToken(userId, token) {
        return User.update(userId, {
            resetToken: token,
            resetExpiry: Date.now() + 3600000 // 1 hour
        });
    }

    static resetPassword(token, newPassword) {
        const user = readDB().find(u => u.resetToken === token && u.resetExpiry > Date.now());
        if (!user) return null;
        return User.update(user.id, {
            password: hashPassword(newPassword),
            resetToken: null,
            resetExpiry: null
        });
    }

    static addSession(userId, session) {
        const users = readDB();
        const idx = users.findIndex(u => u.id === userId);
        if (idx === -1) return null;
        if (!users[idx].sessions) users[idx].sessions = [];
        users[idx].sessions.push({ id: genId(), ...session, createdAt: new Date().toISOString() });
        // Keep only last 5 sessions
        if (users[idx].sessions.length > 5) {
            users[idx].sessions = users[idx].sessions.slice(-5);
        }
        writeDB(users);
    }

    static removeSession(userId, sessionId) {
        const users = readDB();
        const idx = users.findIndex(u => u.id === userId);
        if (idx === -1) return null;
        users[idx].sessions = (users[idx].sessions || []).filter(s => s.id !== sessionId);
        writeDB(users);
    }

    static getAll(filters = {}) {
        let users = readDB();
        if (filters.plan) users = users.filter(u => u.plan === filters.plan);
        if (filters.search) {
            const q = filters.search.toLowerCase();
            users = users.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.username.toLowerCase().includes(q));
        }
        return users.map(u => { const { password: _, ...safe } = u; return safe; });
    }

    static count() {
        return readDB().length;
    }

    static getStats() {
        const users = readDB();
        const now = new Date();
        const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
        return {
            total: users.length,
            free: users.filter(u => u.plan === 'free').length,
            pro: users.filter(u => u.plan === 'pro').length,
            premium: users.filter(u => u.plan === 'premium').length,
            newThisMonth: users.filter(u => new Date(u.createdAt) > thirtyDaysAgo).length,
            activePlans: users.filter(u => u.plan !== 'free' && new Date(u.planExpiry) > now).length
        };
    }

    static delete(id) {
        const users = readDB();
        const filtered = users.filter(u => u.id !== id);
        if (filtered.length === users.length) return false;
        writeDB(filtered);
        return true;
    }
}

module.exports = User;
