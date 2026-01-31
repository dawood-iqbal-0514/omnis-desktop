const taskSchema = {
  type: 'object',
  required: ['id', 'platform', 'action', 'params'],
  properties: {
    id: {
      type: 'string',
      description: 'Unique task identifier',
    },
    platform: {
      type: 'string',
      enum: ['linkedin', 'notion', 'hubspot', 'upwork'],
      description: 'Target platform',
    },
    action: {
      type: 'string',
      description: 'Action to perform',
    },
    params: {
      type: 'object',
      description: 'Action parameters',
      additionalProperties: true,
    },
    dependencies: {
      type: 'array',
      items: { type: 'string' },
      description: 'IDs of tasks that must complete before this one',
    },
    waitAfter: {
      type: 'number',
      minimum: 0,
      description: 'Milliseconds to wait after completion',
    },
    verify: {
      type: 'boolean',
      description: 'Whether to verify the action completed',
    },
    priority: {
      type: 'number',
      minimum: 0,
      maximum: 10,
      description: 'Task priority (0-10, higher = more important)',
    },
    retryOnFailure: {
      type: 'boolean',
      description: 'Whether to retry if task fails',
    },
    maxRetries: {
      type: 'number',
      minimum: 0,
      maximum: 5,
      description: 'Maximum retry attempts',
    },
  },
};

const taskListSchema = {
  type: 'array',
  items: taskSchema,
};

function validateTask(task) {
  const errors = [];

  if (typeof task !== 'object' || task === null) {
    return { valid: false, errors: ['Task must be an object'] };
  }

  const required = ['id', 'platform', 'action', 'params'];
  for (const field of required) {
    if (!(field in task)) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  const validPlatforms = ['linkedin', 'notion', 'hubspot', 'upwork'];
  if (task.platform && !validPlatforms.includes(task.platform)) {
    errors.push(`Invalid platform: ${task.platform}`);
  }

  if (task.dependencies && !Array.isArray(task.dependencies)) {
    errors.push('Dependencies must be an array');
  }

  if (task.waitAfter !== undefined && (typeof task.waitAfter !== 'number' || task.waitAfter < 0)) {
    errors.push('waitAfter must be a non-negative number');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

function validateTaskList(tasks) {
  if (!Array.isArray(tasks)) {
    return { valid: false, errors: ['Task list must be an array'] };
  }

  const allErrors = [];
  const taskIds = new Set();

  tasks.forEach((task, index) => {
    const result = validateTask(task);
    if (!result.valid) {
      allErrors.push(`Task ${index}: ${result.errors.join(', ')}`);
    }

    if (task.id) {
      if (taskIds.has(task.id)) {
        allErrors.push(`Task ${index}: Duplicate task ID: ${task.id}`);
      }
      taskIds.add(task.id);
    }

    if (task.dependencies) {
      for (const depId of task.dependencies) {
      }
    }
  });

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
  };
}

module.exports = {
  taskSchema,
  taskListSchema,
  validateTask,
  validateTaskList,
};
