
const { BrowserManager } = require('../../../core/browserManager');
const SELECTORS = require('../selectors/selectors');

async function login(credentials, options = {}) {
  const { email, password } = credentials;
  const { onProgress } = options;

  onProgress?.('Initializing browser...');

  const browserManager = new BrowserManager();
  const browser = await browserManager.getBrowser('linkedin');
  const page = await browser.newPage();

  try {
    onProgress?.('Navigating to LinkedIn...');

    await page.goto('https://www.linkedin.com/login', {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    await page.waitForSelector(SELECTORS.LOGIN.EMAIL_INPUT, { timeout: 10000 });

    onProgress?.('Entering credentials...');

    await page.type(SELECTORS.LOGIN.EMAIL_INPUT, email, { delay: randomDelay(50, 150) });
    await sleep(randomDelay(500, 1000));

    await page.type(SELECTORS.LOGIN.PASSWORD_INPUT, password, { delay: randomDelay(50, 150) });
    await sleep(randomDelay(500, 1000));

    onProgress?.('Submitting login...');

    await page.click(SELECTORS.LOGIN.SUBMIT_BUTTON);

    await Promise.race([
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }),
      page.waitForSelector(SELECTORS.LOGIN.ERROR_MESSAGE, { timeout: 10000 }).then(() => {
        throw new Error('Invalid credentials');
      }),
    ]);

    const needs2FA = await page.$(SELECTORS.LOGIN.TWO_FACTOR_INPUT);
    if (needs2FA) {
      throw new Error('Two-factor authentication required. Please complete 2FA manually.');
    }

    const securityChallenge = await page.$(SELECTORS.LOGIN.SECURITY_CHALLENGE);
    if (securityChallenge) {
      throw new Error('Security challenge detected. Please verify your account manually.');
    }

    await page.waitForSelector(SELECTORS.FEED.CONTAINER, { timeout: 15000 });

    onProgress?.('Login successful!');

    const cookies = await page.cookies();

    return {
      browser,
      page,
      cookies,
    };
  } catch (error) {

    await page.close().catch(() => {});
    throw error;
  }
}

async function logout(page) {
  try {
    await page.goto('https://www.linkedin.com/m/logout', {
      waitUntil: 'networkidle2',
    });
  } catch (error) {
    console.error('Logout error:', error.message);
  }
}

function randomDelay(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { login, logout };
