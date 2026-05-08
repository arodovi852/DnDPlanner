/**
 * API client.
 *
 * Thin wrapper around `fetch` that
 *   - prepends the API base URL (read from `VITE_API_URL`),
 *   - injects the access token as a Bearer Authorization header,
 *   - transparently refreshes the access token on a 401 and replays the
 *     original request once,
 *   - throws a typed `ApiError` with a stable `code` and HTTP status.
 *
 * The refresh logic is single-flight: concurrent 401s during a refresh
 * wait on the same in-flight refresh promise instead of all firing
 * `/auth/refresh` themselves.
 */

const ACCESS_TOKEN_KEY = 'dndplanner:accessToken';
const REFRESH_TOKEN_KEY = 'dndplanner:refreshToken';

const DEFAULT_BASE_URL = 'http://localhost:3000/api';

function resolveBaseUrl(): string {
  const env = (import.meta as ImportMeta & {
    env?: { VITE_API_URL?: string };
  }).env;
  const url = env?.VITE_API_URL;
  if (typeof url === 'string' && url.length > 0) {
    return url.replace(/\/$/, '');
  }
  return DEFAULT_BASE_URL;
}

const BASE_URL = resolveBaseUrl();

/** Backend success envelope used for the happy path. */
export interface ApiResponse<T> {
  success: true;
  message?: string;
  data: T;
}

/** Backend error envelope. */
export interface ApiErrorBody {
  success: false;
  message?: string;
  code?: string;
  errors?: Array<{ msg?: string; param?: string }>;
}

/** Thrown by every non-2xx response. */
export class ApiError extends Error {
  public status: number;
  public code?: string;
  public body?: ApiErrorBody;

  constructor(status: number, body: ApiErrorBody) {
    super(body?.message || `Request failed with status ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.code = body?.code;
    this.body = body;
  }
}

// ---------------------------------------------------------------------------
// Token storage (localStorage). The access token is also kept in memory so
// rapid sequential calls in the same tick share the same value.
// ---------------------------------------------------------------------------

let accessToken: string | null =
  typeof window !== 'undefined'
    ? window.localStorage.getItem(ACCESS_TOKEN_KEY)
    : null;
let refreshToken: string | null =
  typeof window !== 'undefined'
    ? window.localStorage.getItem(REFRESH_TOKEN_KEY)
    : null;

export function setTokens(tokens: {
  accessToken: string | null;
  refreshToken?: string | null;
}) {
  accessToken = tokens.accessToken;
  if (tokens.refreshToken !== undefined) refreshToken = tokens.refreshToken;
  if (typeof window !== 'undefined') {
    if (tokens.accessToken) {
      window.localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    } else {
      window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    }
    if (tokens.refreshToken !== undefined) {
      if (tokens.refreshToken) {
        window.localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
      } else {
        window.localStorage.removeItem(REFRESH_TOKEN_KEY);
      }
    }
  }
}

export function clearTokens() {
  setTokens({ accessToken: null, refreshToken: null });
}

export function hasTokens(): boolean {
  return accessToken !== null;
}

// ---------------------------------------------------------------------------
// Refresh logic — single-flight to avoid stampedes.
// ---------------------------------------------------------------------------

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;
  if (!refreshToken) return null;

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) {
        clearTokens();
        return null;
      }
      const json = (await res.json()) as ApiResponse<{
        accessToken: string;
        refreshToken: string;
      }>;
      setTokens({
        accessToken: json.data.accessToken,
        refreshToken: json.data.refreshToken,
      });
      return json.data.accessToken;
    } catch {
      clearTokens();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// ---------------------------------------------------------------------------
// Core request helper.
// ---------------------------------------------------------------------------

interface RequestOptions {
  method?: string;
  body?: unknown;
  /** When true (default) the request will retry once on a 401 after refresh. */
  auth?: boolean;
  signal?: AbortSignal;
  query?: Record<string, string | number | boolean | undefined>;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = new URL(
    `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`,
    typeof window !== 'undefined' ? window.location.origin : 'http://localhost'
  );
  if (query) {
    for (const [key, val] of Object.entries(query)) {
      if (val === undefined || val === null) continue;
      url.searchParams.set(key, String(val));
    }
  }
  // If the base URL is absolute we want the absolute form; otherwise
  // (e.g. '/api') the URL constructor already resolved it relative to origin.
  if (BASE_URL.startsWith('http')) return url.toString();
  return `${url.pathname}${url.search}`;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true, signal, query } = options;

  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth && accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

  const url = buildUrl(path, query);

  const doFetch = async (currentHeaders: Record<string, string>): Promise<Response> => {
    try {
      return await fetch(url, {
        method,
        headers: { ...currentHeaders },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal,
      });
    } catch (err) {
      // `fetch` only rejects on network failure (no DNS / connection refused
      // / CORS preflight reject). Wrap that into a typed ApiError so the
      // UI gets a friendlier message than the browser's "NetworkError".
      throw new ApiError(0, {
        success: false,
        code: 'NETWORK',
        message:
          err instanceof Error && err.name === 'AbortError'
            ? 'Request aborted'
            : 'Could not reach the server. Is the backend running?',
      });
    }
  };

  let response = await doFetch(headers);

  // Single-shot refresh + retry on 401.
  if (response.status === 401 && auth && refreshToken) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`;
      response = await doFetch(headers);
    }
  }

  // 204 No Content.
  if (response.status === 204) return undefined as T;

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    json = null;
  }

  if (!response.ok) {
    throw new ApiError(response.status, (json ?? {}) as ApiErrorBody);
  }

  // Endpoints follow the `{ success, data }` envelope; unwrap it.
  if (json && typeof json === 'object' && 'data' in (json as ApiResponse<T>)) {
    return (json as ApiResponse<T>).data;
  }
  return json as T;
}

export const apiClient = {
  get: <T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'POST', body }),
  put: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'PATCH', body }),
  delete: <T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'DELETE' }),
};

export const apiBaseUrl = BASE_URL;
