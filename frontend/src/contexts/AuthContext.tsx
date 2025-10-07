import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, LoginInput, RegisterInput } from '../types';
import apiService from '../services/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (credentials: LoginInput) => Promise<boolean>;
  register: (userData: RegisterInput) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
  updateUser: (userData: User) => void;
  isAuthenticated: boolean;
  isSupervisor: boolean;
  isEngineer: boolean;
  isAdministrator: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = () => {
      try {
        const accessToken = localStorage.getItem('accessToken');
        const storedUser = localStorage.getItem('user');

        if (accessToken && storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        // Clear corrupted data
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (credentials: LoginInput): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiService.login(credentials);

      if (response.success && response.data) {
        const { user: userData, tokens } = response.data;

        // Store tokens and user data
        localStorage.setItem('accessToken', tokens.accessToken);
        localStorage.setItem('refreshToken', tokens.refreshToken);
        localStorage.setItem('user', JSON.stringify(userData));

        setUser(userData);
        return true;
      } else {
        setError(response.error || 'Login failed');
        return false;
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Login failed';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData: RegisterInput): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiService.register(userData);

      if (response.success && response.data) {
        const { user: newUser, tokens } = response.data;

        // Store tokens and user data
        localStorage.setItem('accessToken', tokens.accessToken);
        localStorage.setItem('refreshToken', tokens.refreshToken);
        localStorage.setItem('user', JSON.stringify(newUser));

        setUser(newUser);
        return true;
      } else {
        setError(response.error || 'Registration failed');
        return false;
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Registration failed';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await apiService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear user state and tokens from localStorage
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');

      setUser(null);
      setError(null);
      setLoading(false);
      // Note: Navigation will be handled by route protection when isAuthenticated becomes false
      // This prevents race conditions and maintains SPA behavior
    }
  };

  const clearError = () => {
    setError(null);
  };

  const updateUser = (userData: User) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const value: AuthContextType = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    clearError,
    updateUser,
    isAuthenticated: !!user,
    isSupervisor: user?.role === 'supervisor',
    isEngineer: user?.role === 'engineer',
    isAdministrator: user?.role === 'administrator',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};