/**
 * Flay Omni - SEO Module
 * Meta tags dynamiques, structured data, Open Graph, Twitter Cards
 */

class SEO {
    constructor() {
        this.siteName = 'Flay';
        this.siteUrl = 'https://flay.app';
        this.defaultImage = 'https://flay.app/og-image.png';
        this.description = 'Creez votre carte de visite digitale professionnelle. Site vitrine, reservation, CRM, analytics et plus. Gratuit et simple.';
    }

    // Generate meta tags for a profile page
    profileMeta(profile, user) {
        const name = profile?.name || user?.name || 'Professionnel';
        const bio = profile?.bio || profile?.description || '';
        const title = `${name} | ${this.siteName}`;
        const description = bio.substring(0, 160) || `${name} - Profil professionnel sur ${this.siteName}`;
        const url = `${this.siteUrl}/p/${profile?.slug || user?.username}`;
        const image = profile?.avatar || profile?.banner || this.defaultImage;

        return `
    <title>${this.esc(title)}</title>
    <meta name="description" content="${this.esc(description)}">
    <meta name="keywords" content="${this.esc(profile?.services?.join(', ') || '')}, ${name}, professionnel, carte de visite digitale">
    <meta name="author" content="${this.esc(name)}">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="${url}">

    <!-- Open Graph -->
    <meta property="og:type" content="profile">
    <meta property="og:title" content="${this.esc(title)}">
    <meta property="og:description" content="${this.esc(description)}">
    <meta property="og:image" content="${image}">
    <meta property="og:url" content="${url}">
    <meta property="og:site_name" content="${this.siteName}">
    <meta property="og:locale" content="fr_CI">

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${this.esc(title)}">
    <meta name="twitter:description" content="${this.esc(description)}">
    <meta name="twitter:image" content="${image}">

    <!-- Structured Data: Person -->
    <script type="application/ld+json">${JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Person",
        "name": name,
        "description": description,
        "url": url,
        "image": image,
        "jobTitle": profile?.services?.[0] || 'Professionnel',
        "worksFor": { "@type": "Organization", "name": this.siteName },
        "sameAs": profile?.socials ? Object.values(profile.socials).filter(Boolean) : []
    })}</script>`;
    }

    // Generate meta tags for the landing page
    landingMeta() {
        return `
    <title>Flay - Carte de Visite Digitale Profesionele | Site Vitrine Gratuit</title>
    <meta name="description" content="Creez votre carte de visite digitale professionnelle en 2 minutes. Site vitrine, reservation en ligne, CRM, analytics, paiement Wave. Gratuit et simple.">
    <meta name="keywords" content="carte de visite digitale, site vitrine, page web perso, professionnel, numerique, Cote d'Ivoire, Abidjan, Wave, reservation, CRM">
    <meta name="author" content="DIGITALSTRATEGES">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="${this.siteUrl}/">

    <!-- Open Graph -->
    <meta property="og:type" content="website">
    <meta property="og:title" content="Flay - Carte de Visite Digitale Profesionele">
    <meta property="og:description" content="Creez votre carte de visite digitale professionnelle en 2 minutes. Site vitrine, reservation, CRM, analytics.">
    <meta property="og:image" content="${this.defaultImage}">
    <meta property="og:url" content="${this.siteUrl}/">
    <meta property="og:site_name" content="${this.siteName}">
    <meta property="og:locale" content="fr_CI">

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="Flay - Carte de Visite Digitale Profesionele">
    <meta name="twitter:description" content="Creez votre carte de visite digitale professionnelle en 2 minutes.">
    <meta name="twitter:image" content="${this.defaultImage}">

    <!-- Structured Data: WebSite -->
    <script type="application/ld+json">${JSON.stringify({
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": this.siteName,
        "url": this.siteUrl,
        "description": this.description,
        "potentialAction": {
            "@type": "SearchAction",
            "target": `${this.siteUrl}/search?q={search_term_string}`,
            "query-input": "required name=search_term_string"
        }
    })}</script>

    <!-- Structured Data: Organization -->
    <script type="application/ld+json">${JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": "DIGITALSTRATEGES",
        "url": this.siteUrl,
        "logo": `${this.siteUrl}/logo.png`,
        "sameAs": [],
        "contactPoint": {
            "@type": "ContactPoint",
            "telephone": "+225-0759731990",
            "contactType": "customer service",
            "availableLanguage": ["French", "English"]
        }
    })}</script>

    <!-- Structured Data: Service -->
    <script type="application/ld+json">${JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Service",
        "name": "Flay - Carte de Visite Digitale",
        "provider": { "@type": "Organization", "name": "DIGITALSTRATEGES" },
        "description": this.description,
        "areaServed": {
            "@type": "Country",
            "name": "Cote d'Ivoire"
        },
        "serviceType": "Digital Business Card Platform",
        "offers": [
            { "@type": "Offer", "price": "0", "priceCurrency": "XOF", "name": "Free" },
            { "@type": "Offer", "price": "5000", "priceCurrency": "XOF", "name": "Pro" },
            { "@type": "Offer", "price": "15000", "priceCurrency": "XOF", "name": "Premium" }
        ]
    })}</script>`;
    }

    esc(str) {
        if (!str) return '';
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
}

module.exports = new SEO();
