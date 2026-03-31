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

