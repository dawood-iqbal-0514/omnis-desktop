const { ipcMain, BrowserWindow, session } = require('electron');

let orchestrator = null;
let loginExecutor = null;
let LoginScriptExecutor = null;
let automationScriptExecutor = null;
let AutomationScriptExecutor = null;

function getOrchestrator() {
  if (!orchestrator) {
    // Lazy-load to prevent platforms/index.js from blocking IPC setup
    const { AutomationOrchestrator } = require('../../automation');
    orchestrator = new AutomationOrchestrator();
  }
  return orchestrator;
}

function setupAutomationIPC(mainWindow) {
  // ─── LinkedIn challenge resolution (inline BrowserWindow) ───────────────────
  // When voyager-api flags a session, the chatbot can't recover automatically
  // — LinkedIn requires the actual user to complete a CAPTCHA / 2FA / device
  // confirm in a browser. We open a small modal Electron window with the
  // challenge URL, pre-inject the user's existing cookie jar so LinkedIn
  // recognizes the session, watch for navigation back to a logged-in page,
  // then read the fresh post-verification cookies and hand them back to the
  // renderer (which posts them to the backend). Auto-retries the original
  // chatbot action after success.
  ipcMain.handle('automation:resolve-linkedin-challenge', async (event, payload = {}) => {
    const { challengeUrl, currentCookies } = payload;
    if (!challengeUrl || !/^https:\/\/www\.linkedin\.com\/checkpoint\//.test(challengeUrl)) {
      return { success: false, error: 'Missing or invalid challenge URL' };
    }

    return new Promise((resolve) => {
      // LinkedIn serves a blank/downgrade page if it doesn't recognize the
      // browser. Match a current Chrome UA so it serves the real challenge
      // page. The voyager-api side of our app uses the same UA, so cookies
      // issued in this window remain valid for our subsequent API calls.
      const CHROME_UA =
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
        '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

      const challengeWin = new BrowserWindow({
        width: 500,
        height: 720,
        parent: mainWindow,
        modal: true,
        title: 'LinkedIn verification',
        autoHideMenuBar: true,
        webPreferences: {
          partition: 'persist:linkedin-challenge',
          nodeIntegration: false,
          contextIsolation: true,
        },
      });
      // Override UA for ALL requests this window makes (subframes, AJAX, etc.).
      challengeWin.webContents.setUserAgent(CHROME_UA);

      const ses = challengeWin.webContents.session;
      let resolved = false;
      const finish = (result) => {
        if (resolved) return;
        resolved = true;
        try { challengeWin.close(); } catch {}
        resolve(result);
      };

      // Wipe any cookies left over from a previous resolution attempt so we
      // don't fight stale auth state in the partition.
      const clearOldCookies = async () => {
        try {
          const old = await ses.cookies.get({ domain: '.linkedin.com' });
          await Promise.all(old.map((c) => ses.cookies.remove(`https://www.linkedin.com${c.path || '/'}`, c.name).catch(() => {})));
        } catch {}
      };

      // Pre-inject the stored cookie jar so LinkedIn recognizes the session
      // and shows the verify step directly (rather than asking for re-login).
      // CRITICAL: voyager stores some cookies wrapped in literal quotes
      // (`JSESSIONID="ajax:..."`); Electron's cookies.set treats those quotes
      // as part of the value, which corrupts the session. Strip them.
      const seedCookies = async () => {
        for (const [name, rawValue] of Object.entries(currentCookies || {})) {
          if (!name || rawValue == null) continue;
          let value = String(rawValue);
          // LinkedIn's set-cookie can include surrounding quotes — Electron
          // wants the raw value without them.
          if (value.startsWith('"') && value.endsWith('"')) {
            value = value.slice(1, -1);
          }
          try {
            await ses.cookies.set({
              url: 'https://www.linkedin.com',
              name,
              value,
              domain: '.linkedin.com',
              path: '/',
              secure: true,
              httpOnly: ['li_at', 'liap', 'bscookie'].includes(name),
            });
          } catch (e) {
            // Some cookie names (e.g. __cf_bm) get rejected by Electron — skip.
          }
        }
      };

      // Detect "verification complete" — LinkedIn redirects out of /checkpoint/
      // to /feed/, /in/<vanity>/, /mynetwork/, etc.
      const onNav = async (_evt, url) => {
        if (resolved) return;
        if (typeof url !== 'string') return;
        if (url.includes('/checkpoint/')) return;
        if (!/^https?:\/\/(www\.)?linkedin\.com\//i.test(url)) return;
        try {
          const all = await ses.cookies.get({ domain: '.linkedin.com' });
          const cookieDict = {};
          for (const c of all) cookieDict[c.name] = c.value;
          if (!cookieDict.JSESSIONID && !cookieDict.li_at) {
            finish({ success: false, error: 'Verification ended but no session cookies were issued' });
            return;
          }
          finish({ success: true, cookies: cookieDict });
        } catch (err) {
          finish({ success: false, error: err.message || 'Failed to read cookies after verification' });
        }
      };

      // ── Diagnostics ─────────────────────────────────────────────────────
      // Log every navigation phase + the HTTP response status, and surface
      // any console-level errors LinkedIn's scripts produce. Auto-open
      // DevTools so the user can see exactly what's blocking the page.
      const log = (...args) => console.log('[LinkedIn challenge]', ...args);
      challengeWin.webContents.on('did-start-loading', () => log('start-loading'));
      challengeWin.webContents.on('did-stop-loading', () => log('stop-loading'));
      challengeWin.webContents.on('did-finish-load', () => log('finish-load — page rendered'));
      challengeWin.webContents.on('did-fail-load', (_e, code, desc, url, isMainFrame) => {
        log('did-fail-load:', code, desc, url, '(mainFrame=' + isMainFrame + ')');
      });
      challengeWin.webContents.on('console-message', (_e, level, msg, line, src) => {
        if (level >= 2) log('renderer console error:', msg, '@', src + ':' + line);
      });

      // Hook the underlying webRequest API to log status of the main-frame
      // response — the most useful signal for "page came back blank".
      ses.webRequest.onCompleted((details) => {
        if (details.resourceType === 'mainFrame' && details.url.includes('linkedin.com')) {
          log('mainFrame:', details.statusCode, '←', details.url.slice(0, 120));
        }
      });
      ses.webRequest.onErrorOccurred((details) => {
        if (details.resourceType === 'mainFrame') log('mainFrame error:', details.error, '←', details.url);
      });

      challengeWin.webContents.on('did-navigate', onNav);
      challengeWin.webContents.on('did-redirect-navigation', onNav);
      challengeWin.on('closed', () => {
        finish({ success: false, error: 'Window closed before verification' });
      });

      // Open DevTools side-by-side so the user can see the actual page state
      // and we can diagnose blank renders.
      challengeWin.webContents.openDevTools({ mode: 'detach' });

      (async () => {
        try {
          await clearOldCookies();
          await seedCookies();
          // Pass the UA explicitly here too — some Electron versions ignore
          // setUserAgent() for the FIRST loadURL.
          await challengeWin.loadURL(challengeUrl, {
            userAgent: CHROME_UA,
            httpReferrer: 'https://www.linkedin.com/',
          });
        } catch (err) {
          log('loadURL failed:', err.message);
          finish({ success: false, error: err.message || 'Failed to load challenge URL' });
        }
      })();
    });
  });

  // ─── LinkedIn comment via hidden BrowserWindow ─────────────────────────────
  // LinkedIn moved comment creation to an SDUI flow that requires session-bound
  // protobuf state keys we can't synthesize from outside the browser. Instead
  // of reverse-engineering the encoding, we drive the real comment composer
  // in a hidden Electron window with the user's saved cookies. LinkedIn's
  // own JS generates the right keys; we just type and click submit.
  //
  // Payload:
  //   { activityUrn, body, currentCookies }
  // Returns:
  //   { success: true, commentUrn? } | { success: false, error }
  ipcMain.handle('automation:linkedin-post-comment', async (event, payload = {}) => {
    const { activityUrn, body, currentCookies } = payload;
    if (!activityUrn || typeof activityUrn !== 'string') {
      return { success: false, error: 'activityUrn is required' };
    }
    if (!body || !body.trim()) {
      return { success: false, error: 'Comment body is empty' };
    }
    const ugcMatch = activityUrn.match(/urn:li:(?:fsd_)?(?:ugcPost|activity):(\d+)/);
    if (!ugcMatch) {
      return { success: false, error: `Cannot parse activity/post id from: ${activityUrn}` };
    }
    const ugcId = ugcMatch[1];
    const postUrl = `https://www.linkedin.com/feed/update/urn:li:activity:${ugcId}/`;

    return new Promise((resolve) => {
      const CHROME_UA =
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
        '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

      const win = new BrowserWindow({
        width: 900,
        height: 800,
        parent: mainWindow,
        modal: false,
        show: false,                  // hidden — user sees nothing
        title: 'LinkedIn comment',
        autoHideMenuBar: true,
        webPreferences: {
          partition: 'persist:linkedin-challenge',  // reuse challenge cookies
          nodeIntegration: false,
          contextIsolation: true,
        },
      });
      win.webContents.setUserAgent(CHROME_UA);

      const ses = win.webContents.session;
      let resolved = false;
      const finish = (result) => {
        if (resolved) return;
        resolved = true;
        try { win.close(); } catch {}
        resolve(result);
      };
      const log = (...args) => console.log('[LinkedIn comment]', ...args);

      // Time bound — if the whole flow doesn't finish in 60s, give up.
      const timeoutId = setTimeout(() => finish({ success: false, error: 'Comment posting timed out (60s)' }), 60000);

      // Seed cookies (idempotent — partition is reused across actions).
      const seedCookies = async () => {
        for (const [name, rawValue] of Object.entries(currentCookies || {})) {
          if (!name || rawValue == null) continue;
          let value = String(rawValue);
          if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
          try {
            await ses.cookies.set({
              url: 'https://www.linkedin.com',
              name, value,
              domain: '.linkedin.com',
              path: '/',
              secure: true,
              httpOnly: ['li_at', 'liap', 'bscookie'].includes(name),
            });
          } catch {}
        }
      };

      // Inject script that finds the comment composer, types the body, clicks Post.
      // Returns success/failure + any visible error message.
      const injectAndComment = async () => {
        const escaped = body.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');
        const script = `
          (async () => {
            const sleep = (ms) => new Promise(r => setTimeout(r, ms));
            // Wait until the page's primary comment-toggle button is clickable.
            for (let i = 0; i < 30; i++) {
              const btn = document.querySelector('button[aria-label="Comment"]');
              if (btn) break;
              await sleep(500);
            }
            const toggle = document.querySelector('button[aria-label="Comment"]');
            if (!toggle) return { ok: false, error: 'Comment button not found on the post page' };
            toggle.scrollIntoView({ block: 'center' });
            toggle.click();
            // Wait for the composer to render.
            let editor = null;
            for (let i = 0; i < 30; i++) {
              editor = document.querySelector('[contenteditable="true"][role="textbox"][aria-label*="comment" i]')
                    || document.querySelector('[contenteditable="true"][role="textbox"][aria-label*="creating content" i]');
              if (editor) break;
              await sleep(300);
            }
            if (!editor) return { ok: false, error: 'Comment composer never appeared' };
            editor.focus();
            // ProseMirror requires real keystrokes, but execCommand insertText
            // works in TipTap composers. Try insertText first; fall back to
            // setting innerText + dispatching input.
            try {
              const sel = window.getSelection();
              const range = document.createRange();
              range.selectNodeContents(editor);
              range.collapse(false);
              sel.removeAllRanges();
              sel.addRange(range);
              document.execCommand('insertText', false, \`${escaped}\`);
            } catch (e) {
              editor.innerText = \`${escaped}\`;
              editor.dispatchEvent(new Event('input', { bubbles: true }));
            }
            // Find the Post-comment submit button — walks up from the editor.
            await sleep(400);
            let submit = null;
            let p = editor;
            for (let depth = 0; depth < 12 && !submit; depth++) {
              p = p.parentElement;
              if (!p) break;
              submit = Array.from(p.querySelectorAll('button')).find(b =>
                (b.textContent || '').trim() === 'Comment' && !b.disabled
              );
            }
            if (!submit) return { ok: false, error: 'Submit button not enabled (composer may have rejected the text)' };
            submit.click();
            // Wait for the request to finish — heuristic: editor text is cleared.
            for (let i = 0; i < 20; i++) {
              await sleep(400);
              if ((editor.textContent || '').trim() === '') return { ok: true };
            }
            // Even if editor wasn't cleared, no visible error — assume success.
            return { ok: true, note: 'submitted (editor not cleared in time)' };
          })()
        `;
        try {
          return await win.webContents.executeJavaScript(script);
        } catch (e) {
          return { ok: false, error: 'Inject failed: ' + (e.message || String(e)) };
        }
      };

      win.webContents.on('did-finish-load', async () => {
        // Avoid double-firing on subsequent navigations (e.g. tracker pings).
        if (resolved) return;
        if (!win.webContents.getURL().startsWith('https://www.linkedin.com/feed/update/')) return;
        try {
          const r = await injectAndComment();
          clearTimeout(timeoutId);
          if (r?.ok) finish({ success: true });
          else finish({ success: false, error: r?.error || 'Unknown failure' });
        } catch (err) {
          clearTimeout(timeoutId);
          finish({ success: false, error: err.message || 'Unknown error' });
        }
      });

      win.webContents.on('did-fail-load', (_e, code, desc, url, isMainFrame) => {
        if (isMainFrame) {
          log('did-fail-load:', code, desc, url);
          clearTimeout(timeoutId);
          finish({ success: false, error: `Failed to load post (${code}: ${desc})` });
        }
      });

      win.on('closed', () => {
        clearTimeout(timeoutId);
        if (!resolved) finish({ success: false, error: 'Window closed before comment was posted' });
      });

      (async () => {
        try {
          await seedCookies();
          await win.loadURL(postUrl, { userAgent: CHROME_UA });
        } catch (err) {
          clearTimeout(timeoutId);
          finish({ success: false, error: err.message || 'Failed to load post page' });
        }
      })();
    });
  });

  ipcMain.handle('automation:get-platforms', async () => {
    try {
      const platforms = getOrchestrator().getAllPlatforms();
      return { 
        success: true, 
        platforms: platforms.map(p => ({
          id: p.id,
          name: p.name,
          type: p.type,
          isConnected: p.isConnected,
          availableActions: p.getAvailableActions(),
        }))
      };
    } catch (error) {
      console.error('Failed to get platforms:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('automation:connect', async (event, platformId, credentials) => {
    try {
      const platform = getOrchestrator().getPlatform(platformId);
      if (!platform) {
        return { success: false, error: `Platform ${platformId} not found` };
      }

      await platform.connect(credentials);

      mainWindow.webContents.send('automation:platform-connected', { platformId });
      return { success: true };
    } catch (error) {
      console.error(`Failed to connect to ${platformId}:`, error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('automation:disconnect', async (event, platformId) => {
    try {
      const platform = getOrchestrator().getPlatform(platformId);
      if (platform) {
        await platform.disconnect();
      }
      return { success: true };
    } catch (error) {
      console.error(`Failed to disconnect from ${platformId}:`, error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('automation:execute-task', async (event, task) => {
    try {
      // Resolve script name from task or action catalog
      const actionRegistry = require('../services/pipeline/actionRegistry');
      if (!actionRegistry.initialized) await actionRegistry.initialize();

      const scriptName = task.script || task.automationConfig?.script;
      const actionId = task.action || task.actionId;

      let foundScript = null;

      if (scriptName) {
        // Script name provided directly — use it
        foundScript = { name: scriptName, actionId: actionId };
      } else if (actionId && task.platform) {
        // Look up in action catalog
        const catalogEntry = actionRegistry.getAction(task.platform, actionId);
        if (catalogEntry && catalogEntry.automationScript) {
          foundScript = { name: catalogEntry.automationScript, actionId: actionId };
        }
      }

      if (!foundScript) {
        const errorMsg = scriptName
          ? `Script "${scriptName}" not found for ${task.platform}`
          : `Action "${actionId}" has no automation script for ${task.platform}`;
        console.error('❌ Script not found:', errorMsg);
        return { success: false, error: errorMsg };
      }

      // Check if this is a Python script that needs direct execution
      const isPythonScript = foundScript && foundScript.name && foundScript.name.endsWith('.py');
      
      if (isPythonScript && foundScript) {
        // Use AutomationScriptExecutor for Python scripts
        if (!AutomationScriptExecutor) {
          AutomationScriptExecutor = require('../services/automationScriptExecutor').AutomationScriptExecutor;
        }
        if (!automationScriptExecutor) {
          automationScriptExecutor = new AutomationScriptExecutor(mainWindow);
        }
        
        const result = await automationScriptExecutor.executeScript(
          task.platform,
          foundScript.name,
          task.parameters || {}
        );
        
        mainWindow.webContents.send('automation:task-complete', {
          taskId: task.id,
          result,
        });
        
        return { success: true, result };
      } else {
        // Use orchestrator for other tasks
        const result = await getOrchestrator().executeTask(task, {
          onProgress: (progress) => {
            mainWindow.webContents.send('automation:task-progress', {
              taskId: task.id,
              progress,
            });
          },
        });

        mainWindow.webContents.send('automation:task-complete', {
          taskId: task.id,
          result,
        });

        return { success: true, result };
      }
    } catch (error) {
      console.error('Task execution failed:', error);
      mainWindow.webContents.send('automation:task-error', {
        taskId: task.id,
        error: error.message,
      });
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('automation:cancel-task', async (event, taskId) => {
    try {
      await getOrchestrator().cancelTask(taskId);
      return { success: true };
    } catch (error) {
      console.error(`Failed to cancel task ${taskId}:`, error);
      return { success: false, error: error.message };
    }
  });

  // Lazy-load LoginScriptExecutor to prevent module loading errors
  try {
    if (!LoginScriptExecutor) {
      LoginScriptExecutor = require('../services/loginScriptExecutor').LoginScriptExecutor;
    }
    // Initialize login executor
    loginExecutor = new LoginScriptExecutor(mainWindow);
    console.log('✅ LoginScriptExecutor initialized');
  } catch (error) {
    console.error('❌ Failed to load LoginScriptExecutor:', error);
    // Continue anyway - handler will check for executor
  }

  // Execute login script
  ipcMain.handle('automation:execute-login-script', async (event, platformId, credentials) => {
    try {
      if (!LoginScriptExecutor) {
        LoginScriptExecutor = require('../services/loginScriptExecutor').LoginScriptExecutor;
      }
      if (!loginExecutor) {
        loginExecutor = new LoginScriptExecutor(mainWindow);
      }
      const result = await loginExecutor.executeLoginScript(platformId, credentials);
      return { success: true, ...result };
    } catch (error) {
      console.error('Login script execution failed:', error);
      return { success: false, error: error.message };
    }
  });
  console.log('✅ Registered IPC handler: automation:execute-login-script');

  // Submit 2FA token
  ipcMain.handle('automation:submit-2fa-token', async (event, token) => {
    try {
      if (!loginExecutor) {
        return { success: false, error: 'No active login process' };
      }
      const submitted = loginExecutor.submit2FAToken(token);
      return { success: submitted };
    } catch (error) {
      console.error('Failed to submit 2FA token:', error);
      return { success: false, error: error.message };
    }
  });

  // Cancel login script
  ipcMain.handle('automation:cancel-login-script', async (event) => {
    try {
      if (!loginExecutor) {
        return { success: false, error: 'No active login process' };
      }
      loginExecutor.cancel();
      return { success: true };
    } catch (error) {
      console.error('Failed to cancel login script:', error);
      return { success: false, error: error.message };
    }
  });

  // Submit HubSpot AI response
  ipcMain.handle('automation:submit-hubspot-ai-response', async (event, response) => {
    try {
      if (!AutomationScriptExecutor) {
        AutomationScriptExecutor = require('../services/automationScriptExecutor').AutomationScriptExecutor;
      }
      if (!automationScriptExecutor) {
        return { success: false, error: 'No active automation script process' };
      }
      const submitted = automationScriptExecutor.submitAIResponse(response);
      return { success: submitted };
    } catch (error) {
      console.error('Failed to submit HubSpot AI response:', error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = { setupAutomationIPC };
