const express = require('express');
const crypto = require('crypto');
const db = require('../db');
const analyticsEngine = require('../analytics-engine');
const router = express.Router();

router.post('/public/:slug', async (req, res) => {
    const slug = req.params.slug;
    const body = req.body;
    const profile = db.findBy('profiles', 'slug', slug);
    if (!profile) return res.status(404).json({ error: 'Profil non trouve' });
    if (!body.clientName || !body.date) return res.status(400).json({ error: 'Nom et date requis' });

    const id = `res_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const reservation = {
        id, userId: profile.userId,
        clientName: body.clientName, clientEmail: body.clientEmail || '',
        clientPhone: body.clientPhone || '', service: body.service || '',
        date: body.date, time: body.time || '', notes: body.notes || '',
        status: 'pending', createdAt: new Date().toISOString()
    };
    db.insert('reservations', reservation);
    if (typeof analyticsEngine.track === 'function') analyticsEngine.track(profile.userId, 'reservations');

    res.status(201).json({ reservation, message: 'Reservation envoyee avec succes' });
});

router.post('/', async (req, res) => {
    const body = req.body;
    if (!body.name || !body.phone || !body.service || !body.date || !body.time) {
        return res.status(400).json({ error: 'Champs requis manquants' });
    }
    const id = `res_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    let ownerId = null;
    if (body.profileId) {
        const profile = db.findBy('profiles', 'slug', body.profileId) || db.get('profiles', body.profileId);
        if (profile) ownerId = profile.userId;
    }
    const reservation = {
        id, userId: ownerId, name: body.name, phone: body.phone, email: body.email || '',
        service: body.service, date: body.date, time: body.time, message: body.message || '',
        status: 'pending', createdAt: new Date().toISOString()
    };
    db.insert('reservations', reservation);
    if (ownerId && typeof analyticsEngine.track === 'function') analyticsEngine.track(ownerId, 'reservations');
    res.status(201).json({ reservation, message: 'Reservation envoyee avec succes' });
});

router.get('/', (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Token manquant' });
    const authUtils = require('../auth-utils');
    const payload = authUtils.verifyToken(token);
    if (!payload) return res.status(401).json({ error: 'Token invalide' });
    const reservations = db.findAll('reservations', 'userId', payload.userId);
    res.json({ reservations });
});

router.put('/:id/status', async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Token manquant' });
    const authUtils = require('../auth-utils');
    const payload = authUtils.verifyToken(token);
    if (!payload) return res.status(401).json({ error: 'Token invalide' });
    const reservation = db.get('reservations', req.params.id);
    if (!reservation) return res.status(404).json({ error: 'Reservation non trouvee' });
    db.update('reservations', req.params.id, { status: req.body.status });
    res.json({ reservation: { ...reservation, status: req.body.status } });
});

router.delete('/:id', async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Token manquant' });
    const authUtils = require('../auth-utils');
    const payload = authUtils.verifyToken(token);
    if (!payload) return res.status(401).json({ error: 'Token invalide' });
    db.delete('reservations', req.params.id);
    res.json({ message: 'Reservation supprimee' });
});

module.exports = router;
