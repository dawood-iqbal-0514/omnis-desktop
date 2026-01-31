const { setupAuthIPC } = require('./authIPC');
const { setupSystemIPC } = require('./systemIPC');
const { setupAutomationIPC } = require('./automationIPC');
const { setupLLMIPC } = require('./llmIPC');
const { setupUpdateIPC } = require('./updateIPC');
const { setupDownloadIPC } = require('./downloadIPC');

function setupIPC(mainWindow) {
  console.log('🔧 Setting up IPC handlers...');
  
  try {
    setupAuthIPC(mainWindow);
    console.log('✅ Auth IPC setup');
  } catch (e) {
    console.error('❌ Auth IPC failed:', e.message);
  }
  
  try {
    setupSystemIPC(mainWindow);
    console.log('✅ System IPC setup');
  } catch (e) {
    console.error('❌ System IPC failed:', e.message);
  }
  
  try {
    setupAutomationIPC(mainWindow);
    console.log('✅ Automation IPC setup');
  } catch (e) {
    console.error('❌ Automation IPC failed:', e.message);
  }
  
  try {
    setupLLMIPC(mainWindow);
    console.log('✅ LLM IPC setup');
  } catch (e) {
    console.error('❌ LLM IPC failed:', e.message, e.stack);
  }
  
  try {
    setupUpdateIPC(mainWindow);
    console.log('✅ Update IPC setup');
  } catch (e) {
    console.error('❌ Update IPC failed:', e.message);
  }
  
  try {
    setupDownloadIPC(mainWindow);
    console.log('✅ Download IPC setup');
  } catch (e) {
    console.error('❌ Download IPC failed:', e.message);
  }

  console.log('✅ All IPC handlers initialized');
}

module.exports = { setupIPC };
