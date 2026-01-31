
const SELECTORS = require('../selectors/selectors');
const { randomDelay, sleep } = require('../utils/helpers');

async function viewProfile(page, params, options = {}) {
  const { profileUrl } = params;
  const { onProgress } = options;

  onProgress?.({ status: 'navigating', message: 'Opening profile...' });

  await page.goto(profileUrl, {
    waitUntil: 'networkidle2',
    timeout: 30000,
  });

  await page.waitForSelector(SELECTORS.PROFILE.CONTAINER, { timeout: 10000 });

  onProgress?.({ status: 'viewing', message: 'Viewing profile...' });

  await page.evaluate(async () => {
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    for (let i = 0; i < 3; i++) {
      window.scrollBy(0, 300);
      await delay(500 + Math.random() * 500);
    }
  });

  await sleep(randomDelay(2000, 4000));

  const profileData = await page.evaluate((sel) => {
    const name = document.querySelector(sel.PROFILE.NAME)?.textContent?.trim();
    const headline = document.querySelector(sel.PROFILE.HEADLINE)?.textContent?.trim();

    return { name, headline };
  }, SELECTORS);

  onProgress?.({ status: 'completed', message: 'Profile viewed!' });

  return {
    success: true,
    profileUrl,
    profileData,
    timestamp: new Date().toISOString(),
  };
}

module.exports = { viewProfile };
