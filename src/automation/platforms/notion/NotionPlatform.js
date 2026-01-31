
const { BasePlatform } = require('../base');

class NotionPlatform extends BasePlatform {
  constructor() {
    super({
      id: 'notion',
      name: 'Notion',
      type: 'api',
      icon: 'notion.png',
    });

    this.apiKey = null;
    this.client = null;
  }

  async connect(credentials) {
    this.validateParams(credentials, ['apiKey']);

    try {
      this.log('connect', 'Validating API key...');

      this.apiKey = credentials.apiKey;
      this.setConnected(true, { apiKey: '***' + credentials.apiKey.slice(-4) });

      this.log('connect', 'Successfully connected to Notion');
    } catch (error) {
      this.log('connect', 'Connection failed', { error: error.message });
      throw error;
    }
  }

  async disconnect() {
    this.apiKey = null;
    this.client = null;
    this.setConnected(false);
    this.log('disconnect', 'Disconnected from Notion');
  }

  async executeAction(action, params, options = {}) {
    if (!this.isConnected) {
      throw new Error('Not connected to Notion');
    }

    const actions = {
      'create_page': () => this.createPage(params),
      'update_page': () => this.updatePage(params),
      'query_database': () => this.queryDatabase(params),
      'add_block': () => this.addBlock(params),
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
        id: 'create_page',
        name: 'Create Page',
        description: 'Create a new page in a Notion database',
        params: [
          { name: 'databaseId', type: 'string', required: true, description: 'Database ID' },
          { name: 'title', type: 'string', required: true, description: 'Page title' },
          { name: 'properties', type: 'object', required: false, description: 'Additional properties' },
        ],
      },
      {
        id: 'update_page',
        name: 'Update Page',
        description: 'Update an existing Notion page',
        params: [
          { name: 'pageId', type: 'string', required: true, description: 'Page ID' },
          { name: 'properties', type: 'object', required: true, description: 'Properties to update' },
        ],
      },
      {
        id: 'query_database',
        name: 'Query Database',
        description: 'Query a Notion database',
        params: [
          { name: 'databaseId', type: 'string', required: true, description: 'Database ID' },
          { name: 'filter', type: 'object', required: false, description: 'Query filter' },
          { name: 'sorts', type: 'array', required: false, description: 'Sort options' },
        ],
      },
      {
        id: 'add_block',
        name: 'Add Block',
        description: 'Add content block to a page',
        params: [
          { name: 'pageId', type: 'string', required: true, description: 'Page ID' },
          { name: 'content', type: 'string', required: true, description: 'Block content' },
          { name: 'type', type: 'string', required: false, description: 'Block type (paragraph, heading, etc.)' },
        ],
      },
    ];
  }

  async createPage(params) {

    this.log('createPage', 'Creating page...', params);
    return { success: true, pageId: 'mock-page-id' };
  }

  async updatePage(params) {

    this.log('updatePage', 'Updating page...', params);
    return { success: true };
  }

  async queryDatabase(params) {

    this.log('queryDatabase', 'Querying database...', params);
    return { success: true, results: [] };
  }

  async addBlock(params) {

    this.log('addBlock', 'Adding block...', params);
    return { success: true };
  }
}

module.exports = { NotionPlatform };
