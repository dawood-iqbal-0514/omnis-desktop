const { ipcMain } = require('electron');
const { CerebrasService } = require('../services/cerebrasService');

// ─── Load Pipeline Orchestrator (replaces old ChatbotService) ────────────────
let PipelineOrchestrator;
try {
  PipelineOrchestrator = require('../services/pipeline/pipelineOrchestrator').PipelineOrchestrator;
  console.log('✅ PipelineOrchestrator loaded');
} catch (error) {
  console.error('❌ Failed to load PipelineOrchestrator:', error.message);
}

// ─── Load Result Presenter (formats raw action results into friendly replies)
let resultPresenter;
try {
  resultPresenter = require('../services/pipeline/resultPresenter');
  console.log('✅ ResultPresenter loaded');
} catch (error) {
  console.error('❌ Failed to load ResultPresenter:', error.message);
}

function setupCerebrasIPC() {
  console.log('🔧 Setting up Cerebras IPC handlers...');

  try {
    // Initialize the pipeline on startup
    if (PipelineOrchestrator) {
      PipelineOrchestrator.initialize().catch(err => {
        console.error('❌ Pipeline initialization failed:', err.message);
      });
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

    // Get API key
    ipcMain.handle('cerebras:get-api-key', async () => {
      try {
        const apiKey = CerebrasService.getApiKey();
        return { success: true, apiKey };
      } catch (error) {
        console.error('❌ Failed to get API key:', error);
        return { success: false, error: error.message };
      }
    });

    // ─── Send message (3-stage pipeline) ─────────────────────────────────
    ipcMain.handle('cerebras:send-message', async (event, userMessage, chatHistory, platformName, connectedPlatforms) => {
      console.log('📨 cerebras:send-message handler called');
      try {
        // Use the 3-stage pipeline (if available)
        if (PipelineOrchestrator) {
          try {
            const response = await PipelineOrchestrator.processMessage(
              userMessage,
              chatHistory || [],
              platformName || null,
              connectedPlatforms || null
            );

            // Pass the full response through. v2 flow responses carry a
            // `card` field that the renderer matches on; legacy responses
            // carry `plan` / `executionJSON` / `message`.
            return { success: true, data: response };
          } catch (pipelineError) {
            console.error('❌ Pipeline error:', pipelineError);
            console.error('❌ Pipeline error stack:', pipelineError.stack);
            // Return error message instead of falling back to old prompt
            return {
              success: true,
              data: {
                type: 'message',
                message: `Something went wrong: ${pipelineError.message}. Please try again.`
              }
            };
          }
        } else {
          // Fallback: direct Cerebras call (no pipeline)
          const result = await CerebrasService.sendMessage(userMessage, chatHistory || [], platformName);
          return { success: true, data: result };
        }
      } catch (error) {
        console.error('❌ Cerebras send message error:', error);
        return { success: false, error: error.message || 'An unexpected error occurred. Please try again.' };
      }
    });

    // ─── Build a structured render spec from a successful action's result ──
    // The renderer's <ResultRenderer/> component reads the spec and picks the
    // right sub-component (profile card, data table, confirmation, etc.).
    ipcMain.handle('cerebras:present-result', async (event, userMessage, actionResults) => {
      try {
        if (!resultPresenter) {
          return { success: false, error: 'ResultPresenter not available' };
        }
        const out = await resultPresenter.buildSpec(userMessage, actionResults || []);
        return { success: true, data: out };
      } catch (error) {
        console.error('❌ Cerebras present-result error:', error);
        return { success: false, error: error.message };
      }
    });

    // ─── v2 flow event channel ────────────────────────────────────────────
    // The renderer sends structured events (pick, ask, approve, cancel,
    // menu, execute_result, execute_error) back to resume an in-progress
    // typed flow. Each call returns the next card the renderer should
    // display, or 'fallback' if v2 doesn't know what to do.
    ipcMain.handle('flow:event', async (event, eventPayload) => {
      try {
        if (!PipelineOrchestrator) {
          return { success: false, error: 'PipelineOrchestrator not loaded.' };
        }
        const card = await PipelineOrchestrator.processFlowEvent(eventPayload || {});
        return { success: true, data: card };
      } catch (err) {
        console.error('❌ flow:event error:', err);
        return { success: false, error: err.message };
      }
    });

    // ─── Reset pipeline state ──────────────────────────────────────────────
    ipcMain.handle('cerebras:reset-chatbot', async () => {
      try {
        if (PipelineOrchestrator) {
          PipelineOrchestrator.reset();
        }
        return { success: true };
      } catch (error) {
        console.error('❌ Failed to reset pipeline:', error);
        return { success: false, error: error.message };
      }
    });

    // Extract workflow JSON (legacy, kept for backward compat)
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
        if (PipelineOrchestrator) {
          PipelineOrchestrator.reset();
        }
        return { success: true };
      } catch (error) {
        console.error('❌ Failed to reset chat:', error);
        return { success: false, error: error.message };
      }
    });

    console.log('✅ Cerebras IPC handlers set up (Pipeline mode)');
  } catch (error) {
    console.error('❌ Error setting up Cerebras IPC handlers:', error);
    // Fallback handler
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
