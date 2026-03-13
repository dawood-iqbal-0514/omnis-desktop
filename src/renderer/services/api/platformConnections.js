import { ApiService } from './client';

export const platformAPI = {
  getPlatformConfig: async () => {
    const api = new ApiService();
    return await api.get('/platforms/config');
  },

  getUserPlatforms: async (platform = null) => {
    const api = new ApiService();
    const url = platform
      ? `/platforms/connections?platform=${platform}`
      : '/platforms/connections';
    return await api.get(url);
  },

  saveConnection: async (platform, credentials) => {
    const api = new ApiService();
    return await api.post('/platforms/connections', {
      platform,
      credentials,
    });
  },

  updateConnectionStatus: async (platform, isConnected, isLoggedIn) => {
    const api = new ApiService();
    return await api.request(`/platforms/connections/${platform}/status`, {
      method: 'PATCH',
      body: JSON.stringify({
        isConnected,
        isLoggedIn,
      }),
    });
  },

  disconnectPlatform: async (platform) => {
    const api = new ApiService();
    return await api.post(`/platforms/connections/${platform}/disconnect`);
  },

  getConnectionCredentials: async (platform) => {
    const api = new ApiService();
    return await api.get(`/platforms/connections/${platform}/credentials`);
  },
};
