
const SELECTORS = require('../selectors/selectors');
const { randomDelay, sleep } = require('../utils/helpers');

async function sendMessage(page, params, options = {}) {
  const { profileUrl, message } = params;
  const { onProgress } = options;

  onProgress?.({ status: 'navigating', message: 'Opening profile...' });

  await page.goto(profileUrl, {
    waitUntil: 'networkidle2',
    timeout: 30000,
  });

  await page.waitForSelector(SELECTORS.PROFILE.CONTAINER, { timeout: 10000 });
  await sleep(randomDelay(1000, 2000));

  onProgress?.({ status: 'checking', message: 'Looking for message button...' });

  const messageButton = await page.$(SELECTORS.PROFILE.MESSAGE_BUTTON);
  if (!messageButton) {
    throw new Error('Message button not found. User may not be a connection.');
  }

  await messageButton.click();
  await sleep(randomDelay(1000, 2000));

  onProgress?.({ status: 'typing', message: 'Writing message...' });

  await page.waitForSelector(SELECTORS.MESSAGING.MESSAGE_INPUT, { timeout: 10000 });

  await page.click(SELECTORS.MESSAGING.MESSAGE_INPUT);
  await page.type(SELECTORS.MESSAGING.MESSAGE_INPUT, message, { delay: randomDelay(30, 80) });
  await sleep(randomDelay(500, 1000));

  onProgress?.({ status: 'sending', message: 'Sending message...' });

  await page.click(SELECTORS.MESSAGING.SEND_BUTTON);
  await sleep(randomDelay(1000, 2000));

  onProgress?.({ status: 'completed', message: 'Message sent!' });

  return {
    success: true,
    profileUrl,
    messageLength: message.length,
    timestamp: new Date().toISOString(),
  };
}

module.exports = { sendMessage };
