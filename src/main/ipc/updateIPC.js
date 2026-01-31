const { ipcMain } = require('electron');
const { UpdateService } = require('../services/updater');

function setupUpdateIPC(mainWindow) {
  ipcMain.handle('update:check', async () => {
    try {
      const updateInfo = await UpdateService.checkForUpdates();
      return { success: true, updateInfo };
    } catch (error) {
      console.error('Failed to check for updates:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('update:download', async () => {
    try {
      await UpdateService.downloadUpdate();
      return { success: true };
    } catch (error) {
      console.error('Failed to download update:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('update:install', async () => {
    try {
      UpdateService.quitAndInstall();
      return { success: true };
    } catch (error) {
      console.error('Failed to install update:', error);
      return { success: false, error: error.message };
    }
  });

  UpdateService.on('update-available', (info) => {
    mainWindow.webContents.send('update:available', info);
  });

  UpdateService.on('download-progress', (progress) => {
    mainWindow.webContents.send('update:progress', progress);
  });

  UpdateService.on('update-downloaded', (info) => {
    mainWindow.webContents.send('update:downloaded', info);
  });
}

module.exports = { setupUpdateIPC };
