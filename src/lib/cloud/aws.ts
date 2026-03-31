import {
  STSClient,
  AssumeRoleCommand,
  GetCallerIdentityCommand,
  type Credentials as AwsSdkCredentials,
} from "@aws-sdk/client-sts";
import { EKSClient, ListClustersCommand } from "@aws-sdk/client-eks";
import { Route53Client, ListHostedZonesCommand } from "@aws-sdk/client-route-53";
import { CloudWatchClient, GetMetricDataCommand } from "@aws-sdk/client-cloudwatch";

import type { CloudAccountStatus } from "./types";
import type { AwsNormalizedTelemetry } from "./types";

function getRegion() {
  return process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1";
}

async function getAssumedStsCredentials(region: string): Promise<AwsSdkCredentials | undefined> {
  const assumeRoleArn = process.env.AWS_ASSUME_ROLE_ARN;
  if (!assumeRoleArn) return undefined;

  const baseSts = new STSClient({ region });
  const sessionName = process.env.AWS_ASSUME_ROLE_SESSION_NAME || `acc-${Date.now()}`;

  const resp = await baseSts.send(
    new AssumeRoleCommand({
      RoleArn: assumeRoleArn,
      RoleSessionName: sessionName,
      DurationSeconds: process.env.AWS_ASSUME_ROLE_DURATION_SECONDS
        ? Number(process.env.AWS_ASSUME_ROLE_DURATION_SECONDS)
        : 900,
    })
  );

  const c = resp.Credentials;
  if (!c?.AccessKeyId || !c.SecretAccessKey || !c.SessionToken) return undefined;

  return {
    AccessKeyId: c.AccessKeyId,
    SecretAccessKey: c.SecretAccessKey,
    SessionToken: c.SessionToken,
    Expiration: c.Expiration,
  } as AwsSdkCredentials;
}

async function getAwsIdentity(region: string) {
  const assumedCreds = await getAssumedStsCredentials(region).catch(() => undefined);

  const sts = assumedCreds
    ? new STSClient({
        region,
        credentials: {
          accessKeyId: assumedCreds.AccessKeyId!,
          secretAccessKey: assumedCreds.SecretAccessKey!,
          sessionToken: assumedCreds.SessionToken!,
        },
      })
    : new STSClient({ region });

  return sts.send(new GetCallerIdentityCommand({}));
}

export async function getAwsAccountStatus(): Promise<CloudAccountStatus> {
  const checkedAt = new Date().toISOString();
  const region = getRegion();

  try {
    const identity = await getAwsIdentity(region);

    return {
      provider: "aws",
      connected: true,
      accountId: identity.Account,
      displayName: identity.Arn,
      environment: region,
      details: "STS caller identity retrieved successfully.",
      checkedAt,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to connect to AWS.";
    return {
      provider: "aws",
      connected: false,
      environment: region,
      details: message,
      checkedAt,
    };
  }
}

export async function getAwsNormalizedTelemetry(): Promise<AwsNormalizedTelemetry> {
  const checkedAt = new Date().toISOString();
  const region = getRegion();

  // Use the same assume-role logic as identity checks.
  const assumedCreds = await getAssumedStsCredentials(region).catch(() => undefined);
  const credentials = assumedCreds
    ? {
        accessKeyId: assumedCreds.AccessKeyId!,
        secretAccessKey: assumedCreds.SecretAccessKey!,
        sessionToken: assumedCreds.SessionToken!,
      }
    : undefined;

  const eks = new EKSClient({ region, ...(credentials ? { credentials } : {}) });
  const r53 = new Route53Client({ region, ...(credentials ? { credentials } : {}) });

  let configured = false;
  const detailsParts: string[] = [];

  let eksClusters: string[] | undefined;
  let hostedZones: Array<{ id: string; name: string }> | undefined;
  let cloudwatch:
    | AwsNormalizedTelemetry["cloudwatch"]
    | undefined = undefined;

  // EKS polling (cluster list)
  try {
    const resp = await eks.send(new ListClustersCommand({}));
    eksClusters = (resp.clusters ?? []).slice(0, 10);
    configured = true;
  } catch (error) {
    detailsParts.push(`EKS polling failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Route53 polling (hosted zones list)
  try {
    const resp = await r53.send(new ListHostedZonesCommand({}));
    hostedZones = (resp.HostedZones ?? []).slice(0, 10).map((z) => ({
      id: z.Id ?? "unknown",
      name: z.Name ?? "unknown",
    }));
    configured = true;
  } catch (error) {
    detailsParts.push(
      `Route53 polling failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  // CloudWatch polling (optional, requires metric configuration env vars)
  const metricName = process.env.AWS_CLOUDWATCH_METRIC_NAME;
  const namespace = process.env.AWS_CLOUDWATCH_NAMESPACE;
  const dimensionName = process.env.AWS_CLOUDWATCH_DIMENSION_NAME;
  const dimensionValue = process.env.AWS_CLOUDWATCH_DIMENSION_VALUE;

  if (metricName && namespace && dimensionName && dimensionValue) {
    try {
      const cw = new CloudWatchClient({ region, ...(credentials ? { credentials } : {}) });
      const periodSeconds = process.env.AWS_CLOUDWATCH_PERIOD_SECONDS
        ? Number(process.env.AWS_CLOUDWATCH_PERIOD_SECONDS)
        : 60;

      const statistic = process.env.AWS_CLOUDWATCH_STATISTIC || "Average";
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - 5 * 60 * 1000);

      const resp = await cw.send(
        new GetMetricDataCommand({
          StartTime: startTime,
          EndTime: endTime,
          MetricDataQueries: [
            {
              Id: "m1",
              MetricStat: {
                Metric: {
                  Namespace: namespace,
                  MetricName: metricName,
                  Dimensions: [{ Name: dimensionName, Value: dimensionValue }],
                },
                Period: periodSeconds,
                Stat: statistic,
              },
              ReturnData: true,
            },
          ],
          ScanBy: "TimestampDescending",
          MaxDatapoints: 5,
        })
      );

      const results = resp.MetricDataResults ?? [];
      const values = results[0]?.Values ?? [];
      const times = results[0]?.Timestamps ?? [];
      const lastIdx = values.length - 1;

      if (lastIdx >= 0 && times[lastIdx]) {
        cloudwatch = {
          metricName,
          namespace,
          dimensions: { [dimensionName]: dimensionValue },
          datapoint: {
            at: times[lastIdx].toISOString(),
            value: Number(values[lastIdx]),
          },
        };
        configured = true;
      } else {
        detailsParts.push("CloudWatch metrics available but datapoint parsing failed.");
      }
    } catch (error) {
      detailsParts.push(
        `CloudWatch polling failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  } else {
    detailsParts.push(
      "CloudWatch polling not configured (set AWS_CLOUDWATCH_METRIC_NAME/NAMESPACE/DIMENSION_NAME/DIMENSION_VALUE)."
    );
  }

  return {
    checkedAt,
    configured,
    details: detailsParts.length ? detailsParts.join(" | ") : undefined,
    eksClusters,
    hostedZones,
    cloudwatch,
  };
}

