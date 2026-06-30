const express = require('express');
const { authenticate } = require('../lib/auth');
const chatEngine = require('../chat-engine');
const db = require('../db');
const router = express.Router();

router.get('/rooms', authenticate, (req, res) => {
    const rooms = chatEngine.getUserRooms(req.user.id);
    res.json({ rooms });
});

router.post('/rooms', authenticate, (req, res) => {
    const roomId = chatEngine.createRoom(req.user.id, req.body.visitorName || 'Visiteur');
    res.status(201).json({ roomId });
});

router.get('/rooms/:id/messages', authenticate, (req, res) => {
    const messages = chatEngine.getMessages(req.params.id);
    res.json({ messages });
});

router.post('/rooms/:id/messages', authenticate, (req, res) => {
    const msg = chatEngine.addMessage(req.params.id, req.user.name, 'owner', req.body.content);
    if (!msg) return res.status(404).json({ error: 'Room not found' });
    res.status(201).json({ message: msg });
});

// Public visitor chat endpoints (no auth required)
router.post('/public/:slug', async (req, res) => {
    const profile = db.findBy('profiles', 'slug', req.params.slug);
    if (!profile) return res.status(404).json({ error: 'Profil non trouve' });
    const roomId = chatEngine.createRoom(profile.userId, req.body.name || 'Visiteur');
    res.status(201).json({ roomId });
});

router.get('/public/:roomId/messages', (req, res) => {
    const messages = chatEngine.getMessages(req.params.roomId);
    res.json({ messages });
});

router.post('/public/:roomId/messages', (req, res) => {
    const msg = chatEngine.addMessage(req.params.roomId, req.body.name || 'Visiteur', 'visitor', req.body.content);
    if (!msg) return res.status(404).json({ error: 'Salon introuvable' });
    res.status(201).json({ message: msg });
});

module.exports = router;
