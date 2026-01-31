
const { AutomationError, ErrorCodes } = require('../../core/errorHandler');

class BasePlatform {

  constructor(config) {
    if (this.constructor === BasePlatform) {
      throw new Error('BasePlatform is abstract and cannot be instantiated directly');
    }

    this.id = config.id;
    this.name = config.name;
    this.type = config.type; 
    this.icon = config.icon;

    this.isConnected = false;
    this.connectionInfo = null;
    this.browser = null;
    this.lastActivity = null;
  }

  async connect(credentials) {
    throw new Error('connect() must be implemented by subclass');
  }

  async disconnect() {
    throw new Error('disconnect() must be implemented by subclass');
  }

  async executeAction(action, params, options = {}) {
    throw new Error('executeAction() must be implemented by subclass');
  }

  getAvailableActions() {
    throw new Error('getAvailableActions() must be implemented by subclass');
  }

  async isSessionValid() {
    return this.isConnected;
  }

  async refreshSession() {

  }

  validateParams(params, requiredParams) {
    const missing = requiredParams.filter(param => !params[param]);
    if (missing.length > 0) {
      throw new AutomationError(
        `Missing required parameters: ${missing.join(', ')}`,
        ErrorCodes.MISSING_REQUIRED_PARAM,
        { missing }
      );
    }
  }

  setConnected(connected, info = null) {
    this.isConnected = connected;
    this.connectionInfo = info;
    this.lastActivity = new Date().toISOString();
  }

  randomDelay(min = 1000, max = 3000) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async humanDelay() {
    const delay = this.randomDelay(1000, 3000);
    await this.sleep(delay);
  }

  log(action, message, data = {}) {
    console.log(`[${this.id.toUpperCase()}] ${action}: ${message}`, data);
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      icon: this.icon,
      isConnected: this.isConnected,
      lastActivity: this.lastActivity,
      availableActions: this.getAvailableActions(),
    };
  }
}

module.exports = { BasePlatform };
