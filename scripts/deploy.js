const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { PACKAGE_PATH } = require("./package");

function getAccountId() {
  try {
    const output = execSync(
      "aws sts get-caller-identity --query Account --output text",
      {
        encoding: "utf8",
        stdio: "pipe",
      }
    );
    return output.trim();
  } catch (error) {
    console.error(
      "❌ Could not retrieve AWS Account ID. Please ensure AWS CLI is configured."
    );
    throw error;
  }
}

function generateRoleArn(accountId) {
  return `arn:aws:iam::${accountId}:role/lambda-execution-role`;
}

// Configuration - dynamically generate role ARNs
function getConfig() {
  const accountId = getAccountId();
  const roleArn = generateRoleArn(accountId);

  return {
    dev: {
      functionName: "slot-machine-api-dev",
      role: roleArn,
      description: "Slot Machine API - Development Environment",
    },
    prod: {
      functionName: "slot-machine-api-prod",
      role: roleArn,
      description: "Slot Machine API - Production Environment",
    },
  };
}

const RUNTIME = "nodejs20.x";
const HANDLER = "handler.handler";
const TIMEOUT = 30;
const MEMORY_SIZE = 256;

function executeCommand(command, description) {
  console.log(`🔄 ${description}...`);
  try {
    const output = execSync(command, { encoding: "utf8", stdio: "pipe" });
    return output;
  } catch (error) {
    console.error(`❌ Error ${description.toLowerCase()}:`, error.message);
    if (error.stdout) console.error("STDOUT:", error.stdout);
    if (error.stderr) console.error("STDERR:", error.stderr);
    throw error;
  }
}

function checkAWSCLI() {
  try {
    executeCommand("aws --version", "Checking AWS CLI");
    console.log("✅ AWS CLI is available");
  } catch (error) {
    console.error(
      "❌ AWS CLI not found. Please install AWS CLI and configure your credentials."
    );
    console.error(
      "Instructions: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
    );
    process.exit(1);
  }
}

function checkPackageExists() {
  if (!fs.existsSync(PACKAGE_PATH)) {
    console.error(
      '❌ Deployment package not found. Please run "pnpm package" first.'
    );
    process.exit(1);
  }
  console.log(`✅ Deployment package found: ${PACKAGE_PATH}`);
}

function functionExists(functionName) {
  try {
    executeCommand(
      `aws lambda get-function --function-name ${functionName}`,
      "Checking if function exists"
    );
    return true;
  } catch (error) {
    return false;
  }
}

function createFunction(environment, config) {
  const { functionName, role, description } = config[environment];

  const command = `aws lambda create-function \\
    --function-name ${functionName} \\
    --runtime ${RUNTIME} \\
    --role ${role} \\
    --handler ${HANDLER} \\
    --zip-file fileb://${PACKAGE_PATH} \\
    --description "${description}" \\
    --timeout ${TIMEOUT} \\
    --memory-size ${MEMORY_SIZE} \\
    --environment Variables="{NODE_ENV=${environment}}"`;

  executeCommand(command, `Creating Lambda function: ${functionName}`);
  console.log(`✅ Lambda function created: ${functionName}`);
}

function updateFunction(environment, config) {
  const { functionName } = config[environment];

  // Update function code
  const updateCodeCommand = `aws lambda update-function-code \\
    --function-name ${functionName} \\
    --zip-file fileb://${PACKAGE_PATH}`;

  executeCommand(
    updateCodeCommand,
    `Updating Lambda function code: ${functionName}`
  );

  // Update function configuration
  const updateConfigCommand = `aws lambda update-function-configuration \\
    --function-name ${functionName} \\
    --runtime ${RUNTIME} \\
    --handler ${HANDLER} \\
    --timeout ${TIMEOUT} \\
    --memory-size ${MEMORY_SIZE} \\
    --environment Variables="{NODE_ENV=${environment}}"`;

  executeCommand(
    updateConfigCommand,
    `Updating Lambda function configuration: ${functionName}`
  );
  console.log(`✅ Lambda function updated: ${functionName}`);
}

