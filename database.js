/**
 * Flay Database - In-memory store
 */
const db = {
    users: new Map(),
    profiles: new Map(),
    payments: new Map(),
    reservations: new Map(),
    chatRooms: new Map(),
    apiKeys: new Map()
};

module.exports = db;
