/**
 * Flay AI Agent - Orchestration Agentic Integree
 * Genere du contenu, optimise les profils, et fournit des insights
 */

class AIAgent {
    constructor() {
        this.cache = new Map();
        this.history = new Map();
    }

    /**
     * Genere une bio professionnelle optimisee
     */
    generateBio(name, services = [], location = '', industry = '') {
        const key = `bio_${name}_${services.join(',')}`;
        if (this.cache.has(key)) return this.cache.get(key);

        const serviceText = services.length > 0
            ? services.map(s => s.name || s).join(', ')
            : 'ses services professionnels';

        const locationText = location ? ` a ${location}` : '';

        const bios = [
            `${name} est un professionnel passionne${locationText}, specialise dans ${serviceText}. Avec une approche moderne et client-centree, il/elle accompagne ses clients vers la reussite. Contactez-le/la pour decouvrir ses services.`,
            `Artisan du digital${locationText}, ${name} met son expertise au service de ${serviceText}. Son objectif : transformer vos idees en realites concretes. Disponible pour vos projets.`,
            `Profil expert${locationText} - ${name} offre des services de qualite superieure en ${serviceText}. Satisfaction garantie. Prenez contact des maintenant.`,
            `${name}${locationText} | Specialiste en ${serviceText} | Engagement qualite et resultat | Contactez-moi pour en savoir plus.`
        ];

        const bio = bios[Math.floor(Math.random() * bios.length)];
        this.cache.set(key, bio);
        return bio;
    }

    /**
     * Suggere des services basees sur le domaine d'activite
     */
    suggestServices(industry) {
        const suggestions = {
            'photographe': [
                { name: 'Mariage', description: 'Couverture complete de votre mariage', price: '75 000 FCFA' },
                { name: 'Portrait pro', description: 'Photo professionnelle pour CV/LinkedIn', price: '15 000 FCFA' },
                { name: 'Evenementiel', description: 'Reportage evenement corporate', price: '50 000 FCFA' },
                { name: 'Product', description: 'Photo de produits pour e-commerce', price: '5 000 FCFA/produit' },
                { name: 'Retouche', description: 'Retouche professionnelle d\'images', price: '3 000 FCFA/photo' }
            ],
            'designer': [
                { name: 'Logo', description: 'Creation de logo et identite visuelle', price: '50 000 FCFA' },
                { name: 'Flyer', description: 'Design de supports de communication', price: '15 000 FCFA' },
                { name: 'Site web', description: 'Design UI/UX de site web', price: '150 000 FCFA' },
                { name: 'Branding', description: 'Strategie et identite de marque complete', price: '200 000 FCFA' },
                { name: 'Resume', description: 'Creation de CV design', price: '10 000 FCFA' }
            ],
            'developer': [
                { name: 'Site web', description: 'Developpement site web fullstack', price: '200 000 FCFA' },
                { name: 'App mobile', description: 'Application iOS/Android', price: '500 000 FCFA' },
                { name: 'API', description: 'Developpement d\'API REST', price: '100 000 FCFA' },
                { name: 'Maintenance', description: 'Support et maintenance mensuelle', price: '30 000 FCFA/mois' },
                { name: 'Conseil', description: 'Audit technique et conseil', price: '50 000 FCFA/jour' }
            ],
            'coach': [
                { name: 'Coaching 1h', description: 'Seance de coaching individuelle', price: '25 000 FCFA' },
                { name: 'Pack 5 seances', description: '5 seances de coaching', price: '100 000 FCFA' },
                { name: 'Formation', description: 'Formation groupe (max 10)', price: '50 000 FCFA/pers' },
                { name: 'Mentorat', description: 'Programme mentorat 1 mois', price: '150 000 FCFA' },
                { name: 'Webinaire', description: 'Session webinaire en ligne', price: '10 000 FCFA/participant' }
            ],
            'default': [
                { name: 'Consultation', description: 'Seance de consultation individuelle', price: '20 000 FCFA' },
                { name: 'Formation', description: 'Formation personnalisee', price: '50 000 FCFA' },
                { name: 'Audit', description: 'Audit et diagnostic complet', price: '30 000 FCFA' },
                { name: 'Accompagnement', description: 'Programme d\'accompagnement', price: '100 000 FCFA' },
                { name: 'Pack premium', description: 'Offre complete et premium', price: '200 000 FCFA' }
            ]
        };

        const key = industry.toLowerCase();
        return suggestions[key] || suggestions['default'];
    }

