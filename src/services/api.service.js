import API_BASE_URL from '../config/api.js';

// API Service - Handles all API calls to backend
class ApiService {
  // Get auth token from localStorage
  getToken() {
    return localStorage.getItem('token');
  }

  // Set auth token in localStorage
  setToken(token) {
    localStorage.setItem('token', token);
  }

  // Remove auth token from localStorage
  removeToken() {
    localStorage.removeItem('token');
  }

  // Get headers with auth token
  getHeaders(includeAuth = true) {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (includeAuth) {
      const token = this.getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  // Generic fetch wrapper
  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = this.getHeaders(options.requireAuth !== false);

    const config = {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Request failed');
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // Auth API calls
  async register(userData) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
      requireAuth: false,
    });
  }

  async login(email, password) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      requireAuth: false,
    });
  }

  async getCurrentUser() {
    return this.request('/auth/me');
  }

  async updateProfile(profileData) {
    return this.request('/auth/update-profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  }

  async resetPassword(oldPassword, newPassword) {
    return this.request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ oldPassword, newPassword }),
    });
  }

  // Routes API calls
  async optimizeRoute(routeData) {
    return this.request('/routes/optimize', {
      method: 'POST',
      body: JSON.stringify(routeData),
    });
  }

  async getRoutes(status = null, driverId = null) {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (driverId) params.append('driverId', driverId);
    const query = params.toString();
    return this.request(`/routes${query ? `?${query}` : ''}`);
  }

  async getRoute(routeId) {
    return this.request(`/routes/${routeId}`);
  }

  async updateRoute(routeId, updates) {
    return this.request(`/routes/${routeId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async editRoute(routeId, routeData) {
    return this.request(`/routes/${routeId}`, {
      method: 'PUT',
      body: JSON.stringify(routeData),
    });
  }

  async completeRoute(routeId) {
    return this.request(`/routes/${routeId}`, {
         method: 'PATCH',
         body: JSON.stringify({ status: 'completed' })
    });
  }

  async reoptimizeRoute(routeId, trafficData, weatherData) {
    return this.request(`/routes/${routeId}/reoptimize`, {
      method: 'POST',
      body: JSON.stringify({ trafficData, weatherData }),
    });
  }

  async deleteRoute(routeId) {
    return this.request(`/routes/${routeId}`, {
      method: 'DELETE',
    });
  }

  async getWeather(address, lat, lon) {
    let url = `/routes/weather?address=${encodeURIComponent(address || '')}`;
    if (lat && lon) url += `&lat=${lat}&lon=${lon}`;
    return this.request(url);
  }

  // Users API
  async getUsers() {
    return this.request('/users');
  }

  // AI Intelligence API
  async getFleetAnalysis() {
    return this.request('/routes/analysis');
  }

  // Health check
  async healthCheck() {
    return this.request('/health', { requireAuth: false });
  }
}

export default new ApiService();
