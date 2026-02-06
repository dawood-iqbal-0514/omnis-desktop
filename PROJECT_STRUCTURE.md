# Omnis Desktop - Project Structure Documentation

This document outlines the folder and file structure of the Omnis Desktop application. Follow this structure when adding new features or components.

## 📁 Root Structure

```
omnis-desktop/
├── src/
│   ├── main/              # Electron main process
│   ├── renderer/          # React frontend application
│   └── automation/        # Browser automation engine
├── package.json
└── PROJECT_STRUCTURE.md   # This file
```

---

## 🎨 Frontend Structure (`src/renderer/`)

### Core Files
- **`App.jsx`** - Main application component, handles routing and authentication
- **`main.jsx`** - React entry point, initializes the app
- **`index.html`** - HTML template

### 📂 Folder Structure

#### **`/assets/`** - Static Assets
```
assets/
└── logos/                 # Platform and app logos (PNG, SVG)
    ├── logo.png          # Main app logo
    ├── linkedin.png
    ├── hubspot.png
    └── ... (other platform logos)
```

#### **`/components/`** - Reusable UI Components
```
components/
├── Button/                # Button components
│   ├── ButtonPlain.jsx   # Primary button component
│   ├── ButtonGroup.jsx
│   ├── ButtonIconed.jsx
│   └── index.js          # Export all buttons
├── Form/                  # Form components (Formik-based)
│   ├── FormField.jsx     # Reusable input field with validation
│   ├── FormCheckbox.jsx  # Reusable checkbox with validation
│   ├── OTPInput.jsx      # 6-digit OTP input component
│   └── index.js          # Export all form components
├── Layout/                # Layout components
│   ├── Sidebar.jsx       # Main sidebar navigation
│   └── index.js
├── Loader/                # Loading indicators
│   ├── LoaderSmall.jsx    # Small spinner for inline use
│   ├── LoaderMedium.jsx   # Medium spinner for modals (centered)
│   ├── LoaderLarge.jsx    # Large spinner for pages (centered)
│   ├── InputSpinner.jsx   # Small spinner for input fields
│   └── index.js
├── Modal/                 # Modal dialogs
│   ├── Modal.jsx         # Base modal component (supports closeOnOutsideClick, closeOnEscape)
│   ├── APIKeyModal.jsx
│   └── index.js
├── Dropdown/              # Dropdown/select components
├── Tooltip/               # Tooltip components
├── PlatformConnection/    # Platform connection components
│   ├── PlatformConnectionModal.jsx  # Dynamic modal for platform setup
│   └── index.js
└── index.js               # Export all components
```

**Component Conventions:**
- Each component folder should have an `index.js` for exports
- Use functional components with hooks
- Follow the theme color variables (see `/styles/variables.css`)
- Use Tailwind CSS classes with theme variables

#### **`/pages/`** - Page Components
```
pages/
├── SignIn.jsx            # Sign in page (Formik + Yup)
├── SignUp.jsx            # Sign up page (Formik + Yup)
├── EmailVerification.jsx # OTP verification page (Formik + Yup)
├── ForgotPassword.jsx    # Forgot password page (Formik + Yup)
├── ResetPassword.jsx     # Reset password page (Formik + Yup)
├── Dashboard.jsx         # Main dashboard
├── Chat.jsx              # Chat interface
├── Settings.jsx           # Settings page
└── Platforms.jsx         # Platforms management
```

**Page Conventions:**
- Use Formik for form management
- Use Yup schemas from `/schemas/` for validation
- Use `useToast` hook for notifications
- Follow the same layout pattern (logo, title, form container)

#### **`/schemas/`** - Validation Schemas (Yup)
```
schemas/
└── auth.schemas.js       # All authentication validation schemas
    ├── signUpSchema
    ├── signInSchema
    ├── forgotPasswordSchema
    ├── resetPasswordSchema
    ├── emailVerificationSchema
    └── initialValues     # Default form values
```

**Schema Conventions:**
- Group related schemas in the same file
- Export schemas and initial values
- Use descriptive names ending with `Schema`
- Keep validation rules consistent across forms

#### **`/hooks/`** - Custom React Hooks
```
hooks/
└── useToast.js           # Toast notification hook
    ├── showSuccess()
    ├── showError()
    ├── showInfo()
    ├── showLoading()
    ├── dismiss()
    └── dismissAll()
```

**Hook Conventions:**
- Prefix hook files with `use`
- Export hooks as default
- Keep hooks focused on a single responsibility

#### **`/store/`** - State Management (Zustand)
```
store/
├── authStore.js          # Authentication state
├── themeStore.js         # Theme (light/dark) state
└── platformStore.js      # Platform connections state
    ├── connections       # Array of user's platform connections
    ├── fetchUserPlatforms()  # Fetch all platforms for user (dashboard)
    ├── getPlatformConnection()  # Get connection for specific platform
    ├── saveConnection()  # Save/update platform credentials
    ├── updateConnectionStatus()  # Update isConnected/isFirstTimeLogin flags
    └── disconnectPlatform()  # Remove credentials and reset statuses
```

