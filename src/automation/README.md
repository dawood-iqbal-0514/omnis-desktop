# Automation Engine

This is the core automation engine for Omnis Reach. It handles browser automation for platforms that don't have APIs, and coordinates with the backend for API-based platforms.

## Architecture

```
automation/
├── index.js                 # Main orchestrator - entry point
├── core/                    # Shared utilities
│   ├── browserManager.js    # Selenium/DrissionPage setup
│   ├── taskRunner.js        # Task execution engine
│   ├── errorHandler.js      # Error handling utilities
│   └── rateLimiter.js       # Rate limiting to avoid detection
│
└── platforms/               # Platform-specific implementations
    ├── base/
    │   └── BasePlatform.js  # Abstract base class (MUST extend this)
    ├── linkedin/            # LinkedIn automation
    ├── notion/              # Notion API integration
    └── ...                  # Other platforms
```

## Adding a New Platform

### Step 1: Create Platform Folder

```
platforms/
└── your-platform/
    ├── index.js              # Exports
    ├── YourPlatform.js       # Main platform class
    ├── auth/
    │   ├── login.js          # Login logic
    │   └── sessionManager.js # Session persistence
    ├── actions/
    │   ├── action1.js        # Individual actions
    │   └── action2.js
    ├── selectors/
    │   └── selectors.js      # CSS/XPath selectors
    └── utils/
        └── helpers.js        # Platform-specific helpers
```

### Step 2: Extend BasePlatform

```javascript
const BasePlatform = require('../base/BasePlatform');

class YourPlatform extends BasePlatform {
  constructor() {
    super({
      id: 'your-platform',
      name: 'Your Platform',
      type: 'browser', // or 'api'
      icon: 'your-platform.png',
    });
  }

  async connect(credentials) {
    // Implement connection logic
  }

  async disconnect() {
    // Implement disconnection logic
  }

  async executeAction(action, params) {
    // Route to specific action handlers
  }

  getAvailableActions() {
    return [
      {
        id: 'action_name',
        name: 'Human Readable Name',
        description: 'What this action does',
        params: [
          { name: 'param1', type: 'string', required: true },
          { name: 'param2', type: 'string', required: false },
        ],
      },
    ];
  }
}
```

### Step 3: Register Platform

Add to `platforms/index.js`:

```javascript
const { YourPlatform } = require('./your-platform');
platforms.yourPlatform = new YourPlatform();
```

## Browser Automation Guidelines

1. **Use human-like delays** - Random delays between 1-3 seconds
2. **Handle anti-bot measures** - Use undetected-chromedriver
3. **Persist sessions** - Save cookies to avoid repeated logins
4. **Handle errors gracefully** - Retry with backoff
5. **Respect rate limits** - Use the rateLimiter utility

## Testing

Run automation tests:
```bash
npm run test:automation
```

Test a specific platform:
```bash
npm run test:automation -- --platform=linkedin
```
