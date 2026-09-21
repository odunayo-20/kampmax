/**
 * Development-only health check API route.
 *
 * Proves: Frontend → API client → NestJS API → successful response
 *
 * Calls: GET /api/v1/health
 *
 * Handles:
 *   - successful API response (2xx, success: true envelope)
 *   - API unavailable (server not running, wrong URL)
 *   - network failure (no internet, DNS failure, etc.)
 *   - unexpected response (non-JSON, unexpected status)
 *
 * This file is intentionally placed under `src/app/api/health/route.tsx`
 * so it can be accessed at `/api/health` during development.
 * It should be removed or guarded before production.
 *
 * NOTE: This uses the same API client configured with NEXT_PUBLIC_API_URL.
 * If the NestJS backend is running on the expected port, this will return
 * its health response. If not, it will gracefully report the error.
 */

import { NextResponse } from "next/server";
import { apiClient } from "@/lib/api-client";

export async function GET() {
  try {
    // Call the actual backend health endpoint with the /api/v1 prefix.
    // The NestJS API exposes: GET /api/v1/health
    const healthResponse = await apiClient.get<{ status: string }>("/health");

    if (healthResponse.error) {
      // Backend returned an error envelope (success: false)
      return NextResponse.json(
        {
          success: false,
          error: healthResponse.error.message,
          statusCode: healthResponse.error.status,
          message: healthResponse.error.message,
          timestamp: new Date().toISOString(),
          envApiUrl: process.env.NEXT_PUBLIC_API_URL,
        },
        { status: healthResponse.error.status ?? 500 }
      );
    }

    // Successful health response
    return NextResponse.json({
      success: true,
      data: healthResponse.data,
      message: "Backend API is reachable and healthy",
      timestamp: new Date().toISOString(),
      envApiUrl: process.env.NEXT_PUBLIC_API_URL,
      status: "healthy",
    });
  } catch (error) {
    // Network-level failure or unexpected error
    const err = error instanceof Error ? error : new Error(String(error));
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Network error",
        status: "unreachable",
        message:
          "Backend API is unreachable. " +
          "Ensure the NestJS backend is running and NEXT_PUBLIC_API_URL is correct.",
        timestamp: new Date().toISOString(),
        envApiUrl: process.env.NEXT_PUBLIC_API_URL,
      },
      { status: 500 }
    );
  }
}