const { execSync } = require("child_process");
const { IAM_CONFIG } = require("./create-iam-role");

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
    process.exit(1);
  }
}

function checkCredentials() {
  try {
    executeCommand(
      "aws sts get-caller-identity --no-cli-pager",
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

function getAccountId() {
  try {
    const output = executeCommand(
      "aws sts get-caller-identity --query Account --output text --no-cli-pager",
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
      `aws iam get-role --role-name ${roleName} --no-cli-pager`,
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
      `aws iam get-policy --policy-arn ${policyArn} --no-cli-pager`,
      "Checking if policy exists",
      true
    );
    return true;
  } catch (error) {
    return false;
  }
}

function getAttachedPolicies(roleName) {
  try {
    const output = executeCommand(
      `aws iam list-attached-role-policies --role-name ${roleName} --no-cli-pager`,
      "Getting attached policies",
      true
    );
    const policies = JSON.parse(output);
    return policies.AttachedPolicies || [];
  } catch (error) {
    console.warn(`⚠️  Could not get attached policies for role: ${roleName}`);
    return [];
  }
}

function detachPolicies(roleName) {
  console.log("📋 Detaching policies from role...");

  const attachedPolicies = getAttachedPolicies(roleName);

  if (attachedPolicies.length === 0) {
    console.log("✅ No policies to detach");
    return true;
  }

  let success = true;

  for (const policy of attachedPolicies) {
    try {
      const command = `aws iam detach-role-policy \\
        --role-name ${roleName} \\
        --policy-arn ${policy.PolicyArn} \\
        --no-cli-pager`;

      executeCommand(command, `Detaching policy: ${policy.PolicyName}`);
      console.log(`✅ Detached policy: ${policy.PolicyName}`);
    } catch (error) {
      console.error(`❌ Failed to detach policy: ${policy.PolicyName}`);
      success = false;
    }
  }

  return success;
}

function deleteCustomPolicy(accountId) {
  const { policyName } = IAM_CONFIG;
  const policyArn = `arn:aws:iam::${accountId}:policy/${policyName}`;

  if (!policyExists(policyArn)) {
    console.log(`✅ Custom policy doesn't exist: ${policyName}`);
    return true;
  }

  console.log(`📋 Deleting custom policy: ${policyName}`);

  try {
    // First, get all policy versions except the default
    const versionsOutput = executeCommand(
      `aws iam list-policy-versions --policy-arn ${policyArn} --no-cli-pager`,
      "Getting policy versions",
      true
    );
    const versions = JSON.parse(versionsOutput);

    // Delete non-default versions first
    if (versions.Versions) {
      for (const version of versions.Versions) {
        if (!version.IsDefaultVersion) {
          try {
            const deleteVersionCommand = `aws iam delete-policy-version \\
              --policy-arn ${policyArn} \\
              --version-id ${version.VersionId} \\
              --no-cli-pager`;

            executeCommand(
              deleteVersionCommand,
              `Deleting policy version: ${version.VersionId}`,
              true
            );
          } catch (error) {
            console.warn(
              `⚠️  Could not delete policy version: ${version.VersionId}`
            );
          }
        }
      }
    }

    // Now delete the policy itself
    const command = `aws iam delete-policy --policy-arn ${policyArn} --no-cli-pager`;
    executeCommand(command, `Deleting custom policy: ${policyName}`);
    console.log(`✅ Custom policy deleted: ${policyName}`);

    return true;
  } catch (error) {
    console.error(`❌ Failed to delete custom policy: ${error.message}`);
    return false;
  }
}

function deleteRole(roleName) {
  console.log(`📋 Deleting IAM role: ${roleName}`);

  try {
    const command = `aws iam delete-role --role-name ${roleName} --no-cli-pager`;
    executeCommand(command, `Deleting IAM role: ${roleName}`);
    console.log(`✅ IAM role deleted: ${roleName}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to delete role: ${error.message}`);
    return false;
  }
}

function checkLambdaFunctionsUsingRole(accountId, roleName) {
  const roleArn = `arn:aws:iam::${accountId}:role/${roleName}`;

  console.log("🔍 Checking for Lambda functions using this role...");

  try {
    const functionsOutput = executeCommand(
      "aws lambda list-functions --no-cli-pager",
      "Getting Lambda functions",
      true
    );
    const functions = JSON.parse(functionsOutput);

    const functionsUsingRole = [];

    if (functions.Functions) {
      for (const func of functions.Functions) {
        if (func.Role === roleArn) {
          functionsUsingRole.push(func.FunctionName);
        }
      }
    }

    if (functionsUsingRole.length > 0) {
      console.log("⚠️  The following Lambda functions are using this role:");
      functionsUsingRole.forEach((funcName) => {
        console.log(`   - ${funcName}`);
      });
      console.log("");
      console.log(
        "💡 Consider updating these functions to use a different role before deletion."
      );
      return functionsUsingRole;
    } else {
      console.log("✅ No Lambda functions are using this role");
      return [];
    }
  } catch (error) {
    console.warn(
      "⚠️  Could not check Lambda functions (this is OK if you have no functions yet)"
    );
    return [];
  }
}

function confirmDeletion(roleName, functionsUsingRole = []) {
  console.log("");
  console.log("⚠️  WARNING: This action cannot be undone!");
  console.log(`You are about to delete the IAM role: ${roleName}`);

  if (functionsUsingRole.length > 0) {
    console.log("");
    console.log(
      "🚨 IMPORTANT: This role is currently being used by Lambda functions."
    );
    console.log(
      "Deleting it will cause those functions to fail until a new role is assigned."
    );
  }

  console.log("");
  console.log("📝 What will be deleted:");
  console.log(`   - IAM Role: ${roleName}`);
  console.log(`   - Custom Policy: ${IAM_CONFIG.policyName} (if it exists)`);
  console.log("   - All policy attachments");

  // In a real-world scenario, you might want to use a proper prompt library
  // For now, we'll proceed with a simple environment variable check
  const forceDelete = process.env.FORCE_DELETE === "true";
  const confirmDelete = process.argv.includes("--confirm");

  if (!forceDelete && !confirmDelete) {
    console.log("");
    console.log("❌ Deletion cancelled. To proceed, run with --confirm flag:");
    console.log("   pnpm delete-iam-role --confirm");
    console.log("");
    console.log("Or set environment variable:");
    console.log("   FORCE_DELETE=true pnpm delete-iam-role");
    return false;
  }

  return true;
}

async function deleteIAMRole() {
  console.log("🗑️  Deleting IAM role for Slot Machine API...");
  console.log("");

  // Validate prerequisites
  checkAWSCLI();
  checkCredentials();

  const accountId = getAccountId();
  console.log(`✅ AWS Account ID: ${accountId}`);

  const { roleName } = IAM_CONFIG;

  // Check if role exists
  if (!roleExists(roleName)) {
    console.log(`✅ IAM role "${roleName}" doesn't exist, nothing to delete`);
    return;
  }

  // Check for Lambda functions using this role
  const functionsUsingRole = checkLambdaFunctionsUsingRole(accountId, roleName);

  // Confirm deletion
  if (!confirmDeletion(roleName, functionsUsingRole)) {
    return;
  }

  console.log("");
  console.log("🗑️  Starting deletion process...");

  try {
    // Step 1: Detach all policies from the role
    if (!detachPolicies(roleName)) {
      console.log("⚠️  Some policies could not be detached, but continuing...");
    }

    // Step 2: Delete the custom policy
    if (!deleteCustomPolicy(accountId)) {
      console.log("⚠️  Custom policy could not be deleted, but continuing...");
    }

    // Step 3: Delete the role
    if (!deleteRole(roleName)) {
      console.error("❌ Failed to delete IAM role");
      process.exit(1);
    }

    console.log("");
    console.log("🎉 IAM role deletion completed successfully!");
    console.log("");
    console.log("📝 Next steps:");
    console.log(
      "1. If you have Lambda functions, they will need a new execution role"
    );
    console.log(
      '2. Run "pnpm create-iam-role" to recreate the role when needed'
    );
    console.log(
      "3. Update scripts/deploy.js if you create a new role with a different name"
    );
  } catch (error) {
    console.error("\\n❌ IAM role deletion failed:", error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  deleteIAMRole().catch(console.error);
}

module.exports = { deleteIAMRole };
