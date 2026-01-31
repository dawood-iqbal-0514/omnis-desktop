const { app } = require('electron');
const Store = require('electron-store');

const store = new Store({ name: 'omnis-reach-license' });

const GRACE_PERIOD_MS = 24 * 60 * 60 * 1000;

const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000;

class LicenseService {
  constructor() {
    this.isValid = false;
    this.subscription = null;
    this.heartbeatInterval = null;
    this.lastValidation = null;
  }

  startHeartbeat(apiClient) {
    this.apiClient = apiClient;
    this.validateLicense();

    this.heartbeatInterval = setInterval(
      () => this.validateLicense(),
      HEARTBEAT_INTERVAL_MS
    );
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  async validateLicense() {
    try {
      const response = await this.apiClient.post('/license/validate', {
        deviceId: this.getDeviceId(),
        appVersion: app.getVersion(),
      });

      if (response.data.valid) {
        this.isValid = true;
        this.subscription = response.data.subscription;
        this.lastValidation = Date.now();

        store.set('lastValidSubscription', {
          subscription: this.subscription,
          timestamp: this.lastValidation,
        });
      } else {
        this.handleInvalidLicense(response.data.reason);
      }
    } catch (error) {
      console.error('License validation failed:', error);
      this.handleOfflineValidation();
    }
  }

  handleOfflineValidation() {
    const cached = store.get('lastValidSubscription');

    if (cached && Date.now() - cached.timestamp < GRACE_PERIOD_MS) {
      this.isValid = true;
      this.subscription = cached.subscription;
      console.log('Using cached license (offline grace period)');
    } else {
      this.isValid = false;
      this.subscription = null;
    }
  }

  handleInvalidLicense(reason) {
    this.isValid = false;
    this.subscription = null;
    store.delete('lastValidSubscription');

    this.onLicenseInvalid?.(reason);
  }

  canPerformAction(action, platform) {
    if (!this.isValid || !this.subscription) {
      return { allowed: false, reason: 'subscription_required' };
    }

    const { tier, features } = this.subscription;

    if (features.platforms !== '*' && !features.platforms.includes(platform)) {
      return { allowed: false, reason: 'platform_not_included' };
    }

    if (features.maxTasksPerMonth !== -1) {
      const usage = store.get('monthlyUsage', 0);
      if (usage >= features.maxTasksPerMonth) {
        return { allowed: false, reason: 'limit_reached' };
      }
    }

    return { allowed: true };
  }

  incrementUsage() {
    const currentMonth = new Date().toISOString().slice(0, 7); 
    const storedMonth = store.get('usageMonth');

    if (storedMonth !== currentMonth) {

      store.set('usageMonth', currentMonth);
      store.set('monthlyUsage', 1);
    } else {
      const usage = store.get('monthlyUsage', 0);
      store.set('monthlyUsage', usage + 1);
    }
  }

  getDeviceId() {
    const { machineIdSync } = require('node-machine-id');
    return machineIdSync();
  }
}

module.exports = { LicenseService: new LicenseService() };
