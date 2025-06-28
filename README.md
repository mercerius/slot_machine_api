# Slot Machine API - AWS Lambda

A serverless slot machine API built with TypeScript and deployed to AWS Lambda with AWS Secrets Manager for secure configuration management.

## 🏗️ Project Structure

```
slot_machine_api/
├── src/
│   ├── handler.ts              # Main Lambda handler
│   ├── secrets.ts              # AWS Secrets Manager integration
│   ├── local-server.ts         # Express.js development server
│   └── local-lambda.ts         # Local Lambda simulator
├── scripts/
│   ├── package.js              # Create deployment package
│   ├── deploy.js               # Deploy to AWS Lambda
│   ├── logs.js                 # View Lambda logs
│   ├── invoke.js               # Test Lambda function
│   ├── create-iam-role.js      # Create IAM role with permissions
│   └── manage-secrets.js       # Manage AWS Secrets Manager secrets
├── examples/
│   ├── dev-secrets.json        # Example development secrets
│   └── prod-secrets.json       # Example production secrets
├── package.json                # Dependencies and scripts
├── tsconfig.json               # TypeScript configuration
└── aws-setup.md               # Detailed AWS setup instructions
```

## 🔐 Security Features

- **AWS Secrets Manager Integration**: All sensitive configuration stored securely
- **Environment-based Secrets**: Separate secrets for dev/prod environments
- **Automatic Secret Caching**: Reduced API calls with intelligent caching
- **Graceful Fallbacks**: Functions with defaults when secrets unavailable
- **IAM Least Privilege**: Minimal required permissions for Secrets Manager

## 🚀 Quick Start

### Prerequisites

1. **Node.js** (v20 or later)
2. **pnpm** package manager (`npm install -g pnpm`)
3. **AWS CLI** configured with appropriate credentials
4. **AWS IAM permissions** for Secrets Manager and Lambda

### Installation & Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Build the project
pnpm build

# 3. Create AWS IAM role with Secrets Manager permissions
pnpm create-iam-role

# 4. Create application secrets (optional but recommended)
pnpm secrets:create:dev    # Development secrets
pnpm secrets:create:prod   # Production secrets

# 5. Deploy to AWS
pnpm deploy:dev           # Deploy to development
pnpm deploy:prod          # Deploy to production
```

**That's it!** No manual configuration files needed. The application automatically loads configuration from AWS Secrets Manager.

## 💻 Local Development

Local development works seamlessly with fallback configuration when AWS Secrets Manager is not available.

### Option 1: Express.js Development Server

Runs a full HTTP server that simulates API Gateway + Lambda:

```bash
# Start development server with hot reload
pnpm dev

# The server will be available at:
# http://localhost:3000
```

**Endpoints:**

- `GET /health` - Health check
- `POST /spin` - Spin the slot machine

**Example request:**

```bash
curl -X POST http://localhost:3000/spin \
  -H "Content-Type: application/json" \
  -d '{"bet": 5}'
```

### Option 2: Local Lambda Simulator

Tests the Lambda function directly without HTTP server:

```bash
# Run Lambda function tests locally
pnpm dev:lambda
```

This will run multiple test scenarios with different bet amounts.

## 🔧 Configuration Management

### Secrets Management Commands

```bash
# View current secrets
pnpm secrets:get:dev        # View development secrets
pnpm secrets:get:prod       # View production secrets

# Update secrets from JSON file
pnpm secrets:update:dev examples/dev-secrets.json
pnpm secrets:update:prod examples/prod-secrets.json

# Create new secrets
pnpm secrets:create:dev     # Create development secrets
pnpm secrets:create:prod    # Create production secrets

