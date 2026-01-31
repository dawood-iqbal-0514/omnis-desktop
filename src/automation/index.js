const { BrowserManager } = require('./core/browserManager');
const { TaskRunner } = require('./core/taskRunner');
const { RateLimiter } = require('./core/rateLimiter');
const { platforms, getPlatform, getAllPlatforms } = require('./platforms');

class AutomationOrchestrator {
  constructor() {
    this.browserManager = new BrowserManager();
    this.taskRunner = new TaskRunner();
    this.rateLimiter = new RateLimiter();
    this.runningTasks = new Map();
  }

  getAllPlatforms() {
    return getAllPlatforms();
  }

  getPlatform(platformId) {
    return getPlatform(platformId);
  }

  async executeTask(task, callbacks = {}) {
    const { platform: platformId, action, parameters, id: taskId } = task;

    const platform = getPlatform(platformId);
    if (!platform) {
      throw new Error(`Platform "${platformId}" not found`);
    }

    if (!platform.isConnected) {
      throw new Error(`Platform "${platformId}" is not connected`);
    }

    await this.rateLimiter.waitForSlot(platformId);

    const abortController = new AbortController();
    this.runningTasks.set(taskId, { abortController, platform, action });

    try {
      callbacks.onProgress?.({ status: 'starting', message: `Executing ${action}...` });

      const result = await platform.executeAction(action, parameters, {
        signal: abortController.signal,
        onProgress: callbacks.onProgress,
      });

      this.rateLimiter.recordAction(platformId);

      return result;
    } finally {
      this.runningTasks.delete(taskId);
    }
  }

  async cancelTask(taskId) {
    const task = this.runningTasks.get(taskId);
    if (task) {
      task.abortController.abort();
      this.runningTasks.delete(taskId);
    }
  }

  async shutdown() {
    for (const [taskId] of this.runningTasks) {
      await this.cancelTask(taskId);
    }

    for (const platform of getAllPlatforms()) {
      if (platform.isConnected) {
        await platform.disconnect();
      }
    }

    await this.browserManager.close();
  }
}

module.exports = { AutomationOrchestrator };