**Store Conventions:**
- Use Zustand for state management
- One store per domain (auth, theme, platform, etc.)
- Export store as default
- Stores handle ALL API calls for their domain

#### **`/services/`** - API Services (Internal Use Only)
```
services/
└── api.js                # API service layer (ONLY used by stores)
    ├── ApiService        # Base API class
    ├── authAPI           # Authentication endpoints
    ├── emailVerificationAPI  # Email verification endpoints
    └── platformAPI       # Platform connection endpoints
        ├── getUserPlatforms(platformId?)  # Get all platforms or specific platform
        ├── saveConnection(platform, credentials)  # Save/update credentials
        ├── updateConnectionStatus(platform, status)  # Update connection flags
        └── disconnectPlatform(platform)  # Remove credentials and reset statuses
```

**Service Conventions:**
- ⚠️ **ONLY stores should import from `/services/api.js`**
- ⚠️ **Components should NEVER import from `/services/api.js`**
- Centralize all API calls in services
- Use the base `ApiService` class
- Group related endpoints (authAPI, emailVerificationAPI, platformAPI, etc.)
- Services are low-level utilities used by stores

#### **`/config/`** - Configuration Files
```
config/
├── toaster.config.js     # Toast notification configuration
└── platforms.config.js   # Platform configuration (setup types, fields, enabled status)
    ├── platformsConfig   # Platform details (name, logo, setupType, steps, fields, buttons)
    ├── platformStatusList  # Enabled/disabled status for each platform
    ├── getAllPlatforms()  # Get all platforms with enabled status
    ├── getPlatformConfig()  # Get config for specific platform
    └── isPlatformEnabled()  # Check if platform is enabled
```

**Config Conventions:**
- Keep configuration separate from components
- Export configuration objects
- Use theme variables in configs
- Platform config defines setup requirements (API key, OAuth, automation scripts)

#### **`/styles/`** - Stylesheets
```
styles/
├── index.css             # Main stylesheet (imports Tailwind)
└── variables.css         # CSS custom properties (theme variables)
    ├── :root             # Dark theme (default)
    └── [data-theme="light"]  # Light theme
```

**Style Conventions:**
- Use CSS custom properties for theming
- Variables follow pattern: `--color-{category}-{variant}`
- Use Tailwind CSS for utility classes
- Import variables.css in index.css

#### **`/utils/`** - Utility Functions
```
utils/
├── date.js               # Date formatting utilities
├── format.js             # General formatting utilities
├── string.js             # String manipulation utilities
├── validation.js         # Validation utilities
└── index.js              # Export all utilities
```

**Utility Conventions:**
- ⚠️ **ALWAYS check existing utils before creating new functions**
- ⚠️ **Reuse existing utilities if they exist**
- ⚠️ **Follow existing folder structure when adding new utilities**
- One utility file per domain
- Export functions from `index.js`
- Keep utilities pure (no side effects)
- Check `/utils/` folder first before creating new utility functions

#### **`/middleware/`** - Middleware
```
middleware/
└── authGuard.js          # Route protection middleware
```

---

## 🔌 Platform Connection System

The platform connection system manages user connections to various platforms (HubSpot, LinkedIn, etc.) with flexible authentication methods.

### Architecture Overview

```
Dashboard → PlatformConnectionModal → platformStore → platformAPI → Backend API
```

### Key Components

#### **1. Platform Configuration (`/config/platforms.config.js`)**

Centralized configuration for all platforms:
- **`platformsConfig`**: Defines setup requirements for each platform
  - `setupType`: 'apiKey', 'oauth', 'automation', or 'hybrid'
  - `steps`: Array of setup steps (API key, OAuth, automation script)
  - `fields`: Form fields for credential input
  - `buttons`: Button configurations
- **`platformStatusList`**: Controls which platforms are enabled on dashboard
- **Helper functions**: `getAllPlatforms()`, `getPlatformConfig()`, `isPlatformEnabled()`

**Example:**
```javascript
hubspot: {
  name: 'HubSpot',
  setupType: 'hybrid',
  steps: [
    { type: 'apiKey', required: true, field: 'apiKey' },
    { type: 'automation', required: true, trigger: 'login' }
  ],
  fields: [
    { name: 'apiKey', label: 'API Key', type: 'text', required: true }
  ]
}
```

#### **2. Platform Connection Modal (`/components/PlatformConnection/PlatformConnectionModal.jsx`)**

Dynamic modal that adapts to each platform's setup requirements:

**Features:**
- Fetches platform connection status on open (shows `LoaderMedium` during fetch)
- Dynamically renders input fields based on `platformConfig.fields`
- Debounced API key saving (500ms delay, shows `InputSpinner` while saving)
- "Configured" badge when credentials are saved
- Login button (disabled if no API key saved)
- Disconnect button for connected platforms
- Status messages based on connection state
- Tracks `hasChanges` to prevent unnecessary dashboard refreshes
- Modal does NOT close on outside click or Escape key

