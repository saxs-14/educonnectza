import { auth } from './firebase.js';

const API_BASE = (typeof window !== 'undefined' && window.VITE_API_URL) 
  || (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) 
  || (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:5000/api` : 'http://localhost:5000/api');

export const api = {
  async request(endpoint, options = {}, isFormData = false) {
    const url = `${API_BASE}${endpoint}`;
    const headers = {};
    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }
    
    // Auth Interceptor: Get Firebase ID token
    if (auth.currentUser) {
      try {
        const token = await auth.currentUser.getIdToken();
        headers['Authorization'] = `Bearer ${token}`;
      } catch (err) {
        console.error("Failed to get Firebase token", err);
      }
    }

    const config = {
      ...options,
      headers,
    };

    if (isFormData) {
      config.body = options.body;
    } else if (options.body) {
      config.body = JSON.stringify(options.body);
    }

    const response = await fetch(url, config);
    
    // Handle empty responses
    const text = await response.text();
    const data = text ? JSON.parse(text) : {};
    
    if (!response.ok) {
      throw new Error(data.message || 'Request failed');
    }
    return data;
  },
  get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  },
  post(endpoint, body, isFormData = false) {
    return this.request(endpoint, { method: 'POST', body }, isFormData);
  },
  put(endpoint, body, isFormData = false) {
    return this.request(endpoint, { method: 'PUT', body }, isFormData);
  },
  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
};
