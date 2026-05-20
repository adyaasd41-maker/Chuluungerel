const API = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export function token() { return localStorage.getItem('token'); }

export async function api(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
      ...(options.headers || {})
    }
  });
  if (!res.ok) throw new Error((await res.json()).message || 'API error');
  return res.json();
}

export const apiBase = API;
