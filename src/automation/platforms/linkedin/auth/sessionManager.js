
const Store = require('electron-store');
const { app } = require('electron');

class SessionManager {
  constructor(platformId) {
    this.platformId = platformId;
    this.store = new Store({
      name: `omnis-reach-session-${platformId}`,
      encryptionKey: 'session-encryption-key',
    });
  }

  async saveSession(cookies) {
    this.store.set('cookies', cookies);
    this.store.set('savedAt', Date.now());
  }

  async hasValidSession() {
    const cookies = this.store.get('cookies');
    const savedAt = this.store.get('savedAt');

    if (!cookies || !savedAt) {
      return false;
    }

    const maxAge = 7 * 24 * 60 * 60 * 1000;
    if (Date.now() - savedAt > maxAge) {
      return false;
    }

    const hasAuthCookie = cookies.some(c => 
      c.name === 'li_at' || c.name === 'JSESSIONID'
    );

    return hasAuthCookie;
  }

  getCookies() {
    return this.store.get('cookies') || [];
  }

  async restoreSession(page) {
    try {
      const cookies = this.getCookies();
      if (!cookies.length) {
        return false;
      }

      await page.setCookie(...cookies);

      await page.goto('https://www.linkedin.com/feed/', {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });

      const isLoggedIn = await page.$('[data-test-id="nav-menu-profile"]');

      if (!isLoggedIn) {

        this.clearSession();
        return false;
      }

      return true;
    } catch (error) {
      console.error('Session restore failed:', error);
      return false;
    }
  }

  clearSession() {
    this.store.delete('cookies');
    this.store.delete('savedAt');
  }
}

module.exports = { SessionManager };