function publishVersion(environment, config) {
  const { functionName } = config[environment];

  const command = `aws lambda publish-version \\
    --function-name ${functionName} \\
    --description "Deployed on $(date)"`;

  try {
    const output = executeCommand(
      command,
      `Publishing new version for: ${functionName}`
    );
    const version = JSON.parse(output).Version;
    console.log(`✅ Published version: ${version}`);
    return version;
  } catch (error) {
    console.warn(
      "⚠️  Could not publish version, but deployment was successful"
    );
    return null;
  }
}

function displayFunctionInfo(environment, config) {
  const { functionName } = config[environment];

  try {
    const output = executeCommand(
      `aws lambda get-function --function-name ${functionName}`,
      "Getting function info"
    );
    const functionInfo = JSON.parse(output);

    console.log("\n📋 Function Information:");
    console.log(`   Name: ${functionInfo.Configuration.FunctionName}`);
    console.log(`   ARN: ${functionInfo.Configuration.FunctionArn}`);
    console.log(`   Runtime: ${functionInfo.Configuration.Runtime}`);
    console.log(`   Handler: ${functionInfo.Configuration.Handler}`);
    console.log(`   Last Modified: ${functionInfo.Configuration.LastModified}`);
    console.log(
      `   Code Size: ${(
        functionInfo.Configuration.CodeSize /
        1024 /
        1024
      ).toFixed(2)} MB`
    );

    // Get function URL if it exists
    try {
      const urlOutput = executeCommand(
        `aws lambda get-function-url-config --function-name ${functionName}`,
        "Getting function URL"
      );
      const urlInfo = JSON.parse(urlOutput);
      console.log(`   Function URL: ${urlInfo.FunctionUrl}`);
    } catch {
      console.log("   Function URL: Not configured");
      console.log("\n💡 To create a function URL, run:");
      console.log(
        `   aws lambda create-function-url-config --function-name ${functionName} --auth-type NONE --cors AuthType=none,Origins=["*"],Methods=["*"],Headers=["*"]`
      );
    }
  } catch (error) {
    console.warn("⚠️  Could not retrieve function information");
  }
}

async function deploy() {
  const environment = process.env.ENVIRONMENT || "dev";

  console.log(`🚀 Deploying to ${environment.toUpperCase()} environment...`);
  console.log("");

  // Get dynamic configuration with account ID
  let config;
  try {
    config = getConfig();
  } catch (error) {
    console.error("❌ Failed to get AWS configuration:", error.message);
    process.exit(1);
  }

  if (!config[environment]) {
    console.error(`❌ Unknown environment: ${environment}`);
    console.error("Available environments: dev, prod");
    process.exit(1);
  }

  // Validate prerequisites
  checkAWSCLI();
  checkPackageExists();

  const { functionName, role } = config[environment];

  console.log(`✅ Using IAM Role: ${role}`);

  // Check if role exists
  try {
    executeCommand(
      `aws iam get-role --role-name lambda-execution-role`,
      "Verifying IAM role exists"
    );
    console.log("✅ IAM role verified");
  } catch (error) {
    console.error('❌ IAM role "lambda-execution-role" not found.');
    console.error(
      'Please run "pnpm create-iam-role" to create the required IAM role first.'
    );
    process.exit(1);
  }

  try {
    if (functionExists(functionName)) {
      console.log(`📝 Function ${functionName} exists, updating...`);
      updateFunction(environment, config);
    } else {
      console.log(`🆕 Function ${functionName} doesn't exist, creating...`);
      createFunction(environment, config);
    }

    // Publish a new version
    publishVersion(environment, config);

    // Display function information
    displayFunctionInfo(environment, config);

    console.log(
      `\n🎉 Deployment to ${environment.toUpperCase()} completed successfully!`
    );
  } catch (error) {
    console.error(
      `\n❌ Deployment to ${environment.toUpperCase()} failed:`,
      error.message
    );
    process.exit(1);
  }
}

if (require.main === module) {
  deploy().catch(console.error);
}

module.exports = { deploy };
