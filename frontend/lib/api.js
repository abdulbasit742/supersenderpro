const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function api(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    cache: 'no-store'
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export async function safeApi(path, fallback, options = {}) {
  try {
    const data = await api(path, options);
    if (Array.isArray(fallback) && Array.isArray(data) && data.length === 0) return fallback;
    if (fallback && typeof fallback === 'object' && !Array.isArray(fallback) && data && typeof data === 'object') {
      return { ...fallback, ...data };
    }
    return data ?? fallback;
  } catch (error) {
    return fallback;
  }
}

export { API_URL };
