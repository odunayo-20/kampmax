/**
 * Centralized API client for Kampmax frontend.
 *
 * Uses the project's native fetch (no axios dependency).
 * All requests go through the BASE_URL from api-config.
 * The client centrally prepends /api/v1 to all endpoints.
 *
 * Authentication: reads the auth token from the existing
 * AuthProvider localStorage store ( kampmax_auth_token ).
 * The client does NOT store its own copy of the token -
 * it reads it fresh on each request so it always reflects
 * the current AuthProvider state.
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
 * - On receiving 401, the client attempts a single refresh
 *   using the refresh token stored in localStorage
 *   ( kampmax_refresh_token ).
 * - A shared refresh promise prevents concurrent 401s from
 *   triggering multiple refresh requests.
 * - On refresh failure, the authentication state is cleared
 *   and listeners are notified so the UI can redirect to login.
 */

// -- API config imports --
import { API_BASE_URL, getApiBaseUrl, setApiBaseUrl } from "./api-config";

// -- Auth token storage helpers --
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, getAccessToken, setAccessToken, getRefreshToken, setRefreshToken, clearAuthTokens, persistAuthTokens } from "./auth-storage";

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
let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

async function refreshAuth(): Promise<string | null> {
  // If already refreshing, wait for the existing promise
  if (refreshPromise) {
    return refreshPromise;
  }

  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    notifyAuthFailure();
    clearAuthTokens();
    return null;
  }

  refreshPromise = (async (): Promise<string | null> => {
    try {
      // Direct fetch for refresh — does NOT go through the 401 handler
      // POST /api/v1/auth/refresh with the refresh token in the body
      const refreshResp = await fetch(new URL("/api/v1/auth/refresh", getApiBaseUrl()).toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!refreshResp.ok) {
        // Refresh failed — clear session
        clearAuthTokens();
        notifyAuthFailure();
        refreshPromise = null;
        return null;
      }

      const body = await refreshResp.json();

      // Defensive parsing of the refresh response.
      // The NestJS backend typically returns:
      //   { success: true, statusCode: 200, data: { accessToken, refreshToken }, ... }
      // Or a flat: { accessToken, refreshToken }.
      let accessToken: string | undefined;
      let newRefreshToken: string | undefined;

      if (body && typeof body === "object") {
        if (body.data && typeof body.data === "object") {
          const data = body.data;
          accessToken = data.accessToken || data.access_token || data.token;
          newRefreshToken = data.refreshToken || data.refresh_token || data.refresh;
        } else {
          accessToken = body.accessToken || body.access_token || body.token;
          newRefreshToken = body.refreshToken || body.refresh_token || body.refresh;
        }
      }

      if (accessToken) {
        // Persist new tokens
        persistAuthTokens(accessToken, newRefreshToken ?? refreshToken);
        refreshPromise = null;
        return accessToken;
      } else {
        // Unrecognized response shape — treat as failure
        clearAuthTokens();
        notifyAuthFailure();
        refreshPromise = null;
        return null;
      }
    } catch (err) {
      // Network or unexpected error during refresh
      clearAuthTokens();
      notifyAuthFailure();
      refreshPromise = null;
      return null;
    }
  })();

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
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem("kampmax_auth_token");
  } catch {
    return null;
  }
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

  const reqOptions: RequestInit = {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
  };

  // Make the actual fetch request
  const response = await fetch(url, reqOptions);

  // -- 401 refresh-retry mechanism --
  // Only attempt refresh if the response is 401 and we haven't already refreshed
  if (response.status === 401 && !isRefreshing) {
    isRefreshing = true;
    try {
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
      // Refresh failed — fall through to clear auth below
    } finally {
      isRefreshing = false;
    }
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
  const backendSuccess = typeof rawBody === "object" && rawBody !== null && "success" in rawBody
    ? (rawBody as { success?: boolean }).success
    : undefined;

  if (backendSuccess === true) {
    // Success envelope: extract data payload
    const backendData = (rawBody as BackendSuccessResponse).data;
    let data: T = {} as T;

    // Try to cast the data payload to the expected type
    if (backendData !== null && typeof backendData !== "undefined") {
      data = backendData as T;
    }

    const apiError: ApiError = new Error("") as unknown as ApiError;
    apiError.code = undefined;
    apiError.status = (rawBody as BackendSuccessResponse).statusCode;
    apiError.statusText = "";
    apiError.response = rawBody;
    apiError.data = backendData;

    return {
      parsed: {
        success: true,
        data,
        statusCode: (rawBody as BackendSuccessResponse).statusCode,
        message: (rawBody as BackendSuccessResponse).message,
      },
      apiError: null,
    };
  } else {
    // Error envelope
    let errorMessage = "";
    let errorCode: string | number | undefined = undefined;
    let backendErrorData: unknown = rawBody;

    if (typeof rawBody === "object" && rawBody !== null) {
      const typedBody = rawBody as BackendErrorResponse;
      errorMessage = typedBody.message || response.statusText;
      errorCode = typedBody.statusCode || typedBody.error;
      backendErrorData = typedBody;
    } else {
      errorMessage = response.statusText;
    }

    const apiError: ApiError = new Error(errorMessage) as unknown as ApiError;
    apiError.code = typeof errorCode === "string" || typeof errorCode === "number" ? errorCode : undefined;
    // backendErrorData.statusCode is unknown from the cast, narrow to number | undefined
    let resolvedStatus: number | undefined = status;
    if (typeof backendErrorData === "object" && backendErrorData !== null && "statusCode" in backendErrorData) {
      const extracted = (backendErrorData as { statusCode?: unknown }).statusCode;
      if (typeof extracted === "number") {
        resolvedStatus = extracted;
      }
    }
    apiError.status = resolvedStatus;
    apiError.statusText = response.statusText;
    apiError.response = backendErrorData;

    // Preserve the backend's error field if useful
    if (typeof errorCode === "string" && errorCode.length > 0) {
      apiError.message = errorMessage;
    }

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

  /** GET */
  async get<T>(path: string, options: RequestInit = {}): Promise<{ data: T; error: ApiError | null }> {
    const response = await fetchApi(path, { ...options, method: "GET" });
    const parsed = await parseResponse<T>(response);

    if (parsed.parsed.success && parsed.parsed.data !== undefined) {
      return { data: parsed.parsed.data as T, error: null };
    }

    // Treat unsuccessful as an error
    return { data: {} as T, error: parsed.apiError };
  }

  /** POST */
  async post<T, R>(path: string, body: T, options: RequestInit = {}): Promise<{ data: R; error: ApiError | null }> {
    const response = await fetchApi(path, { ...options, method: "POST", body: JSON.stringify(body) });
    const parsed = await parseResponse<R>(response);

    if (parsed.parsed.success && parsed.parsed.data !== undefined) {
      return { data: parsed.parsed.data as R, error: null };
    }

    return { data: {} as R, error: parsed.apiError };
  }

  /** PUT */
  async put<T, R>(path: string, body: T, options: RequestInit = {}): Promise<{ data: R; error: ApiError | null }> {
    const response = await fetchApi(path, { ...options, method: "PUT", body: JSON.stringify(body) });
    const parsed = await parseResponse<R>(response);

    if (parsed.parsed.success && parsed.parsed.data !== undefined) {
      return { data: parsed.parsed.data as R, error: null };
    }

    return { data: {} as R, error: parsed.apiError };
  }

  /** PATCH */
  async patch<T, R>(path: string, body: T, options: RequestInit = {}): Promise<{ data: R; error: ApiError | null }> {
    const response = await fetchApi(path, { ...options, method: "PATCH", body: JSON.stringify(body) });
    const parsed = await parseResponse<R>(response);

    if (parsed.parsed.success && parsed.parsed.data !== undefined) {
      return { data: parsed.parsed.data as R, error: null };
    }

    return { data: {} as R, error: parsed.apiError };
  }

  /** DELETE */
  async delete<R>(path: string, options: RequestInit = {}): Promise<{ data: R; error: ApiError | null }> {
    const response = await fetchApi(path, { ...options, method: "DELETE" });
    const parsed = await parseResponse<R>(response);

    if (parsed.parsed.success && parsed.parsed.data !== undefined) {
      return { data: parsed.parsed.data as R, error: null };
    }

    return { data: {} as R, error: parsed.apiError };
  }
}

// Export a configured instance so callers can use `apiClient.get(...)` immediately.
export const apiClient = new ApiClient();

// Helper to refresh the base URL (e.g., after env var change in Next.js dev)
export function refreshApiBaseUrl(): void {
  setApiBaseUrl(getApiBaseUrl()); // re-reads process.env
}