const { app } = require('electron');
const path = require('path');

const paths = {
  userData: () => app.getPath('userData'),

  models: () => path.join(app.getPath('userData'), 'models'),

  logs: () => path.join(app.getPath('userData'), 'logs'),

  automation: () => path.join(app.getPath('userData'), 'automation'),

  platformData: (platformId) => 
    path.join(app.getPath('userData'), 'automation', 'platforms', platformId),
};

module.exports = { paths };