**State Management:**
- `isLoadingConnection`: Medium spinner when fetching initial data
- `isSaving`: Tracks if any field is being saved
- `savingField`: Tracks which field is currently saving
- `formData`: Current input values
- `hasChanges`: Tracks if user made any changes

**Connection States:**
- No credentials: Shows input field, no "Configured" badge
- Credentials saved (`hasCredentials: true`): Shows "Configured" badge, enables Login button
- Login clicked (`isFirstTimeLogin: true`): Shows "Login in Progress..." button text
- Connected (`isConnected: true`): Shows "Disconnect" button instead of "Login"

#### **3. Platform Store (`/store/platformStore.js`)**

Manages platform connection state:

**State:**
- `connections`: Array of platform connections with:
  - `platform`: Platform ID (e.g., 'hubspot')
  - `isConnected`: Whether platform is fully connected
  - `isFirstTimeLogin`: Whether login automation is in progress
  - `hasCredentials`: Whether credentials are saved
  - `credentials`: Encrypted credentials (JSON)

**Methods:**
- `fetchUserPlatforms()`: Fetches all platforms for dashboard (shows `LoaderLarge`)
- `getPlatformConnection(platformId)`: Gets connection for specific platform
- `saveConnection(platform, credentials)`: Saves credentials (debounced in modal)
- `updateConnectionStatus(platform, status)`: Updates `isConnected`/`isFirstTimeLogin`
- `disconnectPlatform(platform)`: Removes credentials and resets statuses

#### **4. Platform API Service (`/services/api.js` → `platformAPI`)**

Backend API integration:

**Endpoints:**
- `GET /api/platforms/connections?platform={platformId}`: Get all platforms or specific platform
- `POST /api/platforms/connections`: Save/update credentials
- `PATCH /api/platforms/connections/:platform/status`: Update connection flags
- `POST /api/platforms/connections/:platform/disconnect`: Disconnect platform

**Note:** All endpoints require JWT authentication via `Authorization: Bearer {token}` header.

### Dashboard Integration (`/pages/Dashboard.jsx`)

**Behavior:**
- On mount: Calls `fetchUserPlatforms()` (shows `LoaderLarge` during fetch)
- Platform cards: Clicking card always opens `PlatformConnectionModal`
- "Work" button: 
  - If connected: Navigates to chat page with platform selected
  - If not connected: Opens modal
- After modal closes: Only refreshes if `hasChanges === true`

**Platform Status:**
- Uses `isPlatformEnabled()` from config to mark platforms as `comingSoon`
- Only enabled platforms can be connected
- Connected platforms show "Work" button, others show "Connect"

### Connection Flow

1. **User clicks platform card** → Modal opens
2. **Modal fetches connection status** → Shows `LoaderMedium` during fetch
3. **User enters API key** → Debounced save (500ms), shows `InputSpinner`
4. **API key saved** → "Configured" badge appears, Login button enabled
5. **User clicks Login** → Sets `isFirstTimeLogin: true`, triggers automation (TODO)
6. **Automation completes** → Sets `isConnected: true`, `isFirstTimeLogin: false`
7. **User closes modal** → Dashboard refreshes only if `hasChanges === true`

### Database Schema (Backend)

Platform connections stored in `platform_connections` table:
- `id`: UUID
- `userId`: User ID (foreign key)
- `platform`: Platform identifier ('hubspot', 'linkedin', etc.)
- `isConnected`: Boolean (true when fully connected)
- `isFirstTimeLogin`: Boolean (true when login automation in progress)
- `credentials`: JSON (encrypted API keys, OAuth tokens, etc.)
- `lastConnectedAt`: DateTime
- `lastDisconnectedAt`: DateTime
- Unique constraint on `[userId, platform]`

### Loading States

- **`LoaderLarge`**: Dashboard initial load (`fetchUserPlatforms`)
- **`LoaderMedium`**: Modal initial load (fetching platform connection status)
- **`InputSpinner`**: Input field saving (debounced API key save)

### Best Practices

1. **Always use `platformStore` methods** - Never call `platformAPI` directly from components
2. **Use `platforms.config.js`** - Don't hardcode platform details
3. **Track `hasChanges`** - Only refresh dashboard when user makes changes
4. **Show appropriate loaders** - Large for dashboard, medium for modal, small for inputs
5. **Debounce input saves** - Use 500ms delay for API key input
6. **Disable inputs during save** - Prevent multiple simultaneous saves
7. **Use memoization** - Memoize `platformConfig` and `platformId` in modal to prevent loops

---

## 🤖 Chatbot & Automation System

The chatbot system provides an AI-powered interface for task automation with a two-role architecture (InfoGatherer and Executor) and dynamic execution planning based on platform registries.

### Architecture Overview

```
User → Chat.jsx → cerebrasIPC → ChatbotService → InfoGatherer/Executor → ExecutionPlanBuilder → Automation/API
```

### Two-Role Chatbot System

The chatbot operates in two distinct roles:

