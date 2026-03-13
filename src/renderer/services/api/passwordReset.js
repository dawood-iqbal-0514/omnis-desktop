import { ApiService } from './client';

export const passwordResetAPI = {
  sendPasswordResetOTP: async (email) => {
    const api = new ApiService();
    return await api.post('/auth/password/forgot', {
      email,
    });
  },

  verifyPasswordResetOTP: async (email, otp) => {
    const api = new ApiService();
    return await api.post('/auth/password/verify-otp', {
      email,
      otp,
    });
  },

  resetPassword: async (email, otp, password) => {
    const api = new ApiService();
    return await api.post('/auth/password/reset', {
      email,
      otp,
      password,
    });
  },
};
