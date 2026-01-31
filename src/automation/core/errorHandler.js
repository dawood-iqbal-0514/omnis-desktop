class AutomationError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'AutomationError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      details: this.details,
      timestamp: this.timestamp,
    };
  }
}

const ErrorCodes = {
  CONNECTION_FAILED: 'CONNECTION_FAILED',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  NETWORK_ERROR: 'NETWORK_ERROR',

  AUTH_REQUIRED: 'AUTH_REQUIRED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TWO_FACTOR_REQUIRED: 'TWO_FACTOR_REQUIRED',

  PLATFORM_NOT_FOUND: 'PLATFORM_NOT_FOUND',
  PLATFORM_NOT_CONNECTED: 'PLATFORM_NOT_CONNECTED',
  ACTION_NOT_SUPPORTED: 'ACTION_NOT_SUPPORTED',

  ELEMENT_NOT_FOUND: 'ELEMENT_NOT_FOUND',
  TIMEOUT: 'TIMEOUT',
  TASK_FAILED: 'TASK_FAILED',
  TASK_CANCELLED: 'TASK_CANCELLED',

  RATE_LIMITED: 'RATE_LIMITED',
  ACCOUNT_RESTRICTED: 'ACCOUNT_RESTRICTED',

  INVALID_PARAMETERS: 'INVALID_PARAMETERS',
  MISSING_REQUIRED_PARAM: 'MISSING_REQUIRED_PARAM',
};

function handleError(error, context = {}) {
  if (error instanceof AutomationError) {
    return error;
  }

  if (error.name === 'TimeoutError' || error.message?.includes('timeout')) {
    return new AutomationError(
      `Operation timed out: ${error.message}`,
      ErrorCodes.TIMEOUT,
      { ...context, originalError: error.message }
    );
  }

  if (error.message?.includes('no such element') || error.message?.includes('Element not found')) {
    return new AutomationError(
      `Element not found: ${error.message}`,
      ErrorCodes.ELEMENT_NOT_FOUND,
      { ...context, originalError: error.message }
    );
  }

  if (error.code === 'ECONNRESET' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
    return new AutomationError(
      `Network error: ${error.message}`,
      ErrorCodes.NETWORK_ERROR,
      { ...context, originalError: error.message }
    );
  }

  return new AutomationError(
    error.message || 'An unknown error occurred',
    ErrorCodes.TASK_FAILED,
    { ...context, originalError: error.message }
  );
}

function getUserFriendlyMessage(error) {
  const messages = {
    [ErrorCodes.CONNECTION_FAILED]: 'Failed to connect. Please check your internet connection.',
    [ErrorCodes.SESSION_EXPIRED]: 'Your session has expired. Please reconnect to the platform.',
    [ErrorCodes.AUTH_REQUIRED]: 'Authentication required. Please log in to the platform.',
    [ErrorCodes.INVALID_CREDENTIALS]: 'Invalid credentials. Please check your username and password.',
    [ErrorCodes.TWO_FACTOR_REQUIRED]: 'Two-factor authentication is required.',
    [ErrorCodes.ELEMENT_NOT_FOUND]: 'Could not find the required element on the page. The platform may have updated.',
    [ErrorCodes.TIMEOUT]: 'The operation took too long. Please try again.',
    [ErrorCodes.RATE_LIMITED]: 'Too many requests. Please wait a moment before trying again.',
    [ErrorCodes.ACCOUNT_RESTRICTED]: 'Your account may be restricted. Please check manually.',
  };

  if (error instanceof AutomationError) {
    return messages[error.code] || error.message;
  }

  return error.message || 'An unexpected error occurred.';
}

module.exports = {
  AutomationError,
  ErrorCodes,
  handleError,
  getUserFriendlyMessage,
};
