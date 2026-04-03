# Slot Machine API

A serverless slot machine API built with TypeScript and deployed to AWS Lambda. Configuration is managed through AWS Secrets Manager, keeping all sensitive values out of the codebase.

## Quick Start

```bash
# 1. Install dependencies and build
pnpm install && pnpm build

# 2. Set up AWS (one-time)
pnpm create-iam-role
pnpm secrets:create:dev    # Optional: create dev secrets

# 3. Deploy
pnpm deploy:dev            # Clean build + deploy
# or for faster iteration:
pnpm deploy:dev:quick      # Deploy without rebuilding if already up-to-date

# 4. Test
pnpm invoke
```

## Project Structure

```
src/
├── handler.ts         # Main Lambda handler
├── secrets.ts         # AWS Secrets Manager integration
├── local-server.ts    # Express dev server
└── local-lambda.ts    # Local Lambda simulator
tests/                 # Jest test files
scripts/               # Deployment and management scripts
examples/              # Example secret configurations
eslint.config.js       # ESLint configuration (flat config format)
.prettierrc.json       # Prettier formatting rules
```

## Local Development

```bash
# Express server (http://localhost:3000)
pnpm dev

# Local Lambda simulator
pnpm dev:lambda

# Code quality and formatting
pnpm lint              # Check for linting errors
pnpm lint:fix          # Fix auto-fixable linting errors
pnpm format            # Format all files with Prettier
pnpm format:check      # Check if files are properly formatted

# Testing
pnpm test              # Run Jest tests
pnpm test:watch        # Run tests in watch mode
pnpm test:coverage     # Run tests with coverage report
```

**API Endpoints:**

- `GET /health` - Health check
- `POST /spin` - Spin the slot machine with `{"bet": 5}`

## Code Quality

This project enforces strict code quality standards using modern tooling.

### ESLint + TypeScript

- ESLint v9 with flat configuration format
- Strict TypeScript rules with full type safety — no `any` types
- Import/export validation and unused variable detection
- Separate configs for source and test files

### Prettier

- Consistent code style across the entire project
- Standard formatting rules applied automatically
- Ready for pre-commit hooks in a team environment

### Recommended workflow before committing

```bash
pnpm lint:fix          # Fix linting issues
pnpm format            # Format code
pnpm test              # Ensure tests pass
pnpm build             # Verify TypeScript compiles
```

**VS Code Integration:**

Install the ESLint and Prettier extensions. Files will be linted and formatted automatically on save, with real-time error detection via IntelliSense.

## Configuration and Secrets

The app uses AWS Secrets Manager for all configuration. No manual config files are required.

```bash
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

## Deployment

```bash
# Package the Lambda function
pnpm package           # Clean build + package (always rebuilds)
pnpm package:quick     # Smart package (only if source has changed)
pnpm package:force     # Force repackage without rebuilding

# Deploy to an environment (includes clean build)
pnpm deploy:dev        # Development
pnpm deploy:prod       # Production

# Quick deploy (skips rebuild if package is already up-to-date)
pnpm deploy:dev:quick  # Development
pnpm deploy:prod:quick # Production

# Test and monitor
pnpm invoke            # Invoke the deployed function
pnpm logs              # View CloudWatch logs
```

### Smart Deployment Workflow

**Development (avoid redundant builds):**

```bash
pnpm build
pnpm deploy:dev:quick        # Deploys without rebuilding

# Or if you've already packaged manually:
pnpm package:quick && pnpm deploy:dev:quick
```

**Production (safe approach):**

```bash
pnpm deploy:prod             # Always performs a clean build
# If you're confident the build is current:
pnpm deploy:prod:quick
```

### Build Optimization

The `:quick` scripts check whether the current package is newer than the source files and skip unnecessary rebuilds. This is useful during active development but should be avoided for production releases where a clean build is preferred.

Use `:quick` when:

- Iterating in development after an initial `pnpm build`
- Re-deploying without code changes
- Testing configuration-only changes

Use the standard scripts for production releases.

## API Response

**Win example:**

```json
{
  "reels": ["diamond", "diamond", "diamond"],
  "isWin": true,
  "winAmount": 5000,
  "combination": "diamond diamond diamond",
  "timestamp": "2025-06-28T10:30:00.000Z"
}
```

### Payout Table

| Symbol    | 3 Match | 2 Match |
| --------- | ------- | ------- |
| Diamond   | 1000x   | 20x     |
| Seven     | 500x    | 15x     |
| Star      | 250x    | 10x     |
| Bell      | 100x    | 5x      |
| Cherry    | 10x     | 2x      |

## Scripts Reference

```bash
# Development
pnpm dev              # Start dev server
pnpm build            # Compile TypeScript

# Code Quality
pnpm lint             # Check for linting errors
pnpm lint:fix         # Fix auto-fixable linting errors
pnpm format           # Format all files with Prettier
pnpm format:check     # Check formatting without making changes

# Testing
pnpm test             # Run tests
pnpm test:watch       # Run tests in watch mode
pnpm test:coverage    # Run tests with coverage report

# AWS
pnpm create-iam-role  # Set up IAM role (one-time)

# Packaging and Deployment
pnpm package           # Clean build + package
pnpm package:quick     # Smart package (only if source changed)
pnpm deploy:dev        # Deploy to dev (with clean build)
pnpm deploy:dev:quick  # Deploy to dev (skip rebuild if up-to-date)
pnpm deploy:prod       # Deploy to prod (with clean build)
pnpm deploy:prod:quick # Deploy to prod (skip rebuild if up-to-date)
pnpm invoke            # Invoke the deployed function
pnpm logs              # View logs

# Secrets
pnpm secrets:create:dev   # Create dev secrets
pnpm secrets:get:dev      # View dev secrets
```

## Troubleshooting

**AWS CLI not configured:**

```bash
aws configure
```

**IAM permissions error:**

```bash
pnpm create-iam-role
```

**Port already in use:**

```bash
PORT=3001 pnpm dev
```

## Prerequisites

- Node.js v20+
- pnpm (`npm install -g pnpm`)
- AWS CLI configured
- AWS account with IAM and Lambda permissions

**Recommended VS Code extensions:**

- ESLint (`ms-vscode.vscode-eslint`)
- Prettier (`esbenp.prettier-vscode`)
- TypeScript Importer (`pmneo.tsimporter`)

## Security

- AWS Secrets Manager integration keeps all secrets out of the codebase
- Deployment scripts automatically detect the AWS account ID and generate ARNs — no manual updates required
- Environment-based configuration with separate dev and prod secrets
- IAM role uses least-privilege permissions
- Secret caching is built in to reduce Secrets Manager API calls
- Strict TypeScript with no `any` types throughout the codebase
- ESLint and Prettier enforce consistent, reviewable code

## Production Configuration

Before going to production, update the following in AWS Secrets Manager:

1. **CORS Origins** — change from `["*"]` to your actual domain
2. **API Keys** — add any real payment or analytics keys
3. **Rate Limits** — adjust `maxBetAmount` as appropriate
4. **Monitoring** — set up CloudWatch alerts

## Cost

AWS Free Tier includes 1 million requests and 400,000 GB-seconds per month. At light usage (under 10,000 requests/month), the expected cost is $0.00.
