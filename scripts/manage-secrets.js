#!/usr/bin/env node

const { execSync } = require("child_process");
const fs = require("fs");

// Configuration
const SECRETS_CONFIG = {
  dev: {
    secretName: "slot-machine-api/dev",
    description: "Development environment secrets for Slot Machine API",
  },
  prod: {
    secretName: "slot-machine-api/prod",
    description: "Production environment secrets for Slot Machine API",
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
    return output;
  } catch (error) {
    if (!silent) {
      console.error(`❌ Error ${description.toLowerCase()}:`, error.message);
    }
    throw error;
  }
}

function getAccountId() {
  try {
    const output = executeCommand(
      "aws sts get-caller-identity --query Account --output text",
      "Getting AWS Account ID",
      true
    );
    return output.trim();
  } catch (error) {
    console.error("❌ Could not retrieve AWS Account ID");
    throw error;
  }
}

function getRegion() {
  try {
    const output = executeCommand(
      "aws configure get region",
      "Getting AWS region",
      true
    );
    return output.trim() || "us-east-1";
  } catch (error) {
    console.warn("⚠️  Could not get AWS region, using default: us-east-1");
    return "us-east-1";
  }
}

function secretExists(secretName) {
  try {
    executeCommand(
      `aws secretsmanager describe-secret --secret-id "${secretName}"`,
      `Checking if secret ${secretName} exists`,
      true
    );
    return true;
  } catch {
    return false;
  }
}

function createSecret(environment) {
  const config = SECRETS_CONFIG[environment];
  const region = getRegion();

  if (secretExists(config.secretName)) {
    console.log(`✅ Secret ${config.secretName} already exists`);
    return;
  }

  // Default secrets configuration
  const defaultSecrets = {
    maxBetAmount: environment === "prod" ? 1000 : 100,
    jackpotMultiplier: environment === "prod" ? 2000 : 1000,
    corsOrigins: environment === "prod" ? [] : ["*"], // Will need to be configured manually for prod
    rateLimit: environment === "prod" ? 1000 : 100,
    environment: environment,
    debugMode: environment === "dev",
    apiKeys: {},
  };

  const secretValue = JSON.stringify(defaultSecrets, null, 2);

  const command = `aws secretsmanager create-secret \\
    --name "${config.secretName}" \\
    --description "${config.description}" \\
    --secret-string '${secretValue.replace(/'/g, "'\\''")}' \\
    --region ${region}`;

  executeCommand(command, `Creating secret: ${config.secretName}`);
  console.log(`✅ Created secret: ${config.secretName}`);

  if (environment === "prod") {
    console.log("\n⚠️  IMPORTANT: Production secrets created with defaults.");
    console.log(
      "   Please update the production secret with appropriate values:"
    );
    console.log(`   - Set corsOrigins to your actual domain(s)`);
    console.log(`   - Review maxBetAmount and other limits`);
    console.log(`   - Add any required API keys`);
    console.log(`\n   Update command:`);
    console.log(
      `   aws secretsmanager update-secret --secret-id "${config.secretName}" --secret-string '{"maxBetAmount":1000,"corsOrigins":["https://yourdomain.com"],...}'`
    );
  }
}

function updateSecret(environment, secretData) {
  const config = SECRETS_CONFIG[environment];
  const region = getRegion();

  if (!secretExists(config.secretName)) {
    console.error(
      `❌ Secret ${config.secretName} does not exist. Create it first with: pnpm secrets:create`
    );
    return;
  }

  const secretValue = JSON.stringify(secretData, null, 2);

  const command = `aws secretsmanager update-secret \\
    --secret-id "${config.secretName}" \\
    --secret-string '${secretValue.replace(/'/g, "'\\''")}' \\
    --region ${region}`;

  executeCommand(command, `Updating secret: ${config.secretName}`);
  console.log(`✅ Updated secret: ${config.secretName}`);
}

function getSecret(environment) {
  const config = SECRETS_CONFIG[environment];

  if (!secretExists(config.secretName)) {
    console.error(`❌ Secret ${config.secretName} does not exist`);
    return;
  }

  try {
    const output = executeCommand(
      `aws secretsmanager get-secret-value --secret-id "${config.secretName}" --query SecretString --output text`,
      `Getting secret: ${config.secretName}`,
      true
    );

    const secrets = JSON.parse(output);
    console.log(`📋 Current secrets for ${environment}:`);
    console.log(JSON.stringify(secrets, null, 2));
  } catch (error) {
    console.error(`❌ Failed to retrieve secret: ${error.message}`);
  }
}

function deleteSecret(environment) {
  const config = SECRETS_CONFIG[environment];

  if (!secretExists(config.secretName)) {
    console.log(`✅ Secret ${config.secretName} does not exist`);
    return;
  }

  const command = `aws secretsmanager delete-secret \\
    --secret-id "${config.secretName}" \\
    --force-delete-without-recovery`;

  executeCommand(command, `Deleting secret: ${config.secretName}`);
  console.log(`✅ Deleted secret: ${config.secretName}`);
}

function main() {
  const [, , action, environment, ...args] = process.argv;

  if (!action) {
    console.log(
      "Usage: node manage-secrets.js <create|update|get|delete> <dev|prod> [secret-data-file]"
    );
    console.log("");
    console.log("Examples:");
    console.log(
      "  node manage-secrets.js create dev        # Create dev secrets with defaults"
    );
    console.log(
      "  node manage-secrets.js create prod       # Create prod secrets with defaults"
    );
    console.log(
      "  node manage-secrets.js get dev           # View current dev secrets"
    );
    console.log(
      "  node manage-secrets.js update dev secrets.json  # Update dev secrets from file"
    );
    console.log(
      "  node manage-secrets.js delete dev        # Delete dev secrets"
    );
    process.exit(1);
  }

  if (!environment || !["dev", "prod"].includes(environment)) {
    console.error("❌ Environment must be 'dev' or 'prod'");
    process.exit(1);
  }

  try {
    switch (action) {
      case "create":
        createSecret(environment);
        break;
      case "update":
        const dataFile = args[0];
        if (!dataFile) {
          console.error("❌ Please provide a JSON file with secret data");
          process.exit(1);
        }
        if (!fs.existsSync(dataFile)) {
          console.error(`❌ File not found: ${dataFile}`);
          process.exit(1);
        }
        const secretData = JSON.parse(fs.readFileSync(dataFile, "utf8"));
        updateSecret(environment, secretData);
        break;
      case "get":
        getSecret(environment);
        break;
      case "delete":
        deleteSecret(environment);
        break;
      default:
        console.error(`❌ Unknown action: ${action}`);
        process.exit(1);
    }
  } catch (error) {
    console.error("❌ Operation failed:", error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
