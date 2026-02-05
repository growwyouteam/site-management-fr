/**
 * API Service - Axios instance with interceptors
 * Handles all HTTP requests to the backend
 */

import axios from 'axios';

// Get API base URL from environment variable or use proxy for development
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// Create axios instance with performance optimizations
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 30000, // 30 second timeout
  // Enable response compression
  decompress: true,
  // Enable keep-alive for better performance
  keepAlive: true
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle errors globally
    if (error.response) {
      // Server responded with error
      console.error('API Error:', error.response.data);

      // Redirect to login if unauthorized (token expired or invalid)
      if (error.response.status === 401) {
        // Clear invalid token
        localStorage.removeItem('token');
        delete api.defaults.headers.common['Authorization'];

        // Redirect to login if not already there
        if (window.location.pathname !== '/') {
          window.location.href = '/';
        }
      }
    } else if (error.request) {
      // Request made but no response
      console.error('Network Error:', error.request);
    } else {
      // Something else happened
      console.error('Error:', error.message);
    }

    return Promise.reject(error);
  }
);

export default api;
