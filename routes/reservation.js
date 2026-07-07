const express = require('express');
const crypto = require('crypto');
const db = require('../db');
const analyticsEngine = require('../analytics-engine');
const router = express.Router();

const RESERVATION_TYPES = {
  service: 'Prestation de service',
  business_meeting: 'Rendez-vous d\'affaires',
  maintenance: 'Entretien / Maintenance',
  visit: 'Visite / Inspection'
};

const VALID_TYPES = Object.keys(RESERVATION_TYPES);

function auth(req) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return null;
  const authUtils = require('../auth-utils');
  return authUtils.verifyToken(token);
}

router.get('/types', (req, res) => {
  res.json({ types: RESERVATION_TYPES });
});

router.post('/public/:slug', async (req, res) => {
  const slug = req.params.slug;
  const body = req.body;
  const profile = db.findBy('profiles', 'slug', slug);
  if (!profile) return res.status(404).json({ error: 'Profil non trouve' });
  if (!body.clientName || !body.date) return res.status(400).json({ error: 'Nom et date requis' });

  const type = body.type || 'service';
  if (!VALID_TYPES.includes(type)) return res.status(400).json({ error: 'Type de reservation invalide', validTypes: VALID_TYPES });

  const id = `res_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const reservation = {
    id,
    userId: profile.userId,
    profileId: profile.id,
    clientName: body.clientName,
    clientEmail: body.clientEmail || '',
    clientPhone: body.clientPhone || '',
    service: body.service || '',
    type,
    date: body.date,
    time: body.time || '',
    duration: body.duration || '60',
    notes: body.notes || '',
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  db.insert('reservations', reservation);
  if (typeof analyticsEngine.track === 'function') analyticsEngine.track(profile.userId, 'reservations');

  res.status(201).json({ reservation, message: 'Reservation envoyee avec succes' });
});

router.get('/available/:slug', (req, res) => {
  const slug = req.params.slug;
  const profile = db.findBy('profiles', 'slug', slug);
  if (!profile) return res.status(404).json({ error: 'Profil non trouve' });
  const date = req.query.date;
  if (!date) return res.status(400).json({ error: 'Date requise (YYYY-MM-DD)' });

  const dayReservations = db.findAll('reservations', 'userId', profile.userId)
    .filter(r => r.date === date && r.status !== 'cancelled');

  const bookedSlots = dayReservations.map(r => r.time).filter(Boolean);

  const allSlots = [];
  for (let h = 8; h <= 18; h++) {
    for (let m = 0; m < 60; m += 30) {
      const slot = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      allSlots.push(slot);
    }
  }

  res.json({
    date,
    bookedSlots,
    availableSlots: allSlots.filter(s => !bookedSlots.includes(s)),
    allSlots
  });
});

router.post('/', async (req, res) => {
  const body = req.body;
  if (!body.name || !body.phone || !body.date || !body.time) {
    return res.status(400).json({ error: 'Champs requis manquants' });
  }

  const payload = auth(req);
  let userId = payload?.userId || null;

  if (userId) {
    const premiumFeatures = require('../premium-features');
    const userReservations = db.findAll('reservations', 'userId', userId) || [];
    const check = premiumFeatures.checkLimit(userId, 'reservations', userReservations.length);
    if (!check.allowed) return res.status(403).json({ error: check.reason, code: 'PLAN_LIMIT', limit: check.limit, current: check.current });
  }

  const type = body.type || 'service';
  if (!VALID_TYPES.includes(type)) return res.status(400).json({ error: 'Type de reservation invalide', validTypes: VALID_TYPES });

  const id = `res_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  let ownerId = null;
  if (body.profileId) {
    const profile = db.findBy('profiles', 'slug', body.profileId) || db.get('profiles', body.profileId);
    if (profile) ownerId = profile.userId;
  }

  const reservation = {
    id,
    userId: ownerId,
    name: body.name,
    phone: body.phone,
    email: body.email || '',
    service: body.service || '',
    type,
    date: body.date,
    time: body.time,
    duration: body.duration || '60',
    message: body.message || '',
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  db.insert('reservations', reservation);
  if (ownerId && typeof analyticsEngine.track === 'function') analyticsEngine.track(ownerId, 'reservations');
  res.status(201).json({ reservation, message: 'Reservation envoyee avec succes' });
});

router.get('/', (req, res) => {
  const payload = auth(req);
  if (!payload) return res.status(401).json({ error: 'Token manquant' });
  const type = req.query.type;
  let reservations = db.findAll('reservations', 'userId', payload.userId);
  if (type && VALID_TYPES.includes(type)) {
    reservations = reservations.filter(r => r.type === type);
  }
  const status = req.query.status;
  if (status) {
    reservations = reservations.filter(r => r.status === status);
  }
  reservations.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ reservations, total: reservations.length });
});

router.get('/stats', (req, res) => {
  const payload = auth(req);
  if (!payload) return res.status(401).json({ error: 'Token manquant' });
  const reservations = db.findAll('reservations', 'userId', payload.userId) || [];
  const stats = {
    total: reservations.length,
    pending: reservations.filter(r => r.status === 'pending').length,
    confirmed: reservations.filter(r => r.status === 'confirmed').length,
    completed: reservations.filter(r => r.status === 'completed').length,
    cancelled: reservations.filter(r => r.status === 'cancelled').length,
    byType: {}
  };
  for (const type of VALID_TYPES) {
    stats.byType[type] = reservations.filter(r => r.type === type).length;
  }
  res.json({ stats });
});

router.put('/:id/status', async (req, res) => {
  const payload = auth(req);
  if (!payload) return res.status(401).json({ error: 'Token manquant' });
  const reservation = db.get('reservations', req.params.id);
  if (!reservation) return res.status(404).json({ error: 'Reservation non trouvee' });
  if (reservation.userId !== payload.userId) return res.status(403).json({ error: 'Non autorise' });
  const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
  if (!validStatuses.includes(req.body.status)) return res.status(400).json({ error: 'Statut invalide' });
  db.update('reservations', req.params.id, { status: req.body.status });
  res.json({ reservation: { ...reservation, status: req.body.status } });
});

router.delete('/:id', async (req, res) => {
  const payload = auth(req);
  if (!payload) return res.status(401).json({ error: 'Token manquant' });
  const reservation = db.get('reservations', req.params.id);
  if (!reservation) return res.status(404).json({ error: 'Reservation non trouvee' });
  if (reservation.userId !== payload.userId) return res.status(403).json({ error: 'Non autorise' });
  db.delete('reservations', req.params.id);
  res.json({ message: 'Reservation supprimee' });
});

module.exports = router;
