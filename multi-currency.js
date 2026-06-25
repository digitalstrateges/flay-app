/**
 * Flay Omni - Multi-Currency System
 * Support XOF, EUR, USD, GHS, NGN
 */

class MultiCurrency {
    constructor() {
        this.rates = {
            XOF: 1,
            EUR: 0.00152,
            USD: 0.00165,
            GHS: 0.020,
            NGN: 2.55,
            GBP: 0.00131,
            CAD: 0.00224
        };
        this.symbols = {
            XOF: 'FCFA', EUR: '\u20AC', USD: '$', GHS: 'GH\u20B5', NGN: '\u20A6', GBP: '\u00A3', CAD: 'CA$'
        };
        this.names = {
            XOF: 'Franc CFA (BCEAO)', EUR: 'Euro', USD: 'Dollar americain', GHS: 'Cedi ghaneen', NGN: 'Naira nigerian', GBP: 'Livre sterling', CAD: 'Dollar canadien'
        };
    }

    convert(amount, from, to) {
        if (from === to) return amount;
        const inXOF = amount / this.rates[from];
        return Math.round(inXOF * this.rates[to]);
    }

    format(amount, currency) {
        const sym = this.symbols[currency] || currency;
        if (currency === 'XOF') return `${amount.toLocaleString('fr-FR')} ${sym}`;
        return `${sym} ${amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    getSymbol(currency) { return this.symbols[currency] || currency; }
    getName(currency) { return this.names[currency] || currency; }
    getRate(from, to) { return this.rates[to] / this.rates[from]; }

    getAll() {
        return Object.keys(this.rates).map(code => ({
            code, symbol: this.symbols[code], name: this.names[code], rate: this.rates[code]
        }));
    }

    parseAmount(str) {
        const cleaned = str.replace(/[^0-9.,]/g, '').replace(',', '.');
        return parseFloat(cleaned) || 0;
    }
}

module.exports = new MultiCurrency();
