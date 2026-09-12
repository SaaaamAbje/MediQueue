import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Patient, Doctor, UserRole } from '../types/index';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  patient: Patient | null;
  doctor: Doctor | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  quickSwitch: (role: UserRole, email?: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('mmc_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize session
  useEffect(() => {
    // Listen for global auth failure (401s)
    const handleAuthFailure = () => {
      console.warn('Authentication failure detected, logging out...');
      localStorage.removeItem('mmc_token');
      setToken(null);
      setUser(null);
      setPatient(null);
      setDoctor(null);
    };

    window.addEventListener('mmc-auth-failure', handleAuthFailure);

    async function initAuth() {
      const savedToken = localStorage.getItem('mmc_token');
      if (savedToken) {
        try {
          const res = await api.getMe();
          setUser(res.user);
          setPatient(res.patient || null);
          setDoctor(res.doctor || null);
        } catch {
          localStorage.removeItem('mmc_token');
          setToken(null);
          setUser(null);
          setPatient(null);
          setDoctor(null);
        }
      }
      setIsLoading(false);
    }
    initAuth();

    return () => {
      window.removeEventListener('mmc-auth-failure', handleAuthFailure);
    };
  }, []);

  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const res = await api.login(email, pass);
      localStorage.setItem('mmc_token', res.token);
      setToken(res.token);
      setUser(res.user);
      setPatient(res.patient || null);
      setDoctor(res.doctor || null);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: any) => {
    setIsLoading(true);
    try {
      const res = await api.register(data);
      localStorage.setItem('mmc_token', res.token);
      setToken(res.token);
      setUser(res.user);
      setPatient(res.patient || null);
      setDoctor(null);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch {
      // ignore
    } finally {
      localStorage.removeItem('mmc_token');
      setToken(null);
      setUser(null);
      setPatient(null);
      setDoctor(null);
    }
  };

  const quickSwitch = async () => {
    // Disabled in production/realistic mode
    console.warn('Quick switch is disabled for security.');
  };

  const refreshProfile = async () => {
    try {
      const res = await api.getMe();
      setUser(res.user);
      setPatient(res.patient || null);
      setDoctor(res.doctor || null);
    } catch (err) {
      console.error('Refresh profile error:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || null,
        patient,
        doctor,
        token,
        isLoading,
        login,
        register,
        logout,
        quickSwitch,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
