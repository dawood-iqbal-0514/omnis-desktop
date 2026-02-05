
function loadPlatform(platformId, platformPath) {
  try {
    const module = require(platformPath);
    const PlatformClass = Object.values(module).find(v => v && typeof v === 'function' && v.name?.endsWith('Platform')) || module.default;
    
    if (!PlatformClass || typeof PlatformClass !== 'function') return null;
    
    return new PlatformClass();
  } catch (error) {
    // Platform may have Python files only - this is expected
    return null;
  }
}

const platforms = {};
const platformList = ['linkedin', 'notion', 'hubspot', 'upwork'];

platformList.forEach(id => {
  const platform = loadPlatform(id, `./${id}`);
  if (platform) platforms[id] = platform;
});

function getPlatform(platformId) {
  return platforms[platformId] || null;
}

function getAllPlatforms() {
  return Object.values(platforms);
}

function getPlatformsByType(type) {
  return Object.values(platforms).filter(p => p.type === type);
}

function getConnectedPlatforms() {
  return Object.values(platforms).filter(p => p.isConnected);
}

module.exports = {
  platforms,
  getPlatform,
  getAllPlatforms,
  getPlatformsByType,
  getConnectedPlatforms,
};
