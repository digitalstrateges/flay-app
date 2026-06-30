/**
 * Flay v22.0 - API Validator
 * Validation schema pour toutes les routes
 */

class Validator {
    constructor() {
        this.errors = [];
    }

    reset() {
        this.errors = [];
        return this;
    }

    // String validation
    isRequired(value, field) {
        if (!value || (typeof value === 'string' && !value.trim())) {
            this.errors.push({ field, message: `${field} est requis` });
        }
        return this;
    }

    isEmail(value, field) {
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            this.errors.push({ field, message: `${field} n'est pas un email valide` });
        }
        return this;
    }

    minLength(value, min, field) {
        if (value && value.length < min) {
            this.errors.push({ field, message: `${field} doit avoir au moins ${min} caracteres` });
        }
        return this;
    }

    maxLength(value, max, field) {
        if (value && value.length > max) {
            this.errors.push({ field, message: `${field} ne doit pas depasser ${max} caracteres` });
        }
        return this;
    }

    isUsername(value, field) {
        if (value && !/^[a-zA-Z0-9_-]+$/.test(value)) {
            this.errors.push({ field, message: `${field} ne peut contenir que lettres, chiffres, - et _` });
        }
        if (value && value.length < 3) {
            this.errors.push({ field, message: `${field} doit avoir au moins 3 caracteres` });
        }
        return this;
    }

    isPhone(value, field) {
        if (value && !/^\+?[0-9\s-]{8,15}$/.test(value.replace(/\s/g, ''))) {
            this.errors.push({ field, message: `${field} n'est pas un numero valide` });
        }
        return this;
    }

    isUrl(value, field) {
        if (value && !/^https?:\/\/.+/.test(value)) {
            this.errors.push({ field, message: `${field} n'est pas une URL valide` });
        }
        return this;
    }

    isPlan(value, field) {
        const valid = ['free', 'pro', 'premium'];
        if (value && !valid.includes(value)) {
            this.errors.push({ field, message: `${field} doit etre: ${valid.join(', ')}` });
        }
        return this;
    }

    isStatus(value, field, validStatuses) {
        if (value && !validStatuses.includes(value)) {
            this.errors.push({ field, message: `${field} doit etre: ${validStatuses.join(', ')}` });
        }
        return this;
    }

    isNumber(value, field) {
        if (value !== undefined && value !== null && (isNaN(value) || typeof value !== 'number')) {
            this.errors.push({ field, message: `${field} doit etre un nombre` });
        }
        return this;
    }

    isPositive(value, field) {
        if (value !== undefined && value !== null && value < 0) {
            this.errors.push({ field, message: `${field} doit etre positif` });
        }
        return this;
    }

    isArray(value, field) {
        if (value && !Array.isArray(value)) {
            this.errors.push({ field, message: `${field} doit etre un tableau` });
        }
        return this;
    }

    isIn(value, field, allowed) {
        if (value && !allowed.includes(value)) {
            this.errors.push({ field, message: `${field} doit etre parmi: ${allowed.join(', ')}` });
        }
        return this;
    }

    // Sanitize
    sanitize(str) {
        if (typeof str !== 'string') return str;
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .trim()
            .substring(0, 10000);
    }

    sanitizeObj(obj) {
        if (!obj || typeof obj !== 'object') return obj;
        const out = {};
        for (const [k, v] of Object.entries(obj)) {
            if (typeof v === 'string') out[k] = this.sanitize(v);
            else if (typeof v === 'object' && !Array.isArray(v)) out[k] = this.sanitizeObj(v);
            else out[k] = v;
        }
        return out;
    }

    // Result
    isValid() {
        return this.errors.length === 0;
    }

    getErrors() {
        return this.errors;
    }

    getFirstError() {
        return this.errors[0] || null;
    }

    // Validate specific schemas
    validateRegister(data) {
        this.reset();
        this.isRequired(data.email, 'email');
        this.isEmail(data.email, 'email');
        this.isRequired(data.password, 'password');
        this.minLength(data.password, 6, 'password');
        this.isRequired(data.name, 'name');
        this.maxLength(data.name, 100, 'name');
        this.isRequired(data.username, 'username');
        this.isUsername(data.username, 'username');
        return this;
    }

    validateLogin(data) {
        this.reset();
        this.isRequired(data.email, 'email');
        this.isRequired(data.password, 'password');
        return this;
    }

    validateProfile(data) {
        this.reset();
        if (data.bio) this.maxLength(data.bio, 500, 'bio');
        if (data.title) this.maxLength(data.title, 100, 'title');
        if (data.location) this.maxLength(data.location, 200, 'location');
        if (data.phone) this.isPhone(data.phone, 'phone');
        if (data.email) this.isEmail(data.email, 'email');
        if (data.website) this.isUrl(data.website, 'website');
        return this;
    }

    validatePayment(data) {
        this.reset();
        this.isRequired(data.plan, 'plan');
        this.isPlan(data.plan, 'plan');
        this.isRequired(data.amount, 'amount');
        this.isNumber(data.amount, 'amount');
        this.isPositive(data.amount, 'amount');
        if (data.whatsapp) this.isPhone(data.whatsapp, 'whatsapp');
        return this;
    }

    validateReservation(data) {
        this.reset();
        this.isRequired(data.clientName, 'clientName');
        this.maxLength(data.clientName, 100, 'clientName');
        if (data.clientEmail) this.isEmail(data.clientEmail, 'clientEmail');
        if (data.clientPhone) this.isPhone(data.clientPhone, 'clientPhone');
        this.isRequired(data.date, 'date');
        return this;
    }

    validateContact(data) {
        this.reset();
        this.isRequired(data.name, 'name');
        this.maxLength(data.name, 100, 'name');
        if (data.email) this.isEmail(data.email, 'email');
        if (data.phone) this.isPhone(data.phone, 'phone');
        return this;
    }

    validateDeal(data) {
        this.reset();
        this.isRequired(data.title, 'title');
        this.maxLength(data.title, 200, 'title');
        if (data.value) this.isNumber(data.value, 'value');
        if (data.value) this.isPositive(data.value, 'value');
        if (data.stage) this.isIn(data.stage, 'stage', ['lead', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost']);
        return this;
    }

    validateInvoice(data) {
        this.reset();
        if (data.items) this.isArray(data.items, 'items');
        if (data.total) this.isNumber(data.total, 'total');
        if (data.total) this.isPositive(data.total, 'total');
        return this;
    }
}

module.exports = new Validator();
