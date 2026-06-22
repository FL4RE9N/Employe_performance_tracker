const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

// ---- Typed error classes ----

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
    this.name = 'UnauthorizedError';
  }
}

// ---- CSRF double-submit ----

let csrfToken: string | null = null;

export async function getCsrf(): Promise<string> {
  const res = await fetch(`${API_BASE}/auth/csrf`, {
    method: 'GET',
    credentials: 'include',
  });
  if (!res.ok) {
    throw new ApiError('Failed to fetch CSRF token', res.status);
  }
  const data = await res.json();
  csrfToken = data.csrfToken as string;
  return csrfToken;
}

// ---- Core fetch wrapper ----

interface FetchOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

export async function apiFetch<T = unknown>(
  path: string,
  options: FetchOptions = {},
): Promise<T> {
  const { method = 'GET', body, headers: extraHeaders = {} } = options;
  const isStateMutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(
    method.toUpperCase(),
  );

  const headers: Record<string, string> = {
    'content-type': 'application/json',
    ...extraHeaders,
  };

  if (isStateMutating) {
    // Lazily fetch CSRF token if not yet acquired
    if (!csrfToken) {
      await getCsrf();
    }
    if (csrfToken) {
      headers['x-csrf-token'] = csrfToken;
    }
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    credentials: 'include',
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let message: string;
    try {
      const errBody = await res.json();
      message =
        (Array.isArray(errBody.message)
          ? errBody.message[0]
          : errBody.message) || res.statusText;
    } catch {
      message = res.statusText;
    }

    if (res.status === 401) {
      throw new UnauthorizedError(message);
    }
    throw new ApiError(message, res.status);
  }

  // 204 No Content
  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

// ---- Convenience helpers ----

export function get<T = unknown>(path: string): Promise<T> {
  return apiFetch<T>(path, { method: 'GET' });
}

export function post<T = unknown>(path: string, body?: unknown): Promise<T> {
  return apiFetch<T>(path, { method: 'POST', body });
}
