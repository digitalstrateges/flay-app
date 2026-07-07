const localLLM = require('../src/llm/engine');

class GeminiClient {
  get isEnabled() { return true; }

  getStats() { return localLLM.getStats(); }

  async generateMarketingContent(params) {
    const { businessName, profession, platform, offer } = params || {};
    return localLLM.generateMarketingContent(
      businessName || params.name || 'Entreprise',
      profession || params.profession || 'Professionnel',
      platform || params.platform || 'web',
      offer || params.offer || ''
    );
  }

  async optimizeSEO(title, description, keywords, content) {
    return localLLM.optimizeSEO(title, description, keywords, content);
  }

  async getSmartSuggestions(params) {
    return localLLM.getSmartSuggestions(params.profile || params, params.type);
  }

  async chat(messages, options = {}) {
    return localLLM.chat(messages, options);
  }

  async assistantChat(message, context) {
    return localLLM.assistantChat(message, context);
  }

  async generateShowcaseContent(params) {
    return localLLM.generateShowcaseContent(params.profile || params, params.products);
  }

  async generateImage(prompt, options = {}) {
    return localLLM.generateImage(prompt, options);
  }

  async generateBio(name, profession, city, style) {
    return localLLM.generateBio(name, profession, city, style);
  }

  async generateServices(profession, context) {
    return localLLM.generateServices(profession, context);
  }

  async analyzeImage(imageBase64, question) {
    return localLLM.analyzeImage(imageBase64, question);
  }

  async analyzeProfile(profileData) {
    return localLLM.analyzeProfile(profileData);
  }

  async chatResponse(message, context) {
    return localLLM.chatResponse(message, context);
  }

  clearCache() { localLLM.clearCache(); }
}

module.exports = new GeminiClient();
