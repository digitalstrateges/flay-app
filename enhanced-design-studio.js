/**
 * Flay Omni - Enhanced Design Studio
 * Studio de creation complet avec Canvas, mini-features, IA
 */

class EnhancedDesignStudio {
    constructor() {
        this.templates = this._initTemplates();
        this.components = this._initComponents();
        this.animations = this._initAnimations();
        this.colorPalettes = this._initColorPalettes();
        this.fonts = this._initFonts();
    }

    _initTemplates() {
        return {
            // Templates par industrie
            restaurant: {
                id: 'restaurant',
                name: 'Restaurant',
                icon: '🍽️',
                sections: ['hero', 'menu', 'gallery', 'reservations', 'contact', 'reviews'],
                colors: { primary: '#e74c3c', secondary: '#f39c12', accent: '#2c3e50' },
                fonts: { heading: 'Playfair Display', body: 'Inter' }
            },
            hotel: {
                id: 'hotel',
                name: 'Hotel / Hebergement',
                icon: '🏨',
                sections: ['hero', 'rooms', 'amenities', 'booking', 'gallery', 'location', 'reviews'],
                colors: { primary: '#2c3e50', secondary: '#f39c12', accent: '#e74c3c' },
                fonts: { heading: 'Montserrat', body: 'Open Sans' }
            },
            beauty: {
                id: 'beauty',
                name: 'Beaute / Coiffure / Spa',
                icon: '💄',
                sections: ['hero', 'services', 'gallery', 'booking', 'team', 'reviews', 'products'],
                colors: { primary: '#ec4899', secondary: '#f472b6', accent: '#fdf2f8' },
                fonts: { heading: 'Dancing Script', body: 'Inter' }
            },
            fitness: {
                id: 'fitness',
                name: 'Fitness / Sport',
                icon: '💪',
                sections: ['hero', 'classes', 'trainers', 'schedule', 'pricing', 'gallery', 'contact'],
                colors: { primary: '#ef4444', secondary: '#f97316', accent: '#1f2937' },
                fonts: { heading: 'Bebas Neue', body: 'Roboto' }
            },
            medical: {
                id: 'medical',
                name: 'Medical / Sante',
                icon: '🏥',
                sections: ['hero', 'services', 'doctors', 'appointments', 'testimonials', 'contact'],
                colors: { primary: '#0ea5e9', secondary: '#06b6d4', accent: '#f0f9ff' },
                fonts: { heading: 'Inter', body: 'Inter' }
            },
            lawyer: {
                id: 'lawyer',
                name: 'Avocat / Juridique',
                icon: '⚖️',
                sections: ['hero', 'practice-areas', 'team', 'cases', 'testimonials', 'contact'],
                colors: { primary: '#1e3a8a', secondary: '#3b82f6', accent: '#fef3c7' },
                fonts: { heading: 'Merriweather', body: 'Source Serif Pro' }
            },
            realestate: {
                id: 'realestate',
                name: 'Immobilier',
                icon: '🏠',
                sections: ['hero', 'properties', 'agents', 'services', 'testimonials', 'contact'],
                colors: { primary: '#059669', secondary: '#10b981', accent: '#f0fdf4' },
                fonts: { heading: 'Poppins', body: 'Inter' }
            },
            photographer: {
                id: 'photographer',
                name: 'Photographe',
                icon: '📸',
                sections: ['hero', 'portfolio', 'services', 'packages', 'about', 'contact', 'booking'],
                colors: { primary: '#111827', secondary: '#374151', accent: '#f9fafb' },
                fonts: { heading: 'Playfair Display', body: 'Inter' }
            },
            artisan: {
                id: 'artisan',
                name: 'Artisan / BTP',
                icon: '🔨',
                sections: ['hero', 'services', 'projects', 'certifications', 'team', 'quote', 'contact'],
                colors: { primary: '#ea580c', secondary: '#f97316', accent: '#fff7ed' },
                fonts: { heading: 'Roboto Slab', body: 'Roboto' }
            },
            consultant: {
                id: 'consultant',
                name: 'Consultant / Coach',
                icon: '💼',
                sections: ['hero', 'services', 'about', 'testimonials', 'blog', 'booking', 'contact'],
                colors: { primary: '#7c3aed', secondary: '#a855f7', accent: '#faf5ff' },
                fonts: { heading: 'Outfit', body: 'Inter' }
            },
            ecommerce: {
                id: 'ecommerce',
                name: 'E-commerce / Boutique',
                icon: '🛍️',
                sections: ['hero', 'featured-products', 'categories', 'offers', 'reviews', 'newsletter', 'contact'],
                colors: { primary: '#2563eb', secondary: '#3b82f6', accent: '#eff6ff' },
                fonts: { heading: 'Inter', body: 'Inter' }
            },
            event: {
                id: 'event',
                name: 'Evenementiel',
                icon: '🎉',
                sections: ['hero', 'services', 'gallery', 'packages', 'testimonials', 'booking', 'contact'],
                colors: { primary: '#db2777', secondary: '#f43f5e', accent: '#fdf2f8' },
                fonts: { heading: 'Dancing Script', body: 'Inter' }
            },
            education: {
                id: 'education',
                name: 'Education / Formation',
                icon: '🎓',
                sections: ['hero', 'courses', 'instructors', 'testimonials', 'about', 'enrollment', 'contact'],
                colors: { primary: '#0891b2', secondary: '#06b6d4', accent: '#f0f9ff' },
                fonts: { heading: 'Nunito', body: 'Inter' }
            }
        };
    }

