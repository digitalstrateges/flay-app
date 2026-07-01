/**
 * Flay Design Studio
 * Studio de creation graphique - Upload, Logo, Signature, Géoloc, Vitrine
 */

const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

class DesignStudio {
    constructor() {
        this.uploadDir = path.join(__dirname, 'uploads');
        this.ensureDirs();
    }

    ensureDirs() {
        const dirs = ['avatars', 'logos', 'signatures', 'banners', 'cards', 'gallery', 'temp'];
        dirs.forEach(dir => {
            const p = path.join(this.uploadDir, dir);
            if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
        });
    }

    generateUploadId(userId, type) {
        return `upload_${userId}_${type}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    }

    getFilePath(type, filename) {
        return path.join(this.uploadDir, type, filename);
    }

    getServePath(type, filename) {
        return `/uploads/${type}/${filename}`;
    }

    /**
     * Génère les métadonnées d'image pour le profil
     */
    processImageMetadata(type, size, position, opacity, filters = {}) {
        return {
            type,
            dimensions: size || { width: 200, height: 200 },
            position: position || { x: 0, y: 0 },
            opacity: opacity || 1,
            filters: {
                brightness: filters.brightness || 100,
                contrast: filters.contrast || 100,
                saturation: filters.saturation || 100,
                blur: filters.blur || 0,
                grayscale: filters.grayscale || false
            },
            uploadedAt: new Date().toISOString()
        };
    }

    /**
     * Génère les paramètres de géolocalisation
     */
    generateGeoLocation(lat, lng, address = '', city = '', country = 'Côte d\'Ivoire') {
        return {
            latitude: lat,
            longitude: lng,
            address,
            city,
            country,
            mapUrl: `https://www.google.com/maps?q=${lat},${lng}`,
            embedUrl: `https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3972.5!2d${lng}!3d${lat}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2z${lat},${lng}!5e0!3m2!1sfr!2sci!4v1`,
            coordinates: { lat: parseFloat(lat), lng: parseFloat(lng) }
        };
    }

    /**
     * Génère le template de site vitrine complet
     */
    generateShowcaseSite(profile, user, options = {}) {
        const theme = options.theme || profile.theme || 'dark';
        const lang = options.lang || 'fr';
        const colors = this.getThemeCSS(theme, profile.plan);
        const ecom = options.ecommerce || {};
        const hasStore = ecom.hasStore && ecom.storeUrl;
        const storeProducts = ecom.products || [];

        return `<!DOCTYPE html>
<html lang="${lang}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.esc(user.name)} - ${profile.title || 'Professionnel'}</title>
    <meta name="description" content="${this.esc(profile.bio?.substring(0, 160) || '')}">
    <meta property="og:title" content="${this.esc(user.name)}">
    <meta property="og:description" content="${this.esc(profile.bio?.substring(0, 200) || '')}">
    ${profile.avatar ? `<meta property="og:image" content="${profile.avatar}">` : ''}
    <style>${this.getFullCSS(colors, theme)}
    .site-nav{display:flex;align-items:center;justify-content:space-between;padding:.75rem 1.5rem;background:rgba(0,0,0,.3);backdrop-filter:blur(12px);position:fixed;top:0;left:0;right:0;z-index:100;border-bottom:1px solid var(--border)}
    .site-nav-brand{font-weight:700;color:var(--text);text-decoration:none;font-size:1.1rem}
    .site-nav-links{display:flex;gap:.5rem;align-items:center}
    .site-nav-link{color:var(--muted);text-decoration:none;padding:.4rem 1rem;border-radius:999px;font-size:.875rem;transition:all .2s}
    .site-nav-link:hover{color:var(--text);background:rgba(255,255,255,.08)}
    .site-nav-link.active{color:var(--accent);background:rgba(99,102,241,.15)}
    .products-mini-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:1rem;margin-top:1rem}
    .product-mini-card{background:var(--cardBg);border-radius:12px;padding:1rem;border:1px solid var(--border);transition:transform .2s,box-shadow .2s;text-decoration:none;color:inherit}
    .product-mini-card:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,.3)}
    .product-mini-name{font-size:.95rem;font-weight:600;color:var(--text);margin-bottom:.25rem}
    .product-mini-price{font-size:1.1rem;font-weight:700;color:var(--accent)}
    .product-mini-desc{font-size:.8rem;color:var(--textLight);margin-top:.25rem;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
    .store-cta{text-align:center;margin-top:1.5rem}
    .badge-store{background:linear-gradient(135deg,var(--accent),#a855f7);color:#fff;padding:.3rem .8rem;border-radius:999px;font-size:.75rem;font-weight:600}
    .nav-store-link{display:inline-flex;align-items:center;gap:.5rem;padding:.4rem 1.2rem!important;background:linear-gradient(135deg,var(--accent),#a855f7);color:#fff!important;border-radius:999px!important;font-weight:500}
    .nav-store-link:hover{opacity:.9;background:linear-gradient(135deg,var(--accent),#a855f7)!important}
    </style>
</head>
<body>
    <nav class="site-nav">
        <a href="/${user.username || profile.slug}" class="site-nav-brand">${this.esc(user.name)}</a>
        <div class="site-nav-links">
            <a href="#services" class="site-nav-link">Services</a>
            <a href="#about" class="site-nav-link">A propos</a>
            <a href="#contact" class="site-nav-link">Contact</a>
            ${hasStore ? `<a href="${ecom.storeUrl}" class="site-nav-link nav-store-link">🛍️ Boutique</a>` : ''}
        </div>
    </nav>
    <div class="vitrine" id="vitrine">
        <div class="vitrine-bg"></div>

        <!-- HERO SECTION -->
        <section class="hero">
            <div class="hero-content">
                ${profile.avatar ? `<img src="${profile.avatar}" alt="${this.esc(user.name)}" class="hero-avatar">` : `<div class="hero-avatar-placeholder">${(user.name || '?')[0]}</div>`}
                <h1 class="hero-name">${this.esc(user.name)}</h1>
                ${profile.title ? `<p class="hero-title">${this.esc(profile.title)}</p>` : ''}
                <div class="hero-badges">
                    ${profile.plan === 'pro' ? '<span class="badge badge-pro"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="vertical-align:-2px"><path d="M20 6L9 17l-5-5"/></svg> PRO</span>' : ''}
                    ${profile.plan === 'premium' ? '<span class="badge badge-premium"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="vertical-align:-2px"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26"/></svg> PREMIUM</span>' : ''}
                </div>
                ${profile.bio ? `<p class="hero-bio">${this.esc(profile.bio)}</p>` : ''}
                <div class="hero-location">
                    ${profile.location ? `&#128205; ${this.esc(profile.location)}` : ''}
                    ${profile.phone ? `&nbsp;&bull;&nbsp; &#128222; ${this.esc(profile.phone)}` : ''}
                </div>
                <div class="hero-actions">
                    <a href="${profile.phone ? 'https://wa.me/' + profile.phone.replace(/[^0-9]/g, '') : '#'}" class="btn btn-primary" target="_blank">Contacter sur WhatsApp</a>
                    <a href="#services" class="btn btn-secondary">Voir les services</a>
                </div>
            </div>
        </section>

                <!-- SERVICES SECTION -->
        <section class="section services-section" id="services">
            <div class="container">
                <h2 class="section-title">Nos Services</h2>
                <p class="section-subtitle">Des solutions sur mesure pour votre reussite</p>
                <div class="services-grid">
                    ${(profile.services || []).map(s => `
                    <div class="service-card">
                        <div class="service-header">
                            <h3 class="service-name">${this.esc(s.name)}</h3>
                            ${s.price ? `<div class="service-price">${this.esc(s.price)}</div>` : ''}
                        </div>
                        ${s.description ? `<p class="service-desc">${this.esc(s.description)}</p>` : ''}
                        <a href="${profile.phone ? 'https://wa.me/' + profile.phone.replace(/[^0-9]/g, '') + '?text=' + encodeURIComponent('Bonjour, je suis intéressé par: ' + s.name) : '#'}" class="service-cta" target="_blank">Demander ce service</a>
                    </div>`).join('')}
                </div>
            </div>
        </section>

        <!-- ABOUT SECTION -->
        <section class="section about-section" id="about">
            <div class="container">
                <h2 class="section-title">A propos</h2>
                <p class="section-subtitle">Une vision, une mission, l'excellence</p>
                <div class="about-content">
                    ${profile.avatar ? `<img src="${profile.avatar}" alt="${this.esc(user.name)}" class="about-avatar">` : ''}
                    <div class="about-text">
                        <p>${this.esc(profile.bio || 'Professionnel passionne et dedie a la satisfaction de ses clients. Nous mettons notre expertise au service de votre reussite.')}</p>
                        ${profile.location ? `<div class="about-location">&#128205; ${this.esc(profile.location)}</div>` : ''}
                        <div class="hero-stats" style="margin-top:24px;padding-top:24px;border-top:1px solid var(--border)">
                            <div class="hero-stat"><div class="hero-stat-value">5+</div><div class="hero-stat-label">Annees exp.</div></div>
                            <div class="hero-stat"><div class="hero-stat-value">200+</div><div class="hero-stat-label">Clients</div></div>
                            <div class="hero-stat"><div class="hero-stat-value">98%</div><div class="hero-stat-label">Satisfaction</div></div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- GALLERY SECTION -->
        ${(profile.gallery && profile.gallery.length > 0) ? `
        <section class="section gallery-section" id="gallery">
            <div class="container">
                <h2 class="section-title">Galerie</h2>
                <p class="section-subtitle">Un apercu de notre travail</p>
                <div class="gallery-grid">
                    ${profile.gallery.map(img => `<div class="gallery-item"><img src="${img}" alt="Galerie" loading="lazy"></div>`).join('')}
                </div>
            </div>
        </section>` : ''}

        <!-- MAP SECTION -->
        ${(() => {
            const ld = profile.locationData || {};
            const gl = profile.geoLocation || {};
            const mLat = ld.lat || gl.latitude || null;
            const mLng = ld.lng || gl.longitude || null;
            const mAddr = ld.address || gl.address || (typeof profile.location === 'string' ? profile.location : '') || '';
            if (!mLat && !mLng && !mAddr) return '';
            const lat = parseFloat(mLat) || 5.36;
            const lng = parseFloat(mLng) || -4.01;
            return `
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <section class="section map-section" id="location">
            <div class="container">
                <h2 class="section-title">&#128205; Localisation</h2>
                <div class="map-container">
                    <div id="profileMap" style="height:300px;border-radius:12px;"></div>
                    ${mAddr ? `<p class="map-address">${this.esc(mAddr)}</p>` : ''}
                </div>
            </div>
        </section>
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <script>
            (function(){
                try {
                    var map = L.map('profileMap', { scrollWheelZoom: false }).setView([${lat}, ${lng}], 15);
                    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                        attribution: '&copy; OpenStreetMap',
                        maxZoom: 19
                    }).addTo(map);
                    L.marker([${lat}, ${lng}]).addTo(map);
                    setTimeout(function(){ map.invalidateSize(); }, 500);
                } catch(e) {}
            })();
        </script>` ;
        })()}

        ${storeProducts.length > 0 ? `
        <!-- STORE SECTION -->
        <section class="section" id="store" style="background:rgba(0,0,0,.15)">
            <div class="container">
                <h2 class="section-title">Boutique ${hasStore ? `<span class="badge-store">En ligne</span>` : ''}</h2>
                <p class="section-subtitle">Decouvrez nos produits et services</p>
                <div class="products-mini-grid">
                    ${storeProducts.map(p => `
                    <a href="${ecom.storeUrl}/../product/${p.id}" class="product-mini-card">
                        ${p.image ? `<img src="${p.image}" alt="${this.esc(p.name)}">` : ''}
                        <div class="product-mini-body">
                            <div class="product-mini-name">${this.esc(p.name)}</div>
                            <div class="product-mini-price">${(p.price || 0).toLocaleString()} FCFA</div>
                            ${p.shortDescription ? `<div class="product-mini-desc">${this.esc(p.shortDescription)}</div>` : ''}
                        </div>
                    </a>`).join('')}
                </div>
                <div class="store-cta">
                    <a href="${ecom.storeUrl}" class="btn btn-primary">Voir toute la boutique</a>
                </div>
            </div>
        </section>` : hasStore ? `
        <section class="section" id="store" style="background:rgba(0,0,0,.15);text-align:center;padding:3rem 1rem">
            <div class="container">
                <h2 class="section-title">Boutique</h2>
                <p style="color:var(--textLight);margin-bottom:1.5rem">Decouvrez nos produits et services</p>
                <a href="${ecom.storeUrl}" class="btn btn-primary">Visiter la boutique</a>
            </div>
        </section>` : ''}

        <!-- TESTIMONIALS SECTION -->
        <section class="section testimonials-section" id="testimonials">
            <div class="container">
                <h2 class="section-title">Avis Clients</h2>
                <p class="section-subtitle">Ce que disent nos clients</p>
                <div class="testimonials-grid">
                    <div class="testimonial-card">
                        <div class="testimonial-text">Service exceptionnel ! Le travail est toujours fait avec professionnalisme et dans les delais. Je recommande vivement.</div>
                        <div class="testimonial-author">Aminata K.</div>
                        <div class="testimonial-role">Cliente reguliere</div>
                        <div class="testimonial-stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
                    </div>
                    <div class="testimonial-card">
                        <div class="testimonial-text">Un vrai professionnel. La qualite du travail est au rendez-vous et le rapport qualite-prix est excellent.</div>
                        <div class="testimonial-author">Jean-Pierre M.</div>
                        <div class="testimonial-role">Entrepreneur</div>
                        <div class="testimonial-stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
                    </div>
                    <div class="testimonial-card">
                        <div class="testimonial-text">Je suis tres satisfait du service. L'equipe est reactive et a toujours trouve des solutions a mes problemes.</div>
                        <div class="testimonial-author">Fatou B.</div>
                        <div class="testimonial-role">Chef d'entreprise</div>
                        <div class="testimonial-stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
                    </div>
                </div>
            </div>
        </section>

        <!-- RESERVATION SECTION -->
        <section class="section reservation-section" id="reservation">
            <div class="container">
                <h2 class="section-title">&#128197; Reservation</h2>
                <form class="reservation-form" id="reservationForm">
                    <div class="form-row">
                        <input type="text" name="name" placeholder="Votre nom" required>
                        <input type="tel" name="phone" placeholder="Votre telephone" required>
                    </div>
                    <div class="form-row">
                        <select name="service" required>
                            <option value="">Choisir un service</option>
                            ${(profile.services || []).map(s => `<option value="${this.esc(s.name)}">${this.esc(s.name)} ${s.price ? '- ' + s.price : ''}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-row">
                        <input type="date" name="date" required>
                        <input type="time" name="time" required>
                    </div>
                    <textarea name="message" placeholder="Message (optionnel)" rows="3"></textarea>
                    <button type="submit" class="btn btn-primary btn-full">Envoyer la reservation</button>
                </form>
            </div>
        </section>

        <!-- FAQ SECTION -->
        <section class="section" id="faq">
            <div class="container">
                <h2 class="section-title">Questions Frequentes</h2>
                <p class="section-subtitle">Trouvez reponse a vos interrogations</p>
                <div class="faq-list">
                    <div class="faq-item">
                        <div class="faq-question" onclick="this.parentElement.classList.toggle('open')">Comment prendre rendez-vous ?</div>
                        <div class="faq-answer">Vous pouvez prendre rendez-vous via le formulaire de reservation ci-dessus, ou nous contacter directement par telephone ou WhatsApp.</div>
                    </div>
                    <div class="faq-item">
                        <div class="faq-question" onclick="this.parentElement.classList.toggle('open')">Quels sont vos delais d'intervention ?</div>
                        <div class="faq-answer">Nos delais varient selon le type de service. Contactez-nous pour une estimation precise adaptee a votre projet.</div>
                    </div>
                    <div class="faq-item">
                        <div class="faq-question" onclick="this.parentElement.classList.toggle('open')">Acceptez-vous les paiements mobiles ?</div>
                        <div class="faq-answer">Oui, nous acceptons Wave, Orange Money, MTN Mobile Money et les virements bancaires pour votre commodite.</div>
                    </div>
                    <div class="faq-item">
                        <div class="faq-question" onclick="this.parentElement.classList.toggle('open')">Proposez-vous des devis gratuits ?</div>
                        <div class="faq-answer">Oui, tous nos devis sont 100% gratuits et sans engagement. Contactez-nous pour recevoir une estimation detaillee.</div>
                    </div>
                </div>
            </div>
        </section>

        <!-- CONTACT SECTION -->
        <section class="section contact-section" id="contact">
            <div class="container">
                <h2 class="section-title">Contact</h2>
                <p class="section-subtitle">Nous sommes a votre ecoute</p>
                <div class="contact-grid">
                    ${profile.phone ? `<a href="tel:${profile.phone}" class="contact-card"><div class="contact-icon">&#128222;</div><div class="contact-label">Telephone</div><div class="contact-value">${this.esc(profile.phone)}</div></a>` : ''}
                    ${profile.email ? `<a href="mailto:${profile.email}" class="contact-card"><div class="contact-icon">&#9993;</div><div class="contact-label">Email</div><div class="contact-value">${this.esc(profile.email)}</div></a>` : ''}
                    ${profile.location ? `<div class="contact-card"><div class="contact-icon">&#128205;</div><div class="contact-label">Localisation</div><div class="contact-value">${this.esc(profile.location)}</div></div>` : ''}
                    ${profile.website ? `<a href="${profile.website}" target="_blank" class="contact-card"><div class="contact-icon">&#127760;</div><div class="contact-label">Site web</div><div class="contact-value">${this.esc(profile.website)}</div></a>` : ''}
                </div>
                <div class="social-links">
                    ${profile.socials?.facebook ? `<a href="${profile.socials.facebook}" target="_blank" class="social-btn facebook">Facebook</a>` : ''}
                    ${profile.socials?.instagram ? `<a href="${profile.socials.instagram}" target="_blank" class="social-btn instagram">Instagram</a>` : ''}
                    ${profile.socials?.twitter ? `<a href="${profile.socials.twitter}" target="_blank" class="social-btn twitter">Twitter</a>` : ''}
                    ${profile.socials?.linkedin ? `<a href="${profile.socials.linkedin}" target="_blank" class="social-btn linkedin">LinkedIn</a>` : ''}
                    ${profile.socials?.tiktok ? `<a href="${profile.socials.tiktok}" target="_blank" class="social-btn tiktok">TikTok</a>` : ''}
                    ${profile.socials?.youtube ? `<a href="${profile.socials.youtube}" target="_blank" class="social-btn youtube">YouTube</a>` : ''}
                </div>
            </div>
        </section>

        <!-- FOOTER -->
        <footer class="footer">
            <div class="container">
                <div class="footer-wave">
                    <p>Paiement Wave: <strong>${this.esc(user.name)}</strong></p>
                    <p class="footer-wave-url">flay.app/${this.esc(user.username)}</p>
                </div>
                <div class="footer-credits">
                    Propulse par <strong>Flay</strong> &mdash; L'economie connectee<br>
                    <span style="font-size:12px;opacity:0.7">DIGITALSTRATEGES | +225 07 59 73 19 90</span>
                </div>
                <div class="footer-brand">Flay</div>
            </div>
        </footer>
    </div>

    <script>
        document.getElementById('reservationForm')?.addEventListener('submit', async function(e) {
            e.preventDefault();
            const data = Object.fromEntries(new FormData(this));
            data.profileId = '${profile.slug || user.username}';
            try {
                const res = await fetch('/api/reservations', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                if (res.ok) {
                    alert('Reservation envoyee avec succes !');
                    this.reset();
                } else {
                    alert('Erreur lors de l\\'envoi. Reessayez.');
                }
            } catch(err) {
                alert('Erreur reseau. Reessayez.');
            }
        });

        // Smooth scroll
        document.querySelectorAll('a[href^="#"]').forEach(a => {
            a.addEventListener('click', function(e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) target.scrollIntoView({ behavior: 'smooth' });
            });
        });

        // Parallax effect
        window.addEventListener('scroll', function() {
            const scrolled = window.pageYOffset;
            const bg = document.querySelector('.vitrine-bg');
            if (bg) bg.style.transform = 'translateY(' + (scrolled * 0.5) + 'px)';
        });

        // Scroll reveal animation
        const observerOptions = { threshold: 0.1, rootMargin: '0px 0px -50px 0px' };
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);
        document.querySelectorAll('.service-card, .testimonial-card, .contact-card, .product-mini-card, .gallery-item, .faq-item').forEach(el => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(30px)';
            el.style.transition = 'all 0.6s cubic-bezier(0.4,0,0.2,1)';
            observer.observe(el);
        });

        // Animated counter for stats
        function animateCounters() {
            document.querySelectorAll('.hero-stat-value').forEach(el => {
                const target = parseInt(el.textContent) || 0;
                const suffix = el.textContent.replace(/[0-9]/g, '');
                let current = 0;
                const step = Math.ceil(target / 40);
                const timer = setInterval(() => {
                    current += step;
                    if (current >= target) {
                        current = target;
                        clearInterval(timer);
                    }
                    el.textContent = current + suffix;
                }, 30);
            });
        }
        setTimeout(animateCounters, 500);
    </script>
    <script>
    (function(){
        var vid=document.cookie.match('(^|;) ?_flay_vid=([^;]*)(;|$)');
        if(!vid){vid='flay_'+Date.now()+'_'+Math.random().toString(36).slice(2,8);document.cookie='_flay_vid='+vid+';max-age=31536000;path=/;SameSite=Lax';}
        else vid=vid[2];
        var sid='sess_'+Date.now()+'_'+Math.random().toString(36).slice(2,8);
        var ua=navigator.userAgent;
        var dev='desktop';if(/mobile|android|iphone/i.test(ua))dev='mobile';else if(/tablet|ipad/i.test(ua))dev='tablet';
        var br='Other';if(ua.includes('Chrome')&&!ua.includes('Edg'))br='Chrome';else if(ua.includes('Firefox'))br='Firefox';else if(ua.includes('Safari')&&!ua.includes('Chrome'))br='Safari';else if(ua.includes('Edg'))br='Edge';
        function send(ev,d){try{var c=document.cookie.match('(^|;) ?_flay_consent=([^;]*)(;|$)');var con=c?JSON.parse(c[2]):{};if(ev!=='pageview'&&!con.analytics)return;d.event=ev;d.visitorId=vid;d.userId='${user.id}';d.timestamp=new Date().toISOString();if(navigator.sendBeacon){navigator.sendBeacon('/api/tracking/track',new Blob([JSON.stringify(d)],{type:'application/json'}));}else{fetch('/api/tracking/track',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d),keepalive:true});}}catch(e){}}
        send('pageview',{page:location.pathname,title:document.title,referrer:document.referrer,device:dev,browser:br,screen:screen.width+'x'+screen.height,language:navigator.language});
        var scrollMax=0;
        window.addEventListener('scroll',function(){var s=Math.round((window.scrollY/(document.body.scrollHeight-window.innerHeight))*100);if(s>scrollMax)scrollMax=s;});
        document.addEventListener('click',function(e){var t=e.target.closest('a,button,[data-track]');if(!t)return;send('click',{element:t.tagName,text:(t.textContent||'').trim().substring(0,100),url:t.href||'',page:location.pathname,x:e.clientX,y:e.clientY});});
        window.addEventListener('beforeunload',function(){send('session_end',{sessionId:sid,page:location.pathname,duration:Math.round((Date.now()-performance.timeOrigin)/1000),scrollDepth:scrollMax});});
    })();
    </script>
    <div id="flay-cookie-banner" style="position:fixed;bottom:0;left:0;right:0;z-index:99999;background:${theme==='light'?'#fff':'#15152a'};color:${theme==='light'?'#1a1a2e':'#fff'};border-top:1px solid ${theme==='light'?'#e0e0e0':'#252545'};padding:16px 24px;box-shadow:0 -4px 20px rgba(0,0,0,0.3);font-family:'Inter',system-ui,sans-serif;display:none;" id="flay-cookie-banner">
        <div style="max-width:900px;margin:0 auto;display:flex;align-items:center;gap:16px;flex-wrap:wrap;">
            <div style="flex:1;min-width:250px;">
                <div style="font-size:15px;font-weight:700;margin-bottom:4px;">Nous utilisons des cookies</div>
                <div style="font-size:13px;color:${theme==='light'?'#666':'#a0a0c0'};">Ce site utilise des cookies pour ameliorer votre experience.</div>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
                <button onclick="acceptCookies()" style="padding:10px 20px;background:#667eea;color:white;border:none;border-radius:8px;font-weight:600;cursor:pointer;font-size:14px;">Tout accepter</button>
                <button onclick="rejectCookies()" style="padding:10px 20px;background:transparent;color:${theme==='light'?'#1a1a2e':'#fff'};border:1px solid ${theme==='light'?'#e0e0e0':'#252545'};border-radius:8px;font-weight:600;cursor:pointer;font-size:14px;">Tout refuser</button>
            </div>
        </div>
    </div>
    <script>
    function setCookie(n,v,d){var e=new Date();e.setTime(e.getTime()+d*86400000);document.cookie=n+'='+v+';expires='+e.toUTCString()+';path=/;SameSite=Lax';}
    function getCookie(n){var v=document.cookie.match('(^|;) ?'+n+'=([^;]*)(;|$)');return v?v[2]:null;}
    function acceptCookies(){setCookie('_flay_consent',JSON.stringify({analytics:true,marketing:true,personalization:true,timestamp:Date.now()}),365);document.getElementById('flay-cookie-banner').style.display='none';}
    function rejectCookies(){setCookie('_flay_consent',JSON.stringify({analytics:false,marketing:false,personalization:false,timestamp:Date.now()}),365);document.getElementById('flay-cookie-banner').style.display='none';}
    if(!getCookie('_flay_consent'))setTimeout(function(){document.getElementById('flay-cookie-banner').style.display='block';},2000);
    </script>
