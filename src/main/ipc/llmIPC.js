const { setupLLMHandlers } = require('./llm');

function setupLLMIPC(mainWindow) {
  setupLLMHandlers();
}

module.exports = { setupLLMIPC };
