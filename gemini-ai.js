const localLLM = require('./src/llm/engine');

class AIAgent {
  get isEnabled() { return true; }

  async generateBio(name, profession, city, style) {
    return localLLM.generateBio(name, profession, city, style);
  }

  async generateServices(profession, context) {
    return localLLM.generateServices(profession, context);
  }

  async analyzeImage(imageBase64, question) {
    return localLLM.analyzeImage(imageBase64, question);
  }

  async generateMarketingContent(businessName, profession, platform, offer) {
    return localLLM.generateMarketingContent(businessName, profession, platform, offer);
  }

  async analyzeProfile(profileData) {
    return localLLM.analyzeProfile(profileData);
  }

  async chatResponse(message, context) {
    return localLLM.chatResponse(message, context);
  }

  getStats() {
    return localLLM.getStats();
  }
}

module.exports = new AIAgent();