1. **InfoGatherer Role**: Gathers information, asks clarifying questions, presents execution plan
2. **Executor Role**: Receives approved plan, generates execution JSON, executes tasks

**Role Switching:**
- Starts in `gatherer` role
- Switches to `executor` when plan is ready (detected via `[PLAN_READY]` marker)
- Resets to `gatherer` after execution completes (success or error)

### Folder Structure

#### **Frontend Chat Components (`src/renderer/components/Chat/`)**

```
components/Chat/
├── ExecutionPlanCard.jsx    # Displays execution plan with Approve/Edit buttons
├── ExecutionLogs.jsx         # Real-time execution logs display
└── index.js                  # Exports all chat components
```

**ExecutionPlanCard:**
- Displays plan message and actions
- Shows numbered steps with descriptions and parameters
- Provides "Approve" and "Edit" buttons
- Triggers confetti animation when displayed

**ExecutionLogs:**
- Shows real-time execution progress
- Displays status icons (⏳ running, ✅ success, ❌ error)
- Shows mock execution badges when APIs not integrated
- Persists logs in chat history after execution

#### **Chat Page (`src/renderer/pages/Chat.jsx`)**

**Features:**
- Single chat interface (no multi-chat support)
- Platform selection modal integration
- Confetti animation on plan readiness
- Real-time execution logs
- Input disabled during execution
- Auto-reset to gatherer role after execution

**State Management:**
- `messages`: Array of chat messages
- `pendingPlan`: Current execution plan awaiting approval
- `isExecuting`: Disables input during execution
- `executionLogs`: Real-time execution logs
- `showConfetti`: Controls confetti animation

**Key Methods:**
- `handleSend()`: Processes user messages, handles plan/execute responses
- `handleApprovePlan()`: Sends "APPROVE" to executor, triggers execution
- `handleEditPlan()`: Sends "EDIT" to switch back to gatherer
- `handleExecute()`: Executes plan steps (API and automation)

#### **Backend Chatbot Services (`src/main/services/chatbot/`)**

```
services/chatbot/
├── chatbotService.js         # Orchestrates two-role system
├── roles/
│   ├── infoGatherer.js       # InfoGatherer role implementation
│   └── executor.js           # Executor role implementation
└── utils/
    ├── registryLoader.js     # Loads platform registries (API actions, automation scripts)
    └── executionPlanBuilder.js  # Builds execution plans from actions
```

**ChatbotService (`chatbotService.js`):**
- Manages current role (`gatherer` or `executor`)
- Tracks `pendingPlan` between roles
- Routes messages to appropriate role handler
- Resets role state after execution

**InfoGatherer (`roles/infoGatherer.js`):**
- Loads platform-specific gatherer prompt
- Dynamically injects available automation scripts into prompt
- Processes user messages via Cerebras API
- Detects plan readiness via `[PLAN_READY]` marker
- Creates structured plan from conversation context if needed
- Returns `{ type: 'plan', plan: {...} }` when ready

**Executor (`roles/executor.js`):**
- Loads platform-specific executor prompt
- Receives approved plan from gatherer
- Uses `ExecutionPlanBuilder` to create execution JSON
- Returns `{ type: 'execute', executionJSON: {...} }`

**RegistryLoader (`utils/registryLoader.js`):**
- Loads and caches platform registries
- `loadAPIActions(platformId)`: Loads `api-actions.json`
- `loadAutomationScripts(platformId)`: Loads `automation-scripts.json`
- `isAPIAction(platformId, actionId)`: Checks if action is API-only
- `getAutomationScript(platformId, actionId)`: Gets automation script by actionId
- `getHybridAction(platformId, actionId)`: Gets hybrid action config

**ExecutionPlanBuilder (`utils/executionPlanBuilder.js`):**
- `determineExecutionMethod(platformId, actionId)`: Determines if action is API, automation, or hybrid
- `buildExecutionPlan(platformId, actions)`: Builds structured execution plan with steps
- `validateExecutionPlan(executionPlan)`: Validates plan structure
- Routes actions to correct execution method based on registries

#### **Platform Registries (`src/automation/platforms/{platformId}/registry/`)**

```
automation/platforms/hubspot/
├── registry/
│   ├── api-actions.json      # API-only actions and hybrid actions
│   └── automation-scripts.json  # Available automation scripts
└── prompts/
    ├── gatherer-prompt.txt   # InfoGatherer system prompt
    └── executor-prompt.txt   # Executor system prompt
```

**api-actions.json Structure:**
```json
{
  "apiOnlyActions": [
    "create_contact",
    "get_contact",
    "update_contact",
    ...
  ],
  "hybridActions": {
    "create_contact_with_login": {
      "automationFirst": true,
      "automationScript": "hubspot_login_automation.py",
      "thenAPI": "create_contact"
    }
  }
}
```

**automation-scripts.json Structure:**
```json
{
  "availableScripts": [
    {
      "name": "hubspot_login_automation.py",
      "actionId": "login",
      "description": "Login to HubSpot and establish session"
    },
    {
      "name": "hubspot_list_automation.py",
      "actionId": "list_automation",
      "description": "Perform list operations via automation"
    }
  ]
}
```