# Delete secrets (use with caution)
pnpm secrets:delete:dev     # Delete development secrets
pnpm secrets:delete:prod    # Delete production secrets
```

### Example Secret Configuration

Development secrets (`examples/dev-secrets.json`):

```json
{
  "maxBetAmount": 100,
  "jackpotMultiplier": 1000,
  "corsOrigins": ["*"],
  "rateLimit": 100,
  "environment": "dev",
  "debugMode": true,
  "apiKeys": {}
}
```

Production secrets (`examples/prod-secrets.json`):

```json
{
  "maxBetAmount": 2000,
  "jackpotMultiplier": 5000,
  "corsOrigins": ["https://yourdomain.com"],
  "rateLimit": 1000,
  "environment": "prod",
  "debugMode": false,
  "apiKeys": {
    "paymentGateway": "your-api-key"
  }
}
```

## 📦 Building and Packaging

```bash
# Clean build
pnpm build:clean

# Create deployment package
pnpm package
```

This creates a `build/slot-machine-api.zip` file ready for AWS Lambda deployment.

## 🌩️ AWS Lambda Deployment

### Automated Deployment (Recommended)

The deployment process is fully automated with secrets management:

```bash
# Deploy to development (uses slot-machine-api/dev secrets)
pnpm deploy:dev

# Deploy to production (uses slot-machine-api/prod secrets)
pnpm deploy:prod
```

### Manual Configuration Required

The following items require manual configuration for production:

1. **CORS Origins**: Update production secrets to include your actual domain(s)
2. **API Keys**: Add real API keys for external services in production secrets
3. **Rate Limits**: Adjust betting limits based on your business requirements
4. **Monitoring**: Set up CloudWatch alerts and monitoring dashboards

All other configuration is managed automatically through AWS Secrets Manager.

### AWS Setup (First Time Only)

**Automated setup (recommended):**

```bash
# Create IAM role with Secrets Manager permissions
pnpm create-iam-role

# Create secrets for both environments
pnpm secrets:create:dev
pnpm secrets:create:prod
```

**Manual setup:** See detailed instructions in [aws-setup.md](aws-setup.md)

### IAM Management Commands

```bash
# Create IAM role and policies (one-time setup)
pnpm create-iam-role

# Delete IAM role and policies (cleanup)
pnpm delete-iam-role --confirm
```

### Deploy Commands

```bash
# Deploy to development environment
pnpm deploy:dev

# Deploy to production environment
pnpm deploy:prod

# Deploy with explicit environment
ENVIRONMENT=dev pnpm deploy
```

### Post-Deployment

After deployment, you may want to create a Function URL for HTTP access:

```bash
# Create a public function URL (for development)
aws lambda create-function-url-config \
  --function-name slot-machine-api-dev \
  --auth-type NONE \
  --cors '{
    "AllowCredentials": false,
    "AllowMethods": ["GET", "POST"],
    "AllowOrigins": ["*"],
    "AllowHeaders": ["content-type", "x-amz-date", "authorization"],
    "MaxAge": 3600
  }'

# Get the function URL
aws lambda get-function-url-config \
  --function-name slot-machine-api-dev
```

## 🔍 Testing and Monitoring

### Invoke Lambda Function

```bash
# Test with default payload
pnpm invoke

# Test with specific bet amount
pnpm invoke 25

# Test production environment
pnpm invoke prod

# Run full test suite
pnpm invoke --test
```

### View Logs

```bash
# View recent logs (last 50 entries)
pnpm logs

# View production logs
pnpm logs prod

# Stream logs in real-time
pnpm logs --follow

# View more log entries
pnpm logs 100
```

## 🎮 API Reference

### Spin Endpoint

**Request:**

```json
POST /spin
Content-Type: application/json

