import { ApiService } from './client';

export const emailVerificationAPI = {
  sendOTP: async (email, name) => {
    const api = new ApiService();
    return await api.post('/auth/email/send-otp', {
      email,
      name,
    });
  },

  verifyOTP: async (email, otp) => {
    const api = new ApiService();
    return await api.post('/auth/email/verify-otp', {
      email,
      otp,
    });
  },

  resendOTP: async (email, name) => {
    const api = new ApiService();
    return await api.post('/auth/email/resend-otp', {
      email,
      name,
    });
  },
};
