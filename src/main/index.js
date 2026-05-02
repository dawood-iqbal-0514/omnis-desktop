
const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');

// Load environment variables from .env file if it exists
try {
  const dotenv = require('dotenv');
  const envPath = path.join(__dirname, '../../.env');
  const result = dotenv.config({ path: envPath });
  if (result.error) {
    console.log('ℹ️ .env file not found, using system environment variables');
  } else {
    console.log('✅ Environment variables loaded from .env file');
  }
} catch (error) {
  // dotenv might not be installed, that's okay
  console.log('ℹ️ dotenv not available, using system environment variables');
}

console.log('🚀 Electron main process starting...');

let setupIPC, TokenService, LicenseService, UpdateService;

try {
  setupIPC = require('./ipc').setupIPC;
  console.log('✅ IPC loaded');
} catch (error) {
  console.error('❌ Failed to load IPC:', error.message);
  console.error('Stack:', error.stack);
}

try {
  TokenService = require('./services/tokenService').TokenService;
  console.log('✅ TokenService loaded');
} catch (error) {
  console.error('❌ Failed to load TokenService:', error.message);
}

try {
  LicenseService = require('./services/licenseService').LicenseService;
  console.log('✅ LicenseService loaded');
} catch (error) {
  console.error('❌ Failed to load LicenseService:', error.message);
}

try {
  UpdateService = require('./services/updater').UpdateService;
  console.log('✅ UpdateService loaded');
} catch (error) {
  console.error('❌ Failed to load UpdateService:', error.message);
}

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
console.log(`📍 Environment: ${isDev ? 'Development' : 'Production'}`);

let mainWindow = null;

function createWindow() {
  const iconPath = path.join(__dirname, '../renderer/assets/logos/logo.png');

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#1b222a',
    frame: true,
    titleBarStyle: 'default',
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
    },
  });

  // ─── Block child Electron windows for ALL external links ─────────────────
  // Anything trying to open a new window (target="_blank", window.open, ...)
  // must be sent to the user's default external browser. Spawning a child
  // BrowserWindow loads the URL with no cookies, so platforms like LinkedIn
  // bounce to a Sign Up page — never useful, always confusing.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  // Same for in-page navigations away from our renderer URL.
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const allowed = isDev ? 'http://localhost:5173' : 'file://';
    if (!url.startsWith(allowed)) {
      event.preventDefault();
      if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    }
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    console.log('Development mode: Loading from http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/renderer/index.html'));
  }

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('❌ Failed to load:', errorCode, errorDescription);
  });

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('✅ Window loaded successfully');
  });

  if (setupIPC) {
    setupIPC(mainWindow);
  } else {
    console.error('⚠️ IPC setup not available');
  }

  if (!isDev && UpdateService) {
    UpdateService.checkForUpdates();
  }

  console.log('✅ Main window created successfully');
}

app.whenReady().then(() => {
  console.log('🎯 Electron app ready, creating window...');
  
  // Initialize Cerebras API key from environment BEFORE creating window/IPC
  try {
    const { CerebrasService } = require('./services/cerebrasService');
    
    // Get API key and other config from environment
    const apiKey = process.env.CEREBRAS_API_KEY;
    const apiUrl = process.env.CEREBRAS_API_URL;
    const model = process.env.CEREBRAS_MODEL;
    
    console.log('🔍 Checking for Cerebras API key...');
    console.log('CEREBRAS_API_KEY exists:', !!apiKey);
    console.log('CEREBRAS_API_URL:', apiUrl || 'using default');
    console.log('CEREBRAS_MODEL:', model || 'using default');
    
    if (apiKey && apiKey.trim()) {
      CerebrasService.setApiKey(apiKey.trim());
      
      // Update base URL and model if provided
      if (apiUrl) {
        // Remove /chat/completions if present to get base URL
        const baseUrl = apiUrl.replace('/chat/completions', '').replace(/\/$/, '');
        CerebrasService.baseURL = baseUrl || 'https://api.cerebras.ai/v1';
      }
      if (model) {
        CerebrasService.defaultModel = model;
      }
      
      const verifyKey = CerebrasService.getApiKey();
      if (verifyKey) {
        console.log('✅ Cerebras API key loaded from environment (length:', verifyKey.length, ')');
        console.log('✅ Base URL:', CerebrasService.baseURL);
        console.log('✅ Model:', CerebrasService.defaultModel);
      } else {
        console.error('❌ Failed to set API key in CerebrasService');
      }
    } else {
      console.warn('⚠️ CEREBRAS_API_KEY not found in environment variables');
      console.warn('Please set CEREBRAS_API_KEY in your .env file');
    }
  } catch (error) {
    console.error('❌ Failed to initialize Cerebras service:', error);
    console.error('Error stack:', error.stack);
  }
  
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
}).catch(error => {
  console.error('❌ Failed to start app:', error);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled rejection:', error);
});

module.exports = { mainWindow };
