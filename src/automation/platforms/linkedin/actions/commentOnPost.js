
const SELECTORS = require('../selectors/selectors');
const { randomDelay, sleep } = require('../utils/helpers');

async function commentOnPost(page, params, options = {}) {
  const { postUrl, comment } = params;
  const { onProgress } = options;

  onProgress?.({ status: 'navigating', message: 'Opening post...' });

  await page.goto(postUrl, {
    waitUntil: 'networkidle2',
    timeout: 30000,
  });

  await page.waitForSelector(SELECTORS.POST.COMMENT_BUTTON, { timeout: 10000 });

  onProgress?.({ status: 'interacting', message: 'Opening comment box...' });

  await page.click(SELECTORS.POST.COMMENT_BUTTON);
  await sleep(randomDelay(500, 1000));

  await page.waitForSelector(SELECTORS.POST.COMMENT_INPUT, { timeout: 5000 });

  onProgress?.({ status: 'typing', message: 'Writing comment...' });

  await page.type(SELECTORS.POST.COMMENT_INPUT, comment, { delay: randomDelay(30, 100) });
  await sleep(randomDelay(500, 1500));

  onProgress?.({ status: 'submitting', message: 'Posting comment...' });

  await page.click(SELECTORS.POST.COMMENT_SUBMIT);

  await sleep(randomDelay(1000, 2000));

  onProgress?.({ status: 'completed', message: 'Comment posted successfully!' });

  return {
    success: true,
    postUrl,
    comment,
    timestamp: new Date().toISOString(),
  };
}

module.exports = { commentOnPost };
