
const { BasePlatform } = require('../base');
const { login, logout } = require('./auth/login');
const { SessionManager } = require('./auth/sessionManager');
const { commentOnPost } = require('./actions/commentOnPost');
const { sendConnectionRequest } = require('./actions/sendConnectionRequest');
const { sendMessage } = require('./actions/sendMessage');
const { likePost } = require('./actions/likePost');
const { viewProfile } = require('./actions/viewProfile');

class LinkedInPlatform extends BasePlatform {
  constructor() {
    super({
      id: 'linkedin',
      name: 'LinkedIn',
      type: 'browser',
      icon: 'linkedin.png',
    });

    this.sessionManager = new SessionManager('linkedin');
    this.page = null;
  }

  async connect(credentials) {
    this.validateParams(credentials, ['email', 'password']);

    try {
      this.log('connect', 'Attempting to connect...');

      const hasSession = await this.sessionManager.hasValidSession();
      if (hasSession) {
        this.log('connect', 'Restoring existing session...');
        const restored = await this.sessionManager.restoreSession();
        if (restored) {
          this.setConnected(true, { email: credentials.email });
          return;
        }
      }

      const result = await login(credentials, {
        onProgress: (msg) => this.log('connect', msg),
      });

      await this.sessionManager.saveSession(result.cookies);

      this.page = result.page;
      this.browser = result.browser;
      this.setConnected(true, { email: credentials.email });

      this.log('connect', 'Successfully connected to LinkedIn');
    } catch (error) {
      this.log('connect', 'Connection failed', { error: error.message });
      throw error;
    }
  }

  async disconnect() {
    try {
      if (this.page) {
        await logout(this.page);
      }

      if (this.browser) {
        await this.browser.close();
      }

      this.page = null;
      this.browser = null;
      this.setConnected(false);

      this.log('disconnect', 'Disconnected from LinkedIn');
    } catch (error) {
      this.log('disconnect', 'Disconnect error', { error: error.message });

      this.setConnected(false);
    }
  }

  async executeAction(action, params, options = {}) {

    if (!this.isConnected) {
      throw new Error('Not connected to LinkedIn');
    }

    await this.humanDelay();

    const actions = {
      'comment_on_post': () => commentOnPost(this.page, params, options),
      'send_connection_request': () => sendConnectionRequest(this.page, params, options),
      'send_message': () => sendMessage(this.page, params, options),
      'like_post': () => likePost(this.page, params, options),
      'view_profile': () => viewProfile(this.page, params, options),
    };

    const handler = actions[action];
    if (!handler) {
      throw new Error(`Unknown action: ${action}`);
    }

    this.log('executeAction', `Executing ${action}`, params);
    return handler();
  }

  getAvailableActions() {
    return [
      {
        id: 'comment_on_post',
        name: 'Comment on Post',
        description: 'Leave a comment on a LinkedIn post',
        params: [
          { name: 'postUrl', type: 'string', required: true, description: 'URL of the post' },
          { name: 'comment', type: 'string', required: true, description: 'Comment text' },
        ],
      },
      {
        id: 'send_connection_request',
        name: 'Send Connection Request',
        description: 'Send a connection request to a user',
        params: [
          { name: 'profileUrl', type: 'string', required: true, description: 'URL of the profile' },
          { name: 'message', type: 'string', required: false, description: 'Optional connection note' },
        ],
      },
      {
        id: 'send_message',
        name: 'Send Message',
        description: 'Send a direct message to a connection',
        params: [
          { name: 'profileUrl', type: 'string', required: true, description: 'URL of the profile' },
          { name: 'message', type: 'string', required: true, description: 'Message text' },
        ],
      },
      {
        id: 'like_post',
        name: 'Like Post',
        description: 'Like a LinkedIn post',
        params: [
          { name: 'postUrl', type: 'string', required: true, description: 'URL of the post' },
        ],
      },
      {
        id: 'view_profile',
        name: 'View Profile',
        description: 'View a user profile (they will see you visited)',
        params: [
          { name: 'profileUrl', type: 'string', required: true, description: 'URL of the profile' },
        ],
      },
    ];
  }
}

module.exports = { LinkedInPlatform };
