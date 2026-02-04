const { ipcMain } = require('electron');
const { CerebrasService } = require('../services/cerebrasService');

function setupCerebrasIPC() {
  console.log('🔧 Setting up Cerebras IPC handlers...');

  // Set API key
  ipcMain.handle('cerebras:set-api-key', async (event, apiKey) => {
    try {
      CerebrasService.setApiKey(apiKey);
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to set API key:', error);
      return { success: false, error: error.message };
    }
  });

  // Get API key (returns null if not set)
  ipcMain.handle('cerebras:get-api-key', async () => {
    try {
      const apiKey = CerebrasService.getApiKey();
      return { success: true, apiKey };
    } catch (error) {
      console.error('❌ Failed to get API key:', error);
      return { success: false, error: error.message };
    }
  });

  // Send message
  ipcMain.handle('cerebras:send-message', async (event, userMessage, chatHistory, platformName) => {
    try {
      const result = await CerebrasService.sendMessage(userMessage, chatHistory || [], platformName);
      return { success: true, data: result };
    } catch (error) {
      console.error('❌ Cerebras send message error:', error);
      return { success: false, error: error.message };
    }
  });

  // Extract workflow JSON
  ipcMain.handle('cerebras:extract-workflow', async (event, chatHistory) => {
    try {
      const workflow = await CerebrasService.extractWorkflowJSON(chatHistory);
      return { success: true, data: workflow };
    } catch (error) {
      console.error('❌ Cerebras extract workflow error:', error);
      return { success: false, error: error.message };
    }
  });

  // Reset chat
  ipcMain.handle('cerebras:reset-chat', async () => {
    try {
      CerebrasService.resetChat();
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to reset chat:', error);
      return { success: false, error: error.message };
    }
  });

  console.log('✅ Cerebras IPC handlers set up');
}

module.exports = { setupCerebrasIPC };

