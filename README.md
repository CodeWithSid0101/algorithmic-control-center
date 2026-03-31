    ## Algorithmic Control Center

Enterprise-grade, dark-mode multi-cloud control plane dashboard built with:

- Next.js (App Router) + TypeScript
- Tailwind CSS
- Lucide Icons
- Recharts + Framer Motion

It includes 6 architecture views:

- Gateway (OAuth/JWT simulation)
- Traffic Router (WRR + Circuit Breaker)
- AI Orchestration (Q-learning + federation)
- Governance (policy builder + conjunctive access checks)
- Observability (metrics + anomaly detection + self-healing log)
- Ledger (Raft + LWW/HLC conflict feed)

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Real AWS + Azure Integration

The app includes a live server endpoint at `GET /api/cloud/telemetry` that attempts
to connect to real AWS and Azure accounts.

### 1) Configure credentials

Copy `.env.example` to `.env.local` and fill in values:

```bash
cp .env.example .env.local
```

Required variables:

- AWS: `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` (and optional `AWS_SESSION_TOKEN`)
- Azure: `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`

### 2) Start the app

```bash
npm run dev
```

### 3) Verify cloud connectivity

Open the Ledger page (`/ledger`) and check **Real Cloud Account Readiness (AWS + Azure)**.
It will show connected/not-connected state and account metadata.

When credentials are missing or invalid, the dashboard keeps running in mock fallback mode.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
