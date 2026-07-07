/**
 * Flay Omni - Notifications System
 * Push, Email, SMS, In-App
 */

const crypto = require('crypto');

class NotificationManager {
    constructor() {
        this.notifications = new Map();
        this.preferences = new Map();
        this.sseClients = new Map();
    }

    // === NOTIFICATIONS IN-APP ===
    create(userId, data) {
        const id = `notif_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        const notif = {
            id, userId,
            type: data.type || 'info',
            title: data.title || '',
            message: data.message || '',
            icon: data.icon || 'bell',
            actionUrl: data.actionUrl || null,
            actionLabel: data.actionLabel || null,
            read: false,
            createdAt: new Date().toISOString()
        };
        if (!this.notifications.has(userId)) this.notifications.set(userId, []);
        this.notifications.get(userId).push(notif);
        this.pushSSE(userId, notif);
        return notif;
    }

    getUserNotifications(userId, limit = 50) {
        const notifs = this.notifications.get(userId) || [];
        return notifs.slice(-limit).reverse();
    }

    getUnreadCount(userId) {
        const notifs = this.notifications.get(userId) || [];
        return notifs.filter(n => !n.read).length;
    }

    markRead(userId, notifId) {
        const notifs = this.notifications.get(userId) || [];
        const notif = notifs.find(n => n.id === notifId);
        if (notif) notif.read = true;
    }

    markAllRead(userId) {
        const notifs = this.notifications.get(userId) || [];
        notifs.forEach(n => n.read = true);
    }

    delete(userId, notifId) {
        const notifs = this.notifications.get(userId) || [];
        this.notifications.set(userId, notifs.filter(n => n.id !== notifId));
    }

    // === PREFERENCES ===
    setPreferences(userId, prefs) {
        this.preferences.set(userId, {
            email: prefs.email !== false,
            sms: prefs.sms || false,
            push: prefs.push !== false,
            reservation: prefs.reservation !== false,
            payment: prefs.payment !== false,
            renewal: prefs.renewal !== false,
            marketing: prefs.marketing || false
        });
    }

    getPreferences(userId) {
        return this.preferences.get(userId) || {
            email: true, sms: false, push: true,
            reservation: true, payment: true, renewal: true, marketing: false
        };
    }

    // === SSE PUSH ===
    registerSSE(userId, res) {
        this.sseClients.set(userId, res);
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*'
        });
        res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);
        res.on('close', () => this.sseClients.delete(userId));
    }

    pushSSE(userId, data) {
        const client = this.sseClients.get(userId);
        if (client) {
            try { client.write(`data: ${JSON.stringify(data)}\n\n`); } catch {}
        }
    }

    // === NOTIFICATIONS PREDEFINIES ===
    reservationReceived(userId, clientName, service) {
        return this.create(userId, {
            type: 'reservation',
            title: 'Nouvelle reservation',
            message: `${clientName} a reserve "${service}"`,
            icon: 'calendar',
            actionUrl: '/dashboard.html',
            actionLabel: 'Voir'
        });
    }

    paymentConfirmed(userId, amount, plan) {
        return this.create(userId, {
            type: 'payment',
            title: 'Paiement confirme',
            message: `Plan ${plan} active - ${amount.toLocaleString()} FCFA recus`,
            icon: 'creditCard',
            actionUrl: '/dashboard.html',
            actionLabel: 'Voir'
        });
    }

    planExpiring(userId, plan, daysLeft) {
        return this.create(userId, {
            type: 'warning',
            title: 'Plan expirant bientot',
            message: `Votre plan ${plan} expire dans ${daysLeft} jours`,
            icon: 'clock',
            actionUrl: '/payment.html',
            actionLabel: 'Renouveler'
        });
    }

    newMessage(userId, from) {
        return this.create(userId, {
            type: 'info',
            title: 'Nouveau message',
            message: `${from} vous a envoye un message`,
            icon: 'mail',
            actionUrl: '/chat.html',
            actionLabel: 'Repondre'
        });
    }
}

module.exports = new NotificationManager();
