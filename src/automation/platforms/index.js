
const { LinkedInPlatform } = require('./linkedin');
const { NotionPlatform } = require('./notion');
const { HubSpotPlatform } = require('./hubspot');
const { UpworkPlatform } = require('./upwork');

const platforms = {
  linkedin: new LinkedInPlatform(),
  notion: new NotionPlatform(),
  hubspot: new HubSpotPlatform(),
  upwork: new UpworkPlatform(),

};

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