    _initComponents() {
        return {
            // Composants UI disponibles
            hero: {
                id: 'hero',
                name: 'Hero / Banniere',
                category: 'layout',
                icon: '🎯',
                variants: ['centered', 'split', 'video-bg', 'slider', 'parallax', 'minimal'],
                props: {
                    title: { type: 'text', required: true },
                    subtitle: { type: 'textarea' },
                    ctaText: { type: 'text' },
                    ctaLink: { type: 'url' },
                    background: { type: 'media' },
                    overlay: { type: 'color' },
                    height: { type: 'select', options: ['auto', 'screen', 'large', 'small'] },
                    alignment: { type: 'select', options: ['center', 'left', 'right'] }
                }
            },
            services: {
                id: 'services',
                name: 'Services / Prestations',
                category: 'content',
                icon: '🔧',
                variants: ['grid-3', 'grid-4', 'list', 'cards', 'tabs', 'accordion'],
                props: {
                    title: { type: 'text' },
                    subtitle: { type: 'textarea' },
                    items: { type: 'repeatable', fields: ['title', 'description', 'icon', 'price', 'link'] },
                    columns: { type: 'number', default: 3 },
                    showPrice: { type: 'boolean', default: true },
                    showIcon: { type: 'boolean', default: true }
                }
            },
            gallery: {
                id: 'gallery',
                name: 'Galerie / Portfolio',
                category: 'media',
                icon: '🖼️',
                variants: ['masonry', 'grid', 'slider', 'carousel', 'lightbox', 'justified'],
                props: {
                    title: { type: 'text' },
                    images: { type: 'repeatable', fields: ['src', 'alt', 'caption', 'link'] },
                    columns: { type: 'number', default: 3 },
                    gap: { type: 'number', default: 16 },
                    aspectRatio: { type: 'select', options: ['1:1', '4:3', '16:9', '3:2', 'auto'] },
                    lightbox: { type: 'boolean', default: true },
                    lazyLoad: { type: 'boolean', default: true }
                }
            },
            testimonials: {
                id: 'testimonials',
                name: 'Temoignages / Avis',
                category: 'social-proof',
                icon: '⭐',
                variants: ['carousel', 'grid', 'list', 'masonry', 'video'],
                props: {
                    title: { type: 'text' },
                    items: { type: 'repeatable', fields: ['author', 'role', 'company', 'content', 'rating', 'avatar', 'date'] },
                    autoPlay: { type: 'boolean', default: true },
                    showRating: { type: 'boolean', default: true },
                    showAvatar: { type: 'boolean', default: true }
                }
            },
            team: {
                id: 'team',
                name: 'Equipe / Membres',
                category: 'content',
                icon: '👥',
                variants: ['grid', 'list', 'cards', 'carousel'],
                props: {
                    title: { type: 'text' },
                    members: { type: 'repeatable', fields: ['name', 'role', 'bio', 'avatar', 'social', 'email'] },
                    columns: { type: 'number', default: 4 },
                    showSocial: { type: 'boolean', default: true }
                }
            },
            contact: {
                id: 'contact',
                name: 'Contact / Formulaire',
                category: 'conversion',
                icon: '📞',
                variants: ['simple', 'detailed', 'split', 'sidebar', 'modal'],
                props: {
                    title: { type: 'text' },
                    subtitle: { type: 'textarea' },
                    fields: { type: 'repeatable', fields: ['name', 'type', 'required', 'placeholder'] },
                    showMap: { type: 'boolean', default: true },
                    showInfo: { type: 'boolean', default: true },
                    submitText: { type: 'text', default: 'Envoyer' },
                    redirectUrl: { type: 'url' }
                }
            },
            booking: {
                id: 'booking',
                name: 'Reservation / RDV',
                category: 'conversion',
                icon: '📅',
                variants: ['calendar', 'slots', 'form', 'widget'],
                props: {
                    title: { type: 'text' },
                    services: { type: 'repeatable', fields: ['name', 'duration', 'price', 'description'] },
                    timezone: { type: 'text', default: 'Africa/Abidjan' },
                    businessHours: { type: 'object' },
                    bufferTime: { type: 'number', default: 15 },
                    confirmationEmail: { type: 'boolean', default: true },
                    reminderSMS: { type: 'boolean', default: true }
                }
            },
            pricing: {
                id: 'pricing',
                name: 'Tarifs / Packages',
                category: 'conversion',
                icon: '💰',
                variants: ['table', 'cards', 'toggle', 'comparison'],
                props: {
                    title: { type: 'text' },
                    plans: { type: 'repeatable', fields: ['name', 'price', 'period', 'features', 'cta', 'popular', 'color'] },
                    currency: { type: 'select', options: ['XOF', 'EUR', 'USD', 'GHS', 'NGN'] },
                    billingToggle: { type: 'boolean', default: true }
                }
            },
            faq: {
                id: 'faq',
                name: 'FAQ / Questions frequentes',
                category: 'content',
                icon: '❓',
                variants: ['accordion', 'list', 'searchable', 'categorized'],
                props: {
                    title: { type: 'text' },
                    items: { type: 'repeatable', fields: ['question', 'answer', 'category'] },
                    searchable: { type: 'boolean', default: true }
                }
            },
            blog: {
                id: 'blog',
                name: 'Blog / Articles',
                category: 'content',
                icon: '📝',
                variants: ['grid', 'list', 'masonry', 'featured-sidebar', 'magazine'],
                props: {
                    title: { type: 'text' },
                    posts: { type: 'repeatable', fields: ['title', 'excerpt', 'image', 'date', 'author', 'category', 'readTime', 'link'] },
                    columns: { type: 'number', default: 3 },
                    showCategory: { type: 'boolean', default: true },
                    pagination: { type: 'boolean', default: true }
                }
            },
            newsletter: {
                id: 'newsletter',
                name: 'Newsletter / Inscription',
                category: 'conversion',
                icon: '📧',
                variants: ['inline', 'popup', 'footer', 'sidebar', 'modal'],
                props: {
                    title: { type: 'text' },
                    description: { type: 'textarea' },
                    placeholder: { type: 'text', default: 'Votre email' },
                    buttonText: { type: 'text', default: 'S\'abonner' },
                    gdprText: { type: 'textarea' },
                    successMessage: { type: 'text' }
                }
            },
            social: {
                id: 'social',
                name: 'Reseaux sociaux',
                category: 'social',
                icon: '📱',
                variants: ['icons', 'feed', 'share-buttons', 'follow-buttons', 'social-wall'],
                props: {
                    platforms: { type: 'multiselect', options: ['facebook', 'instagram', 'twitter', 'linkedin', 'youtube', 'tiktok', 'whatsapp', 'telegram'] },
                    style: { type: 'select', options: ['colored', 'monochrome', 'outlined', 'filled'] },
                    size: { type: 'select', options: ['sm', 'md', 'lg'] },
                    showCounts: { type: 'boolean', default: false }
                }
            },
            map: {
                id: 'map',
                name: 'Carte / Localisation',
                category: 'utility',
                icon: '🗺️',
                variants: ['google', 'mapbox', 'openstreetmap', 'static'],
                props: {
                    address: { type: 'text' },
                    lat: { type: 'number' },
                    lng: { type: 'number' },
                    zoom: { type: 'number', default: 15 },
                    marker: { type: 'boolean', default: true },
                    height: { type: 'number', default: 300 }
                }
            },
            video: {
                id: 'video',
                name: 'Video / Media',
                category: 'media',
                icon: '🎬',
                variants: ['youtube', 'vimeo', 'self-hosted', 'background', 'playlist'],
                props: {
                    src: { type: 'url' },
                    poster: { type: 'url' },
                    autoplay: { type: 'boolean', default: false },
                    loop: { type: 'boolean', default: false },
                    controls: { type: 'boolean', default: true },
                    muted: { type: 'boolean', default: true }
                }
            },
            counter: {
                id: 'counter',
                name: 'Compteurs / Statistiques',
                category: 'conversion',
                icon: '🔢',
                variants: ['simple', 'animated', 'circular', 'dashboard'],
                props: {
                    items: { type: 'repeatable', fields: ['label', 'value', 'suffix', 'prefix', 'icon', 'duration'] },
                    columns: { type: 'number', default: 4 }
                }
            },
            timeline: {
                id: 'timeline',
                name: 'Timeline / Histoire',
                category: 'content',
                icon: '📜',
                variants: ['vertical', 'horizontal', 'alternating', 'cards'],
                props: {
                    title: { type: 'text' },
                    events: { type: 'repeatable', fields: ['date', 'title', 'description', 'icon', 'image'] },
                    showDates: { type: 'boolean', default: true }
                }
            },
            cta: {
                id: 'cta',
                name: 'Call to Action',
                category: 'conversion',
                icon: '🎯',
                variants: ['banner', 'card', 'popup', 'sticky', 'floating'],
                props: {
                    title: { type: 'text' },
                    description: { type: 'textarea' },
                    buttonText: { type: 'text' },
                    buttonLink: { type: 'url' },
                    secondaryButton: { type: 'boolean', default: false },
                    background: { type: 'media' }
                }
            }
        };
    }