**gatherer-prompt.txt:**
- Platform-specific instructions for InfoGatherer
- Automatically injected with available automation scripts list
- Includes examples of when to use each actionId
- Instructs to use `[PLAN_READY]` marker when plan is complete

**executor-prompt.txt:**
- Platform-specific instructions for Executor
- Guides JSON generation for execution plans
- Ensures valid execution JSON structure

#### **IPC Handlers (`src/main/ipc/`)**

**cerebrasIPC.js:**
- `cerebras:send-message`: Routes messages through ChatbotService
- `cerebras:reset-chatbot`: Resets chatbot role state
- `cerebras:reset-chat`: Resets chat history and chatbot state

**automationIPC.js:**
- `automation:execute-task`: Executes automation scripts
- Checks script availability in registry before execution
- Returns error if script not found in registry
- Lazy-loads AutomationOrchestrator to prevent crashes

### Execution Flow

1. **User sends message** → `Chat.jsx` → `cerebrasIPC.sendMessage()`
2. **ChatbotService routes** → `InfoGatherer.process()` (if in gatherer role)
3. **InfoGatherer:**
   - Loads platform-specific prompt (with injected automation scripts)
   - Sends message to Cerebras API with system prompt
   - Detects `[PLAN_READY]` marker in response
   - Creates structured plan from context if needed
   - Returns `{ type: 'plan', plan: {...} }`
4. **Frontend displays plan** → Shows `ExecutionPlanCard` with Approve/Edit buttons
5. **User clicks Approve** → `handleApprovePlan()` → Sends "APPROVE" to executor
6. **ChatbotService routes** → `Executor.createExecutionJSON()` (switches to executor role)
7. **Executor:**
   - Uses `ExecutionPlanBuilder` to build execution JSON
   - Determines execution method (API/automation/hybrid) for each action
   - Returns `{ type: 'execute', executionJSON: {...} }`
8. **Frontend executes** → `handleExecute()`:
   - For API steps: Calls backend API
   - For automation steps: Calls `automationIPC.executeTask()`
   - Shows real-time logs via `ExecutionLogs` component
   - Disables input during execution
9. **After execution** → Resets chatbot role to `gatherer` for next task

### Execution Plan Structure

```javascript
{
  platform: "hubspot",
  steps: [
    {
      order: 1,
      type: "automation",  // or "api" or "hybrid"
      action: "list_automation",  // or actionId
      description: "Create list/segment: contacts who opened emails",
      parameters: {
        criteria: "opened emails within the last 7 days"
      },
      automationConfig: {
        script: "hubspot_list_automation.py"
      }
    }
  ]
}
```

### Plan Detection Logic

**InfoGatherer detects plan readiness when:**
- AI includes `[PLAN_READY]` marker in response
- AI presents execution plan with explicit indicators ("execution plan", "📋", "Approve", etc.)

**Fallback plan creation (`createPlanFromContext`):**
- Checks for "list" or "segment" keywords → uses `list_automation` actionId
- Checks for "create contact" (without "list"/"segment") → uses `create_contact` actionId
- Extracts parameters from conversation (criteria, name, email, etc.)
- Always creates at least one action (never returns empty plan)

### Execution Method Determination

**ExecutionPlanBuilder determines execution method:**

1. **Check hybrid actions** → If found, creates hybrid steps (automation + API)
2. **Check API-only actions** → If found, creates API step
3. **Check automation scripts** → If found, creates automation step
4. **Default** → Falls back to automation with convention-based script name

**Priority for hybrid tasks:**
- If `automationFirst: true` → Automation step first, then API
- Otherwise → API first, then automation

### Automation Script Execution

**Before execution:**
- Checks if script exists in registry by script name
- Checks if actionId exists in registry
- Returns error with available scripts list if not found

**During execution:**
- Calls `automationIPC.executeTask()` with platform, action, parameters, script
- Shows real-time logs with status (running, success, error)
- Handles errors gracefully with user-friendly messages

### Key Conventions & Rules

1. **Always use platform registries** - Don't hardcode actionIds or script names
2. **Dynamic prompt injection** - Automation scripts are automatically injected into gatherer prompt
3. **Role-based prompts** - Each role has its own system prompt per platform
4. **Plan detection** - AI must use `[PLAN_READY]` marker or explicit plan indicators
5. **Execution method** - Always check registries to determine API vs automation
6. **Script validation** - Always validate script exists in registry before execution
7. **Error handling** - Show clear errors if script not available
8. **Role reset** - Always reset to gatherer role after execution completes
9. **Single chat** - No multi-chat support (removed)
10. **Confetti animation** - Triggered when plan is ready (500 pieces)

### Adding a New Automation Script

1. **Add Python script** to `src/automation/platforms/{platformId}/`
2. **Register in `automation-scripts.json`**:
   ```json
   {
     "name": "platform_action_automation.py",
     "actionId": "action_id",
     "description": "Description of what the script does"
   }
   ```
