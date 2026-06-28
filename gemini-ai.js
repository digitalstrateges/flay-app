/**
 * Flay AI Agent - Powered by Google Gemini
 * Agent IA multimodal : texte, image, vision
 */

const https = require('https');
const config = require('./config');

class GeminiAI {
    constructor() {
        this.apiKey = config.GEMINI_API_KEY;
        this.model = config.GEMINI_MODEL;
        this.baseUrl = config.GEMINI_BASE_URL;
    }

    /**
     * Appel API Gemini
     */
    async generate(prompt, options = {}) {
        const { systemPrompt, temperature = 0.7, maxTokens = 2048, imageBase64 } = options;
        
        const contents = [];
        
        if (systemPrompt) {
            contents.push({
                role: 'user',
                parts: [{ text: systemPrompt }]
            });
            contents.push({
                role: 'model',
                parts: [{ text: 'Compris. Je vais suivre ces instructions.' }]
            });
        }

        const parts = [{ text: prompt }];
        
        if (imageBase64) {
            parts.push({
                inlineData: {
                    mimeType: 'image/jpeg',
                    data: imageBase64
                }
            });
        }

        contents.push({ role: 'user', parts });

        const requestBody = JSON.stringify({
            contents,
            generationConfig: {
                temperature,
                maxOutputTokens: maxTokens,
                topP: 0.9,
                topK: 40
            }
        });

        return new Promise((resolve, reject) => {
            const url = new URL(`${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`);
            
            const req = https.request(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(requestBody)
                }
            }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const json = JSON.parse(data);
                        if (json.error) {
                            reject(new Error(json.error.message || 'Gemini API error'));
                            return;
                        }
                        const text = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
                        const finishReason = json.candidates?.[0]?.finishReason || 'UNKNOWN';
                        const usage = json.usageMetadata || {};
                        
                        resolve({
                            text,
                            finishReason,
                            usage: {
                                promptTokens: usage.promptTokenCount || 0,
                                completionTokens: usage.candidatesTokenCount || 0,
                                totalTokens: usage.totalTokenCount || 0
                            }
                        });
                    } catch (e) {
                        reject(new Error('Failed to parse Gemini response: ' + e.message));
                    }
                });
            });

            req.on('error', reject);
            req.setTimeout(30000, () => {
                req.destroy();
                reject(new Error('Gemini API timeout'));
            });
            req.write(requestBody);
            req.end();
        });
    }

    /**
     * Generation de bio professionnelle
     */
    async generateBio(name, profession, city, style = 'professional') {
        const prompt = `Genere une bio professionnelle captivante pour un profil ${style} en 2-3 phrases.
        
Nom: ${name}
Profession: ${profession}
Ville: ${city}

Regles:
- Maximum 200 caracteres
- Ton ${style} mais chaleureux
- Inclure la localisation
- Pas de hashtags
- Emoji pertinent au debut`;

        const result = await this.generate(prompt, {
            systemPrompt: 'Tu es un expert en personal branding pour les professionnels en Afrique de l\'Ouest. Tu ecris en francais.'
        });
        return result.text.trim().replace(/^["']|["']$/g, '');
    }

    /**
     * Generation de services
     */
    async generateServices(profession, context = '') {
        const prompt = `Genere une liste de 5-8 services professionnels pour un(e) ${profession} ${context ? 'specialise(e) en ' + context : ''}.

Format JSON array: [{"name": "Nom du service", "description": "Description courte", "price": "Prix en FCFA", "duration": "Duree"}]

Regles:
- Prix realistes pour la Cote d'Ivoire
- Durees en minutes ou "Sur mesure"
- Noms accrocheurs
- Descriptions de max 80 caracteres`;

        const result = await this.generate(prompt, {
            systemPrompt: 'Tu es un consultant business en Cote d\'Ivoire. Reponds UNIQUEMENT avec le JSON, pas de texte explicatif.',
            temperature: 0.8
        });

        try {
            const jsonMatch = result.text.match(/\[[\s\S]*\]/);
            return jsonMatch ? JSON.parse(jsonMatch[0]) : [];
        } catch {
            return [];
        }
    }

    /**
     * Vision : Analyse d'image
     */
    async analyzeImage(imageBase64, question = 'Decris cette image en detail') {
        const result = await this.generate(question, {
            imageBase64,
            systemPrompt: 'Tu es un assistant visuel. Analyse les images et reponds en francais.'
        });
        return result.text;
    }

    /**
     * Generation de contenu marketing
     */
    async generateMarketingContent(businessName, profession, platform, offer = '') {
        const prompt = `Genere un post marketing engaging pour ${platform}.

Business: ${businessName}
Profession: ${profession}
Offre: ${offer || 'Services professionnels'}

Regles:
- Ton amical et professionnel
- Emojis strategiques
- Call-to-action clair
- Max 300 caracteres pour ${platform}
- Inclure des hashtags pertinents`;

        const result = await this.generate(prompt, {
            systemPrompt: 'Tu es un community manager specialise en Afrique de l\'Ouest. Tu crées du contenu viral.'
        });
        return result.text.trim();
    }

    /**
     * Suggestions d'amélioration de profil
     */
    async analyzeProfile(profileData) {
        const prompt = `Analyse ce profil professionnel et donne 5 conseils concrets pour l'ameliorer.

Profil:
- Nom: ${profileData.name || 'N/A'}
- Profession: ${profileData.title || 'N/A'}
- Bio: ${profileData.bio || 'N/A'}
- Services: ${JSON.stringify(profileData.services || [])}
- Theme: ${profileData.theme || 'N/A'}

Pour chaque conseil, donne:
1. Le probleme identifie
2. La solution concrete
3. L'impact attendu

Sois direct et actionable.`;

        const result = await this.generate(prompt, {
            systemPrompt: 'Tu es un expert en optimisation de profils professionnels. Sois concis et pratique.',
            temperature: 0.6
        });
        return result.text;
    }

    /**
     * Reponse intelligente au chat
     */
    async chatResponse(message, context = {}) {
        const systemPrompt = `Tu es l'assistant IA de ${context.businessName || 'ce professionel'}.
Profession: ${context.profession || 'Professionnel'}
Services: ${(context.services || []).join(', ')}

Regles:
- Reponds en francais
- Sois utile et professionnel
- Si la question concerne un service, donne le prix et la disponibilite
- Si c'est une reservation, guide vers le formulaire
- Maximum 150 mots`;

        const result = await this.generate(message, { systemPrompt, temperature: 0.7 });
        return result.text;
    }

    /**
     * Generation de facture description
     */
    async generateInvoiceDescription(items) {
        const prompt = `Genere une description professionnelle pour une facture contenant:
${items.map(i => `- ${i.name}: ${i.quantity}x ${i.price} FCFA`).join('\n')}

Regles:
- Phrases courtes et claires
- Ton professionnel
- Inclure les totaux
- Max 200 caracteres`;

        const result = await this.generate(prompt, {
            systemPrompt: 'Tu es un comptable professionnel. Ecris en francais formel.'
        });
        return result.text.trim();
    }
}

module.exports = new GeminiAI();
