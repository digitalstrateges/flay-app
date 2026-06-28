/**
 * Flay Omni - Africa World Features
 * Fonctionnalites specifiques pour le marche africain et international
 */

class AfricaWorldFeatures {
    constructor() {
        this.supportedCountries = this._initCountries();
        this.paymentMethods = this._initPaymentMethods();
        this.languages = this._initLanguages();
        this.currencies = this._initCurrencies();
    }

    _initCountries() {
        return {
            CI: { name: "Cote d'Ivoire", code: '+225', currency: 'XOF', flag: '🇨🇮', wave: true, momo: true, om: true, moov: true },
            SN: { name: 'Senegal', code: '+221', currency: 'XOF', flag: '🇸🇳', wave: true, momo: true, om: true },
            CM: { name: 'Cameroun', code: '+237', currency: 'XAF', flag: '🇨🇲', wave: true, momo: true, om: true },
            ML: { name: 'Mali', code: '+223', currency: 'XOF', flag: '🇲🇱', wave: true, momo: true, om: true },
            BF: { name: 'Burkina Faso', code: '+226', currency: 'XOF', flag: '🇧🇫', wave: true, momo: true, om: true },
            GH: { name: 'Ghana', code: '+233', currency: 'GHS', flag: '🇬🇭', wave: true, momo: true },
            NG: { name: 'Nigeria', code: '+234', currency: 'NGN', flag: '🇳🇬', wave: true, momo: true },
            TG: { name: 'Togo', code: '+228', currency: 'XOF', flag: '🇹🇬', wave: true, momo: true, om: true },
            BJ: { name: 'Benin', code: '+229', currency: 'XOF', flag: '🇧🇯', wave: true, momo: true, om: true },
            CG: { name: 'Congo', code: '+242', currency: 'XAF', flag: '🇨🇬', wave: true, momo: true },
            GA: { name: 'Gabon', code: '+241', currency: 'XAF', flag: '🇬🇦', wave: true, momo: true },
            GN: { name: 'Guinee', code: '+224', currency: 'GNF', flag: '🇬🇳', wave: true, momo: true },
            NE: { name: 'Niger', code: '+227', currency: 'XOF', flag: '🇳🇪', wave: true, momo: true },
            CD: { name: 'RD Congo', code: '+243', currency: 'USD', flag: '🇨🇩', wave: true, momo: true },
            KE: { name: 'Kenya', code: '+254', currency: 'KES', flag: '🇰🇪', wave: false, mpesa: true },
            TZ: { name: 'Tanzanie', code: '+255', currency: 'TZS', flag: '🇹🇿', wave: false, mpesa: true },
            ZA: { name: 'Afrique du Sud', code: '+27', currency: 'ZAR', flag: '🇿🇦', wave: false, snapscan: true },
            MA: { name: 'Maroc', code: '+212', currency: 'MAD', flag: '🇲🇦', wave: false, cpay: true },
            TN: { name: 'Tunisie', code: '+216', currency: 'TND', flag: '🇹🇳', wave: false },
            DZ: { name: 'Algerie', code: '+213', currency: 'DZD', flag: '🇩🇿', wave: false },
            FR: { name: 'France', code: '+33', currency: 'EUR', flag: '🇫🇷', wave: false, stripe: true },
            BE: { name: 'Belgique', code: '+32', currency: 'EUR', flag: '🇧🇪', wave: false, stripe: true },
            CA: { name: 'Canada', code: '+1', currency: 'CAD', flag: '🇨🇦', wave: false, stripe: true },
            US: { name: 'Etats-Unis', code: '+1', currency: 'USD', flag: '🇺🇸', wave: false, stripe: true },
            GB: { name: 'Royaume-Uni', code: '+44', currency: 'GBP', flag: '🇬🇧', wave: false, stripe: true }
        };
    }

