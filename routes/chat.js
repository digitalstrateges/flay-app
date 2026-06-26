const express = require('express');
const { authenticate } = require('../lib/auth');
const chatEngine = require('../chat-engine');
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

module.exports = router;