    _initAnimations() {
        return {
            entrance: [
                { id: 'fade-in', name: 'Apparition', css: 'animate-fade-in' },
                { id: 'slide-up', name: 'Glissement haut', css: 'animate-slide-up' },
                { id: 'slide-down', name: 'Glissement bas', css: 'animate-slide-down' },
                { id: 'slide-left', name: 'Glissement gauche', css: 'animate-slide-left' },
                { id: 'slide-right', name: 'Glissement droite', css: 'animate-slide-right' },
                { id: 'zoom-in', name: 'Zoom avant', css: 'animate-zoom-in' },
                { id: 'zoom-out', name: 'Zoom arriere', css: 'animate-zoom-out' },
                { id: 'flip-x', name: 'Rotation X', css: 'animate-flip-x' },
                { id: 'flip-y', name: 'Rotation Y', css: 'animate-flip-y' },
                { id: 'rotate-in', name: 'Rotation entree', css: 'animate-rotate-in' }
            ],
            hover: [
                { id: 'lift', name: 'Levitation', css: 'hover-lift' },
                { id: 'grow', name: 'Agrandissement', css: 'hover-grow' },
                { id: 'shrink', name: 'Retrecissement', css: 'hover-shrink' },
                { id: 'rotate', name: 'Rotation', css: 'hover-rotate' },
                { id: 'glow', name: 'Lueur', css: 'hover-glow' },
                { id: 'underline', name: 'Soulignement', css: 'hover-underline' },
                { id: 'border', name: 'Bordure', css: 'hover-border' },
                { id: 'shadow', name: 'Ombre', css: 'hover-shadow' }
            ],
            scroll: [
                { id: 'reveal', name: 'Revelation au scroll', css: 'scroll-reveal' },
                { id: 'parallax', name: 'Parallaxe', css: 'scroll-parallax' },
                { id: 'pin', name: 'Fixation', css: 'scroll-pin' },
                { id: 'progress', name: 'Barre progression', css: 'scroll-progress' }
            ],
            loading: [
                { id: 'skeleton', name: 'Squelette', css: 'loading-skeleton' },
                { id: 'spinner', name: 'Spinner', css: 'loading-spinner' },
                { id: 'pulse', name: 'Pulse', css: 'loading-pulse' },
                { id: 'shimmer', name: 'Scintillement', css: 'loading-shimmer' }
            ]
        };
    }

