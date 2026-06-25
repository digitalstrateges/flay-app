const fs = require('fs');
const path = require('path');
const { genId } = require('../auth-utils');

const DB_PATH = path.join(__dirname, '..', 'data', 'reservations.json');

function readDB() {
    if (!fs.existsSync(DB_PATH)) return [];
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}

function writeDB(data) {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
}

class Reservation {
    static findByProfileId(profileId) {
        return readDB().filter(r => r.profileId === profileId);
    }
    static findById(id) {
        return readDB().find(r => r.id === id);
    }
    static create(data) {
        const reservations = readDB();
        const reservation = {
            id: genId(),
            profileId: data.profileId,
            clientName: data.clientName,
            clientEmail: data.clientEmail,
            clientPhone: data.clientPhone || '',
            service: data.service || '',
            date: data.date,
            time: data.time,
            message: data.message || '',
            status: 'pending',
            createdAt: new Date().toISOString()
        };
        reservations.push(reservation);
        writeDB(reservations);
        return reservation;
    }
    static updateStatus(id, status) {
        const reservations = readDB();
        const idx = reservations.findIndex(r => r.id === id);
        if (idx === -1) return null;
        reservations[idx].status = status;
        reservations[idx].updatedAt = new Date().toISOString();
        writeDB(reservations);
        return reservations[idx];
    }
    static delete(id) {
        const reservations = readDB();
        const filtered = reservations.filter(r => r.id !== id);
        if (filtered.length === reservations.length) return false;
        writeDB(filtered);
        return true;
    }
    static getStats(profileId) {
        const reservations = readDB().filter(r => r.profileId === profileId);
        return {
            total: reservations.length,
            pending: reservations.filter(r => r.status === 'pending').length,
            confirmed: reservations.filter(r => r.status === 'confirmed').length,
            cancelled: reservations.filter(r => r.status === 'cancelled').length
        };
    }
    static getByDateRange(profileId, startDate, endDate) {
        return readDB().filter(r =>
            r.profileId === profileId &&
            new Date(r.createdAt) >= new Date(startDate) &&
            new Date(r.createdAt) <= new Date(endDate)
        );
    }
}

module.exports = Reservation;
