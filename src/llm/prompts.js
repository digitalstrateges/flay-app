const PROMPTS = {

  bio: (name, profession, city, style = 'professionnel') =>
    `Tu es un assistant marketing. Genere une bio professionnelle en français pour ${name}, ${profession} base a ${city}.
Style: ${style}. Maximum 3 phrases. Reponds UNIQUEMENT avec le texte de la bio, sans introduction.`,

  services: (profession, context = '') =>
    `Tu es un assistant business. Pour un ${profession}${context ? ' (' + context + ')' : ''}, genere 4-6 services avec prix en FCFA.
Format: chaque service sur une ligne: "Nom du service | Description breve | Prix FCFA"
Reponds UNIQUEMENT avec la liste des services.`,

  marketingContent: (businessName, profession, platform, offer) =>
    `Tu es un copywriter. Genere du contenu marketing pour ${businessName} (${profession}).
Plateforme: ${platform}. Offre: ${offer || 'Non specifiee'}.
Genere: un titre accrocheur, une description persuasive, 3 hashtags.
Format JSON: {"title": "...", "description": "...", "hashtags": ["...", "...", "..."]}
Reponds UNIQUEMENT avec le JSON.`,

  seoOptimization: (title, description, keywords, content) =>
    `Tu es un expert SEO. Analyse et optimise ce contenu:
Titre: ${title}
Description: ${description}
Mots-cles: ${keywords}
Contenu: ${content}

Genere des suggestions SEO au format JSON:
{"metaTitle": "...", "metaDescription": "...", "keywords": [...], "suggestions": [...]}
Reponds UNIQUEMENT avec le JSON.`,

  smartSuggestions: (profile, type) =>
    `Tu es un assistant business intelligent. Basé sur ce profil: ${JSON.stringify(profile)}
Genere des suggestions ${type === 'improvements' ? 'd\'amelioration' : 'de contenu'} pertinentes.
Format JSON: {"suggestions": [{"title": "...", "description": "..."}]}
Reponds UNIQUEMENT avec le JSON.`,

  theme: (preferences, profession) =>
    `Tu es un designer. Recommande un theme pour ${profession} avec ces preferences: ${JSON.stringify(preferences)}
Format JSON: {"theme": "...", "colors": {...}, "reason": "..."}
Reponds UNIQUEMENT avec le JSON.`,

  chat: (message, context) =>
    `Tu es l'assistant virtuel de Flay Super App. Tu aides les professionnels africains.
Contexte: ${JSON.stringify(context)}
Message: ${message}
Reponds de maniere concise et utile en français.`,

  showcaseContent: (profile, products) =>
    `Tu es un designer de sites vitrine. Genere du contenu pour un showcase:
Profil: ${JSON.stringify(profile)}
Produits: ${JSON.stringify(products || [])}
Genere une mise en page optimisee au format JSON:
{"headline": "...", "subheadline": "...", "cta": "...", "sections": [...]}
Reponds UNIQUEMENT avec le JSON.`,

  imagePrompt: (prompt, style = 'professionnel') =>
    `Genere une description d'image pour: ${prompt}
Style: ${style}
Format JSON: {"description": "...", "prompt": "...", "tags": [...]}
Reponds UNIQUEMENT avec le JSON.`,

  personalization: (userData, pageType) =>
    `Analyse cet utilisateur: ${JSON.stringify(userData)}
Pour la page: ${pageType}
Genere des recommandations de personalisation au format JSON:
{"recommendations": [...], "score": 0-100}
Reponds UNIQUEMENT avec le JSON.`,

  analysis: (data, type) =>
    `Analyse ces donnees ${type}: ${JSON.stringify(data)}
Fournis des insights actionnables au format JSON:
{"insights": [...], "recommendations": [...], "score": 0-100}
Reponds UNIQUEMENT avec le JSON.`,

  productDescription: (product) =>
    `Tu es un copywriter e-commerce. Genere une description de produit convaincante:
${JSON.stringify(product)}
Format: description courte (1 phrase) + description longue (3-4 phrases) + points forts (3-4 puces)
Reponds UNIQUEMENT avec le texte.`,

  invoiceAnalysis: (invoice) =>
    `Analyse cette facture et fournis des recommandations:
${JSON.stringify(invoice)}
Format JSON: {"summary": "...", "insights": [...], "suggestions": [...]}
Reponds UNIQUEMENT avec le JSON.`
};

function buildPrompt(type, params = {}) {
  const promptFn = PROMPTS[type];
  if (!promptFn) throw new Error(`Unknown prompt type: ${type}`);
  return promptFn(...Object.values(params));
}

function getPromptTypes() {
  return Object.keys(PROMPTS);
}

module.exports = { PROMPTS, buildPrompt, getPromptTypes };
