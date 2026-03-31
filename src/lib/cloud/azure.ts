import { ClientSecretCredential } from "@azure/identity";
import { ContainerServiceClient } from "@azure/arm-containerservice";

import type { CloudAccountStatus } from "./types";
import type { AzureNormalizedTelemetry } from "./types";

function hasAzureCredentials() {
  return Boolean(
    process.env.AZURE_TENANT_ID &&
      process.env.AZURE_CLIENT_ID &&
      process.env.AZURE_CLIENT_SECRET
  );
}

export async function getAzureAccountStatus(): Promise<CloudAccountStatus> {
  const checkedAt = new Date().toISOString();

  if (!hasAzureCredentials()) {
    return {
      provider: "azure",
      connected: false,
      details:
        "Missing AZURE_TENANT_ID / AZURE_CLIENT_ID / AZURE_CLIENT_SECRET environment variables.",
      checkedAt,
    };
  }

  const tenantId = process.env.AZURE_TENANT_ID!;
  const clientId = process.env.AZURE_CLIENT_ID!;
  const clientSecret = process.env.AZURE_CLIENT_SECRET!;

  try {
    const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
    const token = await credential.getToken("https://management.azure.com/.default");

    return {
      provider: "azure",
      connected: true,
      tenantId,
      displayName: clientId,
      details: token?.token
        ? "Azure AD token acquired via service principal."
        : "Azure credential initialized but token not returned.",
      checkedAt,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to connect to Azure.";
    return {
      provider: "azure",
      connected: false,
      tenantId,
      details: message,
      checkedAt,
    };
  }
}

function getAzureCredential() {
  const tenantId = process.env.AZURE_TENANT_ID!;
  const clientId = process.env.AZURE_CLIENT_ID!;
  const clientSecret = process.env.AZURE_CLIENT_SECRET!;
  return new ClientSecretCredential(tenantId, clientId, clientSecret);
}

export async function getAzureNormalizedTelemetry(): Promise<AzureNormalizedTelemetry> {
  const checkedAt = new Date().toISOString();

  if (!hasAzureCredentials()) {
    return {
      checkedAt,
      configured: false,
      details: "Missing AZURE_TENANT_ID / AZURE_CLIENT_ID / AZURE_CLIENT_SECRET environment variables.",
    };
  }

  const detailsParts: string[] = [];

  const subscriptionId = process.env.AZURE_SUBSCRIPTION_ID;
  let configured = false;
  let aksClusters: string[] | undefined;

  try {
    const credential = getAzureCredential();
    if (!subscriptionId) {
      detailsParts.push("Azure subscription id not configured (set AZURE_SUBSCRIPTION_ID).");
    } else {
      const rg = process.env.AZURE_AKS_RESOURCE_GROUP;
      if (!rg) {
        detailsParts.push("AKS polling not configured (set AZURE_AKS_RESOURCE_GROUP).");
      } else {
        const containerClient = new ContainerServiceClient(credential, subscriptionId);
        // AKS cluster list can be scoped by resource group; this keeps the adapter secure and predictable.
        const clusters: string[] = [];
        const it = containerClient.managedClusters.listByResourceGroup(rg);
        for await (const c of it) {
          if (c.name) clusters.push(c.name);
          if (clusters.length >= 10) break;
        }
        aksClusters = clusters;
        if (aksClusters.length) configured = true;
      }
    }
  } catch (error) {
    detailsParts.push(`Azure polling failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Azure Monitor metrics polling scaffolding:
  // Implemented as “best effort” and only activated if you set the required env vars.
  // This avoids making insecure guesses about metric/resource configuration.
  const monitorMetricName = process.env.AZURE_MONITOR_METRIC_NAME;
  const monitorResourceId = process.env.AZURE_MONITOR_RESOURCE_ID;
  const monitorMetricAggregation = process.env.AZURE_MONITOR_METRIC_AGGREGATION || "Average";

  let monitorMetrics: AzureNormalizedTelemetry["monitorMetrics"] | undefined = undefined;
  if (monitorMetricName && monitorResourceId) {
    try {
      // Lazy import to avoid hard dependency problems if you don't need this feature.
      type MonitorModule = {
        MonitorManagementClient?: new (
          credential: unknown,
          subscriptionId: string
        ) => { metrics: { list: (params: unknown) => Promise<unknown> } };
        MonitorClient?: new (
          credential: unknown,
          subscriptionId: string
        ) => { metrics: { list: (params: unknown) => Promise<unknown> } };
      };

      const mod = (await import("@azure/arm-monitor")) as unknown as MonitorModule;
      const MonitorClientCtor = mod.MonitorManagementClient ?? mod.MonitorClient;
      if (!MonitorClientCtor) {
        detailsParts.push("Azure Monitor adapter not available (missing @azure/arm-monitor exports).");
      } else {
        const credential = getAzureCredential();
        if (!subscriptionId) {
          detailsParts.push("Azure Monitor polling requires AZURE_SUBSCRIPTION_ID.");
        } else {
          const monitorClient = new MonitorClientCtor(credential, subscriptionId) as unknown as {
            metrics: { list: (params: unknown) => Promise<unknown> };
          };
          const now = new Date();
          const start = new Date(now.getTime() - 5 * 60 * 1000);

          // Method signature varies across SDK versions; treat response as unknown and parse defensively.
          const res = await monitorClient.metrics.list({
            resourceUri: monitorResourceId,
            timespan: `${start.toISOString()}/${now.toISOString()}`,
            interval: "PT1M",
            metricnames: monitorMetricName,
            aggregation: monitorMetricAggregation,
            top: 1,
          });

          const series =
            (res as { value?: Array<{ timeseries?: Array<{ data?: unknown[] }> }> } | undefined)?.value?.[0]
              ?.timeseries?.[0]?.data ?? [];
          const last = series[series.length - 1];
          const valueCandidate =
            (last as { average?: unknown; total?: unknown; maximum?: unknown; minimum?: unknown })?.average ??
            (last as { average?: unknown; total?: unknown; maximum?: unknown; minimum?: unknown })?.total ??
            (last as { average?: unknown; total?: unknown; maximum?: unknown; minimum?: unknown })?.maximum ??
            (last as { average?: unknown; total?: unknown; maximum?: unknown; minimum?: unknown })?.minimum;

          const atCandidate =
            (last as { timeStamp?: unknown; time?: unknown })?.timeStamp ??
            (last as { timeStamp?: unknown; time?: unknown })?.time;

          const at = typeof atCandidate === "string" ? atCandidate : now.toISOString();

          if (typeof valueCandidate === "number") {
            monitorMetrics = {
              metricName: monitorMetricName,
              resourceId: monitorResourceId,
              datapoint: { at, value: valueCandidate },
            };
            configured = true;
          } else {
            detailsParts.push("Azure Monitor metrics returned no numeric datapoint.");
          }
        }
      }
    } catch (error) {
      detailsParts.push(
        `Azure Monitor metrics polling failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  } else {
    detailsParts.push("Azure Monitor polling not configured (set AZURE_MONITOR_METRIC_NAME + AZURE_MONITOR_RESOURCE_ID).");
  }

  return {
    checkedAt,
    configured,
    details: detailsParts.length ? detailsParts.join(" | ") : undefined,
    subscriptionId,
    aksClusters,
    monitorMetrics,
  };
}

