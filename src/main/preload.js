
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

contextBridge.exposeInMainWorld('automationAPI', {
  getPlatforms: () => ipcRenderer.invoke('automation:get-platforms'),
  connectPlatform: (platformId, credentials) => ipcRenderer.invoke('automation:connect', platformId, credentials),
  disconnectPlatform: (platformId) => ipcRenderer.invoke('automation:disconnect', platformId),

  executeTask: (task) => ipcRenderer.invoke('automation:execute-task', task),
  cancelTask: (taskId) => ipcRenderer.invoke('automation:cancel-task', taskId),

  onTaskProgress: (callback) => ipcRenderer.on('automation:task-progress', callback),
  onTaskComplete: (callback) => ipcRenderer.on('automation:task-complete', callback),
  onTaskError: (callback) => ipcRenderer.on('automation:task-error', callback),
  
  // 2FA support
  submit2FAToken: (token) => ipcRenderer.invoke('automation:submit-2fa-token', token),
  on2FARequest: (callback) => ipcRenderer.on('automation:2fa-request', callback),
  off2FARequest: (callback) => ipcRenderer.removeListener('automation:2fa-request', callback),

  // Login script execution
  executeLoginScript: (platformId, credentials) => ipcRenderer.invoke('automation:execute-login-script', platformId, credentials),
  cancelLoginScript: () => ipcRenderer.invoke('automation:cancel-login-script'),
  
  // HubSpot AI support
  submitHubSpotAIResponse: (response) => ipcRenderer.invoke('automation:submit-hubspot-ai-response', response),
  onHubSpotAIQuestion: (callback) => ipcRenderer.on('automation:hubspot-ai-question', callback),

  // LinkedIn challenge resolution — opens a modal BrowserWindow with the
  // checkpoint URL, returns the post-verification cookie jar.
  resolveLinkedinChallenge: (payload) => ipcRenderer.invoke('automation:resolve-linkedin-challenge', payload),
});

contextBridge.exposeInMainWorld('cerebrasAPI', {
  setApiKey: (apiKey) => ipcRenderer.invoke('cerebras:set-api-key', apiKey),
  getApiKey: () => ipcRenderer.invoke('cerebras:get-api-key'),
  sendMessage: (userMessage, chatHistory, platformName, connectedPlatforms) => ipcRenderer.invoke('cerebras:send-message', userMessage, chatHistory, platformName, connectedPlatforms),
  presentResult: (userMessage, actionResults) => ipcRenderer.invoke('cerebras:present-result', userMessage, actionResults),
  extractWorkflow: (chatHistory) => ipcRenderer.invoke('cerebras:extract-workflow', chatHistory),
  resetChat: () => ipcRenderer.invoke('cerebras:reset-chat'),
  resetChatbot: () => ipcRenderer.invoke('cerebras:reset-chatbot'),
});