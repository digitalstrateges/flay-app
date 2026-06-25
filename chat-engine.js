/**
 * Flay Real-time Chat Engine
 * Chat en temps reel entre proprietaires et visiteurs
 */

const crypto = require('crypto');

class ChatEngine {
    constructor() {
        this.rooms = new Map();
        this.users = new Map();
        this.messages = new Map();
        this.typing = new Map();
    }

    createRoom(userId, visitorName = 'Visiteur') {
        const roomId = `chat_${userId}_${Date.now()}`;
        this.rooms.set(roomId, {
            id: roomId,
            ownerId: userId,
            visitor: { name: visitorName, connected: false },
            messages: [],
            createdAt: new Date().toISOString()
        });
        return roomId;
    }

    joinRoom(roomId, role, name) {
        if (!this.rooms.has(roomId)) return null;
        const room = this.rooms.get(roomId);
        if (role === 'owner') room.ownerConnected = true;
        else room.visitor.connected = true;
        return room;
    }

    addMessage(roomId, sender, role, content) {
        if (!this.rooms.has(roomId)) return null;
        const msg = {
            id: `msg_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
            roomId,
            sender,
            role,
            content,
            timestamp: new Date().toISOString(),
            read: false
        };
        this.rooms.get(roomId).messages.push(msg);
        return msg;
    }

    getMessages(roomId, limit = 50) {
        if (!this.rooms.has(roomId)) return [];
        return this.rooms.get(roomId).messages.slice(-limit);
    }

    getUserRooms(userId) {
        const rooms = [];
        for (const [id, room] of this.rooms) {
            if (room.ownerId === userId) rooms.push(room);
        }
        return rooms;
    }

    markRead(roomId, role) {
        if (!this.rooms.has(roomId)) return;
        const room = this.rooms.get(roomId);
        room.messages.forEach(m => {
            if (m.role !== role) m.read = true;
        });
    }

    setTyping(roomId, name, isTyping) {
        if (isTyping) this.typing.set(roomId, name);
        else this.typing.delete(roomId);
    }

    getTyping(roomId) {
        return this.typing.get(roomId) || null;
    }

    closeRoom(roomId) {
        this.rooms.delete(roomId);
    }
}

module.exports = new ChatEngine();