    _initColorPalettes() {
        return {
            professional: [
                { name: 'Corporate Blue', colors: ['#1e3a8a', '#3b82f6', '#60a5fa', '#dbeafe', '#eff6ff'] },
                { name: 'Executive Dark', colors: ['#111827', '#374151', '#6b7280', '#d1d5db', '#f9fafb'] },
                { name: 'Finance Green', colors: ['#065f46', '#10b981', '#34d399', '#a7f3d0', '#ecfdf5'] },
                { name: 'Legal Gold', colors: ['#92400e', '#f59e0b', '#fbbf24', '#fde68a', '#fffbeb'] }
            ],
            creative: [
                { name: 'Sunset Vibes', colors: ['#7f1d1d', '#ef4444', '#f97316', '#fbbf24', '#fff7ed'] },
                { name: 'Ocean Dreams', colors: ['#164e63', '#0ea5e9', '#06b6d4', '#67e8f9', '#f0f9ff'] },
                { name: 'Forest Fresh', colors: ['#14532d', '#22c55e', '#4ade80', '#86efac', '#f0fdf4'] },
                { name: 'Royal Purple', colors: ['#4c1d95', '#a855f7', '#d8b4fe', '#e9d5ff', '#faf5ff'] },
                { name: 'Pink Paradise', colors: ['#831843', '#ec4899', '#f472b6', '#fbcfe8', '#fdf2f8'] }
            ],
            african: [
                { name: 'Cote d\'Ivoire', colors: ['#f77f00', '#f8f400', '#009e60', '#1a1a2e', '#ffffff'] },
                { name: 'Senegal', colors: ['#00853f', '#fdef42', '#ef2b2d', '#1a1a2e', '#ffffff'] },
                { name: 'Ghana', colors: ['#ce1126', '#fcd116', '#006b3f', '#000000', '#ffffff'] },
                { name: 'Nigeria', colors: ['#008751', '#ffffff', '#fcd116', '#1a1a2e', '#ffffff'] },
                { name: 'Afrique Pan', colors: ['#000000', '#ffd700', '#ff0000', '#00ff00', '#ffffff'] }
            ],
            modern: [
                { name: 'Neon Cyber', colors: ['#0a0a0a', '#00ff88', '#0088ff', '#ff0088', '#ffff00'] },
                { name: 'Pastel Dreams', colors: ['#fdf2f8', '#fce7f3', '#fbcfe8', '#f9a8d4', '#f472b6'] },
                { name: 'Earth Tones', colors: ['#1c1917', '#78716c', '#a8a29e', '#d6d3d1', '#fafaf9'] },
                { name: 'Monochrome', colors: ['#000000', '#333333', '#666666', '#999999', '#ffffff'] }
            ],
            seasonal: [
                { name: 'Noel', colors: ['#7f1d1d', '#166534', '#fef3c7', '#ffffff', '#fef2f2'] },
                { name: 'Halloween', colors: ['#000000', '#ff6600', '#ffcc00', '#8b0000', '#ffffff'] },
                { name: 'Ete', colors: ['#ff6b35', '#f7931e', '#ffd166', '#06d6a0', '#118ab2'] },
                { name: 'Printemps', colors: ['#a8e6cf', '#dcedc1', '#ffd3b6', '#ffaaa5', '#ff8b94'] }
            ]
        };
    }

