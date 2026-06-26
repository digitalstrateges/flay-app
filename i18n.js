/**
 * Flay Internationalization (i18n)
 * Support Francais / Anglais
 */

const translations = {
    fr: {
        app: { name: 'Flay', tagline: 'Votre carte de visite digitale professionnelle' },
        nav: {
            home: 'Accueil', login: 'Connexion', register: 'Inscription',
            dashboard: 'Tableau de bord', editor: 'Editeur', pricing: 'Tarifs',
            profile: 'Mon profil', settings: 'Parametres', logout: 'Deconnexion'
        },
        auth: {
            loginTitle: 'Connectez-vous', registerTitle: 'Creez votre compte',
            email: 'Email', password: 'Mot de passe', name: 'Nom complet',
            username: 'Nom d\'utilisateur', forgotPassword: 'Mot de passe oublie ?',
            resetPassword: 'Reinitialiser le mot de passe',
            noAccount: 'Pas encore de compte ? Creer un compte',
            hasAccount: 'Deja un compte ? Se connecter',
            loginBtn: 'Se connecter', registerBtn: 'Creer mon compte',
            loginSuccess: 'Connexion reussie !', registerSuccess: 'Compte cree avec succes !',
            passwordRequirements: 'Min 6 caracteres',
            confirmResetPassword: 'Confirmer le mot de passe',
            sendResetLink: 'Envoyer le lien de reinitialisation',
            resetLinkSent: 'Lien envoye ! Verifiez votre email.',
            invalidCredentials: 'Email ou mot de passe incorrect',
            usernameAvailable: 'Nom d\'utilisateur disponible',
            usernameTaken: 'Ce nom d\'utilisateur est deja pris'
        },
        dashboard: {
            title: 'Tableau de bord',
            welcome: 'Bienvenue',
            stats: { views: 'Vues totales', clicks: 'Clics', reservations: 'Reservations', shares: 'Partages' },
            qrCode: 'Mon QR Code',
            shareLink: 'Partager mon lien',
            editProfile: 'Editer mon profil',
            recentReservations: 'Dernieres reservations',
            noReservations: 'Aucune reservation pour le moment',
            upgradePlan: 'Passer au plan superieur',
            currentPlan: 'Plan actuel',
            expiry: 'Expire le',
            daysLeft: 'jours restants'
        },
        editor: {
            title: 'Editeur de profil',
            bio: 'Bio / Description',
            location: 'Localisation',
            phone: 'Telephone',
            email: 'Email',
            services: 'Services',
            addService: 'Ajouter un service',
            serviceNom: 'Nom du service',
            serviceDesc: 'Description',
            servicePrice: 'Prix (FCFA)',
            theme: 'Theme',
            template: 'Mise en page',
            socials: 'Reseaux sociaux',
            save: 'Enregistrer',
            saved: 'Profil sauvegarde !',
            preview: 'Voir mon profil',
            templates: { minimal: 'Minimal', creatif: 'Creatif', business: 'Business', portfolio: 'Portfolio' }
        },
        payment: {
            title: 'Debloquez tout le potentiel de Flay',
            selectPlan: 'Choisissez votre plan',
            step1: 'Choisir le plan',
            step2: 'Payer avec Wave',
            step3: 'Confirmer le paiement',
            payWithWave: 'Payer avec Wave',
            openWave: 'Ouvrir Wave',
            planSelected: 'Plan selectionne',
            sendProof: 'Envoyer la preuve sur WhatsApp',
            confirmPayment: 'Confirmer le paiement',
            cancelPayment: 'Annuler le paiement',
            paymentConfirmed: 'Paiement confirme ! Plan active.',
            paymentPending: 'En attente de confirmation',
            paymentFailed: 'Echec du paiement',
            amount: 'Montant',
            reference: 'Reference',
            whatsappMsg: 'Message pre-rempli pour WhatsApp',
            thankYou: 'Merci pour votre paiement !',
            autoActivation: 'Activation automatique apres confirmation',
            contactUs: 'Une question ? Contactez-nous sur WhatsApp'
        },
        profile: {
            visitProfile: 'Visiter le profil',
            contactNow: 'Contacter maintenant',
            reserveNow: 'Reserver maintenant',
            services: 'Services',
            about: 'A propos',
            verified: 'Verifie Pro',
            premium: 'Premium',
            viewAll: 'Voir tout'
        },
        reservation: {
            title: 'Faire une reservation',
            name: 'Votre nom',
            phone: 'Votre telephone',
            email: 'Votre email',
            service: 'Service souhaite',
            date: 'Date souhaitee',
            time: 'Heure souhaitee',
            message: 'Message (optionnel)',
            submit: 'Envoyer la reservation',
            success: 'Reservation envoyee avec succes !',
            error: 'Erreur lors de l\'envoi'
        },
        plans: {
            title: 'Choisissez votre plan',
            monthly: '/mois',
            popular: 'Le plus populaire',
            current: 'Plan actuel',
            upgrade: 'Choisir ce plan',
            free: {
                name: 'Gratuit',
                features: 'Carte de visite digitale, Lien unique, 3 services, 2 themes, Stats de base'
            },
            pro: {
                name: 'Pro',
                features: 'Reservations illimitees, Services illimites, Analytics, 7 themes, QR Code, Badge Verifie'
            },
            premium: {
                name: 'Premium',
                features: 'Tout Pro + Agent IA, Domaine custom, PDF, Analytics avances, API, Webhooks, Support 24/7'
            }
        },
        footer: {
            madeWith: 'Fait avec amour par',
            agency: 'DIGITALSTRATEGES',
            contact: 'Contact',
            whatsapp: 'WhatsApp',
            rights: 'Tous droits reserves'
        }
    },
    en: {
        app: { name: 'Flay', tagline: 'Your professional digital business card' },
        nav: {
            home: 'Home', login: 'Login', register: 'Sign Up',
            dashboard: 'Dashboard', editor: 'Editor', pricing: 'Pricing',
            profile: 'My Profile', settings: 'Settings', logout: 'Logout'
        },
        auth: {
            loginTitle: 'Welcome back', registerTitle: 'Create your account',
            email: 'Email', password: 'Password', name: 'Full name',
            username: 'Username', forgotPassword: 'Forgot password?',
            resetPassword: 'Reset password',
            noAccount: 'No account? Create one',
            hasAccount: 'Already have an account? Login',
            loginBtn: 'Login', registerBtn: 'Create my account',
            loginSuccess: 'Login successful!',
            registerSuccess: 'Account created!',
            passwordRequirements: 'Min 6 characters',
            confirmResetPassword: 'Confirm password',
            sendResetLink: 'Send reset link',
            resetLinkSent: 'Link sent! Check your email.',
            invalidCredentials: 'Invalid email or password',
            usernameAvailable: 'Username available',
            usernameTaken: 'Username already taken'
        },
        dashboard: {
            title: 'Dashboard',
            welcome: 'Welcome',
            stats: { views: 'Total Views', clicks: 'Clicks', reservations: 'Reservations', shares: 'Shares' },
            qrCode: 'My QR Code',
            shareLink: 'Share my link',
            editProfile: 'Edit my profile',
            recentReservations: 'Recent Reservations',
            noReservations: 'No reservations yet',
            upgradePlan: 'Upgrade Plan',
            currentPlan: 'Current Plan',
            expiry: 'Expires on',
            daysLeft: 'days left'
        },
        editor: {
            title: 'Profile Editor',
            bio: 'Bio / Description',
            location: 'Location',
            phone: 'Phone',
            email: 'Email',
            services: 'Services',
            addService: 'Add a service',
            serviceNom: 'Service name',
            serviceDesc: 'Description',
            servicePrice: 'Price (FCFA)',
            theme: 'Theme',
            template: 'Layout',
            socials: 'Social Media',
            save: 'Save',
            saved: 'Profile saved!',
            preview: 'View my profile',
            templates: { minimal: 'Minimal', creatif: 'Creative', business: 'Business', portfolio: 'Portfolio' }
        },
        payment: {
            title: 'Unlock Flay\'s full potential',
            selectPlan: 'Choose your plan',
            step1: 'Choose plan',
            step2: 'Pay with Wave',
            step3: 'Confirm payment',
            payWithWave: 'Pay with Wave',
            openWave: 'Open Wave',
            planSelected: 'Selected plan',
            sendProof: 'Send proof on WhatsApp',
            confirmPayment: 'Confirm payment',
            cancelPayment: 'Cancel payment',
            paymentConfirmed: 'Payment confirmed! Plan activated.',
            paymentPending: 'Awaiting confirmation',
            paymentFailed: 'Payment failed',
            amount: 'Amount',
            reference: 'Reference',
            whatsappMsg: 'Pre-filled WhatsApp message',
            thankYou: 'Thank you for your payment!',
            autoActivation: 'Automatic activation after confirmation',
            contactUs: 'Questions? Contact us on WhatsApp'
        },
        profile: {
            visitProfile: 'Visit profile',
            contactNow: 'Contact now',
            reserveNow: 'Book now',
            services: 'Services',
            about: 'About',
            verified: 'Verified Pro',
            premium: 'Premium',
            viewAll: 'View all'
        },
        reservation: {
            title: 'Make a reservation',
            name: 'Your name',
            phone: 'Your phone',
            email: 'Your email',
            service: 'Service requested',
            date: 'Preferred date',
            time: 'Preferred time',
            message: 'Message (optional)',
            submit: 'Submit reservation',
            success: 'Reservation sent successfully!',
            error: 'Error sending reservation'
        },
        plans: {
            title: 'Choose your plan',
            monthly: '/month',
            popular: 'Most Popular',
            current: 'Current Plan',
            upgrade: 'Choose this plan',
            free: {
                name: 'Free',
                features: 'Digital business card, Unique link, 3 services, 2 themes, Basic stats'
            },
            pro: {
                name: 'Pro',
                features: 'Unlimited reservations, Unlimited services, Analytics, 7 themes, QR Code, Verified Badge'
            },
            premium: {
                name: 'Premium',
                features: 'All Pro + AI Agent, Custom domain, PDF, Advanced analytics, API, Webhooks, 24/7 Support'
            }
        },
        footer: {
            madeWith: 'Made with love by',
            agency: 'DIGITALSTRATEGES',
            contact: 'Contact',
            whatsapp: 'WhatsApp',
            rights: 'All rights reserved'
        }
    }
};

