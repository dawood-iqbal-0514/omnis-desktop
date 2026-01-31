const { spawn } = require('child_process');
const path = require('path');
const { app } = require('electron');

class BrowserManager {
  constructor() {
    this.browsers = new Map();
    this.pythonProcess = null;
  }

  async getBrowser(platformId, options = {}) {
    if (this.browsers.has(platformId)) {
      return this.browsers.get(platformId);
    }

    const browser = await this.createBrowser(platformId, options);
    this.browsers.set(platformId, browser);
    return browser;
  }

  async createBrowser(platformId, options = {}) {
    const {
      headless = false,
      userDataDir = path.join(app.getPath('userData'), 'browsers', platformId),
    } = options;

    console.log(`Creating browser for ${platformId}...`);

    return {
      platformId,
      isOpen: true,
      newPage: async () => ({ goto: async () => {}, close: async () => {} }),
      close: async () => { this.browsers.delete(platformId); },
    };
  }

  async closeBrowser(platformId) {
    const browser = this.browsers.get(platformId);
    if (browser) {
      await browser.close();
      this.browsers.delete(platformId);
    }
  }

  async close() {
    for (const [platformId, browser] of this.browsers) {
      try {
        await browser.close();
      } catch (error) {
        console.error(`Failed to close browser for ${platformId}:`, error);
      }
    }
    this.browsers.clear();
  }

  getUserDataDir(platformId) {
    return path.join(app.getPath('userData'), 'browsers', platformId);
  }
}

module.exports = { BrowserManager };
