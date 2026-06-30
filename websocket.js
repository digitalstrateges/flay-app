/**
 * Flay v22.0 - WebSocket Server
 * Real-time chat, notifications, live updates
 */

const crypto = require('crypto');

class WebSocketServer {
    constructor() {
        this.clients = new Map(); // userId -> Set of connections
        this.rooms = new Map();   // roomId -> Set of userIds
        this.typing = new Map();  // roomId -> Set of userIds typing
    }

    handleUpgrade(server) {
        // Use Server-Sent Events as WebSocket alternative (zero-dep)
        server.on('request', (req, res) => {
            if (req.url?.startsWith('/ws') && req.method === 'GET') {
                const url = new URL(req.url, 'http://localhost');
                const token = url.searchParams.get('token');
                const roomId = url.searchParams.get('room') || 'general';

                if (!token) {
                    res.writeHead(401);
                    res.end('Token manquant');
                    return;
                }

                // Verify token
                const authUtils = require('./auth-utils');
                const payload = authUtils.verifyToken(token);
                if (!payload) {
                    res.writeHead(401);
                    res.end('Token invalide');
                    return;
                }

                const userId = payload.userId;

                // SSE Headers
                res.writeHead(200, {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive',
                    'X-Accel-Buffering': 'no'
                });

                res.write(`data: ${JSON.stringify({ type: 'connected', userId, room: roomId })}\n\n`);

                // Register client
                if (!this.clients.has(userId)) this.clients.set(userId, new Set());
                this.clients.get(userId).add(res);

                // Join room
                if (!this.rooms.has(roomId)) this.rooms.set(roomId, new Set());
                this.rooms.get(roomId).add(userId);

                // Broadcast user joined
                this.broadcast(roomId, {
                    type: 'user_joined',
                    userId,
                    users: Array.from(this.rooms.get(roomId))
                }, userId);

                // Send room info
                this.send(res, {
                    type: 'room_info',
                    room: roomId,
                    users: Array.from(this.rooms.get(roomId)),
                    messageCount: 0
                });

                // Handle disconnect
                req.on('close', () => {
                    this.clients.get(userId)?.delete(res);
                    if (this.clients.get(userId)?.size === 0) this.clients.delete(userId);
                    this.rooms.get(roomId)?.delete(userId);
                    if (this.rooms.get(roomId)?.size === 0) this.rooms.delete(roomId);

                    this.broadcast(roomId, {
                        type: 'user_left',
                        userId,
                        users: Array.from(this.rooms.get(roomId) || [])
                    });
                });
            }
        });
    }

    send(res, data) {
        try {
            res.write(`data: ${JSON.stringify(data)}\n\n`);
        } catch (e) { }
    }

    sendToUser(userId, data) {
        const clients = this.clients.get(userId);
        if (clients) {
            for (const client of clients) {
                this.send(client, data);
            }
        }
    }

    broadcast(roomId, data, excludeUserId = null) {
        const users = this.rooms.get(roomId);
        if (!users) return;

        for (const userId of users) {
            if (userId !== excludeUserId) {
                this.sendToUser(userId, data);
            }
        }
    }

    broadcastAll(data) {
        for (const [, clients] of this.clients) {
            for (const client of clients) {
                this.send(client, data);
            }
        }
    }

    // Chat message
    sendMessage(roomId, userId, message, userName) {
        const msg = {
            type: 'message',
            id: `msg_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
            room: roomId,
            userId,
            userName,
            content: message,
            timestamp: new Date().toISOString()
        };

        this.broadcast(roomId, msg);
        return msg;
    }

    // Typing indicator
    setTyping(roomId, userId, isTyping) {
        if (!this.typing.has(roomId)) this.typing.set(roomId, new Set());

        if (isTyping) {
            this.typing.get(roomId).add(userId);
        } else {
            this.typing.get(roomId).delete(userId);
        }

        this.broadcast(roomId, {
            type: 'typing',
            userId,
            isTyping,
            users: Array.from(this.typing.get(roomId))
        }, userId);
    }

    // Notification push
    notify(userId, notification) {
        this.sendToUser(userId, {
            type: 'notification',
            ...notification
        });
    }

    // Live update
    liveUpdate(userId, event) {
        this.sendToUser(userId, {
            type: 'live_update',
            ...event
        });
    }

    // Stats
    getStats() {
        return {
            totalClients: this.clients.size,
            totalConnections: Array.from(this.clients.values()).reduce((sum, set) => sum + set.size, 0),
            rooms: Array.from(this.rooms.entries()).map(([id, users]) => ({
                id,
                users: users.size
            }))
        };
    }
}

module.exports = new WebSocketServer();
