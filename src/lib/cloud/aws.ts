import {
  STSClient,
  AssumeRoleCommand,
  GetCallerIdentityCommand,
  type Credentials as AwsSdkCredentials,
} from "@aws-sdk/client-sts";
import { EKSClient, ListClustersCommand } from "@aws-sdk/client-eks";
import { Route53Client, ListHostedZonesCommand } from "@aws-sdk/client-route-53";
import { CloudWatchClient, GetMetricDataCommand } from "@aws-sdk/client-cloudwatch";
import { EC2Client, DescribeInstancesCommand } from "@aws-sdk/client-ec2";

import type {
  CloudAccountStatus,
  AwsNormalizedTelemetry,
  UnifiedInstance,
  ProviderComputeInstances,
} from "@/types/cloud";

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

/**
 * Fetch metric data from CloudWatch for a specific instance
 */
async function getInstanceMetrics(
  ec2InstanceId: string,
  region: string,
  credentials?: { accessKeyId: string; secretAccessKey: string; sessionToken?: string }
): Promise<{ cpuUsage: number | null; networkBytesIn: number | null; networkBytesOut: number | null }> {
  try {
    const cw = new CloudWatchClient({ region, ...(credentials ? { credentials } : {}) });
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - 5 * 60 * 1000); // Last 5 minutes

    const response = await cw.send(
      new GetMetricDataCommand({
        MetricDataQueries: [
          {
            Id: "cpu_usage",
            MetricStat: {
              Metric: {
                Namespace: "AWS/EC2",
                MetricName: "CPUUtilization",
                Dimensions: [
                  {
                    Name: "InstanceId",
                    Value: ec2InstanceId,
                  },
                ],
              },
              Period: 300,
              Stat: "Average",
            },
            ReturnData: true,
          },
          {
            Id: "network_in",
            MetricStat: {
              Metric: {
                Namespace: "AWS/EC2",
                MetricName: "NetworkIn",
                Dimensions: [
                  {
                    Name: "InstanceId",
                    Value: ec2InstanceId,
                  },
                ],
              },
              Period: 300,
              Stat: "Sum",
            },
            ReturnData: true,
          },
          {
            Id: "network_out",
            MetricStat: {
              Metric: {
                Namespace: "AWS/EC2",
                MetricName: "NetworkOut",
                Dimensions: [
                  {
                    Name: "InstanceId",
                    Value: ec2InstanceId,
                  },
                ],
              },
              Period: 300,
              Stat: "Sum",
            },
            ReturnData: true,
          },
        ],
        StartTime: startTime,
        EndTime: endTime,
        ScanBy: "TimestampDescending",
        MaxDatapoints: 1,
      })
    );

    const cpuData = response.MetricDataResults?.find((m) => m.Id === "cpu_usage");
    const networkInData = response.MetricDataResults?.find((m) => m.Id === "network_in");
    const networkOutData = response.MetricDataResults?.find((m) => m.Id === "network_out");

    return {
      cpuUsage:
        cpuData?.Values && cpuData.Values.length > 0
          ? Math.round(Number(cpuData.Values[0]) * 100) / 100
          : null,
      networkBytesIn:
        networkInData?.Values && networkInData.Values.length > 0
          ? parseInt(String(networkInData.Values[0]), 10)
          : null,
      networkBytesOut:
        networkOutData?.Values && networkOutData.Values.length > 0
          ? parseInt(String(networkOutData.Values[0]), 10)
          : null,
    };
  } catch (error) {
    console.error(`[AWS] Failed to fetch metrics for ${ec2InstanceId}:`, error);
    return { cpuUsage: null, networkBytesIn: null, networkBytesOut: null };
  }
}

/**
 * Fetch EC2 instances and normalize them into unified format
 */
export async function getAwsComputeInstances(): Promise<ProviderComputeInstances> {
  const checkedAt = new Date().toISOString();
  const region = getRegion();

  try {
    // Get credentials if assume role is configured
    const assumedCreds = await getAssumedStsCredentials(region).catch(() => undefined);
    const credentials = assumedCreds
      ? {
          accessKeyId: assumedCreds.AccessKeyId!,
          secretAccessKey: assumedCreds.SecretAccessKey!,
          sessionToken: assumedCreds.SessionToken!,
        }
      : undefined;

    const ec2 = new EC2Client({ region, ...(credentials ? { credentials } : {}) });

    // Fetch all EC2 instances
    const response = await ec2.send(
      new DescribeInstancesCommand({
        Filters: [
          {
            Name: "instance-state-name",
            Values: ["running", "stopped", "stopping", "starting"],
          },
        ],
      })
    );

    const instances: UnifiedInstance[] = [];
    let runningCount = 0;
    let stoppedCount = 0;

    // Iterate through reservations and instances
    for (const reservation of response.Reservations ?? []) {
      for (const instance of reservation.Instances ?? []) {
        const instanceId = instance.InstanceId;
        const state = instance.State?.Name;

        if (!instanceId || !state) continue;

        // Map AWS state to unified state
        const unifiedState = (
          ["running", "stopped", "stopping", "starting"].includes(state)
            ? state
            : "unknown"
        ) as UnifiedInstance["state"];

        if (unifiedState === "running") runningCount++;
        if (unifiedState === "stopped") stoppedCount++;

        // Fetch metrics for this instance
        const metrics = await getInstanceMetrics(instanceId, region, credentials);

        const unifiedInstance: UnifiedInstance = {
          id: `aws:${region}:${instanceId}`,
          provider: "aws",
          name: instance.Tags?.find((t) => t.Key === "Name")?.Value || instanceId,
          state: unifiedState,
          instanceType: instance.InstanceType || "unknown",
          region: instance.Placement?.AvailabilityZone || region,
          cpuUsage: metrics.cpuUsage,
          memoryUsage: null, // AWS doesn't expose memory via EC2 API by default
          networkBytesIn: metrics.networkBytesIn,
          networkBytesOut: metrics.networkBytesOut,
          launchTime: instance.LaunchTime?.toISOString() || new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
          metadata: {
            awsInstanceId: instanceId,
            tags: instance.Tags?.reduce(
              (acc, tag) => {
                if (tag.Key && tag.Value) {
                  acc[tag.Key] = tag.Value;
                }
                return acc;
              },
              {} as Record<string, string>
            ),
          },
        };

        instances.push(unifiedInstance);
      }
    }

    return {
      provider: "aws",
      connected: true,
      instances,
      totalInstances: instances.length,
      runningCount,
      stoppedCount,
      checkedAt,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to fetch EC2 instances.";
    return {
      provider: "aws",
      connected: false,
      instances: [],
      totalInstances: 0,
      runningCount: 0,
      stoppedCount: 0,
      details: message,
      checkedAt,
    };
  }
}
