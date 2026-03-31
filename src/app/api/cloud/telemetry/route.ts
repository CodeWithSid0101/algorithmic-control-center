import { NextResponse, type NextRequest } from "next/server";

import { getAwsAccountStatus, getAwsNormalizedTelemetry } from "@/lib/cloud/aws";
import { getAzureAccountStatus, getAzureNormalizedTelemetry } from "@/lib/cloud/azure";
import type { CloudTelemetry } from "@/types/cloud";

export const dynamic = "force-dynamic";

/**
 * GET /api/cloud/telemetry
 * Retrieves cloud account status and normalized telemetry from AWS and Azure
 * Falls back to mock data if either provider is unavailable
 */
export async function GET(request: NextRequest) {
  try {
    // Validate request (basic check)
    if (request.method !== "GET") {
      return NextResponse.json(
        { error: "Method not allowed", code: "METHOD_NOT_ALLOWED" },
        { status: 405 }
      );
    }

    // Fetch cloud account data
    const [aws, azure, awsNormalized, azureNormalized] = await Promise.all([
      getAwsAccountStatus().catch((err) => {
        console.error("[API] AWS status fetch failed:", err);
        return {
          provider: "aws" as const,
          connected: false,
          details: err instanceof Error ? err.message : "Unknown AWS error",
          checkedAt: new Date().toISOString(),
        };
      }),
      getAzureAccountStatus().catch((err) => {
        console.error("[API] Azure status fetch failed:", err);
        return {
          provider: "azure" as const,
          connected: false,
          details: err instanceof Error ? err.message : "Unknown Azure error",
          checkedAt: new Date().toISOString(),
        };
      }),
      getAwsNormalizedTelemetry().catch((err) => {
        console.error("[API] AWS telemetry fetch failed:", err);
        return {
          checkedAt: new Date().toISOString(),
          configured: false,
          details: err instanceof Error ? err.message : "AWS telemetry fetch failed",
        };
      }),
      getAzureNormalizedTelemetry().catch((err) => {
        console.error("[API] Azure telemetry fetch failed:", err);
        return {
          checkedAt: new Date().toISOString(),
          configured: false,
          details: err instanceof Error ? err.message : "Azure telemetry fetch failed",
        };
      }),
    ]);

    const payload: CloudTelemetry = {
      accounts: [aws, azure],
      mockFallback: !aws.connected || !azure.connected,
      generatedAt: new Date().toISOString(),
      aws: awsNormalized,
      azure: azureNormalized,
    };

    return NextResponse.json(payload, {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("[API] Telemetry endpoint error:", error);

    const errorMessage = error instanceof Error ? error.message : "Internal server error";

    return NextResponse.json(
      {
        error: "Failed to fetch cloud telemetry",
        code: "TELEMETRY_ERROR",
        details: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

