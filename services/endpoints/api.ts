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
    let parsed:
      | {
          error?: string;
          message?: string;
          databaseReport?: {
            health?: { ok?: boolean; mode?: string; message?: string };
            write?: { ok?: boolean; message?: string };
          };
        }
      | null = null;

    try {
      parsed = JSON.parse(errorText) as {
        error?: string;
        message?: string;
        databaseReport?: {
          health?: { ok?: boolean; mode?: string; message?: string };
          write?: { ok?: boolean; message?: string };
        };
      };
    } catch {
      parsed = null;
    }

    if (!parsed) {
      throw new Error(errorText || 'Request failed.');
    }

    const baseMessage = parsed.error || parsed.message || errorText || 'Request failed.';
    const healthMessage = parsed.databaseReport?.health?.message;
    const writeMessage = parsed.databaseReport?.write?.message;

    if (healthMessage || writeMessage) {
      const reportSummary = [healthMessage, writeMessage].filter(Boolean).join(' | ');
      throw new Error(`${baseMessage} [databaseReport: ${reportSummary}]`);
    }

    throw new Error(baseMessage);
  }

  return response.json();
}

export default api;
