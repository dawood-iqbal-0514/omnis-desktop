const fs = require('fs');
const path = require('path');

class RegistryLoader {
  constructor() {
    this.cache = new Map();
  }

  loadAPIActions(platformId) {
    const cacheKey = `${platformId}_api`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const registryPath = path.join(
        __dirname,
        '../../../automation/platforms',
        platformId,
        'registry',
        'api-actions.json'
      );

      if (!fs.existsSync(registryPath)) {
        console.warn(`⚠️  API actions registry not found for ${platformId}`);
        return { apiOnlyActions: [], hybridActions: {} };
      }

      const content = fs.readFileSync(registryPath, 'utf8');
      const registry = JSON.parse(content);
      
      this.cache.set(cacheKey, registry);
      return registry;
    } catch (error) {
      console.error(`❌ Failed to load API actions for ${platformId}:`, error);
      return { apiOnlyActions: [], hybridActions: {} };
    }
  }

  loadAutomationScripts(platformId) {
    const cacheKey = `${platformId}_automation`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const registryPath = path.join(
        __dirname,
        '../../../automation/platforms',
        platformId,
        'registry',
        'automation-scripts.json'
      );

      if (!fs.existsSync(registryPath)) {
        console.warn(`⚠️  Automation scripts registry not found for ${platformId}`);
        return { availableScripts: [] };
      }

      const content = fs.readFileSync(registryPath, 'utf8');
      const registry = JSON.parse(content);
      
      this.cache.set(cacheKey, registry);
      return registry;
    } catch (error) {
      console.error(`❌ Failed to load automation scripts for ${platformId}:`, error);
      return { availableScripts: [] };
    }
  }

  isAPIAction(platformId, actionId) {
    const apiRegistry = this.loadAPIActions(platformId);
    return apiRegistry.apiOnlyActions.includes(actionId);
  }

  getHybridAction(platformId, actionId) {
    const apiRegistry = this.loadAPIActions(platformId);
    return apiRegistry.hybridActions[actionId] || null;
  }

  getAutomationScript(platformId, actionId) {
    const automationRegistry = this.loadAutomationScripts(platformId);
    return automationRegistry.availableScripts.find(
      script => script.actionId === actionId
    ) || null;
  }

  clearCache(platformId) {
    this.cache.delete(`${platformId}_api`);
    this.cache.delete(`${platformId}_automation`);
  }

  clearAllCache() {
    this.cache.clear();
  }
}

module.exports = { RegistryLoader: new RegistryLoader() };

