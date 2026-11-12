/**
 * Centralized API client for Kampmax frontend.
 *
 * Uses the project's native fetch (no axios dependency).
 * All requests go through the BASE_URL from api-config.
 * The client centrally prepends /api/v1 to all endpoints.
 *
 * Authentication: the short-lived access token is read from the in-memory
 * session store (auth-storage.ts) on each request, so it always reflects the
 * current session. Nothing token-like is written to localStorage.
 *
 * Response envelope (NestJS backend format):
 *   Success:  { success: true, statusCode: 200, message: "...", data: {...}, timestamp: "...", path: "..." }
 *   Error:    { success: false, statusCode: 400, message: "...", error: "...", timestamp: "...", path: "..." }
 *
 * The client unwraps the `data` payload from successful responses
 * and exposes structured `ApiError` on failures.
 *
 * Error handling:
 * - Network errors -> ApiError with appropriate status/code
 * - Backend errors -> ApiError with statusCode, message, error
 * - All errors include the raw response for inspection
 *
 * 401 refresh-retry:
 * - On receiving 401, the client attempts a single refresh. The refresh
 *   token is an httpOnly cookie the browser attaches by itself; this code
 *   never sees it (see auth-storage.ts for the security model).
 * - A shared refresh promise prevents concurrent 401s from
 *   triggering multiple refresh requests.
 * - On refresh failure, the authentication state is cleared
 *   and listeners are notified so the UI can redirect to login.
 */

// -- API config imports --
import { API_BASE_URL, getApiBaseUrl, setApiBaseUrl } from "./api-config";

// -- Auth token storage helpers --
import { getAccessToken, setAccessToken, clearAuthTokens } from "./auth-storage";

// -- Auth failure notification --
type AuthFailureListener = () => void;
const authFailureListeners = new Set<AuthFailureListener>();
export function onAuthFailure(listener: AuthFailureListener): () => void {
  authFailureListeners.add(listener);
  return () => authFailureListeners.delete(listener);
}
function notifyAuthFailure(): void {
  for (const listener of authFailureListeners) {
    listener();
  }
}

// -- ApiError type for error responses --

export interface ApiError extends Error {
  code?: string | number;
  status?: number;
  statusText?: string;
  response?: unknown;
  /** Raw server error payload (may contain validation details) */
  data?: unknown;
}

// -- Refresh token management --
let refreshPromise: Promise<string | null> | null = null;

/** Marks every request as coming from the browser app, which switches the
 * backend to cookie sessions and doubles as CSRF protection (a cross-site form
 * cannot add a custom header). */
export const WEB_CLIENT_HEADERS = { "X-Kampmax-Client": "web" } as const;

/** Runs fn while holding a cross-tab lock, so two open tabs never rotate the
 * same refresh cookie at the same moment (the loser would be signed out). */
async function withRefreshLock<T>(fn: () => Promise<T>): Promise<T> {
  const locks = typeof navigator !== "undefined" ? navigator.locks : undefined;
  if (!locks?.request) return fn();
  return locks.request("kampmax-refresh", fn) as Promise<T>;
}

/**
 * Exchanges the httpOnly refresh cookie for a new access token and keeps it in
 * memory. Also used at page load to restore a session. Returns null when there
 * is no valid session (the cookie is missing, expired or revoked); rejects when
 * the server cannot be reached.
 */
export async function refreshAuth(): Promise<string | null> {
  // If already refreshing, wait for the existing promise
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = withRefreshLock(async (): Promise<string | null> => {
    try {
      // Direct fetch for refresh: does NOT go through the 401 handler.
      const refreshResp = await fetch(new URL("/api/v1/auth/refresh", getApiBaseUrl()).toString(), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...WEB_CLIENT_HEADERS },
        body: "{}",
      });

      if (!refreshResp.ok) {
        clearAuthTokens();
        notifyAuthFailure();
        return null;
      }

      const body = await refreshResp.json();
      // { success: true, data: { accessToken }, ... } or a flat { accessToken }.
      const payload = body && typeof body === "object" ? (body.data && typeof body.data === "object" ? body.data : body) : null;
      const accessToken: string | undefined =
        payload?.accessToken || payload?.access_token || payload?.token;

      if (!accessToken) {
        clearAuthTokens();
        notifyAuthFailure();
        return null;
      }
      setAccessToken(accessToken);
      return accessToken;
    } catch (error) {
      // The server could not be reached. That says nothing about the session,
      // so keep it (the cookie is still valid) and let the caller treat this as
      // a network failure instead of signing the user out.
      throw error;
    } finally {
      refreshPromise = null;
    }
  });

  return refreshPromise;
}

// -- URL normalization --

