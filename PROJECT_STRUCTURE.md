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
│   ├── LoaderSmall.jsx
│   ├── LoaderMedium.jsx
│   └── index.js
├── Modal/                 # Modal dialogs
│   ├── Modal.jsx         # Base modal component
│   ├── APIKeyModal.jsx
│   └── index.js
├── Dropdown/              # Dropdown/select components
├── Tooltip/               # Tooltip components
├── PlatformConnection/   # Platform-specific connection components
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
```

**Store Conventions:**
- Use Zustand for state management
- One store per domain (auth, theme, platform, etc.)
- Export store as default

#### **`/services/`** - API Services (Internal Use Only)
```
services/
└── api.js                # API service layer (ONLY used by stores)
    ├── ApiService        # Base API class
    ├── authAPI           # Authentication endpoints
    └── emailVerificationAPI  # Email verification endpoints
```

**Service Conventions:**
- ⚠️ **ONLY stores should import from `/services/api.js`**
- ⚠️ **Components should NEVER import from `/services/api.js`**
- Centralize all API calls in services
- Use the base `ApiService` class
- Group related endpoints (authAPI, emailVerificationAPI, etc.)
- Services are low-level utilities used by stores

#### **`/config/`** - Configuration Files
```
config/
└── toaster.config.js     # Toast notification configuration
```

**Config Conventions:**
- Keep configuration separate from components
- Export configuration objects
- Use theme variables in configs

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
├── index.js              # Automation engine entry
├── core/                 # Core automation utilities
│   ├── browserManager.js
│   ├── errorHandler.js
│   ├── rateLimiter.js
│   └── taskRunner.js
└── platforms/            # Platform-specific implementations
    ├── base/
    │   └── BasePlatform.js  # Base class (MUST extend)
    ├── linkedin/
    ├── hubspot/
    ├── notion/
    └── upwork/
```

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
3. Add corresponding method in the appropriate store (e.g., `authStore.js`)
4. Components call store method, store calls service method
5. Use `ApiService` base class
6. Handle errors in store and return consistent response format

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

**Last Updated:** 2024
**Maintained By:** Development Team