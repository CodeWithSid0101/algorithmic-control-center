# Algorithmic Control Center - Live Cloud Integration Guide

## Overview

Your Algorithmic Control Center now has **real-time cloud infrastructure integration** with both AWS and Azure. This guide explains how to use, configure, and extend the system.

---

## Architecture

### Cloud Abstraction Layer

The system follows a layered architecture:

```
┌─────────────────────────────────────────┐
│        React Frontend Dashboard         │
│     (LiveInfrastructureGrid Component)  │
└────────────────────┬────────────────────┘
                     │
         (HTTP Polling - 15 seconds)
                     │
          ┌──────────┴──────────┐
          │                     │
┌─────────▼─────────┐  ┌───────▼──────────┐
│  /api/cloud/aws   │  │ /api/cloud/azure │
│     /status       │  │    /status       │
└────────┬──────────┘  └────────┬─────────┘
         │                      │
┌────────▼──────────┐  ┌────────▼─────────┐
│  AWS SDK Layer    │  │ Azure SDK Layer   │
│  (EC2, CloudWatch)│  │ (Compute, Monitor)│
└────────┬──────────┘  └────────┬─────────┘
         │                      │
┌────────▼──────────┐  ┌────────▼─────────┐
│  AWS API Calls    │  │ Azure API Calls   │
│  (Real Services)  │  │ (Real Services)   │
└───────────────────┘  └───────────────────┘
```

### Unified Data Schema

All instances from AWS and Azure are normalized into a single `UnifiedInstance` type:

```typescript
type UnifiedInstance = {
  id: string;                          // aws:region:id or azure:subscription:name
  provider: "aws" | "azure";
  name: string;
  state: "running" | "stopped" | "stopping" | "starting" | "deallocated" | "unknown";
  instanceType: string;                // EC2 instance type or VM size
  region: string;
  cpuUsage: number | null;             // Percentage (0-100)
  memoryUsage: number | null;
  networkBytesIn: number | null;
  networkBytesOut: number | null;
  launchTime: string;
  lastUpdated: string;
  metadata?: { tags?: Record<string, string>; };
};
```

---

## Setup Instructions

### 1. Environment Variables

Copy `.env.example` to `.env.local` and fill in your credentials:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your actual credentials:

#### AWS Configuration:

```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
```

#### Azure Configuration:

```env
AZURE_TENANT_ID=your_tenant_id
AZURE_CLIENT_ID=your_client_id
AZURE_CLIENT_SECRET=your_client_secret
AZURE_SUBSCRIPTION_ID=your_subscription_id
```

### 2. AWS Credential Setup

Create an IAM user with minimal permissions:

```bash
# 1. Create user
aws iam create-user --user-name control-center

# 2. Create policy
cat > policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ec2:DescribeInstances",
        "cloudwatch:GetMetricData",
        "eks:ListClusters",
        "route53:ListHostedZones",
        "sts:GetCallerIdentity"
      ],
      "Resource": "*"
    }
  ]
}
EOF

# 3. Attach policy
aws iam put-user-policy --user-name control-center \
  --policy-name control-center-policy \
  --policy-document file://policy.json

# 4. Create access keys
aws iam create-access-key --user-name control-center
# Copy AccessKeyId and SecretAccessKey to .env.local
```

### 3. Azure Credential Setup

Create a service principal:

```bash
# Create service principal
az ad sp create-for-rbac --name "control-center" \
  --role "Reader" \
  --scope "/subscriptions/{your-subscription-id}"

# Output will include:
# - appId (→ AZURE_CLIENT_ID)
# - password (→ AZURE_CLIENT_SECRET)
# - tenant (→ AZURE_TENANT_ID)
```

---

## Using the Dashboard

### Component: `LiveInfrastructureGrid`

The main UI component that displays all compute instances:

```tsx
import { LiveInfrastructureGrid } from "@/components/cloud/LiveInfrastructureGrid";

export default function CloudPage() {
  return (
    <LiveInfrastructureGrid 
      pollInterval={15000}  // Refresh every 15 seconds
      providers={["aws", "azure"]}
    />
  );
}
```

#### Features:

- **Live Status Indicator**: Glowing green dot when connected ✓
- **Auto-Refresh**: Polls every 15 seconds by default (configurable)
- **Provider Cards**: Separate sections for AWS EC2 and Azure VMs
- **Metrics Display**: CPU, Memory, Network metrics for each instance
- **State Badges**: Visual indicators for running/stopped status
- **Manual Refresh**: Button to force immediate data fetch

### Hook: `useComputeInstances`

Low-level hook for fetching and polling cloud instances:

```tsx
const {
  data,                // Full response with AWS and Azure data
  allInstances,        // All instances from both providers
  awsInstances,        // Only AWS instances
  azureInstances,      // Only Azure instances
  isLoading,
  isHealthy,
  lastUpdated,
  error,
  refetch,             // Manual refresh function
} = useComputeInstances({
  pollInterval: 15000,
  providers: ["aws", "azure"],
});
```

---

