const { spawn } = require('child_process');
const path = require('path');
const { app } = require('electron');

class AutomationScriptExecutor {
  constructor(mainWindow) {
    this.mainWindow = mainWindow;
    this.currentProcess = null;
    this.pendingAIResponse = null;
    this.responseResolver = null;
  }

  async executeScript(platformId, scriptName, parameters = {}) {
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
            scriptName
          )
        : path.join(
            process.resourcesPath,
            'app.asar',
            'src',
            'automation',
            'platforms',
            platformId,
            scriptName
          );

      // Get profile path for browser
      const { paths } = require('../utils/paths');
      const profilePath = path.join(paths.userData(), 'OmnisReach_Profiles', platformId, 'default');

      // Create Python process with stdin/stdout
      const pythonProcess = spawn('python', [scriptPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          HUBSPOT_PROFILE_PATH: profilePath,
          AUTOMATION_PARAMS: JSON.stringify(parameters || {}),
        },
      });

      this.currentProcess = pythonProcess;

      let stdout = '';
      let stderr = '';

      // Monitor stdout for HubSpot AI question marker
      pythonProcess.stdout.on('data', (data) => {
        const output = data.toString();
        stdout += output;
        console.log(`[Automation Script STDOUT] ${output}`);

        // Check for HubSpot AI question marker
        if (output.includes('[HUBSPOT_AI_QUESTION]')) {
          // Extract question from output
          const questionMatch = output.match(/\[HUBSPOT_AI_QUESTION\](.*?)(?=\n|$)/s);
          const question = questionMatch ? questionMatch[1].trim() : 'HubSpot AI is asking a question.';

          // Send AI question request to frontend
          this.mainWindow.webContents.send('automation:hubspot-ai-question', {
            platformId,
            question,
          });

          // Wait for response from frontend
          this.waitForAIResponse().then((response) => {
            if (response && pythonProcess.stdin.writable) {
              pythonProcess.stdin.write(response + '\n');
            }
          }).catch((error) => {
            console.error('Error getting AI response:', error);
            pythonProcess.kill();
            reject(new Error('HubSpot AI response input cancelled or failed'));
          });
        }
      });

      pythonProcess.stderr.on('data', (data) => {
        const error = data.toString();
        stderr += error;
        console.error(`[Automation Script Error] ${error}`);
        console.log(`[STDERR] ${error}`);
      });

      pythonProcess.on('close', (code) => {
        this.currentProcess = null;
        console.log(`[Automation Script] Process exited with code: ${code}`);
        console.log(`[Automation Script] STDOUT: ${stdout}`);
        console.log(`[Automation Script] STDERR: ${stderr}`);
        
        if (code === 0) {
          resolve({ success: true, stdout, stderr });
        } else {
          // Extract user-friendly error message
          let errorMessage = 'Script execution failed';

          // First: check stdout for [ERROR] marker (our scripts output errors here)
          const errorMarkerMatch = stdout.match(/\[ERROR\](.+?)(?:\n|$)/s);
          if (errorMarkerMatch && errorMarkerMatch[1].trim().length > 5) {
            errorMessage = errorMarkerMatch[1].trim();
          }
          // Second: check stderr for ERROR:/Exception lines
          else if (stderr) {
            const lines = stderr.split('\n');
            const errorLine = lines.find(line =>
              line.includes('ERROR:') ||
              line.includes('Error:') ||
              line.includes('Failed') ||
              line.includes('Exception')
            );
            if (errorLine) {
              errorMessage = errorLine
                .replace(/^.*?(ERROR|Error)[:\s]+/i, '')
                .replace(/file:.*$/i, '')
                .trim();
              if (!errorMessage || errorMessage.length < 5) {
                errorMessage = 'Script execution failed. Please check the console for details.';
              }
            }
          }

          console.error(`[Automation Script] Final error message: ${errorMessage}`);
          reject(new Error(errorMessage));
        }
      });

      pythonProcess.on('error', (error) => {
        this.currentProcess = null;
        reject(new Error(`Failed to start automation script: ${error.message}`));
      });
    });
  }

  async waitForAIResponse() {
    return new Promise((resolve, reject) => {
      this.responseResolver = { resolve, reject };
      
      // Set timeout (10 minutes for AI conversations)
      setTimeout(() => {
        if (this.responseResolver) {
          this.responseResolver.reject(new Error('HubSpot AI response request timeout'));
          this.responseResolver = null;
        }
      }, 10 * 60 * 1000);
    });
  }

  submitAIResponse(response) {
    if (this.responseResolver) {
      this.responseResolver.resolve(response);
      this.responseResolver = null;
      return true;
    }
    return false;
  }

  cancel() {
    if (this.currentProcess) {
      this.currentProcess.kill();
      this.currentProcess = null;
    }
    if (this.responseResolver) {
      this.responseResolver.reject(new Error('Script cancelled'));
      this.responseResolver = null;
    }
  }
}

module.exports = { AutomationScriptExecutor };

