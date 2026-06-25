/**
 * Flay Omni - CRM Integre
 * Gestion des contacts, suivi clients, pipeline
 */

const crypto = require('crypto');

class CRM {
    constructor() {
        this.contacts = new Map();
        this.interactions = new Map();
        this.deals = new Map();
        this.tags = new Map();
    }

    // === CONTACTS ===
    addContact(userId, data) {
        const id = `crm_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        const contact = {
            id, userId,
            name: data.name || '',
            email: data.email || '',
            phone: data.phone || '',
            company: data.company || '',
            source: data.source || 'manual',
            tags: data.tags || [],
            notes: data.notes || '',
            status: 'lead',
            score: 0,
            lastContact: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        this.contacts.set(id, contact);
        return contact;
    }

    updateContact(contactId, data) {
        const contact = this.contacts.get(contactId);
        if (!contact) return null;
        Object.assign(contact, data, { updatedAt: new Date().toISOString() });
        return contact;
    }

    getContact(contactId) {
        return this.contacts.get(contactId) || null;
    }

    getUserContacts(userId, filters = {}) {
        const contacts = [];
        for (const [, c] of this.contacts) {
            if (c.userId !== userId) continue;
            if (filters.status && c.status !== filters.status) continue;
            if (filters.tag && !c.tags.includes(filters.tag)) continue;
            if (filters.search) {
                const s = filters.search.toLowerCase();
                if (!c.name.toLowerCase().includes(s) && !c.email.toLowerCase().includes(s) && !c.phone.includes(s)) continue;
            }
            contacts.push(c);
        }
        return contacts.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    }

    deleteContact(contactId) {
        this.contacts.delete(contactId);
        this.interactions.delete(contactId);
    }

    // === INTERACTIONS ===
    addInteraction(contactId, type, data = {}) {
        const id = `int_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        const interaction = {
            id, contactId, type,
            description: data.description || '',
            direction: data.direction || 'outbound',
            duration: data.duration || 0,
            outcome: data.outcome || '',
            createdAt: new Date().toISOString()
        };
        if (!this.interactions.has(contactId)) this.interactions.set(contactId, []);
        this.interactions.get(contactId).push(interaction);
        const contact = this.contacts.get(contactId);
        if (contact) { contact.lastContact = new Date().toISOString(); contact.score += 10; }
        return interaction;
    }

    getInteractions(contactId, limit = 20) {
        const ints = this.interactions.get(contactId) || [];
        return ints.slice(-limit).reverse();
    }

    // === DEALS (Pipeline de vente) ===
    createDeal(userId, data) {
        const id = `deal_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        const deal = {
            id, userId,
            name: data.name || '',
            value: data.value || 0,
            currency: data.currency || 'XOF',
            contactId: data.contactId || null,
            stage: 'lead',
            probability: 10,
            expectedClose: data.expectedClose || null,
            notes: data.notes || '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        this.deals.set(id, deal);
        return deal;
    }

    updateDeal(dealId, data) {
        const deal = this.deals.get(dealId);
        if (!deal) return null;
        Object.assign(deal, data, { updatedAt: new Date().toISOString() });
        return deal;
    }

    getUserDeals(userId, stage = null) {
        const deals = [];
        for (const [, d] of this.deals) {
            if (d.userId !== userId) continue;
            if (stage && d.stage !== stage) continue;
            deals.push(d);
        }
        return deals.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    }

    getPipeline(userId) {
        const stages = ['lead', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost'];
        const pipeline = {};
        let totalValue = 0;
        let totalDeals = 0;
        stages.forEach(s => { pipeline[s] = { deals: [], value: 0 }; });
        for (const [, d] of this.deals) {
            if (d.userId !== userId) continue;
            if (pipeline[d.stage]) {
                pipeline[d.stage].deals.push(d);
                pipeline[d.stage].value += d.value;
                totalValue += d.value;
                totalDeals++;
            }
        }
        return { pipeline, totalValue, totalDeals };
    }

    // === STATS ===
    getStats(userId) {
        let totalContacts = 0, leads = 0, clients = 0, totalInteractions = 0;
        let totalDealValue = 0, wonDeals = 0;
        for (const [, c] of this.contacts) {
            if (c.userId !== userId) continue;
            totalContacts++;
            if (c.status === 'lead') leads++;
            if (c.status === 'client') clients++;
        }
        for (const [, d] of this.deals) {
            if (d.userId !== userId) continue;
            totalDealValue += d.value;
            if (d.stage === 'closed_won') wonDeals++;
        }
        for (const [, ints] of this.interactions) {
            totalInteractions += ints.length;
        }
        return { totalContacts, leads, clients, totalInteractions, totalDealValue, wonDeals };
    }

    // === EXPORT ===
    exportContacts(userId, format = 'csv') {
        const contacts = this.getUserContacts(userId);
        if (format === 'csv') {
            const header = 'Name,Email,Phone,Company,Status,Tags,Created\n';
            const rows = contacts.map(c =>
                `"${c.name}","${c.email}","${c.phone}","${c.company}","${c.status}","${c.tags.join(';')}","${c.createdAt}"`
            ).join('\n');
            return header + rows;
        }
        return JSON.stringify(contacts, null, 2);
    }
}

module.exports = new CRM();
