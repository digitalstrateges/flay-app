const https = require('https');
const http = require('http');
const config = require('../config');

class GeminiClient {
    constructor() {
        this.apiKey = config.GEMINI_API_KEY;
        this.model = config.GEMINI_MODEL || 'gemini-2.0-flash';
        this.baseUrl = config.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta';
        this.cache = new Map();
        this.usageStats = { totalRequests: 0, totalTokens: 0, byUser: {} };
    }

    get isEnabled() {
        return !!this.apiKey && this.apiKey.length > 10;
    }

    /**
     * Appel generique a l'API Gemini
     */
    async generateContent(prompt, options = {}) {
        if (!this.isEnabled) {
            return { text: null, error: 'Gemini API key not configured', cached: false };
        }

        const { temperature = 0.7, maxOutputTokens = 2048, systemPrompt = '', userId = 'anonymous' } = options;
        const cacheKey = this._hash(prompt + systemPrompt + temperature);
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.ts < 3600000) {
            return { text: cached.text, cached: true, tokens: 0 };
        }

        const contents = [];
        if (systemPrompt) {
            contents.push({ role: 'user', parts: [{ text: systemPrompt }] });
            contents.push({ role: 'model', parts: [{ text: 'Compris. Je suis pret a vous assister.' }] });
        }
        contents.push({ role: 'user', parts: [{ text: prompt }] });

