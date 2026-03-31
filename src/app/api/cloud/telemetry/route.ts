import { NextResponse } from "next/server";

import { getAwsAccountStatus, getAwsNormalizedTelemetry } from "@/lib/cloud/aws";
import { getAzureAccountStatus, getAzureNormalizedTelemetry } from "@/lib/cloud/azure";
import type { CloudTelemetry } from "@/lib/cloud/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const [aws, azure, awsNormalized, azureNormalized] = await Promise.all([
    getAwsAccountStatus(),
    getAzureAccountStatus(),
    getAwsNormalizedTelemetry(),
    getAzureNormalizedTelemetry(),
  ]);

  const payload: CloudTelemetry = {
    accounts: [aws, azure],
    mockFallback: !aws.connected || !azure.connected,
    generatedAt: new Date().toISOString(),
    aws: awsNormalized,
    azure: azureNormalized,
  };

  return NextResponse.json(payload, { status: 200 });
}

