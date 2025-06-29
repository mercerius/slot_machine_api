# Slot Machine API - AWS Lambda

A serverless slot machine API built with TypeScript and deployed to AWS Lambda with AWS Secrets Manager for secure configuration.

## 🚀 Quick Start

```bash
# 1. Install dependencies and build
pnpm install && pnpm build

# 2. Setup AWS (one-time)
pnpm create-iam-role
pnpm secrets:create:dev    # Optional: Create dev secrets

# 3. Package and Deploy
pnpm deploy:dev            # Clean build + deploy (safe)
# OR for faster iteration:
pnpm deploy:dev:quick      # Deploy without rebuilding if up-to-date

# 4. Test
pnpm invoke
```

## 🏗️ Project Structure

```
src/
├── handler.ts         # Main Lambda handler
├── secrets.ts         # AWS Secrets Manager integration
├── local-server.ts    # Express dev server
└── local-lambda.ts    # Local Lambda simulator
scripts/               # Deployment & management scripts
examples/              # Example secret configurations
```

## 💻 Local Development

```bash
# Express server (http://localhost:3000)
pnpm dev

# Local Lambda simulator
pnpm dev:lambda
```

**API Endpoints:**

- `GET /health` - Health check
- `POST /spin` - Spin slot machine with `{"bet": 5}`

## 🔧 Configuration & Secrets

The app uses AWS Secrets Manager for secure configuration. No manual config files needed.

```bash
# Manage secrets
pnpm secrets:get:dev        # View secrets
pnpm secrets:create:dev     # Create with defaults
pnpm secrets:update:dev examples/dev-secrets.json
```

**Example secret structure:**

```json
{
  "maxBetAmount": 100,
  "jackpotMultiplier": 1000,
  "corsOrigins": ["*"],
  "debugMode": true
}
```

## 🌩️ Deployment

```bash
# Package Lambda function
pnpm package           # Clean build + package (always rebuilds)
pnpm package:quick     # Smart package (only if outdated)
pnpm package:force     # Force repackage without rebuild

# Deploy environments (with clean build)
pnpm deploy:dev        # Development (always rebuilds)
pnpm deploy:prod       # Production (always rebuilds)

# Quick deploy (skips rebuild if package is up-to-date)
pnpm deploy:dev:quick  # Development (smart packaging)
pnpm deploy:prod:quick # Production (smart packaging)

# Test deployment
pnpm invoke           # Test function
pnpm logs             # View logs
```

### 🚀 Smart Deployment Workflow

**For Development (avoid double builds):**

```bash
# After making code changes
pnpm build                    # Build once
pnpm deploy:dev:quick        # Deploy without rebuilding

# Or if you've already built manually
pnpm package:quick && pnpm deploy:dev:quick
```

**For Production (safe approach):**

```bash
pnpm deploy:prod             # Always does clean build for safety
# OR for speed if you're confident:
pnpm deploy:prod:quick       # Uses existing build if up-to-date
```

### ⚡ Build Optimization

The project includes smart packaging to avoid unnecessary rebuilds:

- **`:quick` scripts** check if your package is newer than your source code
- **Automatic detection** of when rebuilding is actually needed
- **Time savings** during development when making frequent deployments
- **Safety options** available for production deployments

**When to use quick scripts:**

- ✅ Development iterations after `pnpm build`
- ✅ Re-deploying without code changes
- ✅ Testing configuration changes
- ❌ Production releases (use regular scripts for safety)

## 🎮 API Response

**Win Example:**

```json
{
  "reels": ["💎", "💎", "💎"],
  "isWin": true,
  "winAmount": 5000,
  "combination": "💎💎💎",
  "timestamp": "2025-06-28T10:30:00.000Z"
}
```

### Payout Table

| Symbols | 3 Match | 2 Match |
| ------- | ------- | ------- |
| 💎💎💎  | 1000x   | 20x     |
| 7️⃣7️⃣7️⃣  | 500x    | 15x     |
| ⭐⭐⭐  | 250x    | 10x     |
| 🔔🔔🔔  | 100x    | 5x      |
| 🍒🍒    | 10x     | 2x      |

## 📝 Essential Scripts

```bash
# Development
pnpm dev              # Start dev server
pnpm build            # Compile TypeScript

# AWS Management
pnpm create-iam-role  # Setup IAM (one-time, automatic)

# Packaging & Deployment
pnpm package          # Clean build + package (safe, always rebuilds)
pnpm package:quick    # Smart package (only if dist changed)
pnpm deploy:dev       # Deploy to dev (with clean build)
pnpm deploy:dev:quick # Deploy to dev (skip rebuild if up-to-date)
pnpm deploy:prod      # Deploy to prod (with clean build)
pnpm deploy:prod:quick # Deploy to prod (skip rebuild if up-to-date)

# Testing & Monitoring
pnpm invoke           # Test function
pnpm logs             # View logs

# Secrets Management
pnpm secrets:create:dev   # Create dev secrets
pnpm secrets:get:dev      # View secrets
```

## 🔧 Troubleshooting

**AWS CLI not configured:**

```bash
aws configure
```

**IAM permissions error:**

```bash
pnpm create-iam-role
```

**Port in use:**

```bash
PORT=3001 pnpm dev
```

## Prerequisites

- Node.js v20+
- pnpm (`npm install -g pnpm`)
- AWS CLI configured
- AWS account with IAM/Lambda permissions

## Security Features

- ✅ **Automatic AWS configuration** - Scripts detect account ID and generate ARNs
- ✅ **AWS Secrets Manager integration** - No secrets in code
- ✅ **Environment-based configuration** - Separate dev/prod settings
- ✅ **IAM least privilege access** - Minimal required permissions
- ✅ **Automatic secret caching** - Optimized secret retrieval
- ✅ **Zero manual configuration** - Fully automated deployment

**🎯 Fully Automated Deployment:**

- No manual ARN updates required
- Scripts automatically detect your AWS account
- Zero-configuration role and policy management

## Production Configuration

For production deployment, update these in AWS Secrets Manager:

1. **CORS Origins**: Change from `["*"]` to your domain
2. **API Keys**: Add real payment/analytics keys
3. **Rate Limits**: Adjust `maxBetAmount` as needed
4. **Monitoring**: Setup CloudWatch alerts

## Cost Estimate

**AWS Free Tier:** 1M requests + 400K GB-seconds/month
**Light usage** (< 10K requests/month): **$0.00**
