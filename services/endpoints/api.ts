async function api<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/';
  const normalizedBase = API_BASE_URL.endsWith('/') ? API_BASE_URL : `${API_BASE_URL}/`;

  const response = await fetch(`${normalizedBase}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const errorText = await response.text();

    try {
      const parsed = JSON.parse(errorText) as { error?: string };
      throw new Error(parsed.error || errorText || 'Request failed.');
    } catch {
      throw new Error(errorText || 'Request failed.');
    }
  }

  return response.json();
}

export default api;
