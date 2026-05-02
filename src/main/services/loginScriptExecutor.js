const { spawn } = require('child_process');
const path = require('path');
const { app } = require('electron');

// ─── Platform-specific login script configuration ────────────────────────────
const PLATFORM_CONFIG = {
  hubspot: {
    folder: 'hubspot',
    script: 'Hubspot_Login.py',
    envMap: (credentials, profilePath) => ({
      HUBSPOT_EMAIL: credentials.email || '',
      HUBSPOT_PASSWORD: credentials.password || '',
      HUBSPOT_PROFILE_PATH: profilePath,
    }),
  },
  ghl: {
    folder: 'gohighlevel',
    script: 'GHL_Login.py',
    envMap: (credentials, profilePath) => ({
      GHL_EMAIL: credentials.email || '',
      GHL_PASSWORD: credentials.password || '',
      GHL_LOCATION_ID: credentials.locationId || '',
      GHL_PROFILE_PATH: profilePath,
    }),
  },
};

class LoginScriptExecutor {
  constructor(mainWindow) {
    this.mainWindow = mainWindow;
    this.currentProcess = null;
    this.pending2FAToken = null;
    this.tokenResolver = null;
  }

  async executeLoginScript(platformId, credentials) {
    return new Promise((resolve, reject) => {
      const config = PLATFORM_CONFIG[platformId];
      if (!config) {
        return reject(new Error(`No login script configured for platform: ${platformId}`));
      }

      // Get script path - handle both development and production
      const isDev = !app.isPackaged;
      const scriptPath = isDev
        ? path.join(app.getAppPath(), 'src', 'automation', 'platforms', config.folder, config.script)
        : path.join(process.resourcesPath, 'app.asar', 'src', 'automation', 'platforms', config.folder, config.script);

      // Get profile path for browser
      const { paths } = require('../utils/paths');
      const profilePath = path.join(paths.userData(), 'OmnisReach_Profiles', platformId, 'default');

      // Create Python process with platform-specific env vars
      const pythonProcess = spawn('python', [scriptPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          ...config.envMap(credentials, profilePath),
        },
      });

      this.currentProcess = pythonProcess;

      let stdout = '';
      let stderr = '';
      let twoFAHandled = false;

      // Monitor stdout for 2FA request marker
      pythonProcess.stdout.on('data', (data) => {
        const output = data.toString();
        stdout += output;

        // Detect [2FA_REQUEST] using accumulated stdout so split chunks can't miss it
        if (!twoFAHandled && stdout.includes('[2FA_REQUEST]')) {
          twoFAHandled = true;

          const marker = '[2FA_REQUEST]';
          const markerIdx = stdout.indexOf(marker);
          let pageMessage = '';
          if (markerIdx >= 0) {
            pageMessage = stdout.substring(markerIdx + marker.length).split('\n')[0].trim();
          }

          // Send 2FA request to frontend with the actual page message
          this.mainWindow.webContents.send('automation:2fa-request', {
            platformId,
            message: pageMessage || 'Enter the verification code.',
          });

          // Wait for token from frontend
          this.waitFor2FAToken().then((token) => {
            if (token && pythonProcess.stdin.writable) {
              pythonProcess.stdin.write(token + '\n');
            } else if (token) {
              reject(new Error('2FA token submission failed: browser session closed unexpectedly'));
            } else {
              reject(new Error('2FA token was empty'));
            }
          }).catch((error) => {
            pythonProcess.kill();
            reject(new Error('2FA token input cancelled or timed out'));
          });
        }
      });

      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      pythonProcess.on('close', (code) => {
        this.currentProcess = null;

        if (code === 0) {
          resolve({ success: true, stdout, stderr });
        } else {
          let errorMessage = 'Login failed';

          if (stderr.includes('ERROR: Chrome/Chromium not found') || stderr.includes('Chrome path found but file doesn\'t exist')) {
            errorMessage = 'Chrome is not installed or not found. Please install Google Chrome from https://www.google.com/chrome/';
          } else if (stderr.includes('WebSocketBadStatusException') || stderr.includes('Handshake status 404')) {
            errorMessage = 'Failed to start browser. Please make sure Chrome/Chromium is installed and try again.';
          } else if (stderr.includes('Failed to launch browser')) {
            const errorMatch = stderr.match(/Failed to launch browser[^\n]*:?\s*([^\n]+)/i);
            errorMessage = errorMatch?.[1]?.trim()
              ? `Browser failed to start: ${errorMatch[1].trim()}`
              : 'Browser failed to start. Please check if Chrome is installed and accessible.';
          } else if (stderr.includes('No 2FA token provided')) {
            errorMessage = '2FA token is required but was not provided.';
          } else if (stderr.includes('Login failed')) {
            errorMessage = 'Login failed. Please check your email and password.';
          } else if (stderr) {
            const lines = stderr.split('\n');
            const errorLine = lines.find(line =>
              line.includes('ERROR:') ||
              line.includes('Error:') ||
              line.includes('Failed') ||
              line.includes('Exception')
            );
            if (errorLine) {
              errorMessage = errorLine.replace(/^.*?(ERROR|Error)[:\s]+/i, '').replace(/file:.*$/i, '').trim();
              if (!errorMessage || errorMessage.length < 5) {
                errorMessage = 'Login failed. Please check the console for details.';
              }
            }
          }

          if (errorMessage === 'Login failed' && stderr.trim()) {
            const firstErrorLine = stderr.split('\n').find(line => line.trim().length > 10);
            if (firstErrorLine) {
              errorMessage = firstErrorLine.trim().substring(0, 200);
            }
          }

          reject(new Error(errorMessage));
        }
      });

      pythonProcess.on('error', (error) => {
        this.currentProcess = null;
        reject(new Error(`Failed to start login script: ${error.message}`));
      });
    });
  }

  async waitFor2FAToken() {
    return new Promise((resolve, reject) => {
      this.tokenResolver = { resolve, reject };
      setTimeout(() => {
        if (this.tokenResolver) {
          this.tokenResolver.reject(new Error('2FA token request timeout'));
          this.tokenResolver = null;
        }
      }, 5 * 60 * 1000);
    });
  }

  submit2FAToken(token) {
    if (this.tokenResolver) {
      this.tokenResolver.resolve(token);
      this.tokenResolver = null;
      return true;
    }
    return false;
  }

  cancel() {
    if (this.currentProcess) {
      this.currentProcess.kill();
      this.currentProcess = null;
    }
    if (this.tokenResolver) {
      this.tokenResolver.reject(new Error('Login cancelled'));
      this.tokenResolver = null;
    }
  }
}

module.exports = { LoginScriptExecutor };
