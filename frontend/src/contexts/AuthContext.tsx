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

  // Initialize auth state from sessionStorage (clears on browser close)
  useEffect(() => {
    const initializeAuth = () => {
      try {
        const accessToken = sessionStorage.getItem('accessToken');
        const storedUser = sessionStorage.getItem('user');

        if (accessToken && storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        // Clear corrupted data
        sessionStorage.removeItem('accessToken');
        sessionStorage.removeItem('refreshToken');
        sessionStorage.removeItem('user');
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

        // Store tokens and user data in sessionStorage (clears on browser close for security)
        sessionStorage.setItem('accessToken', tokens.accessToken);
        sessionStorage.setItem('refreshToken', tokens.refreshToken);
        sessionStorage.setItem('user', JSON.stringify(userData));

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

  // SECURITY: Public registration is DISABLED for company internal system
  // Only authorized supervisors/administrators can create accounts via Team Management
  const register = async (userData: RegisterInput): Promise<boolean> => {
    setError('Public registration is disabled. Please contact your supervisor or administrator.');
    return false;
  };

  const logout = async () => {
    try {
      setLoading(true);
      await apiService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear user state and tokens from sessionStorage
      sessionStorage.removeItem('accessToken');
      sessionStorage.removeItem('refreshToken');
      sessionStorage.removeItem('user');

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
    sessionStorage.setItem('user', JSON.stringify(userData));
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