/**
 * Flay Omni - Domain Management
 * Domaines personnalises, white-label
 */

const crypto = require('crypto');

class DomainManager {
    constructor() {
        this.domains = new Map();
        this.redirects = new Map();
    }

    addDomain(userId, data) {
        const id = `dom_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        const domain = {
            id, userId,
            domain: data.domain || '',
            subdomain: data.subdomain || '',
            type: data.type || 'subdomain',
            verified: false,
            ssl: false,
            redirect: data.redirect || '',
            createdAt: new Date().toISOString()
        };
        this.domains.set(id, domain);
        return domain;
    }

    verifyDomain(domainId) {
        const domain = this.domains.get(domainId);
        if (!domain) return null;
        domain.verified = true;
        domain.ssl = true;
        return domain;
    }

    removeDomain(domainId) {
        this.domains.delete(domainId);
    }

    getUserDomains(userId) {
        const domains = [];
        for (const [, d] of this.domains) {
            if (d.userId === userId) domains.push(d);
        }
        return domains;
    }

    getDomain(domainId) {
        return this.domains.get(domainId) || null;
    }

    getDomainByHost(host) {
        for (const [, d] of this.domains) {
            if (d.domain === host || d.subdomain + '.flay.app' === host) return d;
        }
        return null;
    }

    addRedirect(domainId, from, to) {
        if (!this.redirects.has(domainId)) this.redirects.set(domainId, []);
        this.redirects.get(domainId).push({ from, to, createdAt: new Date().toISOString() });
    }

    getRedirects(domainId) {
        return this.redirects.get(domainId) || [];
    }

    getDNSInstructions(domain) {
        return {
            cname: { type: 'CNAME', host: domain.subdomain || '@', value: 'flay.app', ttl: 3600 },
            aRecord: { type: 'A', host: domain.subdomain || '@', value: '76.76.21.21', ttl: 3600 },
            txtRecord: { type: 'TXT', host: '_flay-verification', value: `flay-verify=${domain.id}`, ttl: 3600 }
        };
    }

    getWhiteLabelConfig(userId) {
        return {
            logo: null,
            colors: { primary: '#667eea', secondary: '#764ba2' },
            favicon: null,
            customCss: '',
            removeBranding: false
        };
    }
}

module.exports = new DomainManager();
