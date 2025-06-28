# Deployment Guide - Slot Machine API

This guide walks you through deploying the Slot Machine API to AWS Lambda using the automated deployment scripts.

## 🚀 Quick Start (Complete Deployment)

```bash
# 1. Install dependencies
pnpm install

# 2. Build the project
pnpm build

# 3. Create AWS IAM role (one-time setup)
pnpm create-iam-role

# 4. Deploy to development
pnpm deploy:dev

# 5. Test the deployment
pnpm invoke dev
```

## 📋 Prerequisites

1. **Node.js** (v20 or later)
2. **pnpm** package manager (`npm install -g pnpm`)
3. **AWS CLI** installed and configured
4. **AWS Account** with appropriate permissions

### AWS CLI Setup

```bash
# Install AWS CLI v2 (if not already installed)
# Windows: Download from https://awscli.amazonaws.com/AWSCLIV2.msi
# macOS: brew install awscli
# Linux: curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
#        unzip awscliv2.zip && sudo ./aws/install

# Configure AWS credentials
aws configure
# Enter your Access Key ID, Secret Access Key, Region (e.g., us-east-1), and Output format (json)

# Verify configuration
aws sts get-caller-identity
```

## 🔧 Step-by-Step Deployment

### 1. Project Setup

```bash
# Clone/navigate to the project
cd slot_machine_api

# Install dependencies
pnpm install

# Build TypeScript
pnpm build
```

### 2. IAM Role Creation

The IAM role creation script automatically:

- Creates a Lambda execution role
- Attaches necessary policies
- Configures proper permissions
- Detects your AWS account ID automatically

```bash
# Create IAM role and policies
pnpm create-iam-role
```

**What this creates:**

- **Role**: `lambda-execution-role`
- **Custom Policy**: `slot-machine-lambda-policy`
- **Attached Policies**: AWS Lambda Basic Execution Role + Custom Policy

### 3. Package and Deploy

```bash
# Create deployment package
pnpm package

# Deploy to development environment
pnpm deploy:dev

# OR deploy to production environment
pnpm deploy:prod
```

### 4. Verify Deployment

```bash
# Test the Lambda function
pnpm invoke dev

# Run comprehensive tests
pnpm invoke --test

# View logs
pnpm logs dev
```

### 5. Create Function URL (Optional)

For HTTP access to your Lambda function:

```bash
# Create a public function URL (development only)
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

## 🛠️ Advanced Operations

### Environment Management

```bash
# Deploy to specific environment
ENVIRONMENT=dev pnpm deploy     # Development
ENVIRONMENT=prod pnpm deploy    # Production

# View logs for specific environment
pnpm logs dev                   # Development logs
pnpm logs prod                  # Production logs

# Test specific environment
pnpm invoke dev                 # Test development
pnpm invoke prod                # Test production
```

### Monitoring and Debugging

```bash
# View recent logs (last 50 entries)
pnpm logs dev

# Stream logs in real-time
pnpm logs --follow dev

# View more log entries
pnpm logs dev 100

# Test with specific bet amount
pnpm invoke dev 25

# Run full test suite
pnpm invoke --test dev
```

### Package Management

```bash
# Clean build
pnpm build:clean

# Just create package (without deploying)
pnpm package

# Check package size
ls -lh build/slot-machine-api.zip
```

## 🔄 Update Deployment

To update an existing deployment:

```bash
# 1. Make your code changes
# 2. Build and deploy
pnpm build
pnpm deploy:dev

# The script automatically:
# - Updates function code
# - Updates configuration
# - Publishes new version
```

## 🗑️ Cleanup

### Remove Lambda Functions

```bash
# Delete development function
aws lambda delete-function --function-name slot-machine-api-dev

# Delete production function
aws lambda delete-function --function-name slot-machine-api-prod
```

### Remove IAM Role

```bash
# Delete IAM role and policies (requires confirmation)
pnpm delete-iam-role --confirm

# Or with environment variable
FORCE_DELETE=true pnpm delete-iam-role
```

## 🔍 Troubleshooting

### Common Issues and Solutions

#### 1. AWS CLI Not Configured

```bash
# Error: Unable to locate credentials
aws configure
```

#### 2. IAM Permissions Issues

```bash
# Error: User is not authorized to perform iam:CreateRole
# Solution: Ensure your AWS user has IAM permissions
# Required permissions: iam:CreateRole, iam:AttachRolePolicy, lambda:*
```

#### 3. Role Already Exists

```bash
# Error: Role with name lambda-execution-role already exists
# Solution: The script handles this automatically, or you can delete and recreate:
pnpm delete-iam-role --confirm
pnpm create-iam-role
```

#### 4. Function Already Exists

```bash
# This is normal - the script will update the existing function
pnpm deploy:dev  # Updates existing function
```

#### 5. Package Too Large

```bash
# Error: Request must be smaller than 69905067 bytes
# Solution: Check for unnecessary files in the package
# Current package should be < 1MB
```

#### 6. Function URL Issues

```bash
# Error: ResourceNotFoundException when accessing function URL
# Solution: Create the function URL:
aws lambda create-function-url-config \\
  --function-name slot-machine-api-dev \\
  --auth-type NONE
```

### Debug Mode

For detailed debugging:

```bash
# Enable debug mode in AWS CLI
export AWS_CLI_TRACE=1

# Run deployment with debug info
pnpm deploy:dev

# Check CloudWatch logs
pnpm logs --follow dev
```

## 📊 Cost Estimation

**AWS Lambda Pricing (as of June 2025):**

- **Requests**: $0.20 per 1M requests
- **Duration**: $0.0000166667 per GB-second
- **Free Tier**: 1M requests + 400,000 GB-seconds per month

**Estimated monthly cost for light usage** (< 10,000 requests): **$0.00** (within free tier)

## 🔐 Security Best Practices

1. **Least Privilege**: The IAM role only has necessary permissions
2. **Environment Separation**: Separate dev/prod functions
3. **No Secrets in Code**: Use environment variables for sensitive data
4. **Function URLs**: Consider authentication for production
5. **Monitoring**: Enable CloudWatch logging (included automatically)

## 📚 Additional Resources

- [AWS Lambda Documentation](https://docs.aws.amazon.com/lambda/)
- [AWS CLI Reference](https://docs.aws.amazon.com/cli/)
- [IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
- [Lambda Pricing](https://aws.amazon.com/lambda/pricing/)

## 🎯 Next Steps

After successful deployment:

1. **Frontend Integration**: Use the Function URL in your frontend application
2. **Custom Domain**: Set up API Gateway with custom domain
3. **Monitoring**: Set up CloudWatch alarms
4. **CI/CD**: Integrate deployment scripts into your CI/CD pipeline
5. **Testing**: Add automated tests with the invoke scripts