function normalizeEndpoint(endpoint: string): string {
  // Strip leading/trailing whitespace
  endpoint = endpoint.trim();

  // Strip redundant /api/v1 prefix if already supplied
  if (endpoint.startsWith("/api/v1/")) {
    endpoint = endpoint.slice(7);
  } else if (endpoint.startsWith("/api/v1")) {
    endpoint = endpoint.slice(7) || "/";
  } else if (endpoint.startsWith("api/v1/")) {
    endpoint = endpoint.slice(6);
  } else if (endpoint.startsWith("api/v1")) {
    endpoint = endpoint.slice(6) || "/";
  }

  // Ensure leading slash
  if (!endpoint.startsWith("/")) {
    endpoint = "/" + endpoint;
  }

  // Remove duplicate leading slashes (except the first)
  while (endpoint.startsWith("//")) {
    endpoint = endpoint.slice(1);
  }

  // Remove trailing slash
  while (endpoint.endsWith("/") && endpoint.length > 1) {
    endpoint = endpoint.slice(0, -1);
  }

  return endpoint;
}

// -- Response envelope parsing --

interface BackendSuccessResponse {
  success: true;
  statusCode: number;
  message: string;
  data: unknown;
  timestamp: string;
  path: string;
}

interface BackendErrorResponse {
  success: false;
  statusCode: number;
  message: string;
  error: string;
  timestamp: string;
  path: string;
}

interface ParsedSuccess<T> {
  success: true;
  data: T;
  statusCode: number;
  message: string;
}

interface ParsedError {
  success: false;
  error: ApiError;
  statusCode: number;
  message: string;
}

// -- Token helper --

function getAuthToken(): string | null {
  return getAccessToken();
}

// -- Core fetch wrapper --

async function fetchApi(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const baseUrl = getApiBaseUrl();
  const normalized = normalizeEndpoint(endpoint);
  // Client prepends /api/v1 centrally
  const fullPath = `/api/v1${normalized}`;
  const url = new URL(fullPath, baseUrl).toString();

  const token = getAuthToken();
  const reqOptions: RequestInit = {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...WEB_CLIENT_HEADERS,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
  };

  // Make the actual fetch request
  const response = await fetch(url, reqOptions);

  // -- 401 refresh-retry mechanism --
  // refreshAuth() itself dedupes concurrent callers via the shared
  // refreshPromise, so every 401 can safely ask for a refresh — a second
  // request that 401s while a refresh is already in flight just awaits
  // the same promise instead of returning its raw 401 to the caller
  // (which previously surfaced as a bare "Invalid or expired token" error
  // on any page that fires more than one authenticated request at once).
  if (response.status === 401) {
    const newAccessToken = await refreshAuth();
    if (newAccessToken) {
      // Retry the original request with the new access token
      const retryResponse = await fetch(url, {
        ...reqOptions,
        headers: {
          ...reqOptions.headers,
          Authorization: `Bearer ${newAccessToken}`,
        },
      });
      return retryResponse;
    }

    // Refresh failed or no refresh token was present.
    // If an Authorization header was sent on a GET request, retry once WITHOUT the
    // Authorization header in case the endpoint allows public/guest access.
    const headersObj = (reqOptions.headers || {}) as Record<string, string>;
    const hasAuthHeader = Boolean(headersObj.Authorization || headersObj.authorization);
    const isGet = !reqOptions.method || reqOptions.method.toUpperCase() === "GET";

    if (hasAuthHeader && isGet) {
      const cleanHeaders = { ...headersObj };
      delete cleanHeaders.Authorization;
      delete cleanHeaders.authorization;
      try {
        const guestResponse = await fetch(url, {
          ...reqOptions,
          headers: cleanHeaders,
        });
        if (guestResponse.ok) {
          return guestResponse;
        }
      } catch {
        // network error during retry; fall through to original response
      }
    }

    // Refresh failed and unauthenticated retry failed — fall through to return original 401 response
  }

  return response;
}

// -- Response parsing with envelope unwrapping --

async function parseResponse<T>(response: Response): Promise<{
  parsed: { success: boolean; data?: T; statusCode?: number; message?: string };
  apiError: ApiError | null;
}> {
  const status = response.status;

  // Attempt to read the JSON body once (it can only be read once)
  let rawBody: unknown;
  try {
    rawBody = await response.json();
  } catch {
    // Non-JSON response
    rawBody = null;
  }

  // Determine if the backend considers the call successful
  const backendSuccess =
    typeof rawBody === "object" && rawBody !== null && "success" in rawBody
      ? (rawBody as { success?: boolean }).success
      : undefined;

  const isHttpOk = response.ok;

  // Considered success if:
  // 1. backend explicitly returned { success: true }
  // 2. HTTP response is 2xx and backend did NOT explicitly return { success: false }
  const isSuccessful =
    backendSuccess === true || (isHttpOk && backendSuccess !== false);

  if (isSuccessful) {
    let data: T = {} as T;

    if (
      backendSuccess === true &&
      typeof rawBody === "object" &&
      rawBody !== null &&
      "data" in rawBody
    ) {
      // Unpack envelope
      const backendData = (rawBody as BackendSuccessResponse).data;
      if (typeof backendData !== "undefined") {
        data = backendData as T;
      }
    } else if (rawBody !== null && typeof rawBody !== "undefined") {
      // Flat or non-enveloped 2xx response
      data = rawBody as T;
    }

    const message =
      typeof rawBody === "object" && rawBody !== null && "message" in rawBody
        ? String((rawBody as { message?: unknown }).message || "")
        : "";

    return {
      parsed: {
        success: true,
        data,
        statusCode: status,
        message,
      },
      apiError: null,
    };
  } else {
    // Error response
    let errorMessage = "";
    let errorCode: string | number | undefined = undefined;
    let backendErrorData: unknown = rawBody;

    if (typeof rawBody === "object" && rawBody !== null) {
      const typedBody = rawBody as BackendErrorResponse;
      errorMessage =
        typedBody.message || response.statusText || "Request failed";
      errorCode = typedBody.statusCode || typedBody.error;
      backendErrorData = typedBody;
    } else {
      errorMessage = response.statusText || "Request failed";
    }

    const apiError: ApiError = new Error(errorMessage) as unknown as ApiError;
    apiError.code =
      typeof errorCode === "string" || typeof errorCode === "number"
        ? errorCode
        : undefined;

    let resolvedStatus: number | undefined = status;
    if (
      typeof backendErrorData === "object" &&
      backendErrorData !== null &&
      "statusCode" in backendErrorData
    ) {
      const extracted = (backendErrorData as { statusCode?: unknown })
        .statusCode;
      if (typeof extracted === "number") {
        resolvedStatus = extracted;
      }
    }
    apiError.status = resolvedStatus;
    apiError.statusText = response.statusText;
    apiError.response = backendErrorData;
    apiError.data = backendErrorData;
    apiError.message = errorMessage;

    return {
      parsed: {
        success: false,
        statusCode: apiError.status,
        message: apiError.message,
      },
      apiError,
    };
  }
}

