const DEFAULT_LIMITS = {
  linkedin: {
    actionsPerMinute: 10,
    actionsPerHour: 100,
    actionsPerDay: 500,
    minDelayBetweenActions: 3000,
    maxDelayBetweenActions: 8000,
  },
  notion: {
    actionsPerMinute: 30,
    actionsPerHour: 1000,
    actionsPerDay: 10000,
    minDelayBetweenActions: 500,
    maxDelayBetweenActions: 2000,
  },
  upwork: {
    actionsPerMinute: 5,
    actionsPerHour: 50,
    actionsPerDay: 200,
    minDelayBetweenActions: 5000,
    maxDelayBetweenActions: 15000,
  },
  default: {
    actionsPerMinute: 15,
    actionsPerHour: 200,
    actionsPerDay: 1000,
    minDelayBetweenActions: 2000,
    maxDelayBetweenActions: 5000,
  },
};

class RateLimiter {
  constructor(customLimits = {}) {
    this.limits = { ...DEFAULT_LIMITS, ...customLimits };
    this.actionHistory = new Map();
  }

  getLimits(platformId) {
    return this.limits[platformId] || this.limits.default;
  }

  recordAction(platformId) {
    if (!this.actionHistory.has(platformId)) {
      this.actionHistory.set(platformId, []);
    }
    this.actionHistory.get(platformId).push(Date.now());
    this.cleanup(platformId);
  }

  isAllowed(platformId) {
    const limits = this.getLimits(platformId);
    const history = this.actionHistory.get(platformId) || [];
    const now = Date.now();

    const lastMinute = history.filter(t => now - t < 60000);
    if (lastMinute.length >= limits.actionsPerMinute) {
      return { allowed: false, reason: 'minute_limit', waitMs: 60000 - (now - lastMinute[0]) };
    }

    const lastHour = history.filter(t => now - t < 3600000);
    if (lastHour.length >= limits.actionsPerHour) {
      return { allowed: false, reason: 'hour_limit', waitMs: 3600000 - (now - lastHour[0]) };
    }

    const lastDay = history.filter(t => now - t < 86400000);
    if (lastDay.length >= limits.actionsPerDay) {
      return { allowed: false, reason: 'day_limit', waitMs: 86400000 - (now - lastDay[0]) };
    }

    return { allowed: true };
  }

  async waitForSlot(platformId) {
    const check = this.isAllowed(platformId);

    if (!check.allowed) {
      console.log(`Rate limit reached for ${platformId}. Waiting ${check.waitMs}ms...`);
      await this.sleep(check.waitMs);
    }

    const limits = this.getLimits(platformId);
    const delay = this.randomDelay(limits.minDelayBetweenActions, limits.maxDelayBetweenActions);
    await this.sleep(delay);
  }

  randomDelay(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  getRemainingQuota(platformId) {
    const limits = this.getLimits(platformId);
    const history = this.actionHistory.get(platformId) || [];
    const now = Date.now();

    return {
      perMinute: limits.actionsPerMinute - history.filter(t => now - t < 60000).length,
      perHour: limits.actionsPerHour - history.filter(t => now - t < 3600000).length,
      perDay: limits.actionsPerDay - history.filter(t => now - t < 86400000).length,
    };
  }

  cleanup(platformId) {
    const history = this.actionHistory.get(platformId);
    if (!history) return;

    const dayAgo = Date.now() - 86400000;
    const filtered = history.filter(t => t > dayAgo);
    this.actionHistory.set(platformId, filtered);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = { RateLimiter, DEFAULT_LIMITS };
