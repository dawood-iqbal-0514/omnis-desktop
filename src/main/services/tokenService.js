const { safeStorage } = require('electron');
const Store = require('electron-store');

const store = new Store({
  name: 'omnis-reach-auth',
  encryptionKey: process.env.STORE_ENCRYPTION_KEY || 'omnis-reach-secure-key',
});

const TokenService = {
  saveRefreshToken: (token) => {
    if (safeStorage.isEncryptionAvailable()) {
      const encrypted = safeStorage.encryptString(token);
      store.set('refreshToken', encrypted.toString('base64'));
    } else {
      store.set('refreshToken', token);
    }
  },

  getRefreshToken: () => {
    const stored = store.get('refreshToken');
    if (!stored) return null;

    if (safeStorage.isEncryptionAvailable()) {
      try {
        const buffer = Buffer.from(stored, 'base64');
        return safeStorage.decryptString(buffer);
      } catch (error) {
        console.error('Failed to decrypt token:', error);
        return null;
      }
    }

    return stored;
  },

  clearTokens: () => {
    store.delete('refreshToken');
  },

  hasStoredCredentials: () => {
    return store.has('refreshToken');
  },
};

module.exports = { TokenService };