// -- Public API client --

export class ApiClient {
  private baseUrl: string;
  private credentials: RequestCredentials;

  constructor(options: { baseUrl?: string; credentials?: RequestCredentials } = {}) {
    this.baseUrl = options.baseUrl || getApiBaseUrl();
    this.credentials = options.credentials || "include";
  }

  /**
   * Shared request path. Never throws: a network failure (backend down, CORS,
   * offline) comes back as an `error` with no `status`, like any other failure.
   */
  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    options: RequestInit = {}
  ): Promise<{ data: T; error: ApiError | null }> {
    let response: Response;
    try {
      response = await fetchApi(path, {
        ...options,
        method,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch (err) {
      const apiError = new Error(
        err instanceof Error && err.message ? err.message : "Network request failed"
      ) as ApiError;
      apiError.code = "NETWORK_ERROR";
      return { data: {} as T, error: apiError };
    }

    const parsed = await parseResponse<T>(response);

    if (parsed.parsed.success && parsed.parsed.data !== undefined) {
      return { data: parsed.parsed.data as T, error: null };
    }

    // Treat unsuccessful as an error
    return { data: {} as T, error: parsed.apiError };
  }

  /** GET */
  async get<T = unknown>(path: string, options: RequestInit = {}): Promise<{ data: T; error: ApiError | null }> {
    return this.request<T>("GET", path, undefined, options);
  }

  /** POST */
  async post<T = unknown, R = T>(path: string, body?: T, options: RequestInit = {}): Promise<{ data: R; error: ApiError | null }> {
    return this.request<R>("POST", path, body, options);
  }

  /** PUT */
  async put<T = unknown, R = T>(path: string, body?: T, options: RequestInit = {}): Promise<{ data: R; error: ApiError | null }> {
    return this.request<R>("PUT", path, body, options);
  }

  /** PATCH */
  async patch<T = unknown, R = T>(path: string, body?: T, options: RequestInit = {}): Promise<{ data: R; error: ApiError | null }> {
    return this.request<R>("PATCH", path, body, options);
  }

  /**
   * GET a file rather than JSON (a private document, say), with the same sign-in
   * and token refresh as every other call. A browser <img> or link cannot send the
   * token, so the file is fetched here and shown from an object URL.
   */
  async getBlob(
    path: string,
    options: RequestInit = {}
  ): Promise<{ blob: Blob | null; filename: string | null; error: ApiError | null }> {
    let response: Response;
    try {
      response = await fetchApi(path, { ...options, method: "GET" });
    } catch (err) {
      const apiError = new Error(
        err instanceof Error && err.message ? err.message : "Network request failed"
      ) as ApiError;
      apiError.code = "NETWORK_ERROR";
      return { blob: null, filename: null, error: apiError };
    }
    if (!response.ok) {
      const { apiError } = await parseResponse<unknown>(response);
      return { blob: null, filename: null, error: apiError };
    }
    const disposition = response.headers.get("content-disposition") ?? "";
    const filename = /filename="?([^";]+)"?/i.exec(disposition)?.[1] ?? null;
    return { blob: await response.blob(), filename, error: null };
  }

  /** DELETE */
  async delete<R = unknown>(path: string, options: RequestInit = {}): Promise<{ data: R; error: ApiError | null }> {
    return this.request<R>("DELETE", path, undefined, options);
  }
}

// Export a configured instance so callers can use `apiClient.get(...)` immediately.
export const apiClient = new ApiClient();

// Helper to refresh the base URL (e.g., after env var change in Next.js dev)
export function refreshApiBaseUrl(): void {
  setApiBaseUrl(getApiBaseUrl()); // re-reads process.env
}