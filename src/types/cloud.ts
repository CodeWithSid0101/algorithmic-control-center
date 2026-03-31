export type CloudProvider = "aws" | "azure";

export type CloudAccountStatus = {
  provider: CloudProvider;
  connected: boolean;
  accountId?: string;
  tenantId?: string;
  displayName?: string;
  environment?: string;
  details?: string;
  checkedAt: string;
};

export type AwsNormalizedTelemetry = {
  checkedAt: string;
  /**
   * If AWS_*_POLL_* env vars are not provided or permissions are missing, this
   * will be `configured=false` with a descriptive `details` message.
   */
  configured: boolean;
  details?: string;
  eksClusters?: string[];
  hostedZones?: Array<{ id: string; name: string }>;
  /**
   * Optional CloudWatch metrics snapshot (shape depends on your metric config).
   */
  cloudwatch?: {
    metricName?: string;
    namespace?: string;
    dimensions?: Record<string, string>;
    datapoint?: {
      at: string;
      value: number;
    };
  };
};

export type AzureNormalizedTelemetry = {
  checkedAt: string;
  configured: boolean;
  details?: string;
  subscriptionId?: string;
  aksClusters?: string[];
  monitorMetrics?: {
    metricName?: string;
    resourceId?: string;
    datapoint?: {
      at: string;
      value: number;
    };
  };
};

export type CloudTelemetry = {
  accounts: CloudAccountStatus[];
  mockFallback: boolean;
  generatedAt: string;
  aws?: AwsNormalizedTelemetry;
  azure?: AzureNormalizedTelemetry;
};

/**
 * Unified compute instance representation across AWS and Azure
 * This is the Cloud Abstraction Layer's normalized schema
 */
export type UnifiedInstance = {
  /** Unique identifier combining provider and instance ID */
  id: string;
  /** Cloud provider (aws or azure) */
  provider: CloudProvider;
  /** Human-readable instance name */
  name: string;
  /** Current state: running, stopped, terminated, deallocated, etc */
  state: "running" | "stopped" | "stopping" | "starting" | "deallocated" | "deallocating" | "unknown";
  /** AWS: t2.micro, t3.small, etc | Azure: Standard_B1s, Standard_D2s_v3, etc */
  instanceType: string;
  /** Region or location */
  region: string;
  /** CPU usage percentage (0-100), null if unavailable */
  cpuUsage: number | null;
  /** Memory usage percentage (0-100), null if unavailable */
  memoryUsage: number | null;
  /** Network bytes in */
  networkBytesIn: number | null;
  /** Network bytes out */
  networkBytesOut: number | null;
  /** Launch/creation time */
  launchTime: string;
  /** Last metric update time */
  lastUpdated: string;
  /** Provider-specific metadata */
  metadata?: {
    awsInstanceId?: string;
    azureResourceId?: string;
    tags?: Record<string, string>;
  };
};

/**
 * Container for compute instances from a single provider
 */
export type ProviderComputeInstances = {
  provider: CloudProvider;
  connected: boolean;
  instances: UnifiedInstance[];
  totalInstances: number;
  runningCount: number;
  stoppedCount: number;
  details?: string;
  checkedAt: string;
};

/**
 * Complete compute infrastructure status from all providers
 */
export type ComputeInfrastructureStatus = {
  aws?: ProviderComputeInstances;
  azure?: ProviderComputeInstances;
  generatedAt: string;
  isHealthy: boolean;
};
