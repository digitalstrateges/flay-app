const modelLoader = require('./model-loader');
const { buildPrompt } = require('./prompts');
const config = require('../config');
const eventBus = require('../core/event-bus');

class LocalLLM {
  constructor() {
    this.ready = false;
    this.model = null;
    this.context = null;
    this.cache = new Map();
    this.cacheSize = 100;
    this.stats = { total: 0, cached: 0, errors: 0, avgTime: 0 };
    this.fallbackMode = true;
  }

  async init() {
    try {
      const LlamaModel = this._tryLoadLlama();
      if (LlamaModel) {
        const modelPath = modelLoader.getModelPath();
        if (modelLoader.isDownloaded()) {
          this.model = await LlamaModel({ modelPath });
          this.context = await this.model.createContext();
          this.ready = true;
          this.fallbackMode = false;
          console.log(`  LLM Local ........... ${modelLoader.getModelInfo().name} (${(modelLoader.getFileSize() / 1024 / 1024).toFixed(0)} MB)`);
        } else {
          console.log(`  LLM Local ........... Modele non trouve. Telechargement requis.`);
          console.log(`  LLM Local ........... "node models/download-model.js" pour telecharger`);
          this._startAutoDownload();
        }
      } else {
        console.log(`  LLM Local ........... Mode fallback (node-llama-cpp non installe)`);
      }
    } catch (e) {
      console.log(`  LLM Local ........... Fallback: ${e.message}`);
    }
  }

  _tryLoadLlama() {
    try {
      return require('node-llama-cpp');
    } catch {
      return null;
    }
  }

  async _startAutoDownload() {
    console.log('  [LLM] Demarrage du telechargement automatique...');
    try {
      await modelLoader.downloadModel((progress) => {
        if (progress % 10 === 0) process.stdout.write(`\r  [LLM] Telechargement: ${progress}%`);
      });
      console.log('\n  [LLM] Modele pret ! Redemarrage necessaire.');
    } catch (e) {
      console.log(`  [LLM] Telechargement echoue: ${e.message}`);
    }
  }

  generate(prompt, options = {}) {
    const cacheKey = this._cacheKey(prompt, options);
    const cached = this._getCached(cacheKey);
    if (cached) return cached;

    const start = Date.now();

    if (this.ready && !this.fallbackMode) {
      return this._generateLocal(prompt, options, cacheKey, start);
    }
    return this._generateFallback(prompt, options, cacheKey, start);
  }

  async _generateLocal(prompt, options, cacheKey, start) {
    try {
      const response = await this.context.completion(prompt, {
        maxTokens: options.maxTokens || 512,
        temperature: options.temperature || 0.7,
        topP: options.topP || 0.9,
        stop: options.stop || ['\n\n', 'User:', 'Assistant:'],
        ...options.llamaOptions
      });
      const time = Date.now() - start;
      this._updateStats(time);
      const result = { text: response.text || response, time, source: 'local-llm', tokens: response.tokens };
      this._setCached(cacheKey, result);
      return result;
    } catch (e) {
      this.stats.errors++;
      return this._generateFallback(prompt, options, cacheKey, start);
    }
  }

  _generateFallback(prompt, options, cacheKey, start) {
    const text = this._smartFallback(prompt, options);
    const time = Date.now() - start;
    this._updateStats(time);
    const result = { text, time, source: 'fallback', tokens: 0 };
    this._setCached(cacheKey, result);
    return result;
  }

