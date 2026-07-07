/**
 * Flay Omni - Two-Factor Authentication (2FA)
 * TOTP-based 2FA avec backup codes
 */

const crypto = require('crypto');

class TwoFactorAuth {
    constructor() {
        this.secrets = new Map();
        this.backupCodes = new Map();
    }

    generateSecret(userId) {
        const secret = crypto.randomBytes(20).toString('base64');
        this.secrets.set(userId, {
            secret,
            enabled: false,
            createdAt: new Date().toISOString()
        });
        return {
            secret,
            otpauthUrl: `otpauth://totp/Flay:${userId}?secret=${secret}&issuer=Flay&algorithm=SHA1&digits=6&period=30`
        };
    }

    verify(userId, token) {
        const entry = this.secrets.get(userId);
        if (!entry || !entry.enabled) return false;
        const time = Math.floor(Date.now() / 30000);
        for (let i = -1; i <= 1; i++) {
            const hmac = crypto.createHmac('sha1', Buffer.from(entry.secret, 'base64'));
            const counter = Buffer.alloc(8);
            counter.writeUInt32BE(0, 0);
            counter.writeUInt32BE(time + i, 4);
            hmac.update(counter);
            const hash = hmac.digest();
            const offset = hash[hash.length - 1] & 0x0f;
            const code = ((hash[offset] & 0x7f) << 24 | (hash[offset + 1] & 0xff) << 16 | (hash[offset + 2] & 0xff) << 8 | (hash[offset + 3] & 0xff)) % 1000000;
            if (String(code).padStart(6, '0') === token) return true;
        }
        return false;
    }

    enable(userId, token) {
        if (!this.verify(userId, token)) return false;
        const entry = this.secrets.get(userId);
        if (entry) {
            entry.enabled = true;
            const backup = this.generateBackupCodes(userId);
            return { enabled: true, backupCodes: backup };
        }
        return false;
    }

    disable(userId) {
        this.secrets.delete(userId);
        this.backupCodes.delete(userId);
        return true;
    }

    isEnabled(userId) {
        const entry = this.secrets.get(userId);
        return entry?.enabled || false;
    }

    generateBackupCodes(userId) {
        const codes = Array(10).fill(null).map(() => crypto.randomBytes(4).toString('hex').toUpperCase());
        this.backupCodes.set(userId, codes.map(c => ({ code: c, used: false })));
        return codes;
    }

    verifyBackupCode(userId, code) {
        const codes = this.backupCodes.get(userId) || [];
        const entry = codes.find(c => c.code === code && !c.used);
        if (entry) {
            entry.used = true;
            return true;
        }
        return false;
    }

    getQRCodeDataURL(secret, email) {
        const otpauth = `otpauth://totp/Flay:${email}?secret=${secret}&issuer=Flay`;
        return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauth)}`;
    }
}

module.exports = new TwoFactorAuth();
