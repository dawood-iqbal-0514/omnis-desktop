# Omnis Reach

Multi-Platform Automation Desktop Application

## Project Structure

```
omnis-reach/
├── apps/desktop/          # Electron Desktop Application
├── packages/shared/       # Shared utilities and types
├── server/                # Node.js Backend API
├── admin/                 # Web Admin Panel
└── website/               # Marketing Website
```

## Tech Stack

- **Desktop App**: Electron 28 + React 18 + Vite 5 + Tailwind CSS
- **State Management**: Zustand
- **Local LLM**: Qwen3 (compiled)
- **Browser Automation**: Selenium/DrissionPage
- **Backend**: Node.js + Express
- **Database**: MongoDB

## Getting Started

```bash
# Install dependencies
npm install

# Run desktop app in development
npm run dev

# Run backend server
npm run dev:server
```

## Architecture

### Three Execution Layers:
1. **Local LLM** - Natural language processing (runs in app)
2. **Backend API** - Authentication, subscriptions, API-based platforms
3. **Local Automation** - Browser automation for platforms without APIs

## Adding a New Platform

See `apps/desktop/src/automation/platforms/README.md` for detailed instructions.