  _smartFallback(prompt, options) {
    const lower = prompt.toLowerCase();

    if (lower.includes('genere une bio') || lower.includes('bio professionnelle')) {
      const profession = this._extractProfession(prompt);
      return `Professionnel passionne avec une solide experience en ${profession || 'mon domaine'}.` +
        ` Je m'engage a fournir des services de qualite exceptionnelle a mes clients.` +
        ` Base en Afrique, je combine expertise locale et standards internationaux.`;
    }

    if (lower.includes('service') && lower.includes('prix')) {
      return `Consultation initiale | Premiere seance de decouverte et conseil | 15 000 FCFA\n` +
        `Pack Standard | Service complet avec suivi personnalise | 35 000 FCFA\n` +
        `Pack Premium | Solution integrale avec support prioritaire | 75 000 FCFA\n` +
        `Formation | Session de formation professionnelle | 50 000 FCFA\n` +
        `Maintenance | Suivi et maintenance mensuelle | 25 000 FCFA/mois`;
    }

    if (lower.includes('seo') || lower.includes('optimisation')) {
      return JSON.stringify({
        metaTitle: 'Optimisez votre presence digitale | Flay',
        metaDescription: 'Decouvrez nos solutions professionnelles pour booster votre activite.',
        keywords: ['professionnel', 'afrique', 'digital', 'business', 'services'],
        suggestions: ['Ajoutez des mots-cles locaux', 'Optimisez vos images', 'Creez du contenu regulier']
      });
    }

    if (lower.includes('json')) {
      return JSON.stringify({
        success: true,
        message: 'Contenu genere automatiquement',
        suggestions: [
          { title: 'Optimisation', description: 'Pour de meilleurs resultats, installez node-llama-cpp' }
        ]
      });
    }

    if (lower.includes('suggestion') || lower.includes('amelioration')) {
      return JSON.stringify({
        suggestions: [
          { title: 'Ajoutez des photos', description: 'Les profils avec photos recoivent 3x plus de visites' },
          { title: 'Completez votre bio', description: 'Une bio detaillee inspire confiance' },
          { title: 'Ajoutez vos services', description: 'Listez clairement ce que vous proposez' }
        ]
      });
    }

    if (lower.includes('theme') || lower.includes('design')) {
      return JSON.stringify({
        theme: 'dark',
        colors: { primary: '#818cf8', secondary: '#a78bfa', accent: '#34d399' },
        reason: 'Theme moderne et professionnel adapte a tous les secteurs'
      });
    }

    if (lower.includes('contenu marketing') || lower.includes('marketing')) {
      const name = this._extractName(prompt) || 'Votre entreprise';
      return `🔥 ${name} - La reference dans votre secteur !\n\n` +
        `Des services professionnels de qualite superieure adaptes a vos besoins. ` +
        `Nous mettons notre expertise a votre service pour vous accompagner vers la reussite.\n\n` +
        `#Professionnel #Qualite #Service #Africa #Business`;
    }

    if (lower.includes('produit') || lower.includes('description')) {
      return `Decouvrez notre produit de qualite superieure, concu avec soin pour repondre a vos besoins. ` +
        `Alliant performance et fiabilite, il est le compagnon ideal pour votre quotidien professionnel.\n\n` +
        `Points forts:\n` +
        `• Qualite professionnelle garantie\n` +
        `• Prix competitif\n` +
        `• Livraison rapide\n` +
        `• Satisfaction client`
        ;
    }

    if (lower.includes('invoice') || lower.includes('facture') || lower.includes('analysis')) {
      return JSON.stringify({
        summary: 'Analyse financiere effectuee',
        insights: ['Transaction dans la moyenne du secteur'],
        suggestions: ['Envisagez un paiement anticipe pour beneficier de remises']
      });
    }

    if (lower.includes('personalisation') || lower.includes('personalization')) {
      return JSON.stringify({
        recommendations: [
          { type: 'theme', value: 'dark', reason: 'Style preferé' },
          { type: 'layout', value: 'grid', reason: 'Affichage optimal' }
        ],
        score: 65
      });
    }

    return "Je suis votre assistant Flay Super App. Posez-moi vos questions sur la plateforme, " +
      "je vous aiderai a creer votre presence digitale, gerer votre boutique, " +
      "ou optimiser votre profil professionnel.";
  }

  _extractProfession(text) {
    const match = text.match(/pour un\s+([^.,]+)/i) || text.match(/en tant qu[ue']\s+([^.,]+)/i);
    return match ? match[1].trim() : null;
  }

  _extractName(text) {
    const match = text.match(/pour\s+(\w+(?:\s+\w+)?)/i);
    return match ? match[1] : null;
  }

  async generateFromTemplate(type, params = {}) {
    const prompt = buildPrompt(type, params);
    const result = await this.generate(prompt, params.options || {});
    result.type = type;
    eventBus.emit('llm:generated', { type, time: result.time, source: result.source });
    return result;
  }

  _cacheKey(prompt, options) {
    return `${prompt.substring(0, 100)}_${options.maxTokens || 512}_${options.temperature || 0.7}`;
  }

  _getCached(key) {
    if (this.cache.has(key)) {
      this.stats.cached++;
      return this.cache.get(key);
    }
    return null;
  }

  _setCached(key, value) {
    if (this.cache.size >= this.cacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  _updateStats(time) {
    this.stats.total++;
    this.stats.avgTime = (this.stats.avgTime * (this.stats.total - 1) + time) / this.stats.total;
  }

  clearCache() { this.cache.clear(); }

  getStats() {
    return {
      ...this.stats,
      ready: this.ready,
      fallback: this.fallbackMode,
      model: modelLoader.getModelInfo().name,
      cacheSize: this.cache.size,
      modelStatus: modelLoader.getStatus()
    };
  }

  async chat(messages, options = {}) {
    const lastMsg = messages[messages.length - 1];
    const prompt = lastMsg.content || lastMsg.text || lastMsg;
    return this.generate(prompt, { ...options, maxTokens: options.maxTokens || 1024 });
  }

  async generateBio(name, profession, city, style) {
    return this.generateFromTemplate('bio', { params: [name, profession, city, style] });
  }

  async generateServices(profession, context) {
    return this.generateFromTemplate('services', { params: [profession, context] });
  }

  async generateMarketingContent(businessName, profession, platform, offer) {
    return this.generateFromTemplate('marketingContent', { params: [businessName, profession, platform, offer] });
  }

  async optimizeSEO(title, description, keywords, content) {
    return this.generateFromTemplate('seoOptimization', { params: [title, description, keywords, content] });
  }

  async getSmartSuggestions(profile, type) {
    return this.generateFromTemplate('smartSuggestions', { params: [profile, type] });
  }

  async generateImage(prompt, options = {}) {
    const result = await this.generateFromTemplate('imagePrompt', { params: [prompt, options.style] });
    try { result.text = JSON.parse(result.text); } catch {}
    return result;
  }

  async assistantChat(message, context) {
    return this.generateFromTemplate('chat', { params: [message, context] });
  }

  async generateShowcaseContent(profile, products) {
    return this.generateFromTemplate('showcaseContent', { params: [profile, products] });
  }

  async analyzeImage(imageBase64, question) {
    return this.generate(`Analyse cette image et reponds a: ${question}. Reponds en français.`);
  }

  async analyzeProfile(profileData) {
    return this.generateFromTemplate('analysis', { params: [profileData, 'profil'] });
  }

  async chatResponse(message, context) {
    return this.generateFromTemplate('chat', { params: [message, context] });
  }
}

module.exports = new LocalLLM();
