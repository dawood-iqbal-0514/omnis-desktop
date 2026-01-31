const { handleError, AutomationError } = require('./errorHandler');

const DEFAULT_RETRY_CONFIG = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
};

class TaskRunner {
  constructor(config = {}) {
    this.config = { ...DEFAULT_RETRY_CONFIG, ...config };
    this.taskHistory = [];
  }

  async execute(taskFn, options = {}) {
    const { maxRetries, onRetry } = { ...this.config, ...options };

    let lastError = null;
    let delay = this.config.initialDelay;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await taskFn(attempt);

        this.recordTask({ success: true, attempt });

        return result;
      } catch (error) {
        lastError = error;

        if (!this.isRetryableError(error)) {
          throw error;
        }

        if (attempt >= maxRetries) {
          break;
        }

        onRetry?.(attempt, error, delay);

        await this.sleep(delay);
        delay = Math.min(delay * this.config.backoffMultiplier, this.config.maxDelay);
      }
    }

    this.recordTask({ success: false, error: lastError });
    throw new AutomationError(
      `Task failed after ${maxRetries} attempts: ${lastError.message}`,
      'TASK_FAILED',
      { originalError: lastError }
    );
  }

  isRetryableError(error) {
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
      return true;
    }

    if (error.message?.includes('Element not found')) {
      return true;
    }

    if (error.message?.includes('rate limit')) {
      return true;
    }

    if (error.message?.includes('authentication') || error.message?.includes('login required')) {
      return false;
    }

    return true;
  }

  recordTask(result) {
    this.taskHistory.push({
      ...result,
      timestamp: new Date().toISOString(),
    });

    if (this.taskHistory.length > 100) {
      this.taskHistory.shift();
    }
  }

  getStats() {
    const total = this.taskHistory.length;
    const successful = this.taskHistory.filter(t => t.success).length;

    return {
      total,
      successful,
      failed: total - successful,
      successRate: total > 0 ? (successful / total * 100).toFixed(2) : 0,
    };
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = { TaskRunner };
