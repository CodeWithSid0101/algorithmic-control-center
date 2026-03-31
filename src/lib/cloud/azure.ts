import { ClientSecretCredential } from "@azure/identity";
import { ContainerServiceClient } from "@azure/arm-containerservice";
import { ComputeManagementClient } from "@azure/arm-compute";
import { MonitorClient } from "@azure/arm-monitor";

import type {
  CloudAccountStatus,
  AzureNormalizedTelemetry,
  UnifiedInstance,
  ProviderComputeInstances,
} from "@/types/cloud";

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
        MonitorClient?: new (
          credential: unknown,
          subscriptionId: string
        ) => { metrics: { list: (params: unknown) => Promise<unknown> } };
      };

      const mod = (await import("@azure/arm-monitor")) as unknown as MonitorModule;
      const MonitorClientCtor = mod.MonitorClient;
      if (!MonitorClientCtor) {
        detailsParts.push("Azure Monitor adapter not available (missing @azure/arm-monitor exports).");
      } else {
        const credential = getAzureCredential();
        if (!subscriptionId) {
          detailsParts.push("Azure Monitor polling requires AZURE_SUBSCRIPTION_ID.");
        } else {
          const monitorClient = new MonitorClientCtor(credential, subscriptionId) as unknown as {
            metrics: { list: (resourceUri: unknown, options: unknown) => Promise<unknown> };
          };
          const now = new Date();
          const start = new Date(now.getTime() - 5 * 60 * 1000);

          // Method signature varies across SDK versions; treat response as unknown and parse defensively.
          const res = await monitorClient.metrics.list(
            monitorResourceId,
            {
              timespan: `${start.toISOString()}/${now.toISOString()}`,
              interval: "PT1M",
              metricnames: monitorMetricName,
              aggregation: monitorMetricAggregation,
              top: 1,
            }
          );

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

/**
 * Fetch VM metrics from Azure Monitor for a specific Virtual Machine
 */
async function getAzureVmMetrics(
  resourceId: string,
  credential: ClientSecretCredential,
  subscriptionId: string
): Promise<{ cpuUsage: number | null; memoryUsage: number | null }> {
  try {
    const monitorClient = new MonitorClient(credential, subscriptionId);
    const now = new Date();
    const start = new Date(now.getTime() - 5 * 60 * 1000); // Last 5 minutes

    const response = await monitorClient.metrics.list(
      resourceId,
      {
        timespan: `${start.toISOString()}/${now.toISOString()}`,
        interval: "PT1M",
        metricnames: "Percentage CPU",
        aggregation: "Average",
        top: 1,
      }
    );

    let cpuUsage: number | null = null;

    // Extract CPU metric from response
    if (response.value && response.value.length > 0) {
      const metric = response.value[0];
      if (metric.timeseries && metric.timeseries.length > 0) {
        const data = metric.timeseries[0].data;
        if (data && data.length > 0) {
          const lastPoint = data[data.length - 1];
          cpuUsage = lastPoint.average ?? null;
        }
      }
    }

    return {
      cpuUsage,
      memoryUsage: null, // Azure doesn't expose memory via standard metrics without agent
    };
  } catch (error) {
    console.error(`[Azure] Failed to fetch metrics for ${resourceId}:`, error);
    return { cpuUsage: null, memoryUsage: null };
  }
}

/**
 * Fetch Azure Virtual Machines and normalize them into unified format
 */
export async function getAzureComputeInstances(): Promise<ProviderComputeInstances> {
  const checkedAt = new Date().toISOString();

  if (!hasAzureCredentials()) {
    return {
      provider: "azure",
      connected: false,
      instances: [],
      totalInstances: 0,
      runningCount: 0,
      stoppedCount: 0,
      details:
        "Missing AZURE_TENANT_ID / AZURE_CLIENT_ID / AZURE_CLIENT_SECRET environment variables.",
      checkedAt,
    };
  }

  const subscriptionId = process.env.AZURE_SUBSCRIPTION_ID;
  if (!subscriptionId) {
    return {
      provider: "azure",
      connected: false,
      instances: [],
      totalInstances: 0,
      runningCount: 0,
      stoppedCount: 0,
      details: "Missing AZURE_SUBSCRIPTION_ID environment variable.",
      checkedAt,
    };
  }

  try {
    const credential = getAzureCredential();
    const computeClient = new ComputeManagementClient(credential, subscriptionId);

    const instances: UnifiedInstance[] = [];
    let runningCount = 0;
    let stoppedCount = 0;

    // List all VMs in the subscription across all resource groups
    const vmsIter = computeClient.virtualMachines.listAll();
    for await (const vm of vmsIter) {
      if (!vm.id || !vm.name) continue;

      const resourceGroup = vm.id.split("/").slice(0, 5).join("/").split("/")[4];
      if (!resourceGroup) continue;

      // Get VM instance view to check power state
      const instanceView = await computeClient.virtualMachines.instanceView(resourceGroup, vm.name);

      // Extract power state from status codes
      let state: UnifiedInstance["state"] = "unknown";
      let isRunning = false;

      if (instanceView.statuses) {
        for (const status of instanceView.statuses) {
          if (status.code?.startsWith("PowerState/")) {
            const powerState = status.code.split("/")[1];
            if (powerState === "running") {
              state = "running";
              isRunning = true;
            } else if (powerState === "stopped") {
              state = "stopped";
            } else if (powerState === "deallocated") {
              state = "deallocated";
            }
            break;
          }
        }
      }

      if (isRunning) runningCount++;
      if (state === "stopped" || state === "deallocated") stoppedCount++;

      // Fetch metrics for this VM
      const metrics = await getAzureVmMetrics(vm.id, credential, subscriptionId);

      const unifiedInstance: UnifiedInstance = {
        id: `azure:${subscriptionId}:${vm.name}`,
        provider: "azure",
        name: vm.name,
        state,
        instanceType: vm.hardwareProfile?.vmSize || "unknown",
        region: vm.location || "unknown",
        cpuUsage: metrics.cpuUsage,
        memoryUsage: metrics.memoryUsage,
        networkBytesIn: null, // Azure doesn't expose network metrics by default
        networkBytesOut: null,
        launchTime: new Date().toISOString(), // Azure doesn't always provide creation time
        lastUpdated: new Date().toISOString(),
        metadata: {
          azureResourceId: vm.id,
          tags: vm.tags,
        },
      };

      instances.push(unifiedInstance);
    }

    return {
      provider: "azure",
      connected: true,
      instances,
      totalInstances: instances.length,
      runningCount,
      stoppedCount,
      checkedAt,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to fetch Azure Virtual Machines.";
    return {
      provider: "azure",
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
