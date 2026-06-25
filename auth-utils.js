const crypto = require('crypto');

function genId() {
    return crypto.randomUUID();
}

function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return { hash: salt + ':' + hash, salt };
}

function verifyPassword(password, storedHash, salt) {
    let hash, s;
    if (salt) {
        s = salt;
        hash = storedHash;
    } else {
        [s, hash] = storedHash.split(':');
    }
    const verify = crypto.pbkdf2Sync(password, s, 10000, 64, 'sha512').toString('hex');
    return hash === verify;
}

function signToken(payload, secret, expiresIn) {
    const config = require('./config');
    const now = Math.floor(Date.now() / 1000);
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(JSON.stringify({
        ...payload,
        iat: now,
        exp: now + (expiresIn || 3600)
    })).toString('base64url');
    const signature = crypto.createHmac('sha256', secret || config.JWT_SECRET).update(header + '.' + body).digest('base64url');
    return header + '.' + body + '.' + signature;
}

function verifyToken(token, secret) {
    try {
        const config = require('./config');
        const [header, body, signature] = token.split('.');
        const expected = crypto.createHmac('sha256', secret || config.JWT_SECRET).update(header + '.' + body).digest('base64url');
        if (signature !== expected) return null;
        const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
        if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
        return payload;
    } catch {
        return null;
    }
}

function generateTokens(userId) {
    const accessToken = signToken({ userId }, undefined, 3600);
    const refreshToken = signToken({ userId, type: 'refresh' }, undefined, 30 * 24 * 3600);
    return { accessToken, refreshToken, expiresIn: 3600 };
}

function generateToken(payload, expiresIn = '1h') {
    const exp = expiresIn.includes('h') ? parseInt(expiresIn) * 3600 : parseInt(expiresIn) * 86400;
    return signToken(payload, undefined, exp);
}

function generateQRCode(text) {
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(text)}`;
}

function generateShareLink(username, baseUrl) {
    return `${baseUrl}/p/${username}`;
}

function generateInvoiceId() {
    return `FLY-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

function slugify(text) {
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
}

function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function sanitizeHtml(str) {
    return str.replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' })[c]);
}

module.exports = {
    genId, hashPassword, verifyPassword,
    signToken, verifyToken, generateTokens, generateToken,
    generateQRCode, generateShareLink, generateInvoiceId,
    slugify, validateEmail, sanitizeHtml
};