## API Endpoints

### GET `/api/cloud/aws/status`

Fetches live AWS EC2 instances and CloudWatch metrics.

**Response:**

```json
{
  "aws": {
    "provider": "aws",
    "connected": true,
    "instances": [
      {
        "id": "aws:us-east-1:i-1234567890abcdef0",
        "provider": "aws",
        "name": "web-server-01",
        "state": "running",
        "instanceType": "t3.micro",
        "region": "us-east-1a",
        "cpuUsage": 45.2,
        "memoryUsage": null,
        "networkBytesIn": 125000,
        "networkBytesOut": 98000,
        "launchTime": "2024-01-15T10:30:00Z",
        "lastUpdated": "2024-01-20T14:45:30Z"
      }
    ],
    "totalInstances": 3,
    "runningCount": 2,
    "stoppedCount": 1,
    "checkedAt": "2024-01-20T14:45:30Z"
  },
  "generatedAt": "2024-01-20T14:45:30Z",
  "isHealthy": true
}
```

### GET `/api/cloud/azure/status`

Fetches live Azure Virtual Machines and Monitor metrics.

**Response:** (Same schema as AWS, with Azure-specific properties)

### GET `/api/cloud/infrastructure/status`

Unified endpoint that fetches both AWS and Azure in parallel.

**Response:**

```json
{
  "aws": { ... },
  "azure": { ... },
  "generatedAt": "2024-01-20T14:45:30Z",
  "isHealthy": true
}
```

---

## Metrics Explained

### CPU Usage

- **AWS**: Fetched from CloudWatch `CPUUtilization` metric for each EC2 instance
- **Azure**: Fetched from Azure Monitor `Percentage CPU` metric for each VM
- **Value**: Percentage (0-100)
- **Update Frequency**: Updated on each API call (every 15 seconds)

### Network Metrics

- **AWS**: Fetches `NetworkIn` and `NetworkOut` from CloudWatch
- **Azure**: Currently not available in standard Azure Monitor without agent setup
- **Value**: Bytes transferred in the last 5-minute period

### Memory Usage

- **AWS**: Not available via EC2 API without CloudWatch agent
- **Azure**: Not available via standard Monitor without agent
- **Note**: Install CloudWatch agent (AWS) or Dependency Agent (Azure) to enable

---

## Security Best Practices

### 1. Credentials are Server-Side Only

✅ **Safe**: All AWS/Azure SDK calls execute in Next.js API routes (Node.js server)  
❌ **Never**: Credentials are never sent to the client browser

### 2. Environment Variables

- `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` are read from `process.env` (server-side)
- `AZURE_*` credentials are read from `process.env` (server-side)
- `.env.local` is in `.gitignore` and never committed

### 3. IAM Permissions (AWS)

Create users with minimal required permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ec2:DescribeInstances",
        "cloudwatch:GetMetricData",
        "sts:GetCallerIdentity"
      ],
      "Resource": "*"
    }
  ]
}
```

### 4. Azure Service Principal

Create with minimal roles:

```bash
az ad sp create-for-rbac --name "control-center" \
  --role "Reader" \
  --scope "/subscriptions/{subscription-id}"
```

### 5. Production Deployment

For production, use cloud-native secret management:

- **AWS**: AWS Secrets Manager or Systems Manager Parameter Store
- **Azure**: Azure Key Vault
- **Set via CI/CD** environment variables (not hardcoded)

---

## Troubleshooting

### Issue: "Missing AWS_ACCESS_KEY_ID" Error

**Solution:**
1. Copy `.env.example` to `.env.local`
2. Fill in actual credentials
3. Restart Next.js dev server: `npm run dev`

### Issue: "Azure authentication failed"

**Check:**
- `AZURE_TENANT_ID` is correct (from Azure AD > Properties)
- `AZURE_CLIENT_ID` matches your app registration (not the object ID)
- `AZURE_CLIENT_SECRET` hasn't expired (create a new one if needed)
- Credentials have Read permission on VMs

**Verify with Azure CLI:**

```bash
az login --service-principal \
  -u $AZURE_CLIENT_ID \
  -p $AZURE_CLIENT_SECRET \
  --tenant $AZURE_TENANT_ID

az vm list  # Should list your VMs
```

### Issue: "No instances returned"

**Check:**
- Are there actually running/stopped instances in your AWS region?
- Does the IAM user have `ec2:DescribeInstances` permission?
- Is the Azure service principal assigned the Reader role?

**Debug with CLI:**

```bash
# AWS
aws ec2 describe-instances --region us-east-1

