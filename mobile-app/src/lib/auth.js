import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiRequest } from './api';

const AuthContext = createContext(null);
const TOKEN_KEY = 'society_auth_token';

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem(TOKEN_KEY);
      if (saved) setToken(saved);
      setLoading(false);
    })();
  }, []);

  const login = async (username, password) => {
    const res = await apiRequest('/api/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    await AsyncStorage.setItem(TOKEN_KEY, res.token);
    setToken(res.token);
  };

  const logout = async () => {
    await AsyncStorage.removeItem(TOKEN_KEY);
    setToken(null);
  };

  const value = useMemo(() => ({ token, loading, login, logout }), [token, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
