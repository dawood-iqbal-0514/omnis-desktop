const intentSchema = {
  type: 'object',
  required: ['platform', 'action', 'params', 'confidence'],
  properties: {
    platform: {
      type: ['string', 'null'],
      enum: ['linkedin', 'notion', 'hubspot', 'upwork', null],
      description: 'Target platform for the action',
    },
    action: {
      type: ['string', 'null'],
      description: 'Action to perform on the platform',
    },
    params: {
      type: 'object',
      description: 'Parameters for the action',
      additionalProperties: true,
    },
    confidence: {
      type: 'number',
      minimum: 0,
      maximum: 1,
      description: 'Confidence score of the intent extraction',
    },
    clarificationNeeded: {
      type: ['string', 'null'],
      description: 'Question to ask user if more info is needed',
    },
  },
};

function validateIntent(intent) {
  const errors = [];

  if (typeof intent !== 'object' || intent === null) {
    return { valid: false, errors: ['Intent must be an object'] };
  }

  const required = ['platform', 'action', 'params', 'confidence'];
  for (const field of required) {
    if (!(field in intent)) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  const validPlatforms = ['linkedin', 'notion', 'hubspot', 'upwork', null];
  if (!validPlatforms.includes(intent.platform)) {
    errors.push(`Invalid platform: ${intent.platform}`);
  }

  if (typeof intent.confidence !== 'number' || intent.confidence < 0 || intent.confidence > 1) {
    errors.push('Confidence must be a number between 0 and 1');
  }

  if (typeof intent.params !== 'object' || intent.params === null) {
    errors.push('Params must be an object');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

module.exports = {
  intentSchema,
  validateIntent,
};