{
  "bet": 5
}
```

**Response (Win):**

```json
{
  "reels": ["💎", "💎", "💎"],
  "isWin": true,
  "winAmount": 5000,
  "combination": "💎💎💎",
  "timestamp": "2025-06-28T10:30:00.000Z",
  "spinId": "spin_1719574200000_abc123def"
}
```

**Response (Loss):**

```json
{
  "reels": ["🍒", "🍋", "🍊"],
  "isWin": false,
  "winAmount": 0,
  "combination": undefined,
  "timestamp": "2025-06-28T10:30:00.000Z",
  "spinId": "spin_1719574200000_xyz789ghi"
}
```

### Payout Table

| Combination | 3 Symbols | 2 Symbols |
| ----------- | --------- | --------- |
| 💎💎💎      | 1000x     | 20x       |
| 7️⃣7️⃣7️⃣      | 500x      | 15x       |
| ⭐⭐⭐      | 250x      | 10x       |
| 🔔🔔🔔      | 100x      | 5x        |
| 🍇🍇🍇      | 50x       | -         |
| 🍊🍊🍊      | 25x       | -         |
| 🍋🍋🍋      | 15x       | -         |
| 🍒🍒🍒      | 10x       | 2x        |

## 📝 Available Scripts

```bash
# Development
pnpm dev              # Start Express development server
pnpm dev:lambda       # Run local Lambda simulator
pnpm build            # Compile TypeScript
pnpm build:clean      # Clean build (removes dist/ first)

# AWS IAM Management
pnpm create-iam-role  # Create IAM role and policies
pnpm delete-iam-role  # Delete IAM role and policies (with --confirm)

# Deployment
pnpm package          # Create deployment package
pnpm deploy           # Deploy to Lambda (dev by default)
pnpm deploy:dev       # Deploy to development
pnpm deploy:prod      # Deploy to production

# Testing & Monitoring
pnpm invoke           # Test Lambda function
pnpm logs             # View Lambda logs
```

## 🛠️ Configuration

### Environment Variables

The Lambda function supports these environment variables:

- `NODE_ENV` - Set to 'dev' or 'prod' during deployment

### Bet Limits

- Minimum bet: 1
- Maximum bet: 100
- Default bet: 1 (if not specified or invalid)

## 🔧 Troubleshooting

### Common Issues

1. **AWS CLI not configured**

   ```bash
   aws configure
   # Enter your Access Key, Secret Key, Region, and Output format
   ```

2. **Windows/WSL specific issues**

   ```bash
   # If using WSL on Windows, ensure AWS CLI is installed in WSL:
   curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
   unzip awscliv2.zip
   sudo ./aws/install

   # Or install via package manager
   sudo apt install awscli  # Ubuntu/Debian
   ```

3. **IAM permissions error**

   ```bash
   # Create the required IAM role automatically
   pnpm create-iam-role
   ```

   - Or manually ensure the Lambda execution role exists
   - Check that your AWS credentials have IAM and Lambda deployment permissions

4. **Function not found**

   - The function name in `scripts/deploy.js` must match what you're trying to invoke
   - Check if the function was successfully deployed

5. **Deployment package too large**
   - The current package should be under 1MB
   - If you add dependencies, consider using Lambda Layers

### Local Development Issues

1. **TypeScript errors**

   ```bash
   pnpm build
   # Check for compilation errors
   ```

2. **Port already in use**
   ```bash
   # Change PORT in local-server.ts or:
   PORT=3001 pnpm dev
   ```

## 📋 Project Decisions

### Why Scripts in package.json?

All deployment and testing operations are available as npm scripts because:

1. **Consistency** - All developers use the same commands
2. **Simplicity** - No need to remember complex AWS CLI commands
3. **Environment Management** - Easy to switch between dev/prod
4. **Documentation** - Scripts serve as living documentation

### Why Node.js Scripts Instead of Bash?

1. **Cross-platform** - Works on Windows, macOS, and Linux
2. **Consistency** - Same language as the application
3. **Error Handling** - Better error handling and logging
4. **Maintainability** - Easier to modify and extend

## 🤝 Contributing

1. Make changes to the source code
2. Test locally with `pnpm dev` or `pnpm dev:lambda`
3. Build and test the package with `pnpm package`
4. Deploy to dev environment with `pnpm deploy:dev`
5. Test the deployed function with `pnpm invoke`
6. Check logs with `pnpm logs`

## 📄 License

This project is licensed under the ISC License.