class I18n {
    constructor(lang = 'fr') {
        this.lang = translations[lang] ? lang : 'fr';
    }

    setLang(lang) {
        this.lang = translations[lang] ? lang : 'fr';
        return this;
    }

    t(key) {
        const keys = key.split('.');
        let value = translations[this.lang];
        for (const k of keys) {
            if (value && value[k] !== undefined) value = value[k];
            else return key;
        }
        return value;
    }

    getLangs() {
        return Object.keys(translations);
    }

    static detect(req) {
        const cookie = req.headers.cookie?.match(/lang=([a-z]+)/);
        if (cookie && translations[cookie[1]]) return cookie[1];
        const accept = req.headers['accept-language'] || '';
        if (accept.startsWith('en')) return 'en';
        return 'fr';
    }

    static selector(lang, currentPath = '/') {
        const langs = { fr: 'Français', en: 'English' };
        return Object.entries(langs).map(([code, name]) =>
            `<a href="/lang/${code}?redirect=${encodeURIComponent(currentPath)}" class="lang-btn ${code === lang ? 'active' : ''}" data-lang="${code}">${name}</a>`
        ).join('');
    }

    static selectorCSS() {
        return '.lang-switch{display:flex;gap:4px;align-items:center}.lang-btn{padding:4px 10px;border-radius:6px;font-size:.75rem;text-decoration:none;color:var(--muted,#64748b);border:1px solid var(--border,#1e293b);background:transparent;transition:all .15s}.lang-btn:hover{color:var(--text,#e2e8f0);border-color:var(--muted)}.lang-btn.active{background:var(--primary2,#6366f1);color:#fff;border-color:var(--primary2)}';
    }
}

module.exports = I18n;
