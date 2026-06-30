/**
 * Flay Omni - Push Notifications
 * Web Push (VAPID) + Real-time Server-Sent Events
 */

const crypto = require('crypto');

class PushNotifications {
    constructor() {
        this.subscriptions = new Map(); // userId -> { endpoint, keys }
        this.vapidKeys = {
            publicKey: process.env.VAPID_PUBLIC_KEY || '',
            privateKey: process.env.VAPID_PRIVATE_KEY || '',
        };
        this.notifications = new Map();
        this.sseClients = new Map(); // userId -> [res]
        this.db = null;
        this._initDb();
        this._loadSubscriptions();
    }

    _initDb() {
        try { this.db = require('./db/index'); } catch {}
    }

    _loadSubscriptions() {
        if (!this.db) return;
        try {
            const rows = this.db.getAll('push_subscriptions');
            for (const row of rows) {
                const keys = typeof row.keys === 'string' ? JSON.parse(row.keys) : row.keys;
                const sub = { endpoint: row.endpoint, keys };
                if (!this.subscriptions.has(row.userId)) {
                    this.subscriptions.set(row.userId, []);
                }
                this.subscriptions.get(row.userId).push(sub);
            }
            console.log(`[PUSH] Restored ${rows.length} subscriptions from DB`);
        } catch (e) {
            console.log('[PUSH] Could not load subscriptions from DB:', e.message);
        }
    }

