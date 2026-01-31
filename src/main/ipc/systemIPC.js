const { ipcMain, shell, app } = require('electron');

const ALLOWED_DOMAINS = [
  'omnisreach.com',
  'www.omnisreach.com',
  'billing.omnisreach.com',
  'help.omnisreach.com',
];

function setupSystemIPC(mainWindow) {
  ipcMain.handle('system:open-external', async (event, url) => {
    try {
      const urlObj = new URL(url);

      const isAllowed = ALLOWED_DOMAINS.some(domain => 
        urlObj.hostname === domain || urlObj.hostname.endsWith('.' + domain)
      );

      if (!isAllowed) {
        console.warn(`Blocked attempt to open non-whitelisted URL: ${url}`);
        return { success: false, error: 'URL not allowed' };
      }

      await shell.openExternal(url);
      return { success: true };
    } catch (error) {
      console.error('Failed to open external URL:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('system:get-version', async () => {
    return app.getVersion();
  });

  ipcMain.handle('system:get-path', async (event, name) => {
    try {
      return app.getPath(name);
    } catch (error) {
      console.error(`Failed to get path ${name}:`, error);
      return null;
    }
  });
}

module.exports = { setupSystemIPC };