    _initPaymentMethods() {
        return {
            wave: { name: 'Wave', icon: '💸', countries: ['CI', 'SN', 'CM', 'ML', 'BF', 'GH', 'TG', 'BJ', 'CG', 'GA', 'GN', 'NE', 'CD'], fee: 0.01, instant: true },
            momo: { name: 'MTN MoMo', icon: '📱', countries: ['CI', 'CM', 'GH', 'NG', 'UG', 'RW', 'ZM', 'MW'], fee: 0.015, instant: true },
            om: { name: 'Orange Money', icon: '🟠', countries: ['CI', 'SN', 'CM', 'ML', 'BF', 'TG', 'BJ', 'GN', 'NE'], fee: 0.015, instant: true },
            moov: { name: 'Moov Money', icon: '🔵', countries: ['CI', 'BJ', 'TG', 'BF'], fee: 0.015, instant: true },
            mpesa: { name: 'M-Pesa', icon: '📱', countries: ['KE', 'TZ', 'CD', 'MZ'], fee: 0.01, instant: true },
            cinetpay: { name: 'CinetPay', icon: '💳', countries: ['CI', 'SN', 'CM', 'ML', 'BF', 'GH', 'NG', 'TG', 'BJ'], fee: 0.025, instant: true },
            stripe: { name: 'Stripe', icon: '💳', countries: ['FR', 'BE', 'CA', 'US', 'GB'], fee: 0.029, instant: false },
            cod: { name: 'Paiement a la livraison', icon: '🚚', countries: ['*'], fee: 0, instant: false },
            bank_transfer: { name: 'Virement bancaire', icon: '🏦', countries: ['*'], fee: 0, instant: false }
        };
    }

    _initLanguages() {
        return {
            fr: { name: 'Francais', flag: '🇫🇷', native: 'Francais' },
            en: { name: 'English', flag: '🇬🇧', native: 'English' },
            ar: { name: 'Arabe', flag: '🇸🇦', native: 'العربية' },
            pt: { name: 'Portugais', flag: '🇧🇷', native: 'Portugues' },
            sw: { name: 'Swahili', flag: '🇰🇪', native: 'Kiswahili' },
            wo: { name: 'Wolof', flag: '🇸🇳', native: 'Wolof' },
            bm: { name: 'Bambara', flag: '🇲🇱', native: 'Bamanankan' },
            ee: { name: 'Ewe', flag: '🇬🇭', native: 'Eʋegbe' },
            yo: { name: 'Yoruba', flag: '🇳🇬', native: 'Yorùbá' },
            ig: { name: 'Igbo', flag: '🇳🇬', native: 'Igbo' },
            ha: { name: 'Hausa', flag: '🇳🇬', native: 'Hausa' },
            zu: { name: 'Zulu', flag: '🇿🇦', native: 'isiZulu' },
            am: { name: 'Amharique', flag: '🇪🇹', native: 'አማርኛ' }
        };
    }

    _initCurrencies() {
        return {
            XOF: { name: 'FCFA (BCEAO)', symbol: 'FCFA', country: 'UEMOA', rate: 1 },
            XAF: { name: 'FCFA (BEAC)', symbol: 'FCFA', country: 'CEMAC', rate: 1 },
            GHS: { name: 'Cedi', symbol: 'GH₵', country: 'Ghana', rate: 0.012 },
            NGN: { name: 'Naira', symbol: '₦', country: 'Nigeria', rate: 0.0065 },
            KES: { name: 'Shilling', symbol: 'KSh', country: 'Kenya', rate: 0.0073 },
            GNF: { name: 'Franc Guineen', symbol: 'FG', country: 'Guinee', rate: 0.00012 },
            TZS: { name: 'Shilling Tanzanien', symbol: 'TSh', country: 'Tanzanie', rate: 0.00038 },
            ZAR: { name: 'Rand', symbol: 'R', country: 'Afrique du Sud', rate: 0.0058 },
            MAD: { name: 'Dirham', symbol: 'MAD', country: 'Maroc', rate: 0.0089 },
            EUR: { name: 'Euro', symbol: '€', country: 'Europe', rate: 0.0015 },
            USD: { name: 'Dollar', symbol: '$', country: 'Etats-Unis', rate: 0.0015 },
            GBP: { name: 'Livre', symbol: '£', country: 'Royaume-Uni', rate: 0.0012 },
            CAD: { name: 'Dollar Canadien', symbol: 'CA$', country: 'Canada', rate: 0.002 },
            BIF: { name: 'Franc Burundais', symbol: 'FBu', country: 'Burundi', rate: 0.00038 },
            RWF: { name: 'Franc Rwandais', symbol: 'RF', country: 'Rwanda', rate: 0.0011 },
            UGX: { name: 'Shilling Ougandais', symbol: 'USh', country: 'Ouganda', rate: 0.0004 }
        };
    }

