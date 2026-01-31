
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

console.log('🚀 Electron main process starting...');

let setupIPC, TokenService, LicenseService, UpdateService, DownloadManager;

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

try {
  DownloadManager = require('./services/downloadManager').DownloadManager;
  console.log('✅ DownloadManager loaded');
} catch (error) {
  console.error('❌ Failed to load DownloadManager:', error.message);
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
