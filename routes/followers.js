const express = require('express');
const crypto = require('crypto');
const authUtils = require('../auth-utils');
const db = require('../db');
const router = express.Router();

function auth(req, res, next) {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) return res.status(401).json({ error: 'Token manquant' });
        const payload = authUtils.verifyToken(token);
        if (!payload) return res.status(401).json({ error: 'Token invalide' });
        req.user = payload;
        next();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

router.post('/follow', auth, (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) return res.status(400).json({ error: 'userId requis' });
        if (userId === req.user.userId) return res.status(400).json({ error: 'Vous ne pouvez pas vous suivre vous-meme' });

        const allFollowers = db.getAll('followers', { userId }) || [];
        const alreadyFollowing = allFollowers.some(f => f.followerId === req.user.userId);
        if (alreadyFollowing) {
            return res.status(400).json({ error: 'Vous suivez deja cet utilisateur' });
        }

        db.insert('followers', {
            id: `follow_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
            userId: userId,
            followerId: req.user.userId,
            createdAt: new Date().toISOString()
        });

        res.json({ success: true, message: 'Abonnement reussi' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/unfollow', auth, (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) return res.status(400).json({ error: 'userId requis' });

        const allFollowers = db.getAll('followers', { userId }) || [];
        const myFollow = allFollowers.find(f => f.followerId === req.user.userId);
        if (myFollow) {
            db.delete('followers', myFollow.id);
        }

        res.json({ success: true, message: 'Desabonnement reussi' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/:userId', (req, res) => {
    try {
        const { userId } = req.params;
        const followers = db.getAll('followers', { userId }) || [];
        const sorted = followers.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        const count = sorted.length;

        const token = req.headers.authorization?.replace('Bearer ', '');
        let payload = null;
        if (token) {
            try { payload = authUtils.verifyToken(token); } catch(e) {}
        }

        let list = [];
        if (payload && payload.userId) {
            list = sorted.map(f => ({ id: f.id, followerId: f.followerId, createdAt: f.createdAt }));
        }

        res.json({ count, followers: list });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/:userId/following', (req, res) => {
    try {
        const { userId } = req.params;
        const following = db.getAll('followers', { followerId: userId }) || [];
        const sorted = following.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        const count = sorted.length;

        const token = req.headers.authorization?.replace('Bearer ', '');
        let payload = null;
        if (token) {
            try { payload = authUtils.verifyToken(token); } catch(e) {}
        }

        let list = [];
        if (payload && payload.userId) {
            list = sorted.map(f => ({ id: f.id, userId: f.userId, createdAt: f.createdAt }));
        }

        res.json({ count, following: list });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/:userId/check', auth, (req, res) => {
    try {
        const { userId } = req.params;
        const allFollowers = db.getAll('followers', { userId }) || [];
        const following = allFollowers.some(f => f.followerId === req.user.userId);
        res.json({ following });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
