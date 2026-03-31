import { NextResponse, type NextRequest } from "next/server";
import { getAwsComputeInstances } from "@/lib/cloud/aws";
import { getAzureComputeInstances } from "@/lib/cloud/azure";
import type { ComputeInfrastructureStatus } from "@/types/cloud";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/cloud/infrastructure/status
 * Unified endpoint that fetches live infrastructure from both AWS and Azure
 * Calls both providers in parallel for optimal performance
 *
 * Response:
 * {
 *   "aws": { ... },
 *   "azure": { ... },
 *   "generatedAt": "2024-01-20T14:45:30Z",
 *   "isHealthy": true
 * }
 */
export async function GET(request: NextRequest) {
  try {
    if (request.method !== "GET") {
      return NextResponse.json(
        { error: "Method not allowed", code: "METHOD_NOT_ALLOWED" },
        { status: 405 }
      );
    }

    // Fetch both AWS and Azure in parallel for best performance
    const [awsComputeInstances, azureComputeInstances] = await Promise.all([
      getAwsComputeInstances().catch((error) => {
        console.error("[API] AWS compute fetch failed:", error);
        return {
          provider: "aws" as const,
          connected: false,
          instances: [],
          totalInstances: 0,
          runningCount: 0,
          stoppedCount: 0,
          details:
            error instanceof Error ? error.message : "Unknown AWS error",
          checkedAt: new Date().toISOString(),
        };
      }),
      getAzureComputeInstances().catch((error) => {
        console.error("[API] Azure compute fetch failed:", error);
        return {
          provider: "azure" as const,
          connected: false,
          instances: [],
          totalInstances: 0,
          runningCount: 0,
          stoppedCount: 0,
          details:
            error instanceof Error ? error.message : "Unknown Azure error",
          checkedAt: new Date().toISOString(),
        };
      }),
    ]);

    const isHealthy =
      awsComputeInstances.connected || azureComputeInstances.connected;

    const response: ComputeInfrastructureStatus = {
      aws: awsComputeInstances,
      azure: azureComputeInstances,
      generatedAt: new Date().toISOString(),
      isHealthy,
    };

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("[API] /api/cloud/infrastructure/status error:", error);

    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: "Failed to fetch cloud infrastructure",
        details: errorMessage,
        code: "INFRASTRUCTURE_FETCH_ERROR",
      },
      { status: 500 }
    );
  }
}