    async _loadFromDb(userId) {
        if (!this.db) return;
        try {
            const rows = this.db.findAll('notifications', 'userId', userId);
            const parsed = rows.map(r => ({
                ...r,
                data: typeof r.data === 'string' ? (() => { try { return JSON.parse(r.data); } catch { return {}; } })() : r.data,
                read: !!r.read
            })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            this.notifications.set(userId, parsed);
        } catch (e) {
            console.log('[PUSH] Could not load notifications from DB:', e.message);
        }
    }

    async _persistToDb(userId, notification) {
        if (!this.db) return;
        try {
            this.db.insert('notifications', {
                id: notification.id,
                userId,
                type: notification.type || 'info',
                title: notification.title || '',
                body: notification.body || '',
                message: notification.message || notification.body || '',
                read: 0,
                data: typeof notification.data === 'object' ? JSON.stringify(notification.data) : notification.data,
                createdAt: notification.createdAt || new Date().toISOString()
            });
        } catch (e) {
            console.log('[PUSH] DB persist error:', e.message);
        }
    }

    // Register push subscription from browser
    registerSubscription(userId, subscription) {
        if (!this.subscriptions.has(userId)) {
            this.subscriptions.set(userId, []);
        }
        const subs = this.subscriptions.get(userId);
        // Remove existing for same endpoint
        const idx = subs.findIndex(s => s.endpoint === subscription.endpoint);
        if (idx >= 0) subs.splice(idx, 1);
        subs.push(subscription);
        console.log(`[PUSH] Registered subscription for user ${userId}`);

        // Persist to DB
        if (this.db) {
            try {
                this.db.deleteWhere('push_subscriptions', 'endpoint', subscription.endpoint);
                this.db.insert('push_subscriptions', {
                    id: `sub_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
                    userId,
                    endpoint: subscription.endpoint,
                    keys: JSON.stringify(subscription.keys || {}),
                    createdAt: new Date().toISOString()
                });
            } catch (e) {
                console.log('[PUSH] DB subscription persist error:', e.message);
            }
        }

        return { success: true };
    }

    removeSubscription(userId, endpoint) {
        const subs = this.subscriptions.get(userId) || [];
        const idx = subs.findIndex(s => s.endpoint === endpoint);
        if (idx >= 0) subs.splice(idx, 1);

        // Remove from DB
        if (this.db) {
            try {
                this.db.deleteWhere('push_subscriptions', 'endpoint', endpoint);
            } catch (e) {
                console.log('[PUSH] DB subscription remove error:', e.message);
            }
        }

        return { success: true };
    }

    getVapidPublicKey() {
        return this.vapidKeys.publicKey;
    }

    // Send push notification
    async sendPush(userId, notification) {
        const subs = this.subscriptions.get(userId) || [];
        const result = { sent: 0, failed: 0, total: subs.length };

        for (const sub of subs) {
            try {
                const sent = await this._sendWebPush(sub, notification);
                if (sent) result.sent++;
                else result.failed++;
            } catch (e) {
                result.failed++;
                console.log(`[PUSH] Failed to send to ${userId}: ${e.message}`);
            }
        }

        // Also store for SSE
        this._storeNotification(userId, notification);

        // Try SSE
        this._sendSSE(userId, notification);

        return result;
    }

    async _sendWebPush(subscription, notification) {
        try {
            const webpush = require('web-push');
            if (this.vapidKeys.publicKey && this.vapidKeys.privateKey) {
                webpush.setVapidDetails(
                    'mailto:contact@flay.app',
                    this.vapidKeys.publicKey,
                    this.vapidKeys.privateKey
                );
                await webpush.sendNotification(subscription, JSON.stringify({
                    title: notification.title,
                    body: notification.body,
                    icon: notification.icon || '/logo-192.png',
                    badge: '/badge-72.png',
                    data: notification.data || {},
                    actions: notification.actions || []
                }));
                return true;
            }
        } catch (e) {
            // web-push not installed or config missing
        }
        return false;
    }

    _storeNotification(userId, notification) {
        if (!this.notifications.has(userId)) {
            this.notifications.set(userId, []);
        }
        const notifs = this.notifications.get(userId);
        const notif = {
            id: `notif_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
            ...notification,
            read: false,
            createdAt: new Date().toISOString()
        };
        notifs.unshift(notif);
        // Keep last 100
        if (notifs.length > 100) notifs.length = 100;

        // Persist to DB
        this._persistToDb(userId, notif);
    }

    // Server-Sent Events for real-time notifications
    addSSEClient(userId, res) {
        if (!this.sseClients.has(userId)) {
            this.sseClients.set(userId, []);
        }
        this.sseClients.get(userId).push(res);

        // Send initial connection event
        res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: Date.now() })}\n\n`);

        // Heartbeat
        const heartbeat = setInterval(() => {
            try { res.write(': heartbeat\n\n'); } catch (e) {
                clearInterval(heartbeat);
            }
        }, 30000);

        res.on('close', () => {
            clearInterval(heartbeat);
            const clients = this.sseClients.get(userId) || [];
            const idx = clients.indexOf(res);
            if (idx >= 0) clients.splice(idx, 1);
        });
    }

    _sendSSE(userId, notification) {
        const clients = this.sseClients.get(userId) || [];
        const data = JSON.stringify({
            type: 'notification',
            ...notification,
            timestamp: Date.now()
        });
        for (const client of clients) {
            try { client.write(`data: ${data}\n\n`); } catch (e) { /* client dead */ }
        }
    }

    getNotifications(userId, limit = 20) {
        const notifs = this.notifications.get(userId) || [];
        return notifs.slice(0, limit);
    }

    markAsRead(userId, notificationId) {
        const notifs = this.notifications.get(userId) || [];
        const notif = notifs.find(n => n.id === notificationId);
        if (notif) {
            notif.read = true;
            if (this.db) {
                try {
                    this.db.update('notifications', notificationId, { read: 1 });
                } catch (e) {
                    console.log('[PUSH] DB mark read error:', e.message);
                }
            }
        }
        return { success: true };
    }

    markAllAsRead(userId) {
        const notifs = this.notifications.get(userId) || [];
        notifs.forEach(n => n.read = true);
        if (this.db) {
            try {
                const all = this.db.findAll('notifications', 'userId', userId);
                for (const n of all) {
                    this.db.update('notifications', n.id, { read: 1 });
                }
            } catch (e) {
                console.log('[PUSH] DB mark all read error:', e.message);
            }
        }
        return { success: true };
    }

    getUnreadCount(userId) {
        const notifs = this.notifications.get(userId) || [];
        return notifs.filter(n => !n.read).length;
    }

    // Helper: Send common notifications
    async notifyReservation(userId, data) {
        return this.sendPush(userId, {
            title: 'Nouvelle reservation',
            body: `${data.clientName} reserve "${data.service}" le ${data.date}`,
            icon: '/logo-192.png',
            data: { type: 'reservation', id: data.reservationId },
            actions: [{ action: 'view', title: 'Voir' }, { action: 'confirm', title: 'Confirmer' }]
        });
    }

    async notifyPayment(userId, data) {
        return this.sendPush(userId, {
            title: 'Paiement recu',
            body: `${data.amount} ${data.currency} recu pour "${data.service}"`,
            icon: '/logo-192.png',
            data: { type: 'payment', id: data.paymentId }
        });
    }

    async notifyPlanExpiring(userId, data) {
        return this.sendPush(userId, {
            title: 'Plan expirant',
            body: `Votre plan ${data.plan} expire dans ${data.days} jours`,
            icon: '/logo-192.png',
            data: { type: 'plan_expiring' },
            actions: [{ action: 'renew', title: 'Renouveler' }]
        });
    }
}

module.exports = new PushNotifications();
