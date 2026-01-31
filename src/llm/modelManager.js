const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const EventEmitter = require('events');

class ModelManager extends EventEmitter {
  constructor() {
    super();

    this.config = {
      modelId: 'qwen2.5-1.5b-instruct-q4',
      modelFile: 'qwen2.5-1.5b-instruct-q4_k_m.gguf',
      contextLength: 4096,
      gpuLayers: 0,
      threads: 4,
    };

    this.model = null;
    this.isLoaded = false;
    this.isLoading = false;
    this.error = null;

    this.modelsDir = path.join(app.getPath('userData'), 'models');
  }

  getModelPath() {
    return path.join(this.modelsDir, this.config.modelFile);
  }

  isModelDownloaded() {
    return fs.existsSync(this.getModelPath());
  }

  getModelInfo() {
    return {
      id: this.config.modelId,
      file: this.config.modelFile,
      path: this.getModelPath(),
      isDownloaded: this.isModelDownloaded(),
      isLoaded: this.isLoaded,
      isLoading: this.isLoading,
      contextLength: this.config.contextLength,
    };
  }

  async load() {
    if (this.isLoaded) {
      console.log('[LLM] Model already loaded');
      return true;
    }

    if (this.isLoading) {
      console.log('[LLM] Model is already loading...');
      return false;
    }

    if (!this.isModelDownloaded()) {
      throw new Error('Model not downloaded. Please download the model first.');
    }

    this.isLoading = true;
    this.emit('loading');

    try {
      console.log('[LLM] Loading model...');

      await new Promise(resolve => setTimeout(resolve, 1000));

      this.isLoaded = true;
      this.isLoading = false;
      this.error = null;

      this.emit('loaded');
      console.log('[LLM] Model loaded successfully');

      return true;
    } catch (error) {
      this.isLoading = false;
      this.error = error.message;

      this.emit('error', error);
      console.error('[LLM] Failed to load model:', error);

      throw error;
    }
  }

  async unload() {
    if (!this.isLoaded) {
      console.log('[LLM] Model not loaded');
      return;
    }

    try {
      console.log('[LLM] Unloading model...');

      this.model = null;
      this.isLoaded = false;

      this.emit('unloaded');
      console.log('[LLM] Model unloaded');
    } catch (error) {
      console.error('[LLM] Failed to unload model:', error);
      throw error;
    }
  }

  getModel() {
    if (!this.isLoaded) {
      throw new Error('Model not loaded');
    }
    return this.model;
  }

  updateConfig(newConfig) {
    if (this.isLoaded) {
      throw new Error('Cannot update config while model is loaded');
    }
    this.config = { ...this.config, ...newConfig };
  }
}

module.exports = { ModelManager };