    getCountry(countryCode) {
        return this.supportedCountries[countryCode.toUpperCase()] || null;
    }

    getPaymentMethodsForCountry(countryCode) {
        const country = this.getCountry(countryCode);
        if (!country) return [];
        return Object.entries(this.paymentMethods)
            .filter(([key, method]) => method.countries.includes(countryCode) || method.countries.includes('*'))
            .map(([key, method]) => ({ id: key, ...method }));
    }

    convertCurrency(amount, from, to) {
        const fromRate = this.currencies[from]?.rate || 1;
        const toRate = this.currencies[to]?.rate || 1;
        return Math.round((amount / fromRate) * toRate);
    }

    formatCurrency(amount, currency) {
        const curr = this.currencies[currency];
        if (!curr) return `${amount} ${currency}`;
        return `${amount.toLocaleString('fr-FR')} ${curr.symbol}`;
    }

    // Localized SMS templates
    getSmsTemplates(lang = 'fr') {
        const templates = {
            fr: {
                reservation: 'Flay: Nouvelle reservation de {clientName} pour "{service}" le {date}.',
                payment: 'Flay: Paiement recu ! {amount} {currency}. Merci !',
                reminder: 'Flay: Rappel - Reservation demain a {time} pour "{service}".',
                verification: 'Flay: Code de verification: {code}. Valable 10 min.',
                promo: 'Flay: {message} Code: {code} pour {discount}.'
            },
            en: {
                reservation: 'Flay: New booking from {clientName} for "{service}" on {date}.',
                payment: 'Flay: Payment received! {amount} {currency}. Thank you!',
                reminder: 'Flay: Reminder - Booking tomorrow at {time} for "{service}".',
                verification: 'Flay: Verification code: {code}. Valid for 10 min.',
                promo: 'Flay: {message} Code: {code} for {discount}.'
            },
            wo: {
                reservation: 'Flay: Takk wu am na ci {clientName} ngir "{service}" ci {date}.',
                payment: 'Flay: Fiy na ! {amount} {currency}. Jërëjëf!',
                reminder: 'Flay: Fatte - Takk bu nekk na demain ci {time} ngir "{service}".',
                verification: 'Flay: Koodu verification: {code}. Dugg 10 simili.',
                promo: 'Flay: {message} Koodu: {code} ngir {discount}.'
            },
            ar: {
                reservation: '플레이: حجز جديد من {clientName} لـ "{service}" في {date}.',
                payment: '플레이: تم الدفع! {amount} {currency}. شكراً!',
                reminder: '플레이: تذكير - حجز غداً في {time} لـ "{service}".',
                verification: '플레이: رمز التحقق: {code}. صالح لمدة 10 دقائق.',
                promo: '플레이: {message} الرمز: {code} لـ {discount}.'
            }
        };
        return templates[lang] || templates.fr;
    }

    // Email templates localized
    getEmailTemplate(lang = 'fr', type, data) {
        const subjects = {
            fr: {
                welcome: 'Bienvenue sur Flay !',
                payment: 'Paiement confirme',
                reservation: 'Reservation confirmee',
                promo: 'Offre speciale Flay'
            },
            en: {
                welcome: 'Welcome to Flay!',
                payment: 'Payment confirmed',
                reservation: 'Booking confirmed',
                promo: 'Special offer from Flay'
            }
        };
        return subjects[lang]?.[type] || subjects.fr[type] || 'Flay Notification';
    }

    // Timezone support
    getTimezone(countryCode) {
        const timezones = {
            CI: 'Africa/Abidjan', SN: 'Africa/Dakar', CM: 'Africa/Douala',
            ML: 'Africa/Bamako', BF: 'Africa/Ouagadougou', GH: 'Africa/Accra',
            NG: 'Africa/Lagos', TG: 'Africa/Lome', BJ: 'Africa/Porto-Novo',
            CG: 'Africa/Brazzaville', GA: 'Africa/Libreville', GN: 'Africa/Conakry',
            NE: 'Africa/Niamey', CD: 'Africa/Kinshasa', KE: 'Africa/Nairobi',
            TZ: 'Africa/Dar_es_Salaam', ZA: 'Africa/Johannesburg', MA: 'Africa/Casablanca',
            TN: 'Africa/Tunis', DZ: 'Africa/Algiers', FR: 'Europe/Paris',
            BE: 'Europe/Brussels', CA: 'America/Toronto', US: 'America/New_York',
            GB: 'Europe/London'
        };
        return timezones[countryCode] || 'UTC';
    }

