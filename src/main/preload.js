
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('authAPI', {
  saveRefreshToken: (token) => ipcRenderer.invoke('auth:save-refresh-token', token),
  getRefreshToken: () => ipcRenderer.invoke('auth:get-refresh-token'),
  clearTokens: () => ipcRenderer.invoke('auth:clear-tokens'),
  getDeviceId: () => ipcRenderer.invoke('auth:get-device-id'),
});

contextBridge.exposeInMainWorld('systemAPI', {
  platform: process.platform,
  openExternal: (url) => ipcRenderer.invoke('system:open-external', url),
  getAppVersion: () => ipcRenderer.invoke('system:get-version'),
  getAppPath: (name) => ipcRenderer.invoke('system:get-path', name),
});

contextBridge.exposeInMainWorld('updateAPI', {
  checkForUpdates: () => ipcRenderer.invoke('update:check'),
  downloadUpdate: () => ipcRenderer.invoke('update:download'),
  installUpdate: () => ipcRenderer.invoke('update:install'),
  onUpdateAvailable: (callback) => ipcRenderer.on('update:available', callback),
  onUpdateProgress: (callback) => ipcRenderer.on('update:progress', callback),
  onUpdateDownloaded: (callback) => ipcRenderer.on('update:downloaded', callback),
});

contextBridge.exposeInMainWorld('llmAPI', {
  initialize: () => ipcRenderer.invoke('llm:initialize'),
  startChat: () => ipcRenderer.invoke('llm:start-chat'),
  sendMessage: (message) => ipcRenderer.invoke('llm:send-message', message),
  extractWorkflow: () => ipcRenderer.invoke('llm:extract-workflow'),
  validateRequirements: () => ipcRenderer.invoke('llm:validate-requirements'),
  getHistory: () => ipcRenderer.invoke('llm:get-history'),
  reset: () => ipcRenderer.invoke('llm:reset'),
});

contextBridge.exposeInMainWorld('automationAPI', {
  getPlatforms: () => ipcRenderer.invoke('automation:get-platforms'),
  connectPlatform: (platformId, credentials) => ipcRenderer.invoke('automation:connect', platformId, credentials),
  disconnectPlatform: (platformId) => ipcRenderer.invoke('automation:disconnect', platformId),

  executeTask: (task) => ipcRenderer.invoke('automation:execute-task', task),
  cancelTask: (taskId) => ipcRenderer.invoke('automation:cancel-task', taskId),

  onTaskProgress: (callback) => ipcRenderer.on('automation:task-progress', callback),
  onTaskComplete: (callback) => ipcRenderer.on('automation:task-complete', callback),
  onTaskError: (callback) => ipcRenderer.on('automation:task-error', callback),
});

contextBridge.exposeInMainWorld('downloadAPI', {
  isModelDownloaded: () => ipcRenderer.invoke('download:is-model-downloaded'),
  downloadModel: () => ipcRenderer.invoke('download:model'),
  cancelDownload: () => ipcRenderer.invoke('download:cancel'),
  onProgress: (callback) => ipcRenderer.on('download:progress', callback),
});
