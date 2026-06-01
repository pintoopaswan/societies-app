import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiRequest } from './api';

const AuthContext = createContext(null);
const TOKEN_KEY = 'society_auth_token';
const USER_KEY = 'societies_app_auth_user';

async function readJson(key, fallback) {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

async function writeJson(key, value) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [savedToken, savedUser] = await Promise.all([
        AsyncStorage.getItem(TOKEN_KEY),
        readJson(USER_KEY, null),
      ]);
      if (savedToken) setToken(savedToken);
      if (savedUser) setUser(savedUser);
      setLoading(false);
    })();
  }, []);

  const persistSession = async (nextToken, nextUser) => {
    await AsyncStorage.setItem(TOKEN_KEY, nextToken);
    await writeJson(USER_KEY, nextUser);
    setToken(nextToken);
    setUser(nextUser);
  };

  const login = async (identifier, password) => {
    const res = await apiRequest('/api/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    });
    const me = await apiRequest('/api/me', {}, res.token);
    await persistSession(res.token, me.user || res.user);
  };

  const requestOtp = async (identifier) => {
    return apiRequest('/api/otp/request', {
      method: 'POST',
      body: JSON.stringify({ identifier }),
    });
  };

  const verifyOtp = async (identifier, otpCode) => {
    const res = await apiRequest('/api/otp/verify', {
      method: 'POST',
      body: JSON.stringify({ identifier, otp_code: otpCode }),
    });
    const user = res.user || (await apiRequest('/api/me', {}, res.token)).user;
    await persistSession(res.token, user);
  };

  const registerRequest = async (payload) => {
    await apiRequest('/api/register-requests', {
      method: 'POST',
      body: payload instanceof FormData ? payload : JSON.stringify(payload),
    });
  };

  const getRegistrationRequests = async () => {
    const res = await apiRequest('/api/register-requests', {}, token);
    return res.data || [];
  };

  const approveRegistration = async (requestId, payload) => {
    await apiRequest(`/api/register-requests/${requestId}/approve`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }, token);
  };

  const rejectRegistration = async (requestId) => {
    await apiRequest(`/api/register-requests/${requestId}/reject`, {
      method: 'POST',
    }, token);
  };

  const getUsers = async () => {
    const res = await apiRequest('/api/users', {}, token);
    return res.data || [];
  };

  const updateUserByAdmin = async (userId, updates) => {
    await apiRequest(`/api/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }, token);

    if (user?.id === userId) {
      const me = await apiRequest('/api/me', {}, token);
      await persistSession(token, me.user);
    }
  };

  const updateProfile = async (updates) => {
    await apiRequest('/api/me', {
      method: 'PUT',
      body: JSON.stringify(updates),
    }, token);
    const me = await apiRequest('/api/me', {}, token);
    await persistSession(token, me.user);
  };

  const changePassword = async (currentPassword, newPassword) => {
    await apiRequest('/api/change-password', {
      method: 'POST',
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    }, token);
  };

  const forgotPassword = async (identifier) => {
    return apiRequest('/api/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ identifier }),
    });
  };

  const logout = async () => {
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
    setToken(null);
    setUser(null);
  };

  const value = useMemo(() => ({
    token,
    user,
    loading,
    login,
    requestOtp,
    verifyOtp,
    logout,
    registerRequest,
    getRegistrationRequests,
    approveRegistration,
    rejectRegistration,
    getUsers,
    updateUserByAdmin,
    updateProfile,
    changePassword,
    forgotPassword,
  }), [token, user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
