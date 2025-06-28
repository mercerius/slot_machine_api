#!/usr/bin/env node

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { PACKAGE_PATH } = require("./package.js");
const { IAM_CONFIG } = require("./create-iam-role.js");

// Configuration
const DEPLOYMENT_CONFIG = {
  dev: {
    functionName: "slot-machine-api-dev",
    runtime: "nodejs20.x",
    handler: "handler.handler",
    timeout: 30,
    memorySize: 256,
    description: "Slot Machine API - Development Environment",
    roleName: IAM_CONFIG.roleName, // Use the role name from create-iam-role script
    environment: {
      NODE_ENV: "development",
      ENVIRONMENT: "dev",
      SECRET_NAME: "slot-machine-api/dev",
    },
  },
  prod: {
    functionName: "slot-machine-api-prod",
    runtime: "nodejs20.x",
    handler: "handler.handler",
    timeout: 30,
    memorySize: 512,
    description: "Slot Machine API - Production Environment",
    roleName: IAM_CONFIG.roleName, // Use the role name from create-iam-role script
    environment: {
      NODE_ENV: "production",
      ENVIRONMENT: "prod",
      SECRET_NAME: "slot-machine-api/prod",
    },
  },
};

function executeCommand(command, description, silent = false) {
  if (!silent) {
    console.log(`🔄 ${description}...`);
  }
  try {
    const output = execSync(command, {
      encoding: "utf8",
      stdio: silent ? "pipe" : "inherit",
    });
    // Only trim if output is not null (happens when stdio is "inherit")
    return output ? output.trim() : "";
  } catch (error) {
    if (!silent) {
      console.error(`❌ Error ${description.toLowerCase()}:`, error.message);
      if (error.stdout) console.error("STDOUT:", error.stdout);
      if (error.stderr) console.error("STDERR:", error.stderr);
    }
    throw error;
  }
}

function getAccountId() {
  try {
    const output = executeCommand(
      "aws sts get-caller-identity --query Account --output text --no-cli-pager",
      "Getting AWS Account ID",
      true
    );
    return output;
  } catch (error) {
    console.error(
      "❌ Could not retrieve AWS Account ID. Please ensure AWS CLI is configured."
    );
    throw error;
  }
}

function getRegion() {
  try {
    const output = executeCommand(
      "aws configure get region --no-cli-pager",
      "Getting AWS region",
      true
    );
    return output || "us-east-1"; // Default to us-east-1 if not configured
  } catch (error) {
    console.warn("⚠️  Could not retrieve AWS region, defaulting to us-east-1");
    return "us-east-1";
  }
}

function checkPrerequisites() {
  console.log("🔍 Checking deployment prerequisites...");

  // Check AWS CLI
  try {
    executeCommand("aws --version", "Checking AWS CLI", true);
  } catch (error) {
    console.error("❌ AWS CLI not found. Please install AWS CLI first.");
    console.error(
      "Instructions: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
    );
    process.exit(1);
  }

  // Check AWS credentials
  try {
    executeCommand(
      "aws sts get-caller-identity --no-cli-pager",
      "Checking AWS credentials",
      true
    );
  } catch (error) {
    console.error(
      "❌ AWS credentials not configured. Please run 'aws configure' first."
    );
    process.exit(1);
  }

  console.log("✅ AWS CLI and credentials are configured");
}

function checkIAMRole(roleName) {
  try {
    executeCommand(
      `aws iam get-role --role-name ${roleName} --no-cli-pager`,
      `Checking if IAM role ${roleName} exists`,
      true
    );
    return true;
  } catch (error) {
    return false;
  }
}

function checkIfFunctionExists(functionName) {
  try {
    executeCommand(
      `aws lambda get-function --function-name ${functionName} --no-cli-pager`,
      `Checking if function ${functionName} exists`,
      true
    );
    return true;
  } catch (error) {
    return false;
  }
}

function createLambdaFunction(config, roleArn, packagePath) {
  const {
    functionName,
    runtime,
    handler,
    timeout,
    memorySize,
    description,
    environment,
  } = config;

  const envVars = Object.entries(environment)
    .map(([key, value]) => `${key}=${value}`)
    .join(",");

  console.log(`🚀 Creating Lambda function: ${functionName}`);

  executeCommand(
    `aws lambda create-function \\
      --function-name ${functionName} \\
      --runtime ${runtime} \\
      --role ${roleArn} \\
      --handler ${handler} \\
      --zip-file fileb://${packagePath} \\
      --timeout ${timeout} \\
      --memory-size ${memorySize} \\
      --description "${description}" \\
      --environment "Variables={${envVars}}" \\
      --no-cli-pager`,
    `Creating Lambda function ${functionName}`
  );
}

function updateLambdaFunction(config, packagePath) {
  const { functionName, timeout, memorySize, description, environment } =
    config;

  console.log(`🔄 Updating Lambda function: ${functionName}`);

  // Update function code
  executeCommand(
    `aws lambda update-function-code \\
      --function-name ${functionName} \\
      --zip-file fileb://${packagePath} \\
      --no-cli-pager`,
    `Updating function code for ${functionName}`
  );

  // Wait for the code update to complete before updating configuration
  console.log(`⏳ Waiting for code update to complete...`);
  executeCommand(
    `aws lambda wait function-updated --function-name ${functionName} --no-cli-pager`,
    `Waiting for code update to finish for ${functionName}`
  );

  // Update function configuration
  const envVars = Object.entries(environment)
    .map(([key, value]) => `${key}=${value}`)
    .join(",");

  executeCommand(
    `aws lambda update-function-configuration \\
      --function-name ${functionName} \\
      --timeout ${timeout} \\
      --memory-size ${memorySize} \\
      --description "${description}" \\
      --environment "Variables={${envVars}}" \\
      --no-cli-pager`,
    `Updating function configuration for ${functionName}`
  );
}

