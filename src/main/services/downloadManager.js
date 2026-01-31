const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');

const MODEL_URL = process.env.LLM_MODEL_URL || 'https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/qwen2.5-1.5b-instruct-q4_k_m.gguf'
const MODEL_FILENAME = 'qwen2.5-1.5b-instruct-q4_k_m.gguf';

class DownloadManager {
  constructor() {
    this.downloadPath = path.join(app.getPath('userData'), 'models');
    this.currentDownload = null;

    if (!fs.existsSync(this.downloadPath)) {
      fs.mkdirSync(this.downloadPath, { recursive: true });
    }
  }

  isModelDownloaded() {
    const modelPath = path.join(this.downloadPath, MODEL_FILENAME);
    return fs.existsSync(modelPath);
  }

  getModelPath() {
    return path.join(this.downloadPath, MODEL_FILENAME);
  }

  async downloadModel(onProgress) {
    const filePath = path.join(this.downloadPath, MODEL_FILENAME);
    const tempPath = filePath + '.tmp';

    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(tempPath);

      this.currentDownload = https.get(MODEL_URL, (response) => {
        if (response.statusCode === 302 || response.statusCode === 301) {
          file.close();
          this.downloadFromUrl(response.headers.location, onProgress)
            .then(resolve)
            .catch(reject);
          return;
        }

        if (response.statusCode !== 200) {
          file.close();
          fs.unlinkSync(tempPath);
          reject(new Error(`Download failed: HTTP ${response.statusCode}`));
          return;
        }

        const totalSize = parseInt(response.headers['content-length'], 10);
        let downloadedSize = 0;

        response.on('data', (chunk) => {
          downloadedSize += chunk.length;

          if (onProgress) {
            onProgress({
              percent: Math.round((downloadedSize / totalSize) * 100),
              transferred: downloadedSize,
              total: totalSize,
            });
          }
        });

        response.pipe(file);

        file.on('finish', () => {
          file.close();
          fs.renameSync(tempPath, filePath);
          this.currentDownload = null;
          resolve();
        });
      });

      this.currentDownload.on('error', (error) => {
        file.close();
        if (fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
        }
        this.currentDownload = null;
        reject(error);
      });
    });
  }

  cancelDownload() {
    if (this.currentDownload) {
      this.currentDownload.destroy();
      this.currentDownload = null;

      const tempPath = path.join(this.downloadPath, MODEL_FILENAME + '.tmp');
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
    }
  }

  deleteModel() {
    const modelPath = path.join(this.downloadPath, MODEL_FILENAME);
    if (fs.existsSync(modelPath)) {
      fs.unlinkSync(modelPath);
    }
  }
}

module.exports = { DownloadManager };
