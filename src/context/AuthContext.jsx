import React, { createContext, useContext, useState, useEffect } from 'react';
import apiService from '../services/api.service';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check if user is logged in on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = apiService.getToken();
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await apiService.getCurrentUser();
      if (response.success) {
        setUser(response.data.user);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      apiService.removeToken();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await apiService.login(email, password);
      if (response.success) {
        const { user, token } = response.data;
        apiService.setToken(token);
        setUser(user);
        setIsAuthenticated(true);
        return { success: true };
      }
    } catch (error) {
      return { success: false, message: error.message };
    }
  };

  const register = async (userData) => {
    try {
      const response = await apiService.register(userData);
      if (response.success) {
        const { user, token } = response.data;
        apiService.setToken(token);
        setUser(user);
        setIsAuthenticated(true);
        return { success: true };
      }
    } catch (error) {
      return { success: false, message: error.message };
    }
  };

  const logout = () => {
    apiService.removeToken();
    setUser(null);
    setIsAuthenticated(false);
  };

  const value = {
    user,
    isAuthenticated,
    loading,
    login,
    register,
    logout,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