</body>
</html>`;
    }

    getThemeCSS(colors, plan) {
        return `
            :root {
                --bg: ${colors.bg};
                --bg2: ${colors.bg2};
                --text: ${colors.text};
                --text-light: ${colors.textLight};
                --accent: ${colors.accent};
                --accent-hover: ${colors.accentHover};
                --card-bg: ${colors.cardBg};
                --border: ${colors.border};
                --shadow: ${colors.shadow};
                --gold: ${colors.gold};
                --gradient: ${colors.gradient};
                --radius: 12px;
            }
        `;
    }

    getFullCSS(colors, theme) {
        return `
            ${this.getThemeCSS(colors, theme)}
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Playfair+Display:wght@700;800;900&display=swap');
            * { margin: 0; padding: 0; box-sizing: border-box; }
            html { scroll-behavior: smooth; }
            body { font-family: 'Inter', system-ui, sans-serif; background: var(--bg); color: var(--text); line-height: 1.7; -webkit-font-smoothing: antialiased; overflow-x: hidden; }
            .vitrine { min-height: 100vh; position: relative; overflow-x: hidden; }
            .vitrine-bg { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: var(--gradient); opacity: 0.03; pointer-events: none; z-index: 0; transition: opacity 0.3s; }
            .container { max-width: 1100px; margin: 0 auto; padding: 0 24px; }

            /* === HERO === */
            .hero { min-height: 100vh; display: flex; align-items: center; justify-content: center; text-align: center; padding: 80px 24px 60px; position: relative; z-index: 1; }
            .hero::before { content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: radial-gradient(ellipse at 50% 50%, var(--accent) 0%, transparent 70%); opacity: 0.05; pointer-events: none; }
            .hero-content { max-width: 650px; animation: heroFadeIn 1s ease-out; }
            @keyframes heroFadeIn { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
            .hero-avatar { width: 180px; height: 180px; border-radius: 50%; border: 4px solid var(--accent); object-fit: cover; margin-bottom: 28px; box-shadow: 0 0 60px rgba(102,126,234,0.25), 0 0 120px rgba(102,126,234,0.1); transition: transform 0.4s, box-shadow 0.4s; }
            .hero-avatar:hover { transform: scale(1.05); box-shadow: 0 0 80px rgba(102,126,234,0.4); }
            .hero-avatar-placeholder { width: 180px; height: 180px; border-radius: 50%; border: 4px solid var(--accent); background: var(--card-bg); display: flex; align-items: center; justify-content: center; font-size: 72px; font-weight: 900; color: var(--accent); margin: 0 auto 28px; box-shadow: 0 0 60px rgba(102,126,234,0.25); }
            .hero-name { font-family: 'Playfair Display', serif; font-size: 52px; font-weight: 900; margin-bottom: 10px; background: var(--gradient); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; line-height: 1.1; }
            .hero-title { font-size: 20px; color: var(--accent); font-weight: 500; margin-bottom: 18px; letter-spacing: 0.5px; }
            .hero-badges { display: flex; gap: 10px; justify-content: center; margin-bottom: 22px; }
            .badge { padding: 5px 16px; border-radius: 20px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; }
            .badge-pro { background: var(--accent); color: white; box-shadow: 0 2px 10px rgba(102,126,234,0.3); }
            .badge-premium { background: var(--gold); color: #1a1a2e; box-shadow: 0 2px 10px rgba(245,166,35,0.3); }
            .hero-bio { font-size: 17px; color: var(--text-light); margin-bottom: 18px; line-height: 1.8; }
            .hero-location { font-size: 14px; color: var(--text-light); margin-bottom: 28px; opacity: 0.8; }
            .hero-actions { display: flex; gap: 14px; justify-content: center; flex-wrap: wrap; }
            .hero-stats { display: flex; gap: 40px; justify-content: center; margin-top: 40px; padding-top: 30px; border-top: 1px solid var(--border); }
            .hero-stat { text-align: center; }
            .hero-stat-value { font-size: 28px; font-weight: 800; color: var(--accent); }
            .hero-stat-label { font-size: 12px; color: var(--text-light); text-transform: uppercase; letter-spacing: 1px; }

            /* === BUTTONS === */
            .btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 14px 32px; border-radius: 12px; font-size: 15px; font-weight: 600; text-decoration: none; transition: all 0.3s cubic-bezier(0.4,0,0.2,1); border: none; cursor: pointer; position: relative; overflow: hidden; }
            .btn::after { content: ''; position: absolute; inset: 0; background: linear-gradient(135deg, rgba(255,255,255,0.1), transparent); opacity: 0; transition: opacity 0.3s; }
            .btn:hover::after { opacity: 1; }
            .btn-primary { background: var(--accent); color: white; box-shadow: 0 4px 20px rgba(102,126,234,0.35); }
            .btn-primary:hover { transform: translateY(-3px); box-shadow: 0 8px 30px rgba(102,126,234,0.5); }
            .btn-secondary { background: var(--card-bg); color: var(--text); border: 1px solid var(--border); }
            .btn-secondary:hover { border-color: var(--accent); transform: translateY(-2px); }
            .btn-full { width: 100%; }

            /* === SECTIONS === */
            .section { padding: 100px 0; position: relative; z-index: 1; }
            .section-title { font-family: 'Playfair Display', serif; font-size: 36px; font-weight: 800; margin-bottom: 16px; color: var(--text); }
            .section-subtitle { font-size: 16px; color: var(--text-light); margin-bottom: 48px; max-width: 500px; }

            /* === SERVICES === */
            .services-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 24px; }
            .service-card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 16px; padding: 32px; transition: all 0.4s cubic-bezier(0.4,0,0.2,1); position: relative; overflow: hidden; }
            .service-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: var(--gradient); transform: scaleX(0); transition: transform 0.4s; }
            .service-card:hover::before { transform: scaleX(1); }
            .service-card:hover { transform: translateY(-6px); box-shadow: 0 20px 50px rgba(0,0,0,0.15); border-color: var(--accent); }
            .service-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px; }
            .service-name { font-size: 20px; font-weight: 700; }
            .service-price { font-size: 18px; font-weight: 800; color: var(--accent); white-space: nowrap; background: linear-gradient(135deg, var(--accent), var(--gold)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
            .service-desc { font-size: 15px; color: var(--text-light); margin-bottom: 20px; line-height: 1.7; }
            .service-cta { display: block; text-align: center; padding: 12px; background: var(--accent); color: white; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 14px; transition: all 0.3s; }
            .service-cta:hover { opacity: 0.9; transform: translateY(-1px); }

            /* === ABOUT === */
            .about-content { display: flex; gap: 48px; align-items: center; }
            .about-avatar { width: 240px; height: 240px; border-radius: 20px; object-fit: cover; border: 3px solid var(--accent); box-shadow: 0 20px 50px rgba(0,0,0,0.15); }
            .about-text { font-size: 17px; color: var(--text-light); line-height: 1.9; }
            .about-location { margin-top: 16px; font-weight: 600; color: var(--accent); display: flex; align-items: center; gap: 8px; }

            /* === GALLERY === */
            .gallery-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 16px; }
            .gallery-item { border-radius: 16px; overflow: hidden; aspect-ratio: 1; cursor: pointer; transition: all 0.4s; position: relative; }
            .gallery-item::after { content: ''; position: absolute; inset: 0; background: linear-gradient(135deg, transparent 50%, rgba(0,0,0,0.4)); opacity: 0; transition: opacity 0.3s; }
            .gallery-item:hover { transform: scale(1.03); box-shadow: 0 15px 40px rgba(0,0,0,0.2); }
            .gallery-item:hover::after { opacity: 1; }
            .gallery-item img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.5s; }
            .gallery-item:hover img { transform: scale(1.1); }

            /* === MAP === */
            .map-container { border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.1); }
            .map-address { text-align: center; padding: 16px; color: var(--text-light); font-size: 15px; font-weight: 500; }

            /* === STORE === */
            .products-mini-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 20px; }
            .product-mini-card { background: var(--card-bg); border-radius: 16px; padding: 0; border: 1px solid var(--border); transition: all 0.4s cubic-bezier(0.4,0,0.2,1); text-decoration: none; color: inherit; overflow: hidden; }
            .product-mini-card:hover { transform: translateY(-6px); box-shadow: 0 20px 50px rgba(0,0,0,0.15); border-color: var(--accent); }
            .product-mini-card img { width: 100%; height: 200px; object-fit: cover; transition: transform 0.5s; }
            .product-mini-card:hover img { transform: scale(1.05); }
            .product-mini-body { padding: 20px; }
            .product-mini-name { font-size: 16px; font-weight: 700; color: var(--text); margin-bottom: 6px; }
            .product-mini-price { font-size: 20px; font-weight: 800; color: var(--accent); }
            .product-mini-desc { font-size: 13px; color: var(--text-light); margin-top: 8px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.6; }
            .badge-store { background: linear-gradient(135deg, var(--accent), #a855f7); color: #fff; padding: 4px 12px; border-radius: 999px; font-size: 11px; font-weight: 700; margin-left: 8px; }
            .store-cta { text-align: center; margin-top: 32px; }
            .nav-store-link { display: inline-flex; align-items: center; gap: 6px; padding: 6px 16px !important; background: linear-gradient(135deg, var(--accent), #a855f7); color: #fff !important; border-radius: 999px !important; font-weight: 600; }

            /* === RESERVATION === */
            .reservation-form { max-width: 600px; }
            .form-row { display: flex; gap: 14px; margin-bottom: 14px; }
            .form-row input, .form-row select { flex: 1; }
            input, select, textarea { width: 100%; padding: 14px 18px; background: var(--card-bg); border: 1.5px solid var(--border); border-radius: 12px; color: var(--text); font-size: 15px; font-family: inherit; margin-bottom: 14px; transition: all 0.3s; }
            input:focus, select:focus, textarea:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px rgba(102,126,234,0.15); }

            /* === CONTACT === */
            .contact-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; margin-bottom: 40px; }
            .contact-card { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 28px 20px; background: var(--card-bg); border: 1px solid var(--border); border-radius: 16px; text-decoration: none; color: var(--text); transition: all 0.4s; position: relative; overflow: hidden; }
            .contact-card::before { content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 3px; background: var(--gradient); transform: scaleX(0); transition: transform 0.4s; }
            .contact-card:hover::before { transform: scaleX(1); }
            .contact-card:hover { border-color: var(--accent); transform: translateY(-4px); box-shadow: 0 15px 40px rgba(0,0,0,0.1); }
            .contact-icon { font-size: 36px; margin-bottom: 10px; }
            .contact-label { font-size: 11px; color: var(--text-light); text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 4px; font-weight: 600; }
            .contact-value { font-size: 15px; font-weight: 600; }

            /* === SOCIAL === */
            .social-links { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
            .social-btn { padding: 12px 24px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 14px; color: white; transition: all 0.3s; position: relative; overflow: hidden; }
            .social-btn::after { content: ''; position: absolute; inset: 0; background: linear-gradient(135deg, rgba(255,255,255,0.2), transparent); opacity: 0; transition: opacity 0.3s; }
            .social-btn:hover::after { opacity: 1; }
            .social-btn:hover { transform: translateY(-3px); box-shadow: 0 8px 25px rgba(0,0,0,0.2); }
            .facebook { background: #1877f2; }
            .instagram { background: linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888); }
            .twitter { background: #1da1f2; }
            .linkedin { background: #0077b5; }
            .tiktok { background: #000; }
            .youtube { background: #ff0000; }
            .whatsapp { background: #25d366; }

            /* === TESTIMONIALS === */
            .testimonials-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 24px; }
            .testimonial-card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 16px; padding: 28px; position: relative; }
            .testimonial-card::before { content: '\\201C'; position: absolute; top: 16px; left: 20px; font-size: 60px; color: var(--accent); opacity: 0.2; font-family: serif; line-height: 1; }
            .testimonial-text { font-size: 15px; color: var(--text-light); line-height: 1.8; margin-bottom: 16px; font-style: italic; }
            .testimonial-author { font-size: 14px; font-weight: 700; color: var(--text); }
            .testimonial-role { font-size: 12px; color: var(--text-light); }
            .testimonial-stars { color: var(--gold); margin-top: 8px; font-size: 14px; }

            /* === FAQ === */
            .faq-list { max-width: 700px; margin: 0 auto; }
            .faq-item { background: var(--card-bg); border: 1px solid var(--border); border-radius: 12px; margin-bottom: 12px; overflow: hidden; transition: all 0.3s; }
            .faq-item:hover { border-color: var(--accent); }
            .faq-question { padding: 18px 24px; font-weight: 600; cursor: pointer; display: flex; justify-content: space-between; align-items: center; font-size: 15px; }
            .faq-question::after { content: '+'; font-size: 20px; color: var(--accent); transition: transform 0.3s; }
            .faq-item.open .faq-question::after { transform: rotate(45deg); }
            .faq-answer { padding: 0 24px 18px; color: var(--text-light); font-size: 14px; line-height: 1.8; display: none; }
            .faq-item.open .faq-answer { display: block; }

            /* === NEWSLETTER === */
            .newsletter { text-align: center; padding: 60px 0; }
            .newsletter-form { display: flex; gap: 12px; max-width: 450px; margin: 0 auto; }
            .newsletter-form input { flex: 1; margin-bottom: 0; }

            /* === FOOTER === */
            .footer { padding: 60px 0 40px; text-align: center; position: relative; z-index: 1; border-top: 1px solid var(--border); }
            .footer-wave { margin-bottom: 24px; padding: 24px 32px; background: var(--card-bg); border-radius: 16px; display: inline-block; border: 1px solid var(--border); }
            .footer-wave-url { font-size: 15px; color: var(--accent); font-weight: 700; margin-top: 4px; }
            .footer-credits { font-size: 13px; color: var(--text-light); margin-bottom: 16px; }
            .footer-brand { font-family: 'Playfair Display', serif; font-size: 40px; font-weight: 900; background: var(--gradient); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }

            /* === ANIMATIONS === */
            @keyframes fadeInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
            .reveal { opacity: 0; transform: translateY(30px); transition: all 0.8s cubic-bezier(0.4,0,0.2,1); }
            .reveal.visible { opacity: 1; transform: translateY(0); }

            /* === RESPONSIVE === */
            @media (max-width: 768px) {
                .hero { padding: 50px 16px 40px; min-height: 70vh; }
                .hero-name { font-size: 34px; }
                .hero-avatar, .hero-avatar-placeholder { width: 120px; height: 120px; }
                .hero-stats { gap: 20px; }
                .hero-stat-value { font-size: 22px; }
                .section { padding: 60px 0; }
                .section-title { font-size: 28px; }
                .about-content { flex-direction: column; text-align: center; }
                .about-avatar { width: 180px; height: 180px; }
                .about-location { justify-content: center; }
                .form-row { flex-direction: column; }
                .services-grid { grid-template-columns: 1fr; }
                .products-mini-grid { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); }
                .newsletter-form { flex-direction: column; }
                .testimonials-grid { grid-template-columns: 1fr; }
                .contact-grid { grid-template-columns: 1fr 1fr; }
            }
            @media (max-width: 480px) {
                .contact-grid { grid-template-columns: 1fr; }
                .hero-actions { flex-direction: column; align-items: center; }
                .hero-actions .btn { width: 100%; }
            }
        `;
    }

    getThemeIds() {
        return ['dark', 'midnight', 'ocean', 'emerald', 'sunset', 'electric', 'rose', 'forest', 'gold', 'aurora', 'noir', 'light', 'daylight', 'ivory', 'cloud', 'snow', 'cotedivoire', 'cotedivoire_dark', 'cotedivoire_light', 'france', 'france_dark', 'france_light', 'senegal', 'senegal_dark', 'senegal_light', 'cameroun', 'mali', 'burkina', 'ghana', 'nigeria', 'togo', 'benin', 'congo', 'gabon', 'guinee', 'niger', 'togo_sunset', 'afrique', 'noel', 'halloween', 'love', 'royal', 'nature', 'cyber', 'pastel', 'mandy', 'ocean_light', 'sunset_light'];
    }

    getThemeColors(theme) {
        const themes = {
            // === DARK MODES ===
            dark: { bg:'#1a1a2e', bg2:'#16213e', text:'#fff', textLight:'#a0a0b0', accent:'#667eea', accentHover:'#5a6fd6', cardBg:'#16213e', border:'#2a2a4a', shadow:'0 10px 40px rgba(0,0,0,0.3)', gold:'#f5a623', gradient:'linear-gradient(135deg, #667eea, #764ba2)' },
            midnight: { bg:'#0a0a23', bg2:'#111133', text:'#fff', textLight:'#8888aa', accent:'#4a90d9', accentHover:'#3a80c9', cardBg:'#111133', border:'#222244', shadow:'0 10px 40px rgba(0,0,0,0.4)', gold:'#ffd700', gradient:'linear-gradient(135deg, #4a90d9, #357abd)' },
            ocean: { bg:'#0a192f', bg2:'#112240', text:'#fff', textLight:'#8899bb', accent:'#64ffda', accentHover:'#4ad0b0', cardBg:'#112240', border:'#1d3557', shadow:'0 10px 40px rgba(0,0,0,0.3)', gold:'#ffd700', gradient:'linear-gradient(135deg, #64ffda, #4ad0b0)' },
            emerald: { bg:'#0d2818', bg2:'#1a3a2a', text:'#fff', textLight:'#88bbaa', accent:'#2ecc71', accentHover:'#27ae60', cardBg:'#1a3a2a', border:'#2a5a3a', shadow:'0 10px 40px rgba(0,0,0,0.3)', gold:'#f1c40f', gradient:'linear-gradient(135deg, #2ecc71, #27ae60)' },
            sunset: { bg:'#1a0a0a', bg2:'#2a1515', text:'#fff', textLight:'#cc8877', accent:'#ff6b6b', accentHover:'#e55a5a', cardBg:'#2a1515', border:'#3a2525', shadow:'0 10px 40px rgba(0,0,0,0.3)', gold:'#ffa500', gradient:'linear-gradient(135deg, #ff6b6b, #ffa500)' },
            electric: { bg:'#0a0a1a', bg2:'#15152a', text:'#fff', textLight:'#9999bb', accent:'#a855f7', accentHover:'#9333ea', cardBg:'#15152a', border:'#252545', shadow:'0 10px 40px rgba(0,0,0,0.3)', gold:'#ffd700', gradient:'linear-gradient(135deg, #a855f7, #ec4899)' },
            rose: { bg:'#1a0a15', bg2:'#2a1525', text:'#fff', textLight:'#bb8899', accent:'#f472b6', accentHover:'#ec4899', cardBg:'#2a1525', border:'#3a2535', shadow:'0 10px 40px rgba(0,0,0,0.3)', gold:'#ffd700', gradient:'linear-gradient(135deg, #f472b6, #ec4899)' },
            forest: { bg:'#0a1a0a', bg2:'#152a15', text:'#fff', textLight:'#88aa88', accent:'#4ade80', accentHover:'#22c55e', cardBg:'#152a15', border:'#253a25', shadow:'0 10px 40px rgba(0,0,0,0.3)', gold:'#ffd700', gradient:'linear-gradient(135deg, #4ade80, #22c55e)' },
            gold: { bg:'#1a150a', bg2:'#2a2515', text:'#fff', textLight:'#bb9966', accent:'#f5a623', accentHover:'#e09500', cardBg:'#2a2515', border:'#3a3525', shadow:'0 10px 40px rgba(0,0,0,0.3)', gold:'#ffd700', gradient:'linear-gradient(135deg, #f5a623, #ffd700)' },
            aurora: { bg:'#0a0a2a', bg2:'#151540', text:'#fff', textLight:'#9999cc', accent:'#00d4ff', accentHover:'#00b8e0', cardBg:'#151540', border:'#252555', shadow:'0 10px 40px rgba(0,0,0,0.3)', gold:'#ffd700', gradient:'linear-gradient(135deg, #00d4ff, #a855f7)' },
            noir: { bg:'#0a0a0a', bg2:'#141414', text:'#fff', textLight:'#888', accent:'#e0e0e0', accentHover:'#ccc', cardBg:'#141414', border:'#222', shadow:'0 10px 40px rgba(0,0,0,0.5)', gold:'#ffd700', gradient:'linear-gradient(135deg, #333, #111)' },

            // === LIGHT MODES ===
            light: { bg:'#ffffff', bg2:'#f8f9fa', text:'#1a1a2e', textLight:'#666', accent:'#667eea', accentHover:'#5a6fd6', cardBg:'#f8f9fa', border:'#e0e0e0', shadow:'0 10px 40px rgba(0,0,0,0.08)', gold:'#f5a623', gradient:'linear-gradient(135deg, #667eea, #764ba2)' },
            daylight: { bg:'#fafbfc', bg2:'#f0f2f5', text:'#1a1a2e', textLight:'#555', accent:'#4a90d9', accentHover:'#357abd', cardBg:'#fff', border:'#e8ecf0', shadow:'0 10px 40px rgba(0,0,0,0.06)', gold:'#f5a623', gradient:'linear-gradient(135deg, #4a90d9, #667eea)' },
            ivory: { bg:'#fffff0', bg2:'#f5f5dc', text:'#2d2d2d', textLight:'#777', accent:'#8b7355', accentHover:'#6d5a43', cardBg:'#fff', border:'#e8e4d9', shadow:'0 10px 40px rgba(0,0,0,0.06)', gold:'#b8860b', gradient:'linear-gradient(135deg, #8b7355, #b8860b)' },
            cloud: { bg:'#f0f4f8', bg2:'#e2e8f0', text:'#1a202c', textLight:'#4a5568', accent:'#3182ce', accentHover:'#2b6cb0', cardBg:'#fff', border:'#cbd5e0', shadow:'0 10px 40px rgba(0,0,0,0.06)', gold:'#d69e2e', gradient:'linear-gradient(135deg, #3182ce, #63b3ed)' },
            snow: { bg:'#f8fafc', bg2:'#edf2f7', text:'#1a202c', textLight:'#718096', accent:'#805ad5', accentHover:'#6b46c1', cardBg:'#fff', border:'#e2e8f0', shadow:'0 10px 40px rgba(0,0,0,0.05)', gold:'#d69e2e', gradient:'linear-gradient(135deg, #805ad5, #b794f4)' },

            // === DRAPEAUX / NATIONAUX ===
            cotedivoire: { bg:'#f8f400', bg2:'#f0ee00', text:'#1a1a2e', textLight:'#555', accent:'#f77f00', accentHover:'#e06800', cardBg:'#fff', border:'#e8e440', shadow:'0 10px 40px rgba(0,0,0,0.1)', gold:'#f77f00', gradient:'linear-gradient(135deg, #f77f00, #f8f400)', flag:'orange-white-green' },
            cotedivoire_dark: { bg:'#1a1500', bg2:'#2a2510', text:'#f8f400', textLight:'#ccbb44', accent:'#f77f00', accentHover:'#ff9020', cardBg:'#2a2510', border:'#3a3520', shadow:'0 10px 40px rgba(0,0,0,0.4)', gold:'#f8f400', gradient:'linear-gradient(135deg, #f77f00, #f8f400)', flag:'orange-white-green' },
            cotedivoire_light: { bg:'#fffef5', bg2:'#fff9e0', text:'#1a1a2e', textLight:'#555', accent:'#f77f00', accentHover:'#e06800', cardBg:'#fff', border:'#f0e880', shadow:'0 10px 40px rgba(0,0,0,0.06)', gold:'#f77f00', gradient:'linear-gradient(135deg, #f77f00, #f8f400)', flag:'orange-white-green' },
            france: { bg:'#002395', bg2:'#001d6e', text:'#fff', textLight:'#8899cc', accent:'#ed2939', accentHover:'#d41f2f', cardBg:'#001d6e', border:'#0033cc', shadow:'0 10px 40px rgba(0,0,0,0.3)', gold:'#fff', gradient:'linear-gradient(135deg, #002395, #ed2939)', flag:'blue-white-red' },
            france_dark: { bg:'#000d3a', bg2:'#001250', text:'#fff', textLight:'#6688cc', accent:'#ed2939', accentHover:'#ff3a4a', cardBg:'#001250', border:'#002080', shadow:'0 10px 40px rgba(0,0,0,0.5)', gold:'#fff', gradient:'linear-gradient(135deg, #002395, #ed2939)', flag:'blue-white-red' },
            france_light: { bg:'#f0f4ff', bg2:'#e0e8ff', text:'#002395', textLight:'#3355aa', accent:'#ed2939', accentHover:'#d41f2f', cardBg:'#fff', border:'#b0c0ff', shadow:'0 10px 40px rgba(0,0,0,0.06)', gold:'#ed2939', gradient:'linear-gradient(135deg, #002395, #ed2939)', flag:'blue-white-red' },
            senegal: { bg:'#00853f', bg2:'#006b32', text:'#fff', textLight:'#88bbaa', accent:'#fdef42', accentHover:'#e8d830', cardBg:'#006b32', border:'#00a34d', shadow:'0 10px 40px rgba(0,0,0,0.3)', gold:'#fdef42', gradient:'linear-gradient(135deg, #00853f, #fdef42)', flag:'green-yellow-red' },
            senegal_dark: { bg:'#002a15', bg2:'#003a20', text:'#fdef42', textLight:'#88cc66', accent:'#fdef42', accentHover:'#ffe855', cardBg:'#003a20', border:'#005530', shadow:'0 10px 40px rgba(0,0,0,0.5)', gold:'#fdef42', gradient:'linear-gradient(135deg, #00853f, #fdef42)', flag:'green-yellow-red' },
            senegal_light: { bg:'#f0fff5', bg2:'#e0ffe8', text:'#004d28', textLight:'#006633', accent:'#00853f', accentHover:'#006b32', cardBg:'#fff', border:'#80ddaa', shadow:'0 10px 40px rgba(0,0,0,0.06)', gold:'#fdef42', gradient:'linear-gradient(135deg, #00853f, #fdef42)', flag:'green-yellow-red' },
            cameroun: { bg:'#007a5e', bg2:'#00664d', text:'#fff', textLight:'#88bbaa', accent:'#fcd116', accentHover:'#e8bd00', cardBg:'#00664d', border:'#009973', shadow:'0 10px 40px rgba(0,0,0,0.3)', gold:'#fcd116', gradient:'linear-gradient(135deg, #007a5e, #fcd116)', flag:'green-red-yellow' },
            mali: { bg:'#14b53a', bg2:'#109930', text:'#fff', textLight:'#88cc88', accent:'#fcd116', accentHover:'#e8bd00', cardBg:'#109930', border:'#17cc44', shadow:'0 10px 40px rgba(0,0,0,0.3)', gold:'#fcd116', gradient:'linear-gradient(135deg, #14b53a, #fcd116)', flag:'green-yellow-red' },
            burkina: { bg:'#ef2b2d', bg2:'#d42527', text:'#fff', textLight:'#cc8888', accent:'#fcd116', accentHover:'#e8bd00', cardBg:'#d42527', border:'#f44', shadow:'0 10px 40px rgba(0,0,0,0.3)', gold:'#fcd116', gradient:'linear-gradient(135deg, #ef2b2d, #fcd116)', flag:'red-yellow-green' },
            ghana: { bg:'#006b3f', bg2:'#005532', text:'#fff', textLight:'#88bbaa', accent:'#fcd116', accentHover:'#e8bd00', cardBg:'#005532', border:'#008850', shadow:'0 10px 40px rgba(0,0,0,0.3)', gold:'#fcd116', gradient:'linear-gradient(135deg, #006b3f, #fcd116)', flag:'red-gold-green' },
            nigeria: { bg:'#008751', bg2:'#006d41', text:'#fff', textLight:'#88bbaa', accent:'#fff', accentHover:'#eee', cardBg:'#006d41', border:'#00a862', shadow:'0 10px 40px rgba(0,0,0,0.3)', gold:'#fff', gradient:'linear-gradient(135deg, #008751, #fff)', flag:'green-white-green' },
            togo: { bg:'#006a1c', bg2:'#005516', text:'#fff', textLight:'#88bbaa', accent:'#fcd116', accentHover:'#e8bd00', cardBg:'#005516', border:'#008824', shadow:'0 10px 40px rgba(0,0,0,0.3)', gold:'#fcd116', gradient:'linear-gradient(135deg, #006a1c, #fcd116)', flag:'green-yellow-red' },
            benin: { bg:'#008751', bg2:'#006d41', text:'#fff', textLight:'#88bbaa', accent:'#fcd116', accentHover:'#e8bd00', cardBg:'#006d41', border:'#00a862', shadow:'0 10px 40px rgba(0,0,0,0.3)', gold:'#fcd116', gradient:'linear-gradient(135deg, #008751, #fcd116)', flag:'green-yellow-red' },
            congo: { bg:'#009543', bg2:'#007a37', text:'#fff', textLight:'#88bbaa', accent:'#fbde4a', accentHover:'#e8cc3a', cardBg:'#007a37', border:'#00b050', shadow:'0 10px 40px rgba(0,0,0,0.3)', gold:'#fbde4a', gradient:'linear-gradient(135deg, #009543, #fbde4a)', flag:'green-yellow-red' },
            gabon: { bg:'#009e60', bg2:'#008250', text:'#fff', textLight:'#88bbaa', accent:'#fcd116', accentHover:'#e8bd00', cardBg:'#008250', border:'#00b870', shadow:'0 10px 40px rgba(0,0,0,0.3)', gold:'#fcd116', gradient:'linear-gradient(135deg, #009e60, #fcd116)', flag:'green-yellow-blue' },
            guinee: { bg:'#ce1126', bg2:'#b00e22', text:'#fff', textLight:'#cc8888', accent:'#fcd116', accentHover:'#e8bd00', cardBg:'#b00e22', border:'#e01530', shadow:'0 10px 40px rgba(0,0,0,0.3)', gold:'#fcd116', gradient:'linear-gradient(135deg, #ce1126, #fcd116)', flag:'red-yellow-green' },
            niger: { bg:'#e05206', bg2:'#c4470a', text:'#fff', textLight:'#cc8866', accent:'#fff', accentHover:'#eee', cardBg:'#c4470a', border:'#f06010', shadow:'0 10px 40px rgba(0,0,0,0.3)', gold:'#fff', gradient:'linear-gradient(135deg, #e05206, #fff)', flag:'orange-white-green' },
            togo_sunset: { bg:'#ff6b35', bg2:'#e05a2a', text:'#fff', textLight:'#ffaa88', accent:'#ffd166', accentHover:'#eec55a', cardBg:'#e05a2a', border:'#ff7844', shadow:'0 10px 40px rgba(0,0,0,0.3)', gold:'#ffd166', gradient:'linear-gradient(135deg, #ff6b35, #ffd166)' },
            afrique: { bg:'#000000', bg2:'#1a1a1a', text:'#fff', textLight:'#aaa', accent:'#f7941d', accentHover:'#e08510', cardBg:'#1a1a1a', border:'#333', shadow:'0 10px 40px rgba(0,0,0,0.4)', gold:'#f7941d', gradient:'linear-gradient(135deg, #f7941d, #e74c3c)', flag:'pan-african' },

            // === SAISONNIERS / SPECIAUX ===
            noel: { bg:'#1a3a1a', bg2:'#0d2818', text:'#fff', textLight:'#88bbaa', accent:'#e74c3c', accentHover:'#c0392b', cardBg:'#0d2818', border:'#2a5a3a', shadow:'0 10px 40px rgba(0,0,0,0.3)', gold:'#ffd700', gradient:'linear-gradient(135deg, #e74c3c, #ffd700)' },
            halloween: { bg:'#1a0a00', bg2:'#2a1500', text:'#fff', textLight:'#cc8844', accent:'#ff6600', accentHover:'#e05500', cardBg:'#2a1500', border:'#3a2500', shadow:'0 10px 40px rgba(0,0,0,0.4)', gold:'#ff9900', gradient:'linear-gradient(135deg, #ff6600, #ff9900)' },
            love: { bg:'#2a0a15', bg2:'#3a1525', text:'#fff', textLight:'#cc8899', accent:'#ff1493', accentHover:'#e0107a', cardBg:'#3a1525', border:'#5a2535', shadow:'0 10px 40px rgba(0,0,0,0.3)', gold:'#ff69b4', gradient:'linear-gradient(135deg, #ff1493, #ff69b4)' },
            royal: { bg:'#1a0a2a', bg2:'#2a1540', text:'#fff', textLight:'#aa88cc', accent:'#9b59b6', accentHover:'#8e44ad', cardBg:'#2a1540', border:'#3a2555', shadow:'0 10px 40px rgba(0,0,0,0.3)', gold:'#ffd700', gradient:'linear-gradient(135deg, #9b59b6, #ffd700)' },
            nature: { bg:'#0a1a0a', bg2:'#152a15', text:'#e8f5e9', textLight:'#81c784', accent:'#66bb6a', accentHover:'#4caf50', cardBg:'#1b5e20', border:'#2e7d32', shadow:'0 10px 40px rgba(0,0,0,0.3)', gold:'#aed581', gradient:'linear-gradient(135deg, #66bb6a, #aed581)' },
            cyber: { bg:'#0a0a1a', bg2:'#0f0f2a', text:'#00ff88', textLight:'#00cc6a', accent:'#00ff88', accentHover:'#00dd77', cardBg:'#0f0f2a', border:'#00ff8833', shadow:'0 10px 40px rgba(0,255,136,0.1)', gold:'#00ff88', gradient:'linear-gradient(135deg, #00ff88, #0088ff)' },
            pastel: { bg:'#fdf2f8', bg2:'#fce7f3', text:'#831843', textLight:'#9d174d', accent:'#ec4899', accentHover:'#db2777', cardBg:'#fff', border:'#fbcfe8', shadow:'0 10px 40px rgba(0,0,0,0.05)', gold:'#f59e0b', gradient:'linear-gradient(135deg, #ec4899, #f59e0b)' },
            mandy: { bg:'#fde68a', bg2:'#fcd34d', text:'#78350f', textLight:'#92400e', accent:'#dc2626', accentHover:'#b91c1c', cardBg:'#fff', border:'#f59e0b', shadow:'0 10px 40px rgba(0,0,0,0.08)', gold:'#dc2626', gradient:'linear-gradient(135deg, #dc2626, #f59e0b)' },
            ocean_light: { bg:'#f0f9ff', bg2:'#e0f2fe', text:'#0c4a6e', textLight:'#0369a1', accent:'#0284c7', accentHover:'#0369a1', cardBg:'#fff', border:'#bae6fd', shadow:'0 10px 40px rgba(0,0,0,0.05)', gold:'#f59e0b', gradient:'linear-gradient(135deg, #0284c7, #38bdf8)' },
            sunset_light: { bg:'#fff7ed', bg2:'#ffedd5', text:'#7c2d12', textLight:'#9a3412', accent:'#ea580c', accentHover:'#c2410c', cardBg:'#fff', border:'#fed7aa', shadow:'0 10px 40px rgba(0,0,0,0.05)', gold:'#f59e0b', gradient:'linear-gradient(135deg, #ea580c, #f59e0b)' }
        };
        return themes[theme] || themes.dark;
    }

    esc(str) {
        if (!str) return '';
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
}

module.exports = new DesignStudio();
