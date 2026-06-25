const express = require('express');
const Reservation = require('../models/Reservation');
const Profile = require('../models/Profile');
const User = require('../models/User');
const { auth, rateLimit } = require('../middleware/auth');
const config = require('../config');

const router = express.Router();

// POST /api/reservation/public/:slug
router.post('/public/:slug', rateLimit(config.RATE_LIMITS.reservation.window, config.RATE_LIMITS.reservation.max), (req, res) => {
    try {
        const profile = Profile.findBySlug(req.params.slug);
        if (!profile) return res.status(404).json({ message: 'Profil non trouve.' });

        // Check if booking is enabled
        if (!profile.settings?.enableBooking) {
            return res.status(403).json({ message: 'Les reservations sont desactivees pour ce profil.' });
        }

        // Check plan for reservations
        const owner = User.findById(profile.userId);
        if (owner && owner.plan === 'free' && !User.isPlanActive(owner.id)) {
            return res.status(403).json({ message: 'Reservations disponibles avec le plan Pro.', upgrade: true });
        }

        const { clientName, clientEmail, clientPhone, service, date, time, message } = req.body;

        // Validation
        const errors = [];
        if (!clientName || clientName.trim().length < 2) errors.push('Nom requis (2 caracteres min)');
        if (!clientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail)) errors.push('Email invalide');
        if (!date) errors.push('Date requise');
        if (!time) errors.push('Heure requise');

        if (date) {
            const reservationDate = new Date(date);
            if (reservationDate < new Date().setHours(0, 0, 0, 0)) {
                errors.push('La date doit etre dans le futur');
            }
        }

        if (errors.length > 0) {
            return res.status(400).json({ message: 'Erreurs de validation', errors });
        }

        const reservation = Reservation.create({
            profileId: profile.id,
            clientName: clientName.trim(),
            clientEmail: clientEmail.trim().toLowerCase(),
            clientPhone: clientPhone || '',
            service: service || '',
            date,
            time,
            message: message || ''
        });

        // Record reservation in profile analytics
        Profile.recordReservation(profile.slug);

        // Get owner info for notification
        const ownerName = owner ? owner.name : '';

        res.status(201).json({
            reservation,
            message: 'Reservation envoyee avec succes !',
            ownerName,
            profileTitle: profile.title
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET /api/reservation/my
router.get('/my', auth, (req, res) => {
    try {
        const profiles = Profile.getAllByUserId(req.user.id);
        let all = [];
        for (const p of profiles) {
            const resList = Reservation.findByProfileId(p.id).map(r => ({
                ...r,
                profileSlug: p.slug,
                profileTitle: p.title
            }));
            all = all.concat(resList);
        }
        all.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        // Stats
        const stats = {
            total: all.length,
            pending: all.filter(r => r.status === 'pending').length,
            confirmed: all.filter(r => r.status === 'confirmed').length,
            cancelled: all.filter(r => r.status === 'cancelled').length
        };

        res.json({ reservations: all, stats });
    } catch (error) {
        res.status(500).json({ message: 'Erreur serveur.' });
    }
});

// PUT /api/reservation/:id/status
router.put('/:id/status', auth, (req, res) => {
    try {
        const { status } = req.body;
        if (!['pending', 'confirmed', 'cancelled'].includes(status)) {
            return res.status(400).json({ message: 'Statut invalide. Valeurs: pending, confirmed, cancelled' });
        }

        const reservation = Reservation.findById(req.params.id);
        if (!reservation) return res.status(404).json({ message: 'Reservation non trouvee.' });

        const profile = Profile.findByUserId(req.user.id);
        if (!profile || profile.id !== reservation.profileId) {
            return res.status(403).json({ message: 'Acces refuse.' });
        }

        const updated = Reservation.updateStatus(req.params.id, status);
        res.json({ reservation: updated });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// DELETE /api/reservation/:id
router.delete('/:id', auth, (req, res) => {
    try {
        const reservation = Reservation.findById(req.params.id);
        if (!reservation) return res.status(404).json({ message: 'Reservation non trouvee.' });

        const profile = Profile.findByUserId(req.user.id);
        if (!profile || profile.id !== reservation.profileId) {
            return res.status(403).json({ message: 'Acces refuse.' });
        }

        Reservation.delete(req.params.id);
        res.json({ message: 'Reservation supprimee.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
