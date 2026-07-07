const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { createHash } = require('crypto');

const MODELS = {
  'qwen2.5-0.5b': {
    name: 'Qwen2.5-0.5B-Instruct-Q4_K_M',
    url: 'https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_k_m.gguf',
    filename: 'qwen2.5-0.5b-instruct-q4_k_m.gguf',
    size: '350 MB',
    sha256: '',
    contextLength: 32768
  },
  'phi-2': {
    name: 'Phi-2-Q4_K_M',
    url: 'https://huggingface.co/microsoft/phi-2/resolve/main/phi-2.Q4_K_M.gguf',
    filename: 'phi-2.Q4_K_M.gguf',
    size: '700 MB',
    sha256: '',
    contextLength: 2048
  },
  'tinyllama': {
    name: 'TinyLlama-1.1B-Q4_K_M',
    url: 'https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF/resolve/main/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf',
    filename: 'tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf',
    size: '700 MB',
    sha256: '',
    contextLength: 2048
  }
};

class ModelLoader {
  constructor(options = {}) {
    this.modelsDir = options.modelsDir || path.join(__dirname, '..', '..', 'models', 'gguf');
    this.selectedModel = options.model || 'qwen2.5-0.5b';
    this.downloading = false;
    this.progress = 0;
    this.status = 'idle';
    this.error = null;

    if (!fs.existsSync(this.modelsDir)) {
      fs.mkdirSync(this.modelsDir, { recursive: true });
    }
  }

  getModelInfo() {
    const model = MODELS[this.selectedModel];
    if (!model) throw new Error(`Model ${this.selectedModel} not found`);
    return model;
  }

  getModelPath() {
    const model = this.getModelInfo();
    return path.join(this.modelsDir, model.filename);
  }

  isDownloaded() {
    return fs.existsSync(this.getModelPath());
  }

  getFileSize() {
    try {
      return fs.statSync(this.getModelPath()).size;
    } catch {
      return 0;
    }
  }

  downloadModel(onProgress = null) {
    return new Promise((resolve, reject) => {
      if (this.downloading) {
        reject(new Error('Download already in progress'));
        return;
      }

      const model = this.getModelInfo();
      const modelPath = this.getModelPath();
      const tempPath = modelPath + '.download';

      this.downloading = true;
      this.status = 'downloading';
      this.progress = 0;

      const file = fs.createWriteStream(tempPath);
      const url = new URL(model.url);
      const client = url.protocol === 'https:' ? https : http;

      console.log(`\n  [LLM] Telechargement de ${model.name} (${model.size})...`);
      console.log(`  [LLM] Modele: ${model.filename}`);

      const req = client.get(model.url, (response) => {
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          file.close();
          fs.unlinkSync(tempPath);
          this.downloading = false;
          return this.downloadFromUrl(response.headers.location, tempPath, modelPath, model, onProgress)
            .then(resolve).catch(reject);
        }

        if (response.statusCode !== 200) {
          file.close();
          fs.unlinkSync(tempPath);
          this.downloading = false;
          this.status = 'error';
          this.error = `HTTP ${response.statusCode}`;
          reject(new Error(`Download failed with status ${response.statusCode}`));
          return;
        }

        const totalSize = parseInt(response.headers['content-length'] || '0', 10);
        let downloadedSize = 0;

        response.on('data', (chunk) => {
          downloadedSize += chunk.length;
          if (totalSize > 0) {
            this.progress = Math.round((downloadedSize / totalSize) * 100);
            if (onProgress) onProgress(this.progress);
          }
        });

        response.pipe(file);

        file.on('finish', () => {
          file.close();
          fs.renameSync(tempPath, modelPath);
          this.downloading = false;
          this.status = 'ready';
          this.progress = 100;
          const finalSize = this.getFileSize();
          console.log(`  [LLM] Telechargement termine: ${(finalSize / 1024 / 1024).toFixed(1)} MB`);
          resolve({ path: modelPath, size: finalSize });
        });
      });

      req.on('error', (err) => {
        file.close();
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        this.downloading = false;
        this.status = 'error';
        this.error = err.message;
        reject(err);
      });

      req.setTimeout(300000, () => {
        req.destroy();
        file.close();
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        this.downloading = false;
        this.status = 'error';
        this.error = 'Timeout';
        reject(new Error('Download timeout'));
      });
    });
  }

  listAvailableModels() {
    return Object.entries(MODELS).map(([key, model]) => ({
      id: key,
      name: model.name,
      filename: model.filename,
      size: model.size,
      downloaded: fs.existsSync(path.join(this.modelsDir, model.filename)),
      fileSize: fs.existsSync(path.join(this.modelsDir, model.filename))
        ? fs.statSync(path.join(this.modelsDir, model.filename)).size
        : 0,
      contextLength: model.contextLength
    }));
  }

  getStatus() {
    return {
      status: this.status,
      model: this.selectedModel,
      downloaded: this.isDownloaded(),
      progress: this.progress,
      fileSize: this.getFileSize(),
      modelsDir: this.modelsDir,
      error: this.error,
      availableModels: this.listAvailableModels()
    };
  }

  switchModel(modelId) {
    if (!MODELS[modelId]) throw new Error(`Unknown model: ${modelId}`);
    this.selectedModel = modelId;
    this.status = this.isDownloaded() ? 'ready' : 'pending';
    return this.getModelInfo();
  }
}

module.exports = new ModelLoader();
