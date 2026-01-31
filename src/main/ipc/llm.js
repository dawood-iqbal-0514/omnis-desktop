const { ipcMain } = require('electron');
const { WorkflowLLMService } = require('../../llm/workflowService');

function setupLLMHandlers() {
  ipcMain.handle('llm:initialize', async () => {
    try {
      await WorkflowLLMService.initialize();
      return { success: true };
    } catch (error) {
      console.error('LLM initialization failed:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('llm:start-chat', async () => {
    try {
      WorkflowLLMService.startChat();
      return { success: true };
    } catch (error) {
      console.error('Failed to start chat:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('llm:send-message', async (event, message) => {
    try {
      const response = await WorkflowLLMService.sendMessage(message);
      return { success: true, data: response };
    } catch (error) {
      console.error('Failed to send message:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('llm:extract-workflow', async () => {
    try {
      const workflow = await WorkflowLLMService.extractWorkflowJSON();
      return { success: true, data: workflow };
    } catch (error) {
      console.error('Failed to extract workflow:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('llm:validate-requirements', async () => {
    try {
      const validation = WorkflowLLMService.validateRequirements();
      return { success: true, data: validation };
    } catch (error) {
      console.error('Failed to validate requirements:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('llm:get-history', async () => {
    try {
      const history = WorkflowLLMService.getChatHistory();
      return { success: true, data: history };
    } catch (error) {
      console.error('Failed to get history:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('llm:reset', async () => {
    try {
      WorkflowLLMService.reset();
      return { success: true };
    } catch (error) {
      console.error('Failed to reset:', error);
      return { success: false, error: error.message };
    }
  });

  console.log('✅ LLM IPC handlers registered');
}

module.exports = { setupLLMHandlers };
