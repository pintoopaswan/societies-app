import { API_BASE_URL } from './config';

// In-memory cache for GET requests
const CACHE_DURATION = 1000 * 60 * 5; // 5 minutes
const cache = new Map();

/**
 * Enhanced API Request utility
 * - Centralized error handling
 * - In-memory caching for performance
 * - Detailed logging
 */
export async function apiRequest(path, options = {}, token = null) {
  const method = (options.method || 'GET').toUpperCase();
  const isFormData = (typeof FormData !== 'undefined') && (options.body instanceof FormData);

  // Cache check for GET requests
  if (method === 'GET' && !options.noCache) {
    const cached = cache.get(path);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.debug(`[API] Cache hit: ${path}`);
      return cached.data;
    }
  }

  const headers = {
    ...(options.headers || {}),
  };
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}${path}`;
  const startTime = Date.now();

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    const text = await res.text().catch(() => '');
    let data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = {};
    }

    const duration = Date.now() - startTime;
    console.debug(`[API] ${method} ${path} - ${res.status} (${duration}ms)`);

    if (!res.ok) {
      // Normalize error messages for the UI
      const errorMsg = data.error || data.message || text || `${res.status} ${res.statusText}`;

      // Map common error codes to user-friendly messages
      let userMsg = errorMsg;
      if (res.status === 401) userMsg = "Session expired. Please sign in again.";
      if (res.status === 403) userMsg = "You don't have permission to perform this action.";
      if (res.status === 404) userMsg = "The requested information could not be found.";
      if (res.status >= 500) userMsg = "Server error. Our team has been notified.";

      const error = new Error(userMsg);
      error.status = res.status;
      error.data = data;
      error.originalError = errorMsg;
      throw error;
    }

    // Save to cache if successful GET
    if (method === 'GET' && !options.noCache) {
      cache.set(path, { data, timestamp: Date.now() });
    } else if (method !== 'GET') {
      // Invalidate cache on mutations
      cache.clear();
    }

    return data;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.warn(`[API] ${method} ${path} was aborted.`);
      throw error;
    }

    console.error(`[API] ${method} ${path} failed:`, error.message);

    // Handle network errors
    if (!error.status) {
      const netError = new Error("Network error. Please check your internet connection.");
      netError.isNetworkError = true;
      throw netError;
    }

    throw error;
  }
}

/** Clear the entire API cache */
export function clearApiCache() {
  cache.clear();
}
