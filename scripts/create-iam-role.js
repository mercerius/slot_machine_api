const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// Configuration
const IAM_CONFIG = {
  roleName: "lambda-execution-role",
  policyName: "slot-machine-lambda-policy",
  description: "Execution role for Slot Machine API Lambda functions",
  trustPolicyFile: path.join(
    __dirname,
    "..",
    "lambda-execution-role-trust-policy.json"
  ),
  permissionsPolicyFile: path.join(
    __dirname,
    "..",
    "lambda-execution-role-permissions.json"
  ),
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

function checkAWSCLI() {
  try {
    executeCommand("aws --version", "Checking AWS CLI", true);
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

function checkCredentials() {
  try {
    executeCommand(
      "aws sts get-caller-identity",
      "Verifying AWS credentials",
      true
    );
    console.log("✅ AWS credentials are configured");
  } catch (error) {
    console.error(
      '❌ AWS credentials not configured. Please run "aws configure"'
    );
    process.exit(1);
  }
}

function checkRequiredFiles() {
  const missingFiles = [];

  if (!fs.existsSync(IAM_CONFIG.trustPolicyFile)) {
    missingFiles.push(IAM_CONFIG.trustPolicyFile);
  }

  if (!fs.existsSync(IAM_CONFIG.permissionsPolicyFile)) {
    missingFiles.push(IAM_CONFIG.permissionsPolicyFile);
  }

  if (missingFiles.length > 0) {
    console.error("❌ Missing required policy files:");
    missingFiles.forEach((file) => console.error(`   - ${file}`));
    process.exit(1);
  }

  console.log("✅ Required policy files found");
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

function roleExists(roleName) {
  try {
    executeCommand(
      `aws iam get-role --role-name ${roleName}`,
      "Checking if role exists",
      true
    );
    return true;
  } catch (error) {
    return false;
  }
}

function policyExists(policyArn) {
  try {
    executeCommand(
      `aws iam get-policy --policy-arn ${policyArn}`,
      "Checking if policy exists",
      true
    );
    return true;
  } catch (error) {
    return false;
  }
}

function createRole() {
  const { roleName, description, trustPolicyFile } = IAM_CONFIG;

  console.log(`📋 Creating IAM role: ${roleName}`);

  try {
    const command = `aws iam create-role \\
      --role-name ${roleName} \\
      --assume-role-policy-document file://${trustPolicyFile} \\
      --description "${description}" \\
      --max-session-duration 3600`;

    executeCommand(command, `Creating IAM role: ${roleName}`);
    console.log(`✅ IAM role created: ${roleName}`);

    // Add tags for better organization
    const tagCommand = `aws iam tag-role \\
      --role-name ${roleName} \\
      --tags Key=Project,Value=SlotMachineAPI Key=Environment,Value=MultiEnv Key=ManagedBy,Value=Deployment-Script`;

    executeCommand(tagCommand, "Adding tags to role");
    console.log("✅ Tags added to role");

    return true;
  } catch (error) {
    console.error(`❌ Failed to create role: ${error.message}`);
    return false;
  }
}

function createCustomPolicy(accountId) {
  const { policyName, permissionsPolicyFile } = IAM_CONFIG;
  const policyArn = `arn:aws:iam::${accountId}:policy/${policyName}`;

  console.log(`📋 Creating custom IAM policy: ${policyName}`);

  try {
    const command = `aws iam create-policy \\
      --policy-name ${policyName} \\
      --policy-document file://${permissionsPolicyFile} \\
      --description "Custom permissions for Slot Machine API Lambda functions"`;

    executeCommand(command, `Creating IAM policy: ${policyName}`);
    console.log(`✅ IAM policy created: ${policyName}`);

    return policyArn;
  } catch (error) {
    console.error(`❌ Failed to create policy: ${error.message}`);
    return null;
  }
}

function attachPolicies(accountId) {
  const { roleName, policyName } = IAM_CONFIG;
  const customPolicyArn = `arn:aws:iam::${accountId}:policy/${policyName}`;
  const basicExecutionPolicyArn =
    "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole";

  console.log("📋 Attaching policies to role...");

  // Attach AWS managed basic execution policy
  try {
    const basicCommand = `aws iam attach-role-policy \\
      --role-name ${roleName} \\
      --policy-arn ${basicExecutionPolicyArn}`;

    executeCommand(basicCommand, "Attaching AWS Lambda Basic Execution Role");
    console.log("✅ AWS Lambda Basic Execution Role attached");
  } catch (error) {
    console.error("❌ Failed to attach basic execution policy");
    return false;
  }

  // Attach custom policy if it exists
  if (policyExists(customPolicyArn)) {
    try {
      const customCommand = `aws iam attach-role-policy \\
        --role-name ${roleName} \\
        --policy-arn ${customPolicyArn}`;

      executeCommand(customCommand, "Attaching custom policy");
      console.log("✅ Custom policy attached");
    } catch (error) {
      console.error("❌ Failed to attach custom policy");
      return false;
    }
  }

  return true;
}

function displayRoleInfo(accountId) {
  const { roleName } = IAM_CONFIG;

  try {
    console.log("\\n📋 IAM Role Information:");
    console.log("=".repeat(50));

    // Get role details
    const roleOutput = executeCommand(
      `aws iam get-role --role-name ${roleName}`,
      "Getting role details",
      true
    );
    const roleInfo = JSON.parse(roleOutput);

    console.log(`   Role Name: ${roleInfo.Role.RoleName}`);
    console.log(`   Role ARN: ${roleInfo.Role.Arn}`);
    console.log(`   Created: ${roleInfo.Role.CreateDate}`);
    console.log(`   Description: ${roleInfo.Role.Description || "N/A"}`);

    // Get attached policies
    const policiesOutput = executeCommand(
      `aws iam list-attached-role-policies --role-name ${roleName}`,
      "Getting attached policies",
      true
    );
    const policies = JSON.parse(policiesOutput);

    console.log("\\n📎 Attached Policies:");
    if (policies.AttachedPolicies && policies.AttachedPolicies.length > 0) {
      policies.AttachedPolicies.forEach((policy) => {
        console.log(`   - ${policy.PolicyName} (${policy.PolicyArn})`);
      });
    } else {
      console.log("   - No policies attached");
    }

    console.log("\\n💡 Usage in deploy.js:");
    console.log(`   Update the role ARN to: ${roleInfo.Role.Arn}`);
  } catch (error) {
    console.warn("⚠️  Could not retrieve role information");
  }
}

function waitForRoleToPropagate() {
  console.log(
    "⏳ Waiting for IAM role to propagate (this can take up to 10 seconds)..."
  );

  return new Promise((resolve) => {
    let attempts = 0;
    const maxAttempts = 10;

    const checkRole = () => {
      attempts++;
      try {
        executeCommand(
          `aws iam get-role --role-name ${IAM_CONFIG.roleName}`,
          "Checking role propagation",
          true
        );
        console.log("✅ IAM role is ready");
        resolve();
      } catch (error) {
        if (attempts < maxAttempts) {
          setTimeout(checkRole, 1000);
        } else {
          console.log(
            "⚠️  Role propagation check timeout, but role should be available shortly"
          );
          resolve();
        }
      }
    };

    setTimeout(checkRole, 1000);
  });
}

async function createIAMRole() {
  console.log("🚀 Setting up IAM role for Slot Machine API...");
  console.log("");

  // Validate prerequisites
  checkAWSCLI();
  checkCredentials();
  checkRequiredFiles();

  const accountId = getAccountId();
  console.log(`✅ AWS Account ID: ${accountId}`);

  const { roleName, policyName } = IAM_CONFIG;

  // Check if role already exists
  if (roleExists(roleName)) {
    console.log(`⚠️  IAM role "${roleName}" already exists`);

    // Ask if user wants to continue (in a real implementation, you might want to use a proper prompt)
    console.log("The role will be updated with the latest policies...");

    displayRoleInfo(accountId);
    return;
  }

  try {
    // Create the role
    if (!createRole()) {
      process.exit(1);
    }

    // Create custom policy if it doesn't exist
    const customPolicyArn = `arn:aws:iam::${accountId}:policy/${policyName}`;
    if (!policyExists(customPolicyArn)) {
      const createdPolicyArn = createCustomPolicy(accountId);
      if (!createdPolicyArn) {
        console.log(
          "⚠️  Custom policy creation failed, but continuing with basic execution role only"
        );
      }
    } else {
      console.log(`✅ Custom policy already exists: ${policyName}`);
    }

    // Attach policies
    if (!attachPolicies(accountId)) {
      process.exit(1);
    }

    // Wait for propagation
    await waitForRoleToPropagate();

    // Display final information
    displayRoleInfo(accountId);

    console.log("\\n🎉 IAM role setup completed successfully!");
    console.log("");
    console.log("📝 Next steps:");
    console.log("1. Update scripts/deploy.js with the role ARN shown above");
    console.log('2. Run "pnpm deploy:dev" to deploy your Lambda function');
  } catch (error) {
    console.error("\\n❌ IAM role setup failed:", error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  createIAMRole().catch(console.error);
}

module.exports = { createIAMRole, IAM_CONFIG };
