/**
 * Flay A/B Testing System
 * Testez differentes versions de votre profil
 */

const crypto = require('crypto');

class ABTesting {
    constructor() {
        this.experiments = new Map();
        this.results = new Map();
    }

    createExperiment(userId, name, variants = ['A', 'B']) {
        const expId = `exp_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        this.experiments.set(expId, {
            id: expId,
            userId,
            name,
            variants,
            traffic: variants.reduce((acc, v) => { acc[v] = 0; return acc; }, {}),
            conversions: variants.reduce((acc, v) => { acc[v] = 0; return acc; }, {}),
            startDate: new Date().toISOString(),
            active: true
        });
        return expId;
    }

    assignVariant(expId) {
        if (!this.experiments.has(expId)) return null;
        const exp = this.experiments.get(expId);
        const variants = exp.variants;
        const variant = variants[Math.floor(Math.random() * variants.length)];
        exp.traffic[variant]++;
        return variant;
    }

    recordConversion(expId, variant) {
        if (!this.experiments.has(expId)) return;
        const exp = this.experiments.get(expId);
        if (exp.conversions[variant] !== undefined) {
            exp.conversions[variant]++;
        }
    }

    getResults(expId) {
        if (!this.experiments.has(expId)) return null;
        const exp = this.experiments.get(expId);
        const totalVisits = Object.values(exp.traffic).reduce((a, b) => a + b, 0);
        const totalConversions = Object.values(exp.conversions).reduce((a, b) => a + b, 0);

        const variants = exp.variants.map(v => ({
            name: v,
            visits: exp.traffic[v],
            conversions: exp.conversions[v],
            conversionRate: exp.traffic[v] > 0 ? ((exp.conversions[v] / exp.traffic[v]) * 100).toFixed(2) : 0
        }));

        const winner = variants.reduce((best, curr) =>
            parseFloat(curr.conversionRate) > parseFloat(best.conversionRate) ? curr : best
        , variants[0]);

        return {
            id: expId,
            name: exp.name,
            totalVisits,
            totalConversions,
            overallConversionRate: totalVisits > 0 ? ((totalConversions / totalVisits) * 100).toFixed(2) : 0,
            variants,
            winner: winner.name,
            startDate: exp.startDate,
            active: exp.active
        };
    }

    getUserExperiments(userId) {
        const list = [];
        for (const [id, exp] of this.experiments) {
            if (exp.userId === userId) list.push(exp);
        }
        return list;
    }

    stopExperiment(expId) {
        if (!this.experiments.has(expId)) return false;
        this.experiments.get(expId).active = false;
        return true;
    }
}

module.exports = new ABTesting();
