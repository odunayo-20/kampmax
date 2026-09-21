/**
 * Centralized API configuration for Kampmax frontend.
 *
 * Reads the base API URL from the environment variable NEXT_PUBLIC_API_URL.
 * The port should match the NestJS backend dev/production deployment.
 *
 * - Development:  NEXT_PUBLIC_API_URL=http://localhost:4000
 * - Production:   configure NEXT_PUBLIC_API_URL via platform env vars
 *
 * The base URL must NOT include a trailing slash and must NOT include the
 * /api/v1 prefix - the API client centrally prepends /api/v1 to all endpoints.
 *
 * The full request URL will be: {NEXT_PUBLIC_API_URL}/api/v1{endpoint}
 */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export function getApiBaseUrl(): string {
  return API_BASE_URL;
}

export function setApiBaseUrl(url: string): void {
  // This is a compile-time constant; runtime reconfiguration is not supported.
  // To change the API base URL, rebuild with the correct NEXT_PUBLIC_API_URL.
}