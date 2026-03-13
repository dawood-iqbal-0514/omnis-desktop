const { spawn } = require('child_process');
const path = require('path');
const { app } = require('electron');

class LoginScriptExecutor {
  constructor(mainWindow) {
    this.mainWindow = mainWindow;
    this.currentProcess = null;
    this.pending2FAToken = null;
    this.tokenResolver = null;
  }

  async executeLoginScript(platformId, credentials) {
    return new Promise((resolve, reject) => {
      // Get script path - handle both development and production
      const isDev = !app.isPackaged;
      const scriptPath = isDev
        ? path.join(
            app.getAppPath(),
            'src',
            'automation',
            'platforms',
            platformId,
            'Hubspot_Login.py'
          )
        : path.join(
            process.resourcesPath,
            'app.asar',
            'src',
            'automation',
            'platforms',
            platformId,
            'Hubspot_Login.py'
          );

      // Get profile path for browser
      const { paths } = require('../utils/paths');
      const profilePath = path.join(paths.userData(), 'OmnisReach_Profiles', platformId, 'default');

      // Create Python process with stdin/stdout
      const pythonProcess = spawn('python', [scriptPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          HUBSPOT_EMAIL: credentials.email,
          HUBSPOT_PASSWORD: credentials.password,
          HUBSPOT_PROFILE_PATH: profilePath,
        },
      });

      this.currentProcess = pythonProcess;

      let stdout = '';
      let stderr = '';
      let twoFAHandled = false; // Prevent double-triggering if data arrives in multiple chunks

      // Monitor stdout for 2FA request marker
      pythonProcess.stdout.on('data', (data) => {
        const output = data.toString();
        stdout += output; // Accumulate — detection uses full stdout so split chunks can't miss it
        console.log(`[Login Script STDOUT] ${output}`);

        // Forward every [DEBUG] line to the renderer DevTools console
        // so the user can see exactly what Python is doing without opening main-process logs
        output.split('\n').forEach((line) => {
          if (line.startsWith('[DEBUG]') || line.startsWith('[SUCCESS]') || line.startsWith('[ERROR]') || line.startsWith('[2FA_REQUEST]')) {
            this.mainWindow.webContents.send('automation:login-debug', { platformId, line: line.trim() });
          }
        });

        // Check for 2FA request marker using accumulated stdout (not just current chunk)
        // This prevents missing the marker when Python's output arrives in split chunks
        if (!twoFAHandled && (stdout.includes('[2FA_REQUEST]') || stdout.includes('Enter the OTP sent to your email'))) {
          twoFAHandled = true;
          console.log('[Login Script] 2FA request detected — sending modal prompt to renderer');

          // Send 2FA request to frontend
          this.mainWindow.webContents.send('automation:2fa-request', {
            platformId,
            message: 'HubSpot has sent a 2FA code to your email. Please enter it below.',
          });

          // Wait for token from frontend
          this.waitFor2FAToken().then((token) => {
            if (token) {
              if (pythonProcess.stdin.writable) {
                console.log('[Login Script] Writing 2FA token to Python stdin');
                pythonProcess.stdin.write(token + '\n');
              } else {
                console.error('[Login Script] Cannot write 2FA token — stdin is not writable (process may have exited)');
                reject(new Error('2FA token submission failed: browser session closed unexpectedly'));
              }
            } else {
              console.error('[Login Script] Received empty 2FA token');
              reject(new Error('2FA token was empty'));
            }
          }).catch((error) => {
            console.error('[Login Script] Error waiting for 2FA token:', error);
            pythonProcess.kill();
            reject(new Error('2FA token input cancelled or timed out'));
          });
        }
      });

      pythonProcess.stderr.on('data', (data) => {
        const error = data.toString();
        stderr += error;
        console.error(`[Login Script Error] ${error}`);
        // Also log to stdout for visibility
        console.log(`[STDERR] ${error}`);
      });

      pythonProcess.on('close', (code) => {
        this.currentProcess = null;
        console.log(`[Login Script] Process exited with code: ${code}`);
        console.log(`[Login Script] STDOUT: ${stdout}`);
        console.log(`[Login Script] STDERR: ${stderr}`);
        
        if (code === 0) {
          resolve({ success: true, stdout, stderr });
        } else {
          // Extract user-friendly error message from stderr
          let errorMessage = 'Login failed';
          
          // Check for specific error patterns
          if (stderr.includes('ERROR: Chrome/Chromium not found') || stderr.includes('Chrome path found but file doesn\'t exist')) {
            errorMessage = 'Chrome is not installed or not found. Please install Google Chrome from https://www.google.com/chrome/';
          } else if (stderr.includes('WebSocketBadStatusException') || stderr.includes('Handshake status 404')) {
            errorMessage = 'Failed to start browser. Please make sure Chrome/Chromium is installed and try again.';
          } else if (stderr.includes('Failed to launch browser')) {
            // Extract the actual error message from the Python script
            const errorMatch = stderr.match(/Failed to launch browser[^\n]*:?\s*([^\n]+)/i);
            if (errorMatch && errorMatch[1]) {
              errorMessage = `Browser failed to start: ${errorMatch[1].trim()}`;
            } else {
              errorMessage = 'Browser failed to start. Please check if Chrome is installed and accessible.';
            }
          } else if (stderr.includes('No 2FA token provided')) {
            errorMessage = '2FA token is required but was not provided.';
          } else if (stderr.includes('Login failed')) {
            errorMessage = 'Login failed. Please check your email and password.';
          } else if (stderr) {
            // Try to extract a meaningful error from stderr
            const lines = stderr.split('\n');
            const errorLine = lines.find(line => 
              line.includes('ERROR:') || 
              line.includes('Error:') || 
              line.includes('Failed') || 
              line.includes('Exception')
            );
            if (errorLine) {
              // Clean up the error message
              errorMessage = errorLine
                .replace(/^.*?(ERROR|Error)[:\s]+/i, '')
                .replace(/file:.*$/i, '')
                .trim();
              if (!errorMessage || errorMessage.length < 5) {
                errorMessage = 'Login failed. Please check the console for details.';
              }
            }
          }
          
          // If we still don't have a good error message, use stderr
          if (errorMessage === 'Login failed' && stderr.trim()) {
            // Get first meaningful line from stderr
            const firstErrorLine = stderr.split('\n').find(line => line.trim().length > 10);
            if (firstErrorLine) {
              errorMessage = firstErrorLine.trim().substring(0, 200); // Limit length
            }
          }
          
          console.error(`[Login Script] Final error message: ${errorMessage}`);
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
      
      // Set timeout (5 minutes)
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
      console.log('[Login Script] submit2FAToken called — resolving tokenResolver with token');
      this.tokenResolver.resolve(token);
      this.tokenResolver = null;
      return true;
    }
    console.error('[Login Script] submit2FAToken called but tokenResolver is null — no active 2FA request waiting');
    return false;
  }

  cancel() {
    console.log('[Login Script] cancel() called —', new Error('cancel trace').stack);
    if (this.currentProcess) {
      console.log('[Login Script] Killing Python process from cancel()');
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

