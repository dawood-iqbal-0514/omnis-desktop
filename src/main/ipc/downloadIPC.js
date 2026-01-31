const { ipcMain } = require('electron');
const { DownloadManager } = require('../services/downloadManager');

let downloadManager = null;

function getDownloadManager() {
  if (!downloadManager) {
    downloadManager = new DownloadManager();
  }
  return downloadManager;
}

function setupDownloadIPC(mainWindow) {
  ipcMain.handle('download:is-model-downloaded', async () => {
    try {
      const isDownloaded = getDownloadManager().isModelDownloaded();
      return { success: true, isDownloaded };
    } catch (error) {
      console.error('Failed to check model status:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('download:model', async () => {
    try {
      await getDownloadManager().downloadModel((progress) => {
        mainWindow.webContents.send('download:progress', progress);
      });
      return { success: true };
    } catch (error) {
      console.error('Failed to download model:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('download:cancel', async () => {
    try {
      getDownloadManager().cancelDownload();
      return { success: true };
    } catch (error) {
      console.error('Failed to cancel download:', error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = { setupDownloadIPC };
