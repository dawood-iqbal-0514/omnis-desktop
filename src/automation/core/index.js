const { BrowserManager } = require('./browserManager');
const { TaskRunner } = require('./taskRunner');
const { RateLimiter, DEFAULT_LIMITS } = require('./rateLimiter');
const { 
  AutomationError, 
  ErrorCodes, 
  handleError, 
  getUserFriendlyMessage 
} = require('./errorHandler');

module.exports = {
  BrowserManager,
  TaskRunner,
  RateLimiter,
  DEFAULT_LIMITS,
  AutomationError,
  ErrorCodes,
  handleError,
  getUserFriendlyMessage,
};
