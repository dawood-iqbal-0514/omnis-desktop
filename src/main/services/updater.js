const { autoUpdater } = require('electron-updater');
const { EventEmitter } = require('events');

class UpdateService extends EventEmitter {
  constructor() {
    super();

    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;

    this.setupListeners();
  }

  setupListeners() {
    autoUpdater.on('checking-for-update', () => {
      console.log('Checking for updates...');
    });

    autoUpdater.on('update-available', (info) => {
      console.log('Update available:', info.version);
      this.emit('update-available', {
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: info.releaseNotes,
      });
    });

    autoUpdater.on('update-not-available', () => {
      console.log('No updates available');
    });

    autoUpdater.on('download-progress', (progress) => {
      this.emit('download-progress', {
        percent: progress.percent,
        bytesPerSecond: progress.bytesPerSecond,
        transferred: progress.transferred,
        total: progress.total,
      });
    });

    autoUpdater.on('update-downloaded', (info) => {
      console.log('Update downloaded:', info.version);
      this.emit('update-downloaded', {
        version: info.version,
        releaseNotes: info.releaseNotes,
      });
    });

    autoUpdater.on('error', (error) => {
      console.error('Update error:', error);
      this.emit('error', error);
    });
  }

  async checkForUpdates() {
    try {
      const result = await autoUpdater.checkForUpdates();
      return result?.updateInfo || null;
    } catch (error) {
      console.error('Failed to check for updates:', error);
      throw error;
    }
  }

  async downloadUpdate() {
    try {
      await autoUpdater.downloadUpdate();
    } catch (error) {
      console.error('Failed to download update:', error);
      throw error;
    }
  }

  quitAndInstall() {
    autoUpdater.quitAndInstall();
  }
}

module.exports = { UpdateService: new UpdateService() };
