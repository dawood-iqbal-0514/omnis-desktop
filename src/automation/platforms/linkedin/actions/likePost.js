
const SELECTORS = require('../selectors/selectors');
const { randomDelay, sleep } = require('../utils/helpers');

async function likePost(page, params, options = {}) {
  const { postUrl } = params;
  const { onProgress } = options;

  onProgress?.({ status: 'navigating', message: 'Opening post...' });

  await page.goto(postUrl, {
    waitUntil: 'networkidle2',
    timeout: 30000,
  });

  await page.waitForSelector(SELECTORS.POST.LIKE_BUTTON, { timeout: 10000 });
  await sleep(randomDelay(1000, 2000));

  onProgress?.({ status: 'checking', message: 'Checking like status...' });

  const likeButton = await page.$(SELECTORS.POST.LIKE_BUTTON);
  const isLiked = await page.evaluate((btn) => {
    return btn.getAttribute('aria-pressed') === 'true' || 
           btn.classList.contains('react-button--active');
  }, likeButton);

  if (isLiked) {
    return {
      success: true,
      alreadyLiked: true,
      postUrl,
      message: 'Post was already liked',
    };
  }

  onProgress?.({ status: 'liking', message: 'Liking post...' });

  await likeButton.click();
  await sleep(randomDelay(500, 1000));

  onProgress?.({ status: 'completed', message: 'Post liked!' });

  return {
    success: true,
    alreadyLiked: false,
    postUrl,
    timestamp: new Date().toISOString(),
  };
}

module.exports = { likePost };