        try {
            const result = await this._request(`/${this.model}:generateContent`, {
                contents,
                generationConfig: {
                    temperature,
                    maxOutputTokens,
                    topP: 0.95,
                    topK: 40
                },
                safetySettings: [
                    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
                    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
                    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
                    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
                ]
            });

            if (result.error) return { text: null, error: result.error };

            const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
            const tokens = result.usageMetadata?.totalTokenCount || 0;

            this.cache.set(cacheKey, { text, ts: Date.now() });
            if (this.cache.size > 500) {
                const oldest = this.cache.keys().next().value;
                this.cache.delete(oldest);
            }

            this.usageStats.totalRequests++;
            this.usageStats.totalTokens += tokens;
            if (!this.usageStats.byUser[userId]) this.usageStats.byUser[userId] = { requests: 0, tokens: 0 };
            this.usageStats.byUser[userId].requests++;
            this.usageStats.byUser[userId].tokens += tokens;

            return { text, tokens, cached: false };
        } catch (err) {
            console.error('Gemini API error:', err.message);
            return { text: null, error: err.message };
        }
    }

    /**
     * Generation avec contexte conversationnel (chat)
     */
    async chat(messages, options = {}) {
        if (!this.isEnabled) return { text: null, error: 'Gemini API key not configured' };

        const { temperature = 0.7, maxOutputTokens = 2048, systemPrompt = '' } = options;
        const contents = [];

        if (systemPrompt) {
            contents.push({ role: 'user', parts: [{ text: systemPrompt }] });
            contents.push({ role: 'model', parts: [{ text: 'Compris.' }] });
        }

        for (const msg of messages) {
            contents.push({
                role: msg.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: msg.content }]
            });
        }

        try {
            const result = await this._request(`/${this.model}:generateContent`, {
                contents,
                generationConfig: { temperature, maxOutputTokens, topP: 0.95 }
            });

            if (result.error) return { text: null, error: result.error };
            const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
            const tokens = result.usageMetadata?.totalTokenCount || 0;
            return { text, tokens };
        } catch (err) {
            return { text: null, error: err.message };
        }
    }

    /**
     * Generation d'images via Imagen (Gemini)
     */
    async generateImage(prompt, options = {}) {
        if (!this.isEnabled) {
            return { image: null, error: 'Gemini API key not configured' };
        }

        const { width = 512, height = 512, style = 'realistic' } = options;
        const stylePrompts = {
            realistic: 'photorealistic, high quality, detailed',
            artistic: 'artistic painting style, vibrant colors, creative',
            cartoon: 'cartoon illustration, colorful, fun',
            anime: 'anime style, detailed, beautiful',
            minimalist: 'minimalist design, clean, simple geometric',
            '3d': '3D render, glossy, modern',
            vintage: 'vintage retro style, warm tones',
            luxury: 'luxury premium style, gold accents, elegant'
        };

        const fullPrompt = `${prompt}, ${stylePrompts[style] || stylePrompts.realistic}, professional quality`;

        try {
            const result = await this._request(`/${this.model}:generateContent`, {
                contents: [{ role: 'user', parts: [{ text: `Generate an image: ${fullPrompt}. Return only the image description for generation.` }] }],
                generationConfig: { temperature: 0.9, maxOutputTokens: 1024 }
            });

            return { description: result.candidates?.[0]?.content?.parts?.[0]?.text || '', prompt: fullPrompt };
        } catch (err) {
            return { image: null, error: err.message };
        }
    }

    /**
     * Analyse de contenu avec vision (si modele supporte)
     */
    async analyzeImage(imageUrl, question = 'Decrivez cette image en detail') {
        if (!this.isEnabled) return { text: null, error: 'Gemini API key not configured' };

        try {
            const result = await this._request(`/${this.model}:generateContent`, {
                contents: [{
                    role: 'user',
                    parts: [
                        { text: question },
                        { inlineData: { mimeType: 'image/jpeg', data: await this._fetchImageBase64(imageUrl) } }
                    ]
                }],
                generationConfig: { temperature: 0.4, maxOutputTokens: 1024 }
            });

            if (result.error) return { text: null, error: result.error };
            return { text: result.candidates?.[0]?.content?.parts?.[0]?.text || '' };
        } catch (err) {
            return { text: null, error: err.message };
        }
    }

    /**
     * Generation de contenu marketing complet
     */
    async generateMarketingContent(businessInfo, contentType = 'all') {
        const systemPrompt = `Tu es un expert en marketing digital pour les businesses en Afrique de l'Ouest, specialement en Cote d'Ivoire. Tu parles francais. Tu crees du contenu engageant, professionnel et adapte au marche africain. Tu utilises des emojis avec parcimonie.`;

        const prompts = {
            bio: `Genere une bio professionnelle attractive pour: ${JSON.stringify(businessInfo)}. La bio doit etre concise (max 150 mots), percutante, et inclure des emojis pertinents.`,
            posts: `Genere 3 posts Instagram/TikTok engageants pour: ${JSON.stringify(businessInfo)}. Inclus hashtags et call-to-action. Format: chaque post sur 3-4 lignes.`,
            description: `Genere une description Google My Business optimisee SEO pour: ${JSON.stringify(businessInfo)}. Max 750 caracteres, avec mots-cles locaux.`,
            whatsapp: `Genere 3 messages WhatsApp professionnels (presentation, relance, promotion) pour: ${JSON.stringify(businessInfo)}.`,
            email: `Genere un email de bienvenue professionnel pour les nouveaux clients de: ${JSON.stringify(businessInfo)}.`,
            all: `Genere un kit marketing complet pour: ${JSON.stringify(businessInfo)}: 1) Bio, 2) 3 posts reseaux sociaux, 3) Description Google, 4) 3 messages WhatsApp, 5) Email de bienvenue. Formate proprement avec des titres.`
        };

        return this.chat([{ role: 'user', content: prompts[contentType] || prompts.all }], {
            systemPrompt,
            temperature: 0.8,
            maxOutputTokens: 4096
        });
    }

    /**
     * SEO optimization
     */
    async optimizeSEO(title, description, location = '') {
        const systemPrompt = 'Tu es un expert SEO. Analyse et optimise le contenu pour le referencement local en Afrique de l\'Ouest. Reponds en JSON avec les champs: optimizedTitle, optimizedDescription, keywords (array), metaTags (array).';

        return this.chat([{
            role: 'user',
            content: `Optimise pour SEO: Titre="${title}", Description="${description}", Localisation="${location}". Retourne un JSON valide.`
        }], { systemPrompt, temperature: 0.3 });
    }

    /**
     * Suggestions intelligentes basees sur le profil
     */
    async getSmartSuggestions(profileData) {
        const systemPrompt = 'Tu es un consultant business pour les professionals en Afrique. Analyse le profil et donne des suggestions concretes et actionnables. Reponds en JSON avec: suggestions (array of {category, action, priority, impact}).';

        return this.chat([{
            role: 'user',
            content: `Analyse ce profil business et donne des suggestions d'amelioration: ${JSON.stringify(profileData)}`
        }], { systemPrompt, temperature: 0.5 });
    }

    /**
     * Chat assistant pour le dashboard
     */
    async assistantChat(userMessage, context = {}) {
        const systemPrompt = `Tu es l'assistant AI de Flay, une plateforme de cartes de visite numeriques et boutiques en ligne pour les professionnels en Afrique. Tu parles francais, tu es serviable, concis et professionnel. Tu connais bien les services Flay: profils pro, boutiques, reservations, paiements Wave/CinetPay, analytics.`;

        const contextMsg = context.user ? `\nContexte: Utilisateur "${context.user.name}", plan ${context.user.plan || 'free'}, ${context.services?.length || 0} services.` : '';

        return this.chat([{ role: 'user', content: userMessage + contextMsg }], {
            systemPrompt,
            temperature: 0.7,
            maxOutputTokens: 1024
        });
    }

    /**
     * Generateur de page vitrine
     */
    async generateShowcaseContent(profileData) {
        const systemPrompt = 'Tu es un copywriter expert. Genere du contenu professionnel pour des sites vitrines de professionnels africains. Format JSON avec: heroTitle, heroSubtitle, aboutText, services (array with name+description), ctaText.';

        return this.chat([{
            role: 'user',
            content: `Genere le contenu d'un site vitrine pour: ${JSON.stringify(profileData)}`
        }], { systemPrompt, temperature: 0.8 });
    }

    // === HELPERS ===

    async _request(endpoint, body) {
        const url = `${this.baseUrl}${endpoint}?key=${this.apiKey}`;
        const data = JSON.stringify(body);

        return new Promise((resolve, reject) => {
            const req = https.request(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
                timeout: 60000
            }, (res) => {
                let body = '';
                res.on('data', chunk => body += chunk);
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(body));
                    } catch (e) {
                        resolve({ error: 'Invalid response', raw: body.substring(0, 200) });
                    }
                });
            });
            req.on('error', reject);
            req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
            req.write(data);
            req.end();
        });
    }

    async _fetchImageBase64(url) {
        return new Promise((resolve, reject) => {
            const protocol = url.startsWith('https') ? https : http;
            protocol.get(url, { timeout: 15000 }, (res) => {
                const chunks = [];
                res.on('data', chunk => chunks.push(chunk));
                res.on('end', () => resolve(Buffer.concat(chunks).toString('base64')));
            }).on('error', reject);
        });
    }

    _hash(str) {
        let h = 0;
        for (let i = 0; i < str.length; i++) {
            h = ((h << 5) - h) + str.charCodeAt(i);
            h |= 0;
        }
        return 'cache_' + Math.abs(h).toString(36);
    }

    getStats() {
        return { ...this.usageStats, enabled: this.isEnabled, model: this.model };
    }
}

module.exports = new GeminiClient();
