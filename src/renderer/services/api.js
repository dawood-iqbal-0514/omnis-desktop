const API_BASE_URL = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:4000/api';

/**
 * API service for making HTTP requests
 */
class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.token = null;
  }

  /**
   * Set authentication token
   */
  setToken(token) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('omnis-reach-token', token);
    }
  }

  /**
   * Get authentication token from localStorage
   */
  getToken() {
    if (!this.token && typeof window !== 'undefined') {
      this.token = localStorage.getItem('omnis-reach-token');
    }
    return this.token;
  }

  /**
   * Clear authentication token
   */
  clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('omnis-reach-token');
    }
  }

  /**
   * Make HTTP request
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const token = this.getToken();

    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        // Extract error message from response
        const errorMessage = data.error || data.message || 'Request failed';
        throw new Error(errorMessage);
      }

      return data;
    } catch (error) {
      // Re-throw the error so it can be handled by the calling code
      // Don't log to console - let the UI handle error display via toast
      throw error;
    }
  }

  /**
   * POST request
   */
  async post(endpoint, body) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  /**
   * GET request
   */
  async get(endpoint) {
    return this.request(endpoint, {
      method: 'GET',
    });
  }

  /**
   * PUT request
   */
  async put(endpoint, body) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  /**
   * DELETE request
   */
  async delete(endpoint) {
    return this.request(endpoint, {
      method: 'DELETE',
    });
  }
}

// Auth API methods
export const authAPI = {
  /**
   * Sign up a new user
   * Note: Token is NOT generated on signup - user must verify email first, then sign in
   */
  signup: async (name, email, password) => {
    const api = new ApiService();
    const response = await api.post('/auth/signup', {
      name,
      email,
      password,
    });

    // Don't set token - user must verify email first, then sign in to get token
    return response;
  },

  /**
   * Sign in an existing user
   */
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

  /**
   * Sign out
   */
  signout: () => {
    const api = new ApiService();
    api.clearToken();
  },
};

// Email verification API methods
export const emailVerificationAPI = {
  /**
   * Send OTP to user's email
   */
  sendOTP: async (email, name) => {
    const api = new ApiService();
    return await api.post('/auth/email/send-otp', {
      email,
      name,
    });
  },

  /**
   * Verify OTP
   */
  verifyOTP: async (email, otp) => {
    const api = new ApiService();
    return await api.post('/auth/email/verify-otp', {
      email,
      otp,
    });
  },

  /**
   * Resend OTP
   */
  resendOTP: async (email, name) => {
    const api = new ApiService();
    return await api.post('/auth/email/resend-otp', {
      email,
      name,
    });
  },
};

// Password reset API methods
export const passwordResetAPI = {
  /**
   * Send OTP for password reset
   */
  sendPasswordResetOTP: async (email) => {
    const api = new ApiService();
    return await api.post('/auth/password/forgot', {
      email,
    });
  },

  /**
   * Reset password with OTP verification
   */
  resetPassword: async (email, otp, password) => {
    const api = new ApiService();
    return await api.post('/auth/password/reset', {
      email,
      otp,
      password,
    });
  },
};

// Platform connections API methods
export const platformAPI = {
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

  updateConnectionStatus: async (platform, isConnected, isFirstTimeLogin) => {
    const api = new ApiService();
    return await api.request(`/platforms/connections/${platform}/status`, {
      method: 'PATCH',
      body: JSON.stringify({
        isConnected,
        isFirstTimeLogin,
      }),
    });
  },

  disconnectPlatform: async (platform) => {
    const api = new ApiService();
    return await api.post(`/platforms/connections/${platform}/disconnect`);
  },
};

export default new ApiService();