    _initFonts() {
        return {
            headings: [
                { id: 'inter', name: 'Inter', category: 'sans-serif', weights: ['300', '400', '500', '600', '700', '800', '900'] },
                { id: 'roboto', name: 'Roboto', category: 'sans-serif', weights: ['100', '300', '400', '500', '700', '900'] },
                { id: 'poppins', name: 'Poppins', category: 'sans-serif', weights: ['100', '200', '300', '400', '500', '600', '700', '800', '900'] },
                { id: 'montserrat', name: 'Montserrat', category: 'sans-serif', weights: ['100', '200', '300', '400', '500', '600', '700', '800', '900'] },
                { id: 'outfit', name: 'Outfit', category: 'sans-serif', weights: ['100', '200', '300', '400', '500', '600', '700', '800', '900'] },
                { id: 'nunito', name: 'Nunito', category: 'sans-serif', weights: ['200', '300', '400', '500', '600', '700', '800', '900'] },
                { id: 'playfair', name: 'Playfair Display', category: 'serif', weights: ['400', '500', '600', '700', '800', '900'] },
                { id: 'merriweather', name: 'Merriweather', category: 'serif', weights: ['300', '400', '700', '900'] },
                { id: 'source-serif', name: 'Source Serif Pro', category: 'serif', weights: ['200', '300', '400', '600', '700', '900'] },
                { id: 'roboto-slab', name: 'Roboto Slab', category: 'slab', weights: ['100', '200', '300', '400', '500', '600', '700', '800', '900'] },
                { id: 'dancing-script', name: 'Dancing Script', category: 'handwriting', weights: ['400', '500', '600', '700'] },
                { id: 'bebas', name: 'Bebas Neue', category: 'display', weights: ['400'] },
                { id: 'oswald', name: 'Oswald', category: 'sans-serif', weights: ['200', '300', '400', '500', '600', '700'] }
            ],
            body: [
                { id: 'inter', name: 'Inter', category: 'sans-serif', weights: ['300', '400', '500', '600', '700'] },
                { id: 'roboto', name: 'Roboto', category: 'sans-serif', weights: ['100', '300', '400', '500', '700'] },
                { id: 'open-sans', name: 'Open Sans', category: 'sans-serif', weights: ['300', '400', '500', '600', '700', '800'] },
                { id: 'source-sans', name: 'Source Sans Pro', category: 'sans-serif', weights: ['200', '300', '400', '600', '700', '900'] },
                { id: 'lato', name: 'Lato', category: 'sans-serif', weights: ['100', '300', '400', '700', '900'] },
                { id: 'pt-sans', name: 'PT Sans', category: 'sans-serif', weights: ['400', '700'] },
                { id: 'ibm-plex', name: 'IBM Plex Sans', category: 'sans-serif', weights: ['100', '200', '300', '400', '500', '600', '700'] }
            ]
        };
    }

