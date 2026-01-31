
const SELECTORS = {

  LOGIN: {
    EMAIL_INPUT: '#username',
    PASSWORD_INPUT: '#password',
    SUBMIT_BUTTON: 'button[type="submit"]',
    ERROR_MESSAGE: '#error-for-username, #error-for-password, .form__label--error',
    TWO_FACTOR_INPUT: '#input__phone_verification_pin',
    SECURITY_CHALLENGE: '.challenge-dialog',
  },

  NAV: {
    HOME: '[data-test-id="nav-home"]',
    NETWORK: '[data-test-id="nav-mynetwork"]',
    JOBS: '[data-test-id="nav-jobs"]',
    MESSAGING: '[data-test-id="nav-messaging"]',
    NOTIFICATIONS: '[data-test-id="nav-notifications"]',
    PROFILE_MENU: '[data-test-id="nav-menu-profile"]',
    SEARCH: '.search-global-typeahead__input',
  },

  FEED: {
    CONTAINER: '.feed-shared-update-v2, .scaffold-finite-scroll',
    POST: '.feed-shared-update-v2',
    POST_CONTENT: '.feed-shared-update-v2__description',
    POST_AUTHOR: '.update-components-actor__title',
    POST_TIME: '.update-components-actor__sub-description',
  },

  POST: {
    LIKE_BUTTON: 'button[aria-label*="Like"], .react-button__trigger',
    COMMENT_BUTTON: 'button[aria-label*="Comment"]',
    SHARE_BUTTON: 'button[aria-label*="Share"]',
    COMMENT_INPUT: '.comments-comment-box__form textarea, .ql-editor',
    COMMENT_SUBMIT: 'button.comments-comment-box__submit-button',
    COMMENTS_SECTION: '.comments-comments-list',
    SINGLE_COMMENT: '.comments-comment-item',
  },

  PROFILE: {
    CONTAINER: '.scaffold-layout__main',
    NAME: 'h1.text-heading-xlarge',
    HEADLINE: '.text-body-medium',
    CONNECT_BUTTON: 'button[aria-label*="Connect"], button.pvs-profile-actions__action',
    MESSAGE_BUTTON: 'button[aria-label*="Message"]',
    FOLLOW_BUTTON: 'button[aria-label*="Follow"]',
    MORE_BUTTON: 'button[aria-label*="More actions"]',
  },

  CONNECTION: {
    ADD_NOTE_BUTTON: 'button[aria-label*="Add a note"]',
    NOTE_INPUT: 'textarea#custom-message',
    SEND_BUTTON: 'button[aria-label*="Send"], button.artdeco-button--primary',
    MODAL: '.artdeco-modal',
    CLOSE_MODAL: 'button[aria-label="Dismiss"]',
  },

  MESSAGING: {
    CONTAINER: '.msg-overlay-list-bubble',
    NEW_MESSAGE_BUTTON: '.msg-overlay-bubble-header__button',
    SEARCH_INPUT: '.msg-search-form__typeahead-input',
    CONVERSATION: '.msg-conversation-card',
    MESSAGE_INPUT: '.msg-form__contenteditable',
    SEND_BUTTON: 'button.msg-form__send-button',
    ATTACHMENT_BUTTON: 'button[aria-label*="Attach"]',
  },

  SEARCH: {
    INPUT: '.search-global-typeahead__input',
    RESULTS: '.search-results-container',
    RESULT_ITEM: '.entity-result',
    PEOPLE_FILTER: 'button[aria-label*="People"]',
    POSTS_FILTER: 'button[aria-label*="Posts"]',
  },
};

module.exports = SELECTORS;
