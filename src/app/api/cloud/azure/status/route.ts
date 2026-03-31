import { NextResponse, type NextRequest } from "next/server";
import { getAzureComputeInstances } from "@/lib/cloud/azure";
import type { ComputeInfrastructureStatus } from "@/types/cloud";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/cloud/azure/status
 * Fetches live Azure Virtual Machines and Monitor metrics
 *
 * Response:
 * {
 *   "azure": {
 *     "provider": "azure",
 *     "connected": true,
 *     "instances": [
 *       {
 *         "id": "azure:subscription-id:vm-name",
 *         "provider": "azure",
 *         "name": "prod-vm-01",
 *         "state": "running",
 *         "instanceType": "Standard_B2s",
 *         "region": "eastus",
 *         "cpuUsage": 32.5,
 *         "memoryUsage": null,
 *         "networkBytesIn": null,
 *         "networkBytesOut": null,
 *         "launchTime": "2024-01-15T10:30:00Z",
 *         "lastUpdated": "2024-01-20T14:45:30Z"
 *       }
 *     ],
 *     "totalInstances": 2,
 *     "runningCount": 1,
 *     "stoppedCount": 1,
 *     "checkedAt": "2024-01-20T14:45:30Z"
 *   },
 *   "generatedAt": "2024-01-20T14:45:30Z",
 *   "isHealthy": true
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Basic validation
    if (request.method !== "GET") {
      return NextResponse.json(
        { error: "Method not allowed", code: "METHOD_NOT_ALLOWED" },
        { status: 405 }
      );
    }

    // Fetch Azure compute instances
    const azureComputeInstances = await getAzureComputeInstances();

    const response: ComputeInfrastructureStatus = {
      azure: azureComputeInstances,
      generatedAt: new Date().toISOString(),
      isHealthy: azureComputeInstances.connected,
    };

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("[API] /api/cloud/azure/status error:", error);

    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: "Failed to fetch Azure compute instances",
        details: errorMessage,
        code: "AZURE_FETCH_ERROR",
      },
      { status: 500 }
    );
  }
}
