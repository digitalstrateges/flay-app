/**
 * Flay Omni - Push Notification Routes
 * VAPID subscription + SSE real-time
 */

const express = require('express');
const router = express.Router();
const push = require('../push-notifications');
const { authenticate } = require('../lib/auth');

// Get VAPID public key
router.get('/vapid-public-key', (req, res) => {
    res.json({ publicKey: push.getVapidPublicKey() });
});

// Register push subscription
router.post('/subscribe', authenticate, (req, res) => {
    try {
        const result = push.registerSubscription(req.user.id, req.body.subscription);
        res.json(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Remove push subscription
router.post('/unsubscribe', authenticate, (req, res) => {
    try {
        const result = push.removeSubscription(req.user.id, req.body.endpoint);
        res.json(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// SSE endpoint for real-time notifications
router.get('/stream/:userId', authenticate, (req, res) => {
    if (req.params.userId !== req.user.id) {
        return res.status(403).json({ error: 'Acces refuse' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    push.addSSEClient(req.user.id, res);

    req.on('close', () => {
        // Client disconnected
    });
});

// Get notifications
router.get('/', authenticate, (req, res) => {
    try {
        const notifications = push.getNotifications(req.user.id, parseInt(req.query.limit) || 20);
        const unread = push.getUnreadCount(req.user.id);
        res.json({ notifications, unread });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Mark as read
router.put('/:notifId/read', authenticate, (req, res) => {
    try {
        const result = push.markAsRead(req.user.id, req.params.notifId);
        res.json(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Mark all as read
router.put('/read-all', authenticate, (req, res) => {
    try {
        const result = push.markAllAsRead(req.user.id);
        res.json(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Get unread count
router.get('/unread-count', authenticate, (req, res) => {
    try {
        const count = push.getUnreadCount(req.user.id);
        res.json({ count });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