    /**
     * Genere des reponses automatiques pour les clients
     */
    generateResponse(context) {
        const { clientName, service, date, time, message } = context;

        const responses = {
            reservation: `Bonjour ${clientName} ! Merci pour votre reservation pour "${service}" le ${date} a ${time}. Nous avons bien recu votre demande et vous confirmerons dans les plus brefs delais. N'hesitez pas a nous contacter si vous avez des questions. A bientot !`,
            confirmation: `Excellent ${clientName} ! Votre reservation pour "${service}" le ${date} a ${time} est confirmee. Nous avons hate de vous accueillir. En cas de question, contactez-nous sur WhatsApp.`,
            reminder: `Rappel : ${clientName}, vous avez une reservation "${service}" prevue demain a ${time}. Nous vous attendons avec impatience !`,
            thankYou: `Merci ${clientName} pour votre confiance ! Votre ${service} du ${date} a ete un succes. N'hesitez pas a nous recommander. A bientot !`
        };

        return responses.reservation;
    }

    /**
     * Genere des insights analytics
     */
    generateInsights(analytics) {
        const insights = [];

        if (analytics.totalViews > 100) {
            insights.push({
                type: 'success',
                icon: '&#128640;',
                title: 'Excellent trafic !',
                message: `Votre profil a recu ${analytics.totalViews} vues. Vous etes dans le top 10% des profils Flay.`
            });
        } else if (analytics.totalViews > 50) {
            insights.push({
                type: 'info',
                icon: '&#128200;',
                title: 'Bon trafic',
                message: `${analytics.totalViews} vues au total. Continuez a partager votre lien !`
            });
        } else {
            insights.push({
                type: 'suggestion',
                icon: '&#128161;',
                title: 'Augmentez votre visibilite',
                message: `Partagez votre lien Flay sur WhatsApp et les reseaux sociaux.`
            });
        }

        const ctr = analytics.totalViews > 0 ? ((analytics.totalClicks / analytics.totalViews) * 100).toFixed(1) : 0;
        if (ctr > 5) {
            insights.push({
                type: 'success',
                icon: '&#127919;',
                title: 'Taux de clic excellent',
                message: `${ctr}% de vos visiteurs cliquent sur vos liens.`
            });
        }

        if (analytics.totalReservations > 0) {
            insights.push({
                type: 'success',
                icon: '&#128197;',
                title: 'Reservations actives',
                message: `${analytics.totalReservations} reservations recues. Convergez vos prospects !`
            });
        }

        return insights;
    }

    /**
     * Genere des titres SEO optimises
     */
    generateSEO(title, bio, location) {
        return {
            title: `${title} | Flay - Profil Professionnel`,
            description: bio.substring(0, 160),
            keywords: [title, location, 'Flay', 'profil pro', 'services'].filter(Boolean),
            ogTitle: title,
            ogDescription: bio.substring(0, 200),
            ogType: 'profile'
        };
    }

    /**
     * Suggestions d'optimisation du profil
     */
    suggestOptimizations(profile) {
        const suggestions = [];

        if (!profile.bio || profile.bio.length < 50) {
            suggestions.push({ priority: 'high', message: 'Ajoutez une bio detaillee (min 50 caracteres)', action: 'bio' });
        }
        if (!profile.avatar) {
            suggestions.push({ priority: 'high', message: 'Ajoutez une photo de profil', action: 'avatar' });
        }
        if (!profile.phone && !profile.email) {
            suggestions.push({ priority: 'high', message: 'Ajoutez au moins un moyen de contact', action: 'contact' });
        }
        if (!profile.services || profile.services.length === 0) {
            suggestions.push({ priority: 'medium', message: 'Ajoutez vos services et tarifs', action: 'services' });
        }
        if (!profile.location) {
            suggestions.push({ priority: 'medium', message: 'Ajoutez votre localisation', action: 'location' });
        }
        if (!profile.socials || Object.values(profile.socials).filter(Boolean).length === 0) {
            suggestions.push({ priority: 'low', message: 'Connectez vos reseaux sociaux', action: 'socials' });
        }

        return suggestions;
    }

    /**
     * Genere des themes personnalises basees sur l'industrie
     */
    suggestTheme(industry) {
        const themes = {
            'photographe': 'sunset',
            'designer': 'electric',
            'developer': 'ocean',
            'coach': 'emerald',
            'musicien': 'rose',
            'restaurant': 'gold',
            'fitness': 'forest',
            'beaute': 'rose',
            'immobilier': 'midnight',
            'education': 'ocean',
            'sante': 'emerald',
            'tech': 'electric'
        };
        return themes[industry?.toLowerCase()] || 'dark';
    }
}

module.exports = new AIAgent();
