
function randomDelay(min = 1000, max = 3000) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForElement(page, selector, options = {}) {
  const { timeout = 10000, retries = 3 } = options;

  for (let i = 0; i < retries; i++) {
    try {
      await page.waitForSelector(selector, { timeout: timeout / retries });
      return true;
    } catch (error) {
      if (i === retries - 1) throw error;
      await sleep(1000);
    }
  }
}

async function scrollIntoView(page, selector) {
  await page.evaluate((sel) => {
    const element = document.querySelector(sel);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, selector);
  await sleep(500);
}

function extractUsername(profileUrl) {
  const match = profileUrl.match(/linkedin\.com\/in\/([^\/\?]+)/);
  return match ? match[1] : null;
}

function isValidLinkedInUrl(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.includes('linkedin.com');
  } catch {
    return false;
  }
}

function getTypingDelay() {

  return randomDelay(30, 80);
}

module.exports = {
  randomDelay,
  sleep,
  waitForElement,
  scrollIntoView,
  extractUsername,
  isValidLinkedInUrl,
  getTypingDelay,
};
