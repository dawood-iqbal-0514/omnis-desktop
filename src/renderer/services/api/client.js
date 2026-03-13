const API_BASE_URL = import.meta.env.VITE_BACKEND_API_URL;

let on401Callback = null;

export function setOn401(callback) {
  on401Callback = callback;
}

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.token = null;
  }

  setToken(token) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('omnis-reach-token', token);
    }
  }

  getToken() {
    if (!this.token && typeof window !== 'undefined') {
      this.token = localStorage.getItem('omnis-reach-token');
    }
    return this.token;
  }

  clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('omnis-reach-token');
    }
  }

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

      if (response.status === 401) {
        this.clearToken();
        if (on401Callback) on401Callback();
        const errorMessage = data.error || data.message || 'Session expired';
        const err = new Error(errorMessage);
        err.status = 401;
        throw err;
      }

      if (!response.ok) {
        const errorMessage = data.error || data.message || 'Request failed';
        throw new Error(errorMessage);
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  async get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  }

  async post(endpoint, body) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async put(endpoint, body) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
}

export { ApiService, API_BASE_URL };
