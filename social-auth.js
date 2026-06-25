/**
 * Flay Omni - Social Authentication
 * Google, Apple, Facebook OAuth (simulation pour dev)
 */

const crypto = require('crypto');

class SocialAuth {
    constructor() {
        this.providers = {
            google: {
                name: 'Google',
                color: '#4285f4',
                icon: 'google',
                authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
                tokenUrl: 'https://oauth2.googleapis.com/token',
                scope: 'email profile'
            },
            apple: {
                name: 'Apple',
                color: '#000000',
                icon: 'apple',
                authUrl: 'https://appleid.apple.com/auth/authorize',
                scope: 'name email'
            },
            facebook: {
                name: 'Facebook',
                color: '#1877f2',
                icon: 'facebook',
                authUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
                scope: 'email public_profile'
            }
        };
        this.linkedAccounts = new Map();
    }

    getProviders() {
        return Object.entries(this.providers).map(([id, p]) => ({
            id, name: p.name, color: p.color, icon: p.icon
        }));
    }

    getAuthUrl(provider, redirectUri, state) {
        const p = this.providers[provider];
        if (!p) return null;
        const params = new URLSearchParams({
            client_id: `${provider}_client_id`,
            redirect_uri: redirectUri,
            response_type: 'code',
            scope: p.scope,
            state: state || crypto.randomBytes(16).toString('hex')
        });
        return `${p.authUrl}?${params.toString()}`;
    }

    simulateCallback(userId, provider) {
        const fakeUser = {
            id: `${provider}_${Date.now()}`,
            provider,
            email: `user_${Date.now()}@${provider}.com`,
            name: `Utilisateur ${provider}`,
            avatar: `https://ui-avatars.com/api/?name=${provider}&background=random`
        };
        this.linkAccount(userId, fakeUser);
        return fakeUser;
    }

    linkAccount(userId, providerData) {
        if (!this.linkedAccounts.has(userId)) this.linkedAccounts.set(userId, []);
        const accounts = this.linkedAccounts.get(userId);
        const existing = accounts.find(a => a.provider === providerData.provider);
        if (existing) Object.assign(existing, providerData);
        else accounts.push(providerData);
        return true;
    }

    unlinkAccount(userId, provider) {
        const accounts = this.linkedAccounts.get(userId) || [];
        this.linkedAccounts.set(userId, accounts.filter(a => a.provider !== provider));
    }

    getLinkedAccounts(userId) {
        return this.linkedAccounts.get(userId) || [];
    }

    isLinked(userId, provider) {
        const accounts = this.linkedAccounts.get(userId) || [];
        return accounts.some(a => a.provider === provider);
    }
}

module.exports = new SocialAuth();
