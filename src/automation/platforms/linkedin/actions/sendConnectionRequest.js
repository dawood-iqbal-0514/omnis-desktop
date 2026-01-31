
const SELECTORS = require('../selectors/selectors');
const { randomDelay, sleep } = require('../utils/helpers');

async function sendConnectionRequest(page, params, options = {}) {
  const { profileUrl, message } = params;
  const { onProgress } = options;

  onProgress?.({ status: 'navigating', message: 'Opening profile...' });

  await page.goto(profileUrl, {
    waitUntil: 'networkidle2',
    timeout: 30000,
  });

  await page.waitForSelector(SELECTORS.PROFILE.CONTAINER, { timeout: 10000 });
  await sleep(randomDelay(1000, 2000));

  onProgress?.({ status: 'checking', message: 'Looking for connect button...' });

  const messageButton = await page.$(SELECTORS.PROFILE.MESSAGE_BUTTON);
  if (messageButton) {
    return {
      success: false,
      reason: 'already_connected',
      message: 'Already connected to this user',
    };
  }

  const connectButton = await page.$(SELECTORS.PROFILE.CONNECT_BUTTON);
  if (!connectButton) {

    const moreButton = await page.$(SELECTORS.PROFILE.MORE_BUTTON);
    if (moreButton) {
      await moreButton.click();
      await sleep(randomDelay(500, 1000));
    }
  }

  const finalConnectButton = await page.$(SELECTORS.PROFILE.CONNECT_BUTTON);
  if (!finalConnectButton) {
    throw new Error('Connect button not found');
  }

  await finalConnectButton.click();
  await sleep(randomDelay(500, 1000));

  await page.waitForSelector(SELECTORS.CONNECTION.MODAL, { timeout: 5000 });

  onProgress?.({ status: 'connecting', message: 'Sending request...' });

  if (message) {
    const addNoteButton = await page.$(SELECTORS.CONNECTION.ADD_NOTE_BUTTON);
    if (addNoteButton) {
      await addNoteButton.click();
      await sleep(randomDelay(500, 1000));

      await page.waitForSelector(SELECTORS.CONNECTION.NOTE_INPUT, { timeout: 5000 });
      await page.type(SELECTORS.CONNECTION.NOTE_INPUT, message, { delay: randomDelay(30, 80) });
      await sleep(randomDelay(500, 1000));
    }
  }

  await page.click(SELECTORS.CONNECTION.SEND_BUTTON);
  await sleep(randomDelay(1000, 2000));

  onProgress?.({ status: 'completed', message: 'Connection request sent!' });

  return {
    success: true,
    profileUrl,
    withMessage: !!message,
    timestamp: new Date().toISOString(),
  };
}

module.exports = { sendConnectionRequest };