3. **Script automatically available** - Chatbot will see it in injected prompt
4. **Update gatherer prompt** if needed for specific instructions

### Adding a New API Action

1. **Add to `api-actions.json`** in `apiOnlyActions` array:
   ```json
   {
     "apiOnlyActions": [
       "new_action_id",
       ...
     ]
   }
   ```
2. **Action automatically routed to API** - ExecutionPlanBuilder will use API method
3. **Backend must implement** the corresponding API endpoint

### Adding a New Hybrid Action

1. **Add to `api-actions.json`** in `hybridActions` object:
   ```json
   {
     "hybridActions": {
       "action_name": {
         "automationFirst": true,
         "automationScript": "script_name.py",
         "thenAPI": "api_action_id"
       }
     }
   }
   ```
2. **ExecutionPlanBuilder** will create both automation and API steps

### Platform-Specific Prompts

**Location:** `src/automation/platforms/{platformId}/prompts/`

- **gatherer-prompt.txt**: Instructions for InfoGatherer role
  - Automatically injected with available automation scripts
  - Should instruct AI to use `[PLAN_READY]` marker
  - Should distinguish between API actions and automation actions

- **executor-prompt.txt**: Instructions for Executor role
  - Guides JSON generation
  - Ensures valid execution plan structure

**If prompts don't exist:** System uses default prompts (less platform-specific)

### Error Handling

**Network/DNS Errors:**
- `EAI_AGAIN`, `ENOTFOUND`: "Cannot connect to the AI service. Please check your internet connection."
- `ECONNREFUSED`, `ETIMEDOUT`: "Connection to the AI service failed. Please check your internet connection."

**API Errors:**
- `500`: "The AI service encountered an internal error. Please try again in a moment."
- `503`: "The AI service is temporarily unavailable. Please try again in a few moments."
- `401`: "Invalid API key. Please check your Cerebras API key."

**Execution Errors:**
- Script not found: Shows error with available scripts list
- API not available: Shows mock execution (for development)
- Execution failure: Shows error in execution logs

---

## 🔧 Backend Structure (`src/main/`)

### Main Process
```
main/
├── index.js              # Electron main process entry
├── preload.js            # Preload script for security
├── ipc/                  # IPC handlers
│   ├── authIPC.js
│   ├── automationIPC.js
│   ├── cerebrasIPC.js
│   ├── systemIPC.js
│   ├── updateIPC.js
│   └── index.js
├── services/             # Main process services
│   ├── cerebrasService.js
│   ├── licenseService.js
│   ├── tokenService.js
│   └── updater.js
└── utils/
    └── paths.js
```

---

## 🤖 Automation Structure (`src/automation/`)

```
automation/
├── index.js              # Automation engine entry (safely loads platforms)
├── core/                 # Core automation utilities
│   ├── browserManager.js
│   ├── errorHandler.js
│   ├── rateLimiter.js
│   └── taskRunner.js
└── platforms/            # Platform-specific implementations
    ├── base/
    │   └── BasePlatform.js  # Base class (MUST extend)
    ├── hubspot/
    │   ├── hubspot_list_automation.py  # Python automation scripts
    │   ├── hubspot_login_automation.py
    │   ├── registry/     # Platform registries
    │   │   ├── api-actions.json      # API-only and hybrid actions
    │   │   └── automation-scripts.json  # Available automation scripts
    │   └── prompts/      # Platform-specific AI prompts
    │       ├── gatherer-prompt.txt   # InfoGatherer system prompt
    │       └── executor-prompt.txt   # Executor system prompt
    ├── linkedin/
    ├── notion/
    └── upwork/
```

