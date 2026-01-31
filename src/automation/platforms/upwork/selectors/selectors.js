
const SELECTORS = {

  LOGIN: {
    EMAIL_INPUT: '#login_username',
    CONTINUE_BUTTON: '#login_password_continue',
    PASSWORD_INPUT: '#login_password',
    SUBMIT_BUTTON: '#login_control_continue',
    ERROR_MESSAGE: '.air3-alert-error',
  },

  NAV: {
    FIND_WORK: '[data-test="nav-find-work"]',
    MY_JOBS: '[data-test="nav-my-jobs"]',
    REPORTS: '[data-test="nav-reports"]',
    MESSAGES: '[data-test="nav-messages"]',
  },

  SEARCH: {
    INPUT: 'input[placeholder*="Search"]',
    SUBMIT: 'button[type="submit"]',
    RESULTS: '.job-tile',
    JOB_TITLE: '.job-tile-title',
    JOB_DESCRIPTION: '.job-tile-description',
  },

  JOB: {
    APPLY_BUTTON: '[data-test="apply-now"]',
    TITLE: '.job-details-title',
    DESCRIPTION: '.job-details-description',
    BUDGET: '.job-details-budget',
    SKILLS: '.job-details-skills',
  },

  PROPOSAL: {
    COVER_LETTER: 'textarea[name="coverLetter"]',
    RATE_INPUT: 'input[name="rate"]',
    SUBMIT_BUTTON: 'button[type="submit"]',
  },
};

module.exports = SELECTORS;
