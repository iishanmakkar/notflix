import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

// Create axios instance with base URL
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// Add request interceptor to add token to all requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor to handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Only clear auth data if it's not a login request
      if (!error.config.url.includes('/api/auth/login')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = () => {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      
      if (storedToken && storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          // Ensure all required fields are present
          const formattedUserData = {
            _id: userData.id || userData._id,
            name: userData.name,
            email: userData.email,
            role: userData.role,
            isPremium: userData.isPremium === undefined ? false : userData.isPremium,
            profileImage: userData.profileImage || ''
          };
          setUser(formattedUserData);
          setToken(storedToken);
        } catch (error) {
          console.error('Error parsing stored user data:', error);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
          setToken(null);
        }
      } else {
        setUser(null);
        setToken(null);
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await api.post('/api/auth/login', { email, password });
      const data = response.data;

      if (!data.token || !data.user) {
        throw new Error('Invalid response from server');
      }

      // Format user data consistently
      const formattedUserData = {
        _id: data.user.id || data.user._id,
        name: data.user.name,
        email: data.user.email,
        role: data.user.role,
        isPremium: data.user.isPremium === undefined ? false : data.user.isPremium,
        profileImage: data.user.profileImage || ''
      };

      // Store token and user data
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(formattedUserData));
      setUser(formattedUserData);
      setToken(data.token);
      return data;
    } catch (error) {
      console.error('Login error:', error.response?.data || error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setToken(null);
  };

  const updatePremiumStatus = async (isPremium) => {
    try {
      if (!user?._id) {
        throw new Error('No user logged in');
      }

      const response = await api.patch('/api/auth/update-premium', {
        userId: user._id,
        isPremium
      });

      const updatedUserData = {
        ...user,
        isPremium: response.data.user.isPremium,
        profileImage: response.data.user.profileImage || user.profileImage || ''
      };

      localStorage.setItem('user', JSON.stringify(updatedUserData));
      setUser(updatedUserData);
      
      return response.data;
    } catch (error) {
      console.error('Error updating premium status:', error);
      throw error;
    }
  };

  const register = async (name, email, password) => {
    try {
      const response = await api.post('/api/auth/register', { name, email, password });
      const data = response.data;

      if (!data.token || !data.user) {
        throw new Error('Invalid response from server');
      }

      const formattedUserData = {
        _id: data.user.id || data.user._id,
        name: data.user.name,
        email: data.user.email,
        role: data.user.role,
        isPremium: data.user.isPremium === undefined ? false : data.user.isPremium,
        profileImage: data.user.profileImage || ''
      };

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(formattedUserData));
      setUser(formattedUserData);
      setToken(data.token);
      return data;
    } catch (error) {
      console.error('Register error:', error.response?.data || error);
      throw error;
    }
  };

  const value = {
    user,
    setUser,
    token,
    setToken,
    loading,
    login,
    logout,
    register,
    api,
    updatePremiumStatus,
    isPremium: user?.isPremium || false
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext; 
