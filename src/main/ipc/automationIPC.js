const { ipcMain } = require('electron');

let orchestrator = null;
let loginExecutor = null;
let LoginScriptExecutor = null;
let automationScriptExecutor = null;
let AutomationScriptExecutor = null;

function getOrchestrator() {
  if (!orchestrator) {
    // Lazy-load to prevent platforms/index.js from blocking IPC setup
    const { AutomationOrchestrator } = require('../../automation');
    orchestrator = new AutomationOrchestrator();
  }
  return orchestrator;
}

function setupAutomationIPC(mainWindow) {
  ipcMain.handle('automation:get-platforms', async () => {
    try {
      const platforms = getOrchestrator().getAllPlatforms();
      return { 
        success: true, 
        platforms: platforms.map(p => ({
          id: p.id,
          name: p.name,
          type: p.type,
          isConnected: p.isConnected,
          availableActions: p.getAvailableActions(),
        }))
      };
    } catch (error) {
      console.error('Failed to get platforms:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('automation:connect', async (event, platformId, credentials) => {
    try {
      const platform = getOrchestrator().getPlatform(platformId);
      if (!platform) {
        return { success: false, error: `Platform ${platformId} not found` };
      }

      await platform.connect(credentials);

      mainWindow.webContents.send('automation:platform-connected', { platformId });
      return { success: true };
    } catch (error) {
      console.error(`Failed to connect to ${platformId}:`, error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('automation:disconnect', async (event, platformId) => {
    try {
      const platform = getOrchestrator().getPlatform(platformId);
      if (platform) {
        await platform.disconnect();
      }
      return { success: true };
    } catch (error) {
      console.error(`Failed to disconnect from ${platformId}:`, error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('automation:execute-task', async (event, task) => {
    try {
      // Check if script exists in registry before executing
      const { RegistryLoader } = require('../services/chatbot/utils/registryLoader');
      const scriptName = task.script || task.automationConfig?.script;
      const actionId = task.action || task.actionId;
      
      let foundScript = null;
      let scriptFound = false;
      
      if (scriptName || actionId) {
        const automationRegistry = RegistryLoader.loadAutomationScripts(task.platform);
        
        // Check by script name first (if provided)
        if (scriptName) {
          foundScript = automationRegistry.availableScripts.find(
            s => s.name === scriptName
          );
          if (foundScript) {
            scriptFound = true;
          }
        }
        
        // Check by actionId (if script name not found or not provided)
        if (!scriptFound && actionId) {
          foundScript = RegistryLoader.getAutomationScript(task.platform, actionId);
          if (foundScript) {
            scriptFound = true;
          }
        }
        
        // If neither found, return error
        if (!scriptFound) {
          const availableScripts = automationRegistry.availableScripts.map(s => s.name).join(', ') || 'none';
          const errorMsg = scriptName 
            ? `Script "${scriptName}" is not available in the registry for ${task.platform}. Available scripts: ${availableScripts}`
            : `Action "${actionId}" is not available in the automation registry for ${task.platform}. Available actions: ${automationRegistry.availableScripts.map(s => s.actionId).join(', ') || 'none'}`;
          console.error('❌ Script/Action not found:', errorMsg);
          return { success: false, error: errorMsg };
        }
      }

      // Check if this is a Python script that needs direct execution
      const isPythonScript = foundScript && foundScript.name && foundScript.name.endsWith('.py');
      
      if (isPythonScript && foundScript) {
        // Use AutomationScriptExecutor for Python scripts
        if (!AutomationScriptExecutor) {
          AutomationScriptExecutor = require('../services/automationScriptExecutor').AutomationScriptExecutor;
        }
        if (!automationScriptExecutor) {
          automationScriptExecutor = new AutomationScriptExecutor(mainWindow);
        }
        
        const result = await automationScriptExecutor.executeScript(
          task.platform,
          foundScript.name,
          task.parameters || {}
        );
        
        mainWindow.webContents.send('automation:task-complete', {
          taskId: task.id,
          result,
        });
        
        return { success: true, result };
      } else {
        // Use orchestrator for other tasks
        const result = await getOrchestrator().executeTask(task, {
          onProgress: (progress) => {
            mainWindow.webContents.send('automation:task-progress', {
              taskId: task.id,
              progress,
            });
          },
        });

        mainWindow.webContents.send('automation:task-complete', {
          taskId: task.id,
          result,
        });

        return { success: true, result };
      }
    } catch (error) {
      console.error('Task execution failed:', error);
      mainWindow.webContents.send('automation:task-error', {
        taskId: task.id,
        error: error.message,
      });
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('automation:cancel-task', async (event, taskId) => {
    try {
      await getOrchestrator().cancelTask(taskId);
      return { success: true };
    } catch (error) {
      console.error(`Failed to cancel task ${taskId}:`, error);
      return { success: false, error: error.message };
    }
  });

  // Lazy-load LoginScriptExecutor to prevent module loading errors
  try {
    if (!LoginScriptExecutor) {
      LoginScriptExecutor = require('../services/loginScriptExecutor').LoginScriptExecutor;
    }
    // Initialize login executor
    loginExecutor = new LoginScriptExecutor(mainWindow);
    console.log('✅ LoginScriptExecutor initialized');
  } catch (error) {
    console.error('❌ Failed to load LoginScriptExecutor:', error);
    // Continue anyway - handler will check for executor
  }

  // Execute login script
  ipcMain.handle('automation:execute-login-script', async (event, platformId, credentials) => {
    try {
      if (!LoginScriptExecutor) {
        LoginScriptExecutor = require('../services/loginScriptExecutor').LoginScriptExecutor;
      }
      if (!loginExecutor) {
        loginExecutor = new LoginScriptExecutor(mainWindow);
      }
      const result = await loginExecutor.executeLoginScript(platformId, credentials);
      return { success: true, ...result };
    } catch (error) {
      console.error('Login script execution failed:', error);
      return { success: false, error: error.message };
    }
  });
  console.log('✅ Registered IPC handler: automation:execute-login-script');

  // Submit 2FA token
  ipcMain.handle('automation:submit-2fa-token', async (event, token) => {
    try {
      if (!loginExecutor) {
        return { success: false, error: 'No active login process' };
      }
      const submitted = loginExecutor.submit2FAToken(token);
      return { success: submitted };
    } catch (error) {
      console.error('Failed to submit 2FA token:', error);
      return { success: false, error: error.message };
    }
  });

  // Cancel login script
  ipcMain.handle('automation:cancel-login-script', async (event) => {
    try {
      if (!loginExecutor) {
        return { success: false, error: 'No active login process' };
      }
      loginExecutor.cancel();
      return { success: true };
    } catch (error) {
      console.error('Failed to cancel login script:', error);
      return { success: false, error: error.message };
    }
  });

  // Submit HubSpot AI response
  ipcMain.handle('automation:submit-hubspot-ai-response', async (event, response) => {
    try {
      if (!AutomationScriptExecutor) {
        AutomationScriptExecutor = require('../services/automationScriptExecutor').AutomationScriptExecutor;
      }
      if (!automationScriptExecutor) {
        return { success: false, error: 'No active automation script process' };
      }
      const submitted = automationScriptExecutor.submitAIResponse(response);
      return { success: submitted };
    } catch (error) {
      console.error('Failed to submit HubSpot AI response:', error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = { setupAutomationIPC };
