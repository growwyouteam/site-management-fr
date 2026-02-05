/**
 * Authentication Context
 * Manages user authentication state across the application
 * Uses backend API for authentication with JWT tokens
 */

import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

// Auth Provider Component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  // Check if user is logged in on mount (verify JWT token with backend)
  useEffect(() => {
    checkAuth();
  }, []);

  // Update API authorization header when token changes
  useEffect(() => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      localStorage.setItem('token', token);
    } else {
      delete api.defaults.headers.common['Authorization'];
      localStorage.removeItem('token');
    }
  }, [token]);

  const checkAuth = async () => {
    const storedToken = localStorage.getItem('token');

    if (!storedToken) {
      setLoading(false);
      return;
    }

    try {
      // Set token in header for this request
      api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;

      const response = await api.get('/auth/me');
      if (response.data.success) {
        setUser(response.data.data);
        setToken(storedToken);
      }
    } catch (error) {
      // Token is invalid or expired
      setUser(null);
      setToken(null);
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

  // Login function (calls backend API and stores JWT token)
  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      if (response.data.success) {
        const { user, token } = response.data.data;
        setUser(user);
        setToken(token);
        return { success: true, user };
      }
      return {
        success: false,
        error: response.data.error || 'Login failed'
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Invalid email or password'
      };
    }
  };

  // Logout function (removes JWT token)
  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem('token');
      window.location.href = '/';
    }
  };

  const value = {
    user,
    loading,
    login,
    logout,
    isAdmin: user?.role === 'admin',
    isSiteManager: user?.role === 'sitemanager'
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