function waitForFunctionActive(functionName) {
  console.log(`⏳ Waiting for function ${functionName} to become active...`);
  executeCommand(
    `aws lambda wait function-active --function-name ${functionName} --no-cli-pager`,
    `Waiting for function ${functionName} to be ready`
  );
}

function ensureLogGroup(functionName, region) {
  const logGroupName = `/aws/lambda/${functionName}`;

  try {
    // Check if log group exists
    executeCommand(
      `aws logs describe-log-groups --log-group-name-prefix "${logGroupName}" --no-cli-pager`,
      `Checking if log group ${logGroupName} exists`,
      true
    );
    console.log(`✅ CloudWatch log group ${logGroupName} exists`);
  } catch (error) {
    try {
      // Create log group if it doesn't exist
      console.log(`🔧 Creating CloudWatch log group: ${logGroupName}`);
      executeCommand(
        `aws logs create-log-group --log-group-name "${logGroupName}" --no-cli-pager`,
        `Creating log group ${logGroupName}`
      );

      // Set retention policy to 14 days (free tier friendly)
      executeCommand(
        `aws logs put-retention-policy --log-group-name "${logGroupName}" --retention-in-days 14 --no-cli-pager`,
        `Setting log retention to 14 days for ${logGroupName}`
      );

      console.log(`✅ CloudWatch log group created with 14-day retention`);
    } catch (createError) {
      console.warn(`⚠️  Could not create log group: ${createError.message}`);
      console.warn(`   Lambda will create it automatically on first execution`);
    }
  }
}

async function deploy() {
  try {
    const environment = process.env.ENVIRONMENT || "dev";
    const config = DEPLOYMENT_CONFIG[environment];

    if (!config) {
      console.error(`❌ Unknown environment: ${environment}`);
      console.error(
        `Available environments: ${Object.keys(DEPLOYMENT_CONFIG).join(", ")}`
      );
      process.exit(1);
    }

    console.log(`🎯 Deploying to environment: ${environment}`);
    console.log(`📦 Function name: ${config.functionName}`);

    // Check prerequisites
    checkPrerequisites();

    // Check if deployment package exists
    if (!fs.existsSync(PACKAGE_PATH)) {
      console.error(`❌ Deployment package not found: ${PACKAGE_PATH}`);
      console.error('Please run "pnpm package" first.');
      process.exit(1);
    }

    // Get AWS account info
    const accountId = getAccountId();
    const region = getRegion();
    const roleArn = `arn:aws:iam::${accountId}:role/${config.roleName}`;

    console.log(`🔍 AWS Account ID: ${accountId}`);
    console.log(`🌍 AWS Region: ${region}`);
    console.log(`🔑 IAM Role ARN: ${roleArn}`);

    // Check if IAM role exists (required prerequisite)
    if (!checkIAMRole(config.roleName)) {
      console.error(`❌ IAM role "${config.roleName}" not found!`);
      console.error(`\n📋 Please create the IAM role first by running:`);
      console.error(`   pnpm create-iam-role`);
      console.error(`\nThis is a one-time setup required before deployment.`);
      process.exit(1);
    }

    console.log(`✅ IAM role ${config.roleName} exists`);

    // Check if function exists and deploy accordingly
    const functionExists = checkIfFunctionExists(config.functionName);

    if (functionExists) {
      console.log(
        `🔄 Updating existing Lambda function: ${config.functionName}`
      );
      updateLambdaFunction(config, PACKAGE_PATH);
    } else {
      console.log(`🚀 Creating new Lambda function: ${config.functionName}`);
      createLambdaFunction(config, roleArn, PACKAGE_PATH);
    }

    // Wait for function to be active
    waitForFunctionActive(config.functionName);

    // Ensure CloudWatch log group exists and is properly configured
    ensureLogGroup(config.functionName, region);

    console.log(`\n✅ Deployment successful!`);
    console.log(`🎰 Function: ${config.functionName}`);
    console.log(`🌍 Region: ${region}`);
    console.log(
      `🔗 ARN: arn:aws:lambda:${region}:${accountId}:function:${config.functionName}`
    );

    // Show next steps based on environment
    console.log(`\n📋 Next steps:`);
    console.log(`💡 Test your function: pnpm invoke`);
    console.log(`📊 View logs: pnpm logs`);

    if (environment === "dev") {
      console.log(`🔧 Setup secrets (optional): pnpm secrets:create:dev`);
    }
  } catch (error) {
    console.error("\n❌ Deployment failed!");
    console.error("Error:", error.message);

    // Provide helpful troubleshooting tips
    console.error("\n🔧 Troubleshooting:");
    console.error("1. Ensure AWS CLI is configured: aws configure");
    console.error("2. Create IAM role: pnpm create-iam-role");
    console.error("3. Package function: pnpm package");
    console.error("4. Check AWS permissions for Lambda and IAM");

    process.exit(1);
  }
}

if (require.main === module) {
  deploy();
}

module.exports = { deploy };
