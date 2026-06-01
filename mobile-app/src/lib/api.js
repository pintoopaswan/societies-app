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
    const message = data.error || data.message || text || `${res.status} ${res.statusText}`;
    throw new Error(`${options.method || 'GET'} ${url} failed (${res.status}): ${message}`);
  }
  return data;
}