    // Business hours by country
    getBusinessHours(countryCode) {
        const hours = {
            default: { open: '08:00', close: '18:00', break: '12:00-14:00' },
            CI: { open: '08:00', close: '19:00', break: '12:00-14:00' },
            NG: { open: '08:00', close: '17:00', break: '13:00-14:00' },
            ZA: { open: '08:00', close: '17:00', break: '13:00-14:00' },
            FR: { open: '09:00', close: '18:00', break: '12:00-13:30' }
        };
        return hours[countryCode] || hours.default;
    }

    // Public holidays by country
    getPublicHolidays(countryCode) {
        const holidays = {
            CI: [
                { date: '01-01', name: 'Jour de l\'an' },
                { date: '01-07', name: 'Fete des rois' },
                { date: '04-01', name: 'Lundi de Pâques' },
                { date: '05-01', name: 'Fete du Travail' },
                { date: '05-29', name: 'Jour des Martyrs' },
                { date: '06-15', name: 'Fete Nationale' },
                { date: '08-15', name: 'Assomption' },
                { date: '11-15', name: 'Jour de la Paix' },
                { date: '12-25', name: 'Noel' }
            ],
            SN: [
                { date: '01-01', name: 'Jour de l\'an' },
                { date: '04-04', name: 'Fete de l\'Independance' },
                { date: '05-01', name: 'Fete du Travail' },
                { date: '08-15', name: 'Assomption' },
                { date: '11-01', name: 'Toussaint' },
                { date: '12-25', name: 'Noel' }
            ],
            FR: [
                { date: '01-01', name: 'Jour de l\'an' },
                { date: '04-01', name: 'Lundi de Paques' },
                { date: '05-01', name: 'Fete du Travail' },
                { date: '05-08', name: 'Victoire 1945' },
                { date: '05-29', name: 'Ascension' },
                { date: '06-09', name: 'Lundi de Pentecôte' },
                { date: '07-14', name: 'Fete Nationale' },
                { date: '08-15', name: 'Assomption' },
                { date: '11-01', name: 'Toussaint' },
                { date: '11-11', name: 'Armistice' },
                { date: '12-25', name: 'Noel' }
            ]
        };
        return holidays[countryCode] || [];
    }

    // SEO helpers for African markets
    getSeoKeywords(countryCode) {
        const keywords = {
            CI: ["cote d'ivoire", "abidjan", "business", "professionnel", "reservation", "service", "artisan", "restaurant", "beaute", "sante"],
            SN: ["senegal", "dakar", "business", "professionnel", "reservation", "service", "artisan", "restaurant"],
            NG: ["nigeria", "lagos", "business", "professional", "booking", "service", "artisan"],
            GH: ["ghana", "accra", "business", "professional", "booking", "service"],
            FR: ["france", "paris", "business", "professionnel", "reservation", "service"],
            KE: ["kenya", "nairobi", "business", "professional", "booking", "service"]
        };
        return keywords[countryCode] || keywords.CI;
    }

    // Social proof by country
    getSocialProof(countryCode) {
        return {
            users: Math.floor(Math.random() * 5000) + 1000,
            businesses: Math.floor(Math.random() * 500) + 100,
            transactions: Math.floor(Math.random() * 50000) + 10000,
            rating: 4.8,
            country: this.getCountry(countryCode)?.name || 'Cote d\'Ivoire'
        };
    }

    // Multi-currency pricing
    getLocalizedPricing(countryCode, plan) {
        const prices = {
            free: { CI: 0, SN: 0, CM: 0, GH: 0, NG: 0, FR: 0, US: 0 },
            pro: { CI: 5000, SN: 5000, CM: 5000, GH: 15, NG: 2000, FR: 5, US: 5 },
            premium: { CI: 15000, SN: 15000, CM: 15000, GH: 45, NG: 6000, FR: 15, US: 15 },
            doree: { CI: 30000, SN: 30000, CM: 30000, GH: 90, NG: 12000, FR: 30, US: 30 }
        };
        return prices[plan]?.[countryCode] || prices[plan]?.CI || 0;
    }
}

module.exports = new AfricaWorldFeatures();
