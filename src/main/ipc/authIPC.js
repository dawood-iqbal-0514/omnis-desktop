const { ipcMain } = require('electron');
const { TokenService } = require('../services/tokenService');
const { machineIdSync } = require('node-machine-id');

function setupAuthIPC(mainWindow) {
  ipcMain.handle('auth:save-refresh-token', async (event, token) => {
    try {
      TokenService.saveRefreshToken(token);
      return { success: true };
    } catch (error) {
      console.error('Failed to save refresh token:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('auth:get-refresh-token', async () => {
    try {
      const token = TokenService.getRefreshToken();
      return { success: true, token };
    } catch (error) {
      console.error('Failed to get refresh token:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('auth:clear-tokens', async () => {
    try {
      TokenService.clearTokens();
      return { success: true };
    } catch (error) {
      console.error('Failed to clear tokens:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('auth:get-device-id', async () => {
    try {
      const deviceId = machineIdSync();
      return { success: true, deviceId };
    } catch (error) {
      console.error('Failed to get device ID:', error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = { setupAuthIPC };
