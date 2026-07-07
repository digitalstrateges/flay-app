/**
 * Flay Webhooks System
 * Notifications automatiques vers des services externes
 */

const crypto = require('crypto');

class WebhookManager {
    constructor() {
        this.webhooks = new Map();
        this.logs = new Map();
    }

    register(userId, url, events = ['*'], secret = null) {
        const webhookId = `wh_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        this.webhooks.set(webhookId, {
            id: webhookId,
            userId,
            url,
            events,
            secret: secret || crypto.randomBytes(32).toString('hex'),
            active: true,
            createdAt: new Date().toISOString()
        });
        return webhookId;
    }

    unregister(webhookId) {
        this.webhooks.delete(webhookId);
    }

    async trigger(event, data, userId = null) {
        const triggered = [];
        for (const [id, wh] of this.webhooks) {
            if (!wh.active) continue;
            if (userId && wh.userId !== userId) continue;
            if (!wh.events.includes('*') && !wh.events.includes(event)) continue;

            const payload = {
                event,
                data,
                timestamp: new Date().toISOString(),
                webhookId: id
            };

            const signature = crypto.createHmac('sha256', wh.secret).update(JSON.stringify(payload)).digest('hex');

            try {
                // In production, use fetch() - simulated here
                this.logs.set(`${id}_${Date.now()}`, {
                    webhookId: id,
                    event,
                    status: 'sent',
                    timestamp: new Date().toISOString()
                });
                triggered.push(id);
            } catch (err) {
                this.logs.set(`${id}_${Date.now()}`, {
                    webhookId: id,
                    event,
                    status: 'failed',
                    error: err.message,
                    timestamp: new Date().toISOString()
                });
            }
        }
        return triggered;
    }

    getWebhooks(userId) {
        const list = [];
        for (const [id, wh] of this.webhooks) {
            if (wh.userId === userId) list.push(wh);
        }
        return list;
    }

    getLogs(webhookId, limit = 20) {
        const logs = [];
        for (const [key, log] of this.logs) {
            if (log.webhookId === webhookId) logs.push(log);
        }
        return logs.slice(-limit);
    }
}

module.exports = new WebhookManager();
