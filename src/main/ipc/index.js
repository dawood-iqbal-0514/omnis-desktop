const { setupAuthIPC } = require('./authIPC');
const { setupSystemIPC } = require('./systemIPC');
const { setupAutomationIPC } = require('./automationIPC');
const { setupUpdateIPC } = require('./updateIPC');
const { setupCerebrasIPC } = require('./cerebrasIPC');

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
    setupUpdateIPC(mainWindow);
    console.log('✅ Update IPC setup');
  } catch (e) {
    console.error('❌ Update IPC failed:', e.message);
  }

  try {
    setupCerebrasIPC();
    console.log('✅ Cerebras IPC setup');
  } catch (e) {
    console.error('❌ Cerebras IPC failed:', e.message);
  }

  console.log('✅ All IPC handlers initialized');
}

module.exports = { setupIPC };
