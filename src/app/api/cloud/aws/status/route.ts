import { NextResponse, type NextRequest } from "next/server";
import { getAwsComputeInstances } from "@/lib/cloud/aws";
import type { ComputeInfrastructureStatus } from "@/types/cloud";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/cloud/aws/status
 * Fetches live AWS EC2 instances and CloudWatch metrics
 *
 * Response:
 * {
 *   "aws": {
 *     "provider": "aws",
 *     "connected": true,
 *     "instances": [
 *       {
 *         "id": "aws:us-east-1:i-1234567890abcdef0",
 *         "provider": "aws",
 *         "name": "web-server-01",
 *         "state": "running",
 *         "instanceType": "t3.micro",
 *         "region": "us-east-1a",
 *         "cpuUsage": 45.2,
 *         "memoryUsage": null,
 *         "networkBytesIn": 125000,
 *         "networkBytesOut": 98000,
 *         "launchTime": "2024-01-15T10:30:00Z",
 *         "lastUpdated": "2024-01-20T14:45:30Z"
 *       }
 *     ],
 *     "totalInstances": 3,
 *     "runningCount": 2,
 *     "stoppedCount": 1,
 *     "checkedAt": "2024-01-20T14:45:30Z"
 *   },
 *   "generatedAt": "2024-01-20T14:45:30Z",
 *   "isHealthy": true
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Basic rate limiting check (optional)
    if (request.method !== "GET") {
      return NextResponse.json(
        { error: "Method not allowed", code: "METHOD_NOT_ALLOWED" },
        { status: 405 }
      );
    }

    // Fetch AWS compute instances
    const awsComputeInstances = await getAwsComputeInstances();

    const response: ComputeInfrastructureStatus = {
      aws: awsComputeInstances,
      generatedAt: new Date().toISOString(),
      isHealthy: awsComputeInstances.connected,
    };

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("[API] /api/cloud/aws/status error:", error);

    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: "Failed to fetch AWS compute instances",
        details: errorMessage,
        code: "AWS_FETCH_ERROR",
      },
      { status: 500 }
    );
  }
}