**Platform Folder Structure:**
- **Python scripts**: Automation scripts (`.py` files)
- **registry/**: JSON files defining available actions and scripts
- **prompts/**: System prompts for chatbot roles

**Note:** Platforms can have Python-only automation (no JS files). The system gracefully handles missing JS files.

---

## 🎯 Key Conventions & Patterns

### ⚠️ **CRITICAL: Always Use Context/Store - Never Direct API Calls**

**MANDATORY RULE:**
- ✅ **ALWAYS use Zustand stores (context) for ALL operations** - Components should NEVER call APIs directly
- ✅ **Stores are the ONLY layer that should interact with services/APIs**
- ✅ **Components call store methods, stores call services**
- ❌ **NEVER import from `/services/api.js` in components**
- ❌ **NEVER make direct API calls in components**

**Architecture Pattern:**
```
Component → Store (Zustand) → Service (API) → Backend
```

**Example (CORRECT):**
```jsx
// ✅ CORRECT: Component uses store
import useAuthStore from '../store/authStore';

const signin = useAuthStore((state) => state.signin);
const response = await signin(email, password);
```

**Example (WRONG):**
```jsx
// ❌ WRONG: Component directly calls API
import { authAPI } from '../services/api';
const response = await authAPI.signin(email, password);
```

**Why?**
- Centralized state management
- Consistent error handling
- Easier testing and maintenance
- Single source of truth
- Better separation of concerns

### 1. **Form Validation**
- ✅ Use **Formik** for form state management
- ✅ Use **Yup** for validation schemas
- ✅ Store schemas in `/schemas/` folder
- ✅ Use reusable form components from `/components/Form/`

**Example:**
```jsx
import { Formik, Form } from 'formik';
import { FormField } from '../components/Form';
import { signUpSchema, initialValues } from '../schemas/auth.schemas';

<Formik
  initialValues={initialValues.signUp}
  validationSchema={signUpSchema}
  onSubmit={handleSubmit}
>
  {({ isSubmitting }) => (
    <Form>
      <FormField name="email" label="Email" type="email" required />
    </Form>
  )}
</Formik>
```

### 2. **Toast Notifications**
- ✅ Use `useToast` hook from `/hooks/useToast.js`
- ✅ Toast config in `/config/toaster.config.js`
- ✅ Always show toasts for user actions (success/error)

**Example:**
```jsx
import useToast from '../hooks/useToast';

const { showSuccess, showError } = useToast();
showSuccess('Operation successful!');
showError('Something went wrong!');
```

### 3. **API Calls & State Management**
- ✅ **ALWAYS use Zustand stores** - Components should NEVER call APIs directly
- ✅ Stores handle all API interactions internally
- ✅ Services (`/services/api.js`) are ONLY used by stores, never by components
- ✅ Handle errors in stores and return consistent responses

**Example (CORRECT):**
```jsx
// ✅ Component uses store method
import useAuthStore from '../store/authStore';

const signin = useAuthStore((state) => state.signin);
const response = await signin(email, password);
```

**Example (WRONG):**
```jsx
// ❌ NEVER do this in components
import { authAPI } from '../services/api';
const response = await authAPI.signin(email, password);
```

### 4. **State Management (MANDATORY)**
- ✅ **ALWAYS use Zustand stores** - This is MANDATORY, not optional
- ✅ One store per domain (auth, theme, platform, etc.)
- ✅ Stores handle ALL business logic and API calls
- ✅ Components ONLY interact with stores, never with services directly
- ✅ Keep stores focused and small
- ✅ Stores import from `/services/api.js`, components NEVER do

### 5. **Styling**
- ✅ Use Tailwind CSS utility classes
- ✅ Use CSS custom properties from `/styles/variables.css`
- ✅ Follow theme color variables: `--color-primary-accent`, `--color-text-primary`, etc.

**Example:**
```jsx
className="bg-base-background text-text-primary border-border-muted"
```

### 6. **Component Structure**
- ✅ Functional components with hooks
- ✅ Each component folder has `index.js` for exports
- ✅ Use default exports for components
- ✅ Keep components focused and reusable

### 7. **File Naming**
- ✅ Components: `PascalCase.jsx` (e.g., `SignUp.jsx`)
- ✅ Utilities: `camelCase.js` (e.g., `date.js`)
- ✅ Hooks: `useCamelCase.js` (e.g., `useToast.js`)
- ✅ Stores: `camelCaseStore.js` (e.g., `authStore.js`)
- ✅ Schemas: `domain.schemas.js` (e.g., `auth.schemas.js`)

---

## 📝 Adding New Features

### Adding a New Page
1. Create component in `/pages/`
2. Add route in `App.jsx`
3. Use Formik + Yup if it has forms
4. Use `useToast` for notifications
5. Follow existing page structure

### Adding a New Form
1. Create Yup schema in `/schemas/`
2. Add initial values
3. Use `FormField`, `FormCheckbox`, or `OTPInput` components
4. Import schema in your page

### Adding a New Component
1. ⚠️ **Check existing components first** - Reuse if similar component exists
2. ⚠️ **Follow existing folder structure** - Don't create new patterns
3. Create folder in `/components/`
4. Create component file and `index.js`
5. Export from `/components/index.js`
6. Use theme variables for styling
7. Use existing component patterns as reference

### Adding a New API Endpoint
1. ⚠️ **Add method to store, NOT directly to service from component**
2. Add method to appropriate API object in `/services/api.js` (for store to use)
3. Add corresponding method in the appropriate store (e.g., `authStore.js`, `platformStore.js`)
4. Components call store method, store calls service method
5. Use `ApiService` base class
6. Handle errors in store and return consistent response format

### Adding a New Platform
1. Add platform logo to `/assets/logos/`
2. Add platform configuration to `/config/platforms.config.js`:
   - Add to `platformsConfig` with setup requirements
   - Add to `platformStatusList` with `status: true/false`
3. Platform will automatically appear on dashboard if `status: true`
4. Modal will dynamically render fields based on `platformConfig.fields`
5. Backend will handle platform connection via existing APIs (no backend changes needed)

### Adding a New Store
1. ⚠️ **Check if existing store can handle the functionality first**
2. Create file in `/store/` if new domain needed
3. Use Zustand `create()` function
4. Export as default
5. Keep it focused on one domain
6. **MANDATORY: Store must handle ALL API calls for its domain**
7. Store imports from `/services/api.js`, components import from store

---

## 🎨 Theme System

The app uses CSS custom properties for theming. Key variables:

**Colors:**
- `--color-primary-accent` - Main brand color (#9a1959)
- `--color-base-background` - Main background
- `--color-base-background-light` - Card/container background
- `--color-text-primary` - Primary text color
- `--color-text-secondary` - Secondary text color
- `--color-border-muted` - Border color
- `--color-success` - Success color
- `--color-error` - Error color

**Usage:**
```jsx
className="bg-[var(--color-base-background-light)] text-[var(--color-text-primary)]"
// Or use Tailwind classes that reference these variables
className="bg-base-background-light text-text-primary"
```

---

## 🔐 Authentication Flow

1. **Sign Up** → Creates user with `emailVerified: false`
2. **Email Verification** → Sends OTP, verifies email
3. **Sign In** → Requires verified email, returns JWT token
4. **Token Storage** → Stored in localStorage as `omnis-reach-token`

**Key Points:**
- Users cannot sign in until email is verified
- If user exists but email not verified, signup resends OTP
- OTP stored in `users` table (not separate table)
- OTP expires in 10 minutes

---

## 📦 Dependencies

**Key Libraries:**
- `react` + `react-dom` - UI framework
- `formik` + `yup` - Form management and validation
- `react-hot-toast` - Toast notifications
- `zustand` - State management
- `tailwindcss` - Styling
- `electron` - Desktop app framework

---

## 🚀 Development Guidelines

### ⚠️ **CRITICAL RULES (MUST FOLLOW):**

1. **ALWAYS use Zustand stores (context)** - Components should NEVER call APIs directly
   - Components → Stores → Services → Backend
   - This is MANDATORY, not optional

2. **Check existing utilities before creating new ones**
   - Always check `/utils/` folder first
   - Reuse existing functions if they exist
   - Follow existing folder structure when adding new utilities

3. **Check existing components before creating new ones**
   - Always check `/components/` folder first
   - Reuse or extend existing components if possible
   - Follow existing component patterns

4. **Always follow the folder structure** - Don't create files in wrong locations

5. **Use existing patterns** - Check similar files before creating new ones

6. **Keep components reusable** - Extract common patterns into components

7. **Validate forms** - Always use Formik + Yup for forms

8. **Show user feedback** - Use toasts for all user actions

9. **Follow theme** - Use theme variables, don't hardcode colors

10. **Export properly** - Use index.js files for clean imports

11. **Keep it clean** - Separate concerns (components, stores, services, schemas, etc.)

### Architecture Summary:
```
Components (UI Layer)
    ↓ (only calls)
Stores (Business Logic & State)
    ↓ (only calls)
Services (API Layer)
    ↓ (calls)
Backend API
```

---

## 📚 Quick Reference

**Import Form Components:**
```jsx
import { FormField, FormCheckbox, OTPInput } from '../components/Form';
```

**Import Validation Schemas:**
```jsx
import { signUpSchema, initialValues } from '../schemas/auth.schemas';
```

**Use Toast:**
```jsx
import useToast from '../hooks/useToast';
const { showSuccess, showError } = useToast();
```

**Use Store (MANDATORY - Never use services directly):**
```jsx
// ✅ CORRECT: Use store methods
import useAuthStore from '../store/authStore';
const signin = useAuthStore((state) => state.signin);
const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
const response = await signin(email, password);
```

**NEVER do this in components:**
```jsx
// ❌ WRONG: Never import services in components
import { authAPI } from '../services/api';
```

---

---

## 🔄 Platform Connection System - Quick Reference

**Get Platform Config:**
```jsx
import { getPlatformConfig, isPlatformEnabled } from '../config/platforms.config';
const config = getPlatformConfig('hubspot');
const enabled = isPlatformEnabled('hubspot');
```

**Use Platform Store:**
```jsx
import usePlatformStore from '../store/platformStore';

const { 
  connections, 
  fetchUserPlatforms, 
  getPlatformConnection,
  saveConnection 
} = usePlatformStore();

// Fetch all platforms (dashboard)
await fetchUserPlatforms();

// Get specific platform connection
const connection = getPlatformConnection('hubspot');

// Save credentials
await saveConnection('hubspot', { apiKey: 'xxx' });
```

**Open Platform Modal:**
```jsx
import { PlatformConnectionModal } from '../components/PlatformConnection';

<PlatformConnectionModal
  isOpen={isModalOpen}
  onClose={(hasChanges) => {
    if (hasChanges) {
      fetchUserPlatforms(); 
    }
    setIsModalOpen(false);
  }}
  platformName="HubSpot"
/>
```

**Check Connection Status:**
```jsx
const connection = getPlatformConnection('hubspot');
const isConnected = connection?.isConnected === true;
const hasCredentials = connection?.hasCredentials === true;
const isLoginInProgress = connection?.isFirstTimeLogin === true;
```

---

**Last Updated:** 2024
**Maintained By:** Development Team