# Azure
az vm list --subscription $AZURE_SUBSCRIPTION_ID
```

### Issue: "Metrics are null"

**AWS:**
- CloudWatch metrics require EC2 instance to be running
- Metrics take 5-10 minutes to appear for new instances
- Windows instances require CloudWatch agent for detailed metrics

**Azure:**
- Metrics require agent or platform metrics enabled
- First metrics appear within 1-3 minutes of instance start

---

## Extending the System

### Adding a New Cloud Provider

1. **Create service file**: `src/lib/cloud/gcp.ts`
2. **Implement `getGcpComputeInstances()`** following the same pattern as AWS/Azure
3. **Create API route**: `src/app/api/cloud/gcp/status/route.ts`
4. **Add types**: Update `src/types/cloud.ts` with GCP types
5. **Update components**: Modify `useComputeInstances` hook to include GCP

### Adding More Metrics

For AWS (CloudWatch):

```typescript
// In getAwsComputeInstances() or getInstanceMetrics()
const metrics = await cw.send(new GetMetricDataCommand({
  MetricDataQueries: [
    {
      Id: "disk_reads",
      MetricStat: {
        Metric: {
          Namespace: "AWS/EC2",
          MetricName: "DiskReadOps",  // Add custom metric
          Dimensions: [{ Name: "InstanceId", Value: instanceId }],
        },
        Period: 300,
        Stat: "Sum",
      },
      ReturnData: true,
    },
  ],
  // ...
}));
```

For Azure (Monitor):

```typescript
// Modify getAzureVmMetrics() to fetch additional metrics
const response = await monitorClient.metrics.list(
  resourceId,
  {
    timespan: `${start.toISOString()}/${now.toISOString()}`,
    interval: "PT1M",
    metricnames: "Network In,Network Out",  // Multiple metrics
    aggregation: "Average",
    top: 1,
  }
);
```

---

## Performance Considerations

### Polling Frequency

- **Default**: 15 seconds (good balance for most scenarios)
- **Faster**: 5-10 seconds (higher API costs, more frequent updates)
- **Slower**: 30-60 seconds (lower costs, less current data)

### Parallel Requests

✅ All AWS ListClusters, Route53, EC2 calls are parallel for speed  
✅ All Azure VM lists iterate with async for efficiency  
❌ Metrics for each instance are sequential (can be parallelized further)

### Optimization Tips

1. **Reduce metric polling** if costs are high (disable optional metrics)
2. **Cache results** in-memory for repeated requests within same interval
3. **Use CloudWatch Insights** for complex AWS queries instead of GetMetricData
4. **Batch Azure queries** using Azure Resource Graph for complex filters

---

## File Structure

```
src/
├── app/api/cloud/
│   ├── aws/status/route.ts          ← AWS EC2 endpoint
│   ├── azure/status/route.ts        ← Azure VM endpoint
│   └── infrastructure/status/route.ts ← Unified endpoint
├── components/cloud/
│   ├── LiveInfrastructureGrid.tsx   ← Main dashboard component
│   ├── InstanceCard.tsx             ← Instance display card
│   └── useComputeInstances.ts       ← Data fetching hook
├── lib/cloud/
│   ├── aws.ts                       ← AWS SDK wrapper
│   └── azure.ts                     ← Azure SDK wrapper
└── types/
    └── cloud.ts                     ← Unified type definitions
```

---

## Monitoring Queries

### Check Connectivity

```bash
curl http://localhost:3000/api/cloud/aws/status
curl http://localhost:3000/api/cloud/azure/status
```

### Monitor Polling

Open your browser DevTools Network tab and watch for:
- Requests to `/api/cloud/aws/status` every 15 seconds
- Requests to `/api/cloud/azure/status` every 15 seconds
- Response status 200 with instance data

### Check Logs

```bash
# Terminal where you ran `npm run dev`
[API] AWS compute fetch successful: 3 instances
[API] Azure compute fetch successful: 2 instances
```

---

## Common Use Cases

### 1. Multi-Cloud Dashboard

Display all instances from AWS and Azure in one unified interface:

```tsx
<LiveInfrastructureGrid providers={["aws", "azure"]} />
```

### 2. AWS-Only View

```tsx
<LiveInfrastructureGrid providers={["aws"]} />
```

### 3. Custom Polling Interval

```tsx
<LiveInfrastructureGrid pollInterval={5000} />  // 5 seconds
```

### 4. Programmatic Access

```typescript
const { awsInstances, azureInstances } = useComputeInstances();

// Filter for running instances only
const runningInstances = [
  ...awsInstances,
  ...azureInstances,
].filter(i => i.state === "running");

// Calculate total CPU usage
const avgCpu = runningInstances.reduce((sum, i) => 
  sum + (i.cpuUsage ?? 0), 0
) / runningInstances.length;
```

---

## Next Steps

1. ✅ Configure `.env.local` with your credentials
2. ✅ Test `/api/cloud/aws/status` endpoint
3. ✅ Test `/api/cloud/azure/status` endpoint
4. ✅ Add `LiveInfrastructureGrid` to a page
5. ✅ Monitor the dashboard for real-time updates
6. 🚀 Extend with additional metrics or providers

---

## Support & Resources

- [AWS SDK for JavaScript Documentation](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/)
- [Azure SDK for JavaScript Documentation](https://github.com/Azure/azure-sdk-for-js)
- [Next.js API Routes Documentation](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)

---

Last Updated: March 31, 2026  
Version: 1.0.0