    // Generate complete page from template
    generatePage(templateId, customizations = {}) {
        const template = this.templates[templateId];
        if (!template) return null;

        const page = {
            id: `page_${Date.now()}`,
            templateId,
            name: customizations.name || template.name,
            sections: template.sections.map(sectionId => {
                const component = this.components[sectionId];
                return {
                    id: `${sectionId}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
                    type: sectionId,
                    component: component,
                    variant: customizations[`${sectionId}_variant`] || component.variants[0],
                    props: { ...component.props, ...customizations[`${sectionId}_props`] },
                    animation: customizations[`${sectionId}_animation`] || 'fade-in',
                    order: template.sections.indexOf(sectionId)
                };
            }),
            theme: {
                colors: customizations.colors || template.colors,
                fonts: customizations.fonts || template.fonts,
                spacing: customizations.spacing || 'normal',
                borderRadius: customizations.borderRadius || 'md'
            },
            settings: {
                rtl: customizations.rtl || false,
                lang: customizations.lang || 'fr',
                animations: customizations.animations !== false,
                lazyLoad: true,
                seo: customizations.seo || {}
            },
            createdAt: new Date().toISOString()
        };

        return page;
    }

    // Generate CSS for page
    generateCSS(page) {
        const { theme } = page;
        let css = `
:root {
    --color-primary: ${theme.colors.primary};
    --color-primary-hover: ${this._adjustColor(theme.colors.primary, -20)};
    --color-primary-light: ${this._adjustColor(theme.colors.primary, 40)};
    --color-secondary: ${theme.colors.secondary};
    --color-accent: ${theme.colors.accent};
    --color-background: ${theme.colors.background || '#ffffff'};
    --color-surface: ${theme.colors.surface || '#f8f9fa'};
    --color-text: ${theme.colors.text || '#1a1a2e'};
    --color-text-light: ${theme.colors.textLight || '#666'};
    --color-border: ${theme.colors.border || '#e0e0e0'};
    --font-heading: '${theme.fonts.heading}', system-ui, sans-serif;
    --font-body: '${theme.fonts.body}', system-ui, sans-serif;
    --spacing-xs: 4px;
    --spacing-sm: 8px;
    --spacing-md: 16px;
    --spacing-lg: 24px;
    --spacing-xl: 32px;
    --spacing-2xl: 48px;
    --radius-sm: 4px;
    --radius-md: 8px;
    --radius-lg: 12px;
    --radius-xl: 16px;
    --shadow-sm: 0 1px 3px rgba(0,0,0,0.1);
    --shadow-md: 0 4px 12px rgba(0,0,0,0.15);
    --shadow-lg: 0 8px 24px rgba(0,0,0,0.2);
    --transition-fast: 150ms ease;
    --transition-normal: 250ms ease;
    --transition-slow: 350ms ease;
}

* { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; }
body { font-family: var(--font-body); color: var(--color-text); background: var(--color-background); line-height: 1.6; }
h1,h2,h3,h4,h5,h6 { font-family: var(--font-heading); font-weight: 600; line-height: 1.3; color: var(--color-text); }
a { color: var(--color-primary); text-decoration: none; transition: color var(--transition-fast); }
a:hover { color: var(--color-primary-hover); }
img { max-width: 100%; height: auto; display: block; }
button { font-family: inherit; cursor: pointer; border: none; background: none; }
input, textarea, select { font-family: inherit; font-size: 1rem; padding: 12px 16px; border: 1px solid var(--color-border); border-radius: var(--radius-md); background: var(--color-background); color: var(--color-text); }
input:focus, textarea:focus, select:focus { outline: none; border-color: var(--color-primary); box-shadow: 0 0 0 3px var(--color-primary-light); }

/* Utility classes */
.container { max-width: 1200px; margin: 0 auto; padding: 0 var(--spacing-md); }
.section { padding: var(--spacing-2xl) 0; }
.section-sm { padding: var(--spacing-lg) 0; }
.section-lg { padding: calc(var(--spacing-2xl) * 2) 0; }

/* Grid system */
.grid { display: grid; gap: var(--spacing-lg); }
.grid-2 { grid-template-columns: repeat(2, 1fr); }
.grid-3 { grid-template-columns: repeat(3, 1fr); }
.grid-4 { grid-template-columns: repeat(4, 1fr); }
@media (max-width: 1024px) { .grid-4 { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 768px) { .grid-3, .grid-4, .grid-2 { grid-template-columns: 1fr; } }

/* Flex utilities */
.flex { display: flex; }
.flex-center { display: flex; align-items: center; justify-content: center; }
.flex-between { display: flex; align-items: center; justify-content: space-between; }
.flex-col { flex-direction: column; }
.gap-sm { gap: var(--spacing-sm); }
.gap-md { gap: var(--spacing-md); }
.gap-lg { gap: var(--spacing-lg); }

/* Buttons */
.btn { display: inline-flex; align-items: center; justify-content: center; gap: var(--spacing-sm); padding: 12px 24px; border-radius: var(--radius-md); font-weight: 600; font-size: 1rem; transition: all var(--transition-fast); }
.btn-primary { background: var(--color-primary); color: white; }
.btn-primary:hover { background: var(--color-primary-hover); transform: translateY(-2px); box-shadow: var(--shadow-md); }
.btn-secondary { background: var(--color-secondary); color: white; }
.btn-outline { background: transparent; border: 2px solid var(--color-primary); color: var(--color-primary); }
.btn-outline:hover { background: var(--color-primary); color: white; }
.btn-ghost { background: transparent; color: var(--color-text); }
.btn-ghost:hover { background: var(--color-surface); }
.btn-sm { padding: 8px 16px; font-size: 0.875rem; }
.btn-lg { padding: 16px 32px; font-size: 1.125rem; }

/* Cards */
.card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: var(--spacing-lg); transition: all var(--transition-normal); }
.card:hover { box-shadow: var(--shadow-lg); transform: translateY(-4px); }
.card-image { width: 100%; height: 200px; object-fit: cover; border-radius: var(--radius-md) var(--radius-md) 0 0; }
.card-content { padding: var(--spacing-md); }
.card-title { font-size: 1.125rem; font-weight: 600; margin-bottom: var(--spacing-sm); }
.card-text { color: var(--color-text-light); font-size: 0.9375rem; line-height: 1.6; }

/* Animations */
@keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes slide-up { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
@keyframes slide-down { from { opacity: 0; transform: translateY(-30px); } to { opacity: 1; transform: translateY(0); } }
@keyframes slide-left { from { opacity: 0; transform: translateX(30px); } to { opacity: 1; transform: translateX(0); } }
@keyframes slide-right { from { opacity: 0; transform: translateX(-30px); } to { opacity: 1; transform: translateX(0); } }
@keyframes zoom-in { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
@keyframes zoom-out { from { opacity: 0; transform: scale(1.1); } to { opacity: 1; transform: scale(1); } }
@keyframes flip-x { from { opacity: 0; transform: rotateX(90deg); } to { opacity: 1; transform: rotateX(0); } }
@keyframes flip-y { from { opacity: 0; transform: rotateY(90deg); } to { opacity: 1; transform: rotateY(0); } }
@keyframes rotate-in { from { opacity: 0; transform: rotate(-10deg) scale(0.9); } to { opacity: 1; transform: rotate(0) scale(1); } }

.animate-fade-in { animation: fade-in 0.6s ease forwards; }
.animate-slide-up { animation: slide-up 0.6s ease forwards; }
.animate-slide-down { animation: slide-down 0.6s ease forwards; }
.animate-slide-left { animation: slide-left 0.6s ease forwards; }
.animate-slide-right { animation: slide-right 0.6s ease forwards; }
.animate-zoom-in { animation: zoom-in 0.6s ease forwards; }
.animate-zoom-out { animation: zoom-out 0.6s ease forwards; }
.animate-flip-x { animation: flip-x 0.6s ease forwards; }
.animate-flip-y { animation: flip-y 0.6s ease forwards; }
.animate-rotate-in { animation: rotate-in 0.6s ease forwards; }

/* Stagger delays */
.delay-1 { animation-delay: 100ms; }
.delay-2 { animation-delay: 200ms; }
.delay-3 { animation-delay: 300ms; }
.delay-4 { animation-delay: 400ms; }
.delay-5 { animation-delay: 500ms; }
.delay-6 { animation-delay: 600ms; }

/* Hover animations */
.hover-lift { transition: transform var(--transition-normal), box-shadow var(--transition-normal); }
.hover-lift:hover { transform: translateY(-8px); box-shadow: var(--shadow-lg); }
.hover-grow { transition: transform var(--transition-normal); }
.hover-grow:hover { transform: scale(1.05); }
.hover-shrink { transition: transform var(--transition-normal); }
.hover-shrink:hover { transform: scale(0.95); }
.hover-rotate { transition: transform var(--transition-normal); }
.hover-rotate:hover { transform: rotate(5deg); }
.hover-glow { transition: box-shadow var(--transition-normal); }
.hover-glow:hover { box-shadow: 0 0 30px var(--color-primary-light); }
.hover-underline { position: relative; }
.hover-underline::after { content: ''; position: absolute; bottom: -4px; left: 0; width: 0; height: 2px; background: var(--color-primary); transition: width var(--transition-normal); }
.hover-underline:hover::after { width: 100%; }

/* Scroll reveal */
.scroll-reveal { opacity: 0; transform: translateY(30px); transition: opacity 0.6s ease, transform 0.6s ease; }
.scroll-reveal.visible { opacity: 1; transform: translateY(0); }

/* RTL support */
[dir="rtl"] { direction: rtl; text-align: right; }
[dir="rtl"] .grid { direction: rtl; }
[dir="rtl"] .flex { flex-direction: row-reverse; }
[dir="rtl"] .btn { flex-direction: row-reverse; }
[dir="rtl"] .card { text-align: right; }
`;

        if (page.settings.rtl) {
            css += bidirectional.generateRTLCSS('', page.settings.lang);
        }

        return css;
    }

    _adjustColor(color, amount) {
        const hex = color.replace('#', '');
        const num = parseInt(hex, 16);
        const r = Math.max(0, Math.min(255, (num >> 16) + amount));
        const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount));
        const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount));
        return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }

    // Get all available data for editor
    getEditorData() {
        return {
            templates: this.templates,
            components: this.components,
            animations: this.animations,
            colorPalettes: this.colorPalettes,
            fonts: this.fonts
        };
    }
}

// Import bidirectional
const bidirectional = require('./bidirectional');

module.exports = new EnhancedDesignStudio();