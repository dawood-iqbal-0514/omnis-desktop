import { ApiService } from './client';

export const authAPI = {
  signup: async (name, email, password) => {
    const api = new ApiService();
    const response = await api.post('/auth/signup', {
      name,
      email,
      password,
    });
    return response;
  },

  signin: async (email, password) => {
    const api = new ApiService();
    const response = await api.post('/auth/signin', {
      email,
      password,
    });
    if (response.success && response.data.token) {
      api.setToken(response.data.token);
    }
    return response;
  },

  signout: () => {
    const api = new ApiService();
    api.clearToken();
  },
};
