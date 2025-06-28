# AWS Setup Guide - Slot Machine API

This guide provides manual AWS setup instructions. For automated setup, use `pnpm create-iam-role` instead.

## Quick Start (Automated)

**Recommended approach:**

```bash
# 1. Automated IAM role creation (recommended)
pnpm create-iam-role

# 2. Create application secrets (optional but recommended)
pnpm secrets:create:dev    # Creates development secrets
pnpm secrets:create:prod   # Creates production secrets

# 3. Deploy
pnpm deploy:dev
```

## Manual Setup (Advanced Users)

### Prerequisites

1. **AWS CLI configured** with appropriate credentials
2. **IAM permissions** to create roles, policies, and secrets
3. **Secrets Manager access** for production environments

### Environment Variables

The application automatically detects AWS account details and loads configuration from AWS Secrets Manager.

**No manual environment configuration is required** if you use the automated setup.

For advanced manual configuration, create a `.env` file (optional):

```bash
# AWS Configuration (auto-detected by scripts)
AWS_ACCOUNT_ID=123456789012
AWS_REGION=us-east-1

# Lambda Configuration (managed by scripts)
LAMBDA_ROLE_NAME=lambda-execution-role

# Function Names (managed by scripts)
DEV_FUNCTION_NAME=slot-machine-api-dev
PROD_FUNCTION_NAME=slot-machine-api-prod
```

## IAM Role & Secrets Manager Setup

The API requires two AWS resources:

1. **IAM Role** for Lambda execution
2. **Secrets Manager** secrets for application configuration

### Automated Setup (Recommended)

```bash
# Create IAM role with Secrets Manager permissions
pnpm create-iam-role

# Create application secrets with sensible defaults
pnpm secrets:create:dev     # Development environment
pnpm secrets:create:prod    # Production environment
```

### Manual IAM Role Creation

Create an IAM role with the following policies:

#### Trust Policy (lambda-execution-role-trust-policy.json)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

#### Permissions Policy (lambda-execution-role-permissions.json)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret"
      ],
      "Resource": "arn:aws:secretsmanager:*:*:secret:slot-machine-api/*"
    }
  ]
}
```

### Manual Secrets Setup

Create secrets in AWS Secrets Manager for application configuration:

#### Development Secrets (`slot-machine-api/dev`)

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

#### Production Secrets (`slot-machine-api/prod`)

⚠️ **IMPORTANT**: Update production secrets with appropriate values:

```json
{
  "maxBetAmount": 2000,
  "jackpotMultiplier": 5000,
  "corsOrigins": ["https://yourdomain.com"],
  "rateLimit": 1000,
  "environment": "prod",
  "debugMode": false,
  "apiKeys": {
    "paymentGateway": "your-payment-api-key",
    "analytics": "your-analytics-key"
  }
}
```

### Secrets Management Commands

```bash
# View current secrets
pnpm secrets:get:dev        # View development secrets
pnpm secrets:get:prod       # View production secrets

# Update secrets from JSON file
pnpm secrets:update:dev examples/dev-secrets.json
pnpm secrets:update:prod examples/prod-secrets.json

# Delete secrets (careful!)
pnpm secrets:delete:dev     # Delete development secrets
pnpm secrets:delete:prod    # Delete production secrets
```

## Creating the IAM Role (Manual Method)

Run these AWS CLI commands to create the required IAM role:

```bash
# Create the role
aws iam create-role \
  --role-name lambda-execution-role \
  --assume-role-policy-document file://lambda-execution-role-trust-policy.json

# Attach the basic execution policy
aws iam attach-role-policy \
  --role-name lambda-execution-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

# Create and attach custom policy for Secrets Manager
aws iam create-policy \
  --policy-name slot-machine-lambda-policy \
  --policy-document file://lambda-execution-role-permissions.json

aws iam attach-role-policy \
  --role-name lambda-execution-role \
  --policy-arn arn:aws:iam::YOUR_ACCOUNT_ID:policy/slot-machine-lambda-policy
```

## Creating Secrets (Manual Method)

```bash
# Create development secrets
aws secretsmanager create-secret \
  --name "slot-machine-api/dev" \
  --description "Development environment secrets for Slot Machine API" \
  --secret-string file://examples/dev-secrets.json

# Create production secrets
aws secretsmanager create-secret \
  --name "slot-machine-api/prod" \
  --description "Production environment secrets for Slot Machine API" \
  --secret-string file://examples/prod-secrets.json
```

## Security Best Practices

1. **Use Secrets Manager** for all sensitive configuration
2. **Rotate secrets regularly** in production
3. **Use least-privilege IAM policies**
4. **Never commit secrets** to version control
5. **Use different secrets** for each environment
6. **Monitor secret access** via CloudTrail

## Required Manual Configuration

The following requires manual configuration for production:

1. **CORS Origins**: Update `corsOrigins` in production secrets to match your domain(s)
2. **API Keys**: Add actual API keys for external services in production secrets
3. **Rate Limits**: Adjust `maxBetAmount` and `rateLimit` based on your requirements
4. **Monitoring**: Set up CloudWatch alerts for Lambda errors and secret access

All other configuration is automated through the provided scripts.
