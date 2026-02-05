const { ipcMain } = require('electron');
const { CerebrasService } = require('../services/cerebrasService');

let ChatbotService;
try {
  ChatbotService = require('../services/chatbot/chatbotService').ChatbotService;
  console.log('✅ ChatbotService loaded');
} catch (error) {
  console.error('❌ Failed to load ChatbotService:', error);
  console.error('Stack:', error.stack);
  // Continue without ChatbotService - will use fallback
}

function setupCerebrasIPC() {
  console.log('🔧 Setting up Cerebras IPC handlers...');
  
  try {
    if (!ChatbotService) {
      console.warn('⚠️ ChatbotService not available, using direct CerebrasService');
    }

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

  // Send message (with new chatbot service)
  ipcMain.handle('cerebras:send-message', async (event, userMessage, chatHistory, platformName) => {
    console.log('📨 cerebras:send-message handler called');
    try {
      if (!platformName) {
        // Fallback to old behavior if no platform
        const result = await CerebrasService.sendMessage(userMessage, chatHistory || [], platformName);
        return { success: true, data: result };
      }

      // Use new chatbot service with role management (if available)
      if (ChatbotService) {
        try {
          const response = await ChatbotService.processMessage(userMessage, chatHistory || [], platformName);
          
          return {
            success: true,
            data: {
              type: response.type,
              message: response.message,
              plan: response.plan,
              executionJSON: response.executionJSON
            }
          };
        } catch (chatbotError) {
          console.error('❌ ChatbotService error:', chatbotError);
          // If chatbot service fails, fallback to direct Cerebras call
          console.log('⚠️  Falling back to direct CerebrasService call');
          const result = await CerebrasService.sendMessage(userMessage, chatHistory || [], platformName);
          return { success: true, data: result };
        }
      } else {
        // Fallback to direct CerebrasService if ChatbotService not available
        const result = await CerebrasService.sendMessage(userMessage, chatHistory || [], platformName);
        return { success: true, data: result };
      }
    } catch (error) {
      console.error('❌ Cerebras send message error:', error);
      console.error('Error stack:', error.stack);
      return { success: false, error: error.message || 'An unexpected error occurred. Please try again.' };
    }
  });

  // Reset chatbot (reset role state)
  ipcMain.handle('cerebras:reset-chatbot', async () => {
    try {
      if (ChatbotService) {
        ChatbotService.reset();
      }
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to reset chatbot:', error);
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
      if (ChatbotService) {
        ChatbotService.reset();
      }
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to reset chat:', error);
      return { success: false, error: error.message };
    }
  });

    console.log('✅ Cerebras IPC handlers set up');
  } catch (error) {
    console.error('❌ Error setting up Cerebras IPC handlers:', error);
    console.error('Stack:', error.stack);
    // Still try to register basic handler as fallback
    try {
      ipcMain.handle('cerebras:send-message', async (event, userMessage, chatHistory, platformName) => {
        try {
          const result = await CerebrasService.sendMessage(userMessage, chatHistory || [], platformName);
          return { success: true, data: result };
        } catch (err) {
          return { success: false, error: err.message };
        }
      });
      console.log('✅ Fallback Cerebras IPC handler registered');
    } catch (fallbackError) {
      console.error('❌ Failed to register fallback handler:', fallbackError);
    }
  }
}

module.exports = { setupCerebrasIPC };

