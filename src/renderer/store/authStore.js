import { create } from 'zustand';
import { authAPI, emailVerificationAPI, passwordResetAPI } from '../services/api';

const useAuthStore = create((set) => ({
  isAuthenticated: false,
  user: null,
  token: null,
  
  login: (userData, token = null) => {
    set({ 
      isAuthenticated: true, 
      user: userData,
      token: token || localStorage.getItem('omnis-reach-token'),
    });
  },
  
  logout: () => {
    authAPI.signout();
    set({ 
      isAuthenticated: false, 
      user: null,
      token: null,
    });
  },
  
  // Initialize auth state from localStorage
  initializeAuth: () => {
    const token = localStorage.getItem('omnis-reach-token');
    const userStr = localStorage.getItem('omnis-reach-user');
    
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        set({ 
          isAuthenticated: true, 
          user,
          token,
        });
      } catch (error) {
        console.error('Failed to parse user from localStorage:', error);
        localStorage.removeItem('omnis-reach-token');
        localStorage.removeItem('omnis-reach-user');
      }
    }
  },

  // Sign up a new user
  signup: async (name, email, password) => {
    try {
      const response = await authAPI.signup(name, email, password);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Sign in an existing user
  signin: async (email, password) => {
    try {
      const response = await authAPI.signin(email, password);
      
      if (response.success) {
        // Store user data and token
        const userData = {
          email: response.data.user.email,
          name: response.data.user.name,
          id: response.data.user.id,
        };
        
        // Store user in localStorage
        localStorage.setItem('omnis-reach-user', JSON.stringify(userData));
        
        // Update store
        set({ 
          isAuthenticated: true, 
          user: userData,
          token: response.data.token,
        });
      }
      
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Send OTP for email verification
  sendVerificationOTP: async (email, name) => {
    try {
      const response = await emailVerificationAPI.sendOTP(email, name);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Verify OTP for email verification
  verifyEmailOTP: async (email, otp) => {
    try {
      const response = await emailVerificationAPI.verifyOTP(email, otp);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Send OTP for password reset
  sendPasswordResetOTP: async (email) => {
    try {
      const response = await passwordResetAPI.sendPasswordResetOTP(email);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Verify OTP for password reset
  verifyPasswordResetOTP: async (email, otp) => {
    try {
      const response = await passwordResetAPI.verifyPasswordResetOTP(email, otp);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Reset password with OTP
  resetPassword: async (email, otp, password) => {
    try {
      const response = await passwordResetAPI.resetPassword(email, otp, password);
      return response;
    } catch (error) {
      throw error;
    }
  },
}));

export default useAuthStore;

