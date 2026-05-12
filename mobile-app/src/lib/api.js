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

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}
