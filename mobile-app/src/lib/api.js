import { API_BASE_URL } from './config';

export async function apiRequest(path, options = {}, token = null) {
  const isFormData = (typeof FormData !== 'undefined') && (options.body instanceof FormData);
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

    if (!res.ok) {
      // Normalise error messages
      const errorMsg = data.error || data.message || text || `${res.status} ${res.statusText}`;
      const error = new Error(errorMsg);
      error.status = res.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (error) {
    // Log error for production tracking
    console.error(`[API] ${options.method || 'GET'} ${path} failed:`, error.message);

    // Custom handling for specific statuses
    if (error.status === 401) {
      // Optional: Trigger global logout or redirect to login
    }

    throw error;
  }
}
