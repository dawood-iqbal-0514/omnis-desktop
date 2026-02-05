const { ipcMain } = require('electron');

let orchestrator = null;

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
}

module.exports = { setupAutomationIPC };
