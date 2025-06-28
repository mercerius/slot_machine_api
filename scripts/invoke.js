const { execSync } = require("child_process");

// Configuration
const config = {
  dev: {
    functionName: "slot-machine-api-dev",
  },
  prod: {
    functionName: "slot-machine-api-prod",
  },
};

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

function invokeFunction(environment = "dev", payload = null) {
  const { functionName } = config[environment];

  if (!functionName) {
    console.error(`❌ Unknown environment: ${environment}`);
    console.error("Available environments: dev, prod");
    process.exit(1);
  }

  // Default test payload
  const defaultPayload = {
    httpMethod: "POST",
    path: "/spin",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ bet: 5 }),
    pathParameters: null,
    queryStringParameters: null,
    isBase64Encoded: false,
  };

  const testPayload = payload || defaultPayload;

  console.log(`🎰 Invoking Lambda function: ${functionName}`);
  console.log(`📤 Payload: ${JSON.stringify(testPayload, null, 2)}`);
  console.log("");

  try {
    // Create a temporary file for the payload
    const fs = require("fs");
    const path = require("path");
    const tempDir = require("os").tmpdir();
    const payloadFile = path.join(tempDir, `lambda-payload-${Date.now()}.json`);

    fs.writeFileSync(payloadFile, JSON.stringify(testPayload));

    const command = `aws lambda invoke \\
      --function-name ${functionName} \\
      --payload file://${payloadFile} \\
      --cli-binary-format raw-in-base64-out \\
      response.json`;

    const output = executeCommand(command, `Invoking ${functionName}`);
    const invokeResult = JSON.parse(output);

    console.log("📊 Invocation Result:");
    console.log(`   Status Code: ${invokeResult.StatusCode}`);
    console.log(`   Execution Duration: ${invokeResult.ExecutedVersion}`);

    if (invokeResult.FunctionError) {
      console.log(`   Error Type: ${invokeResult.FunctionError}`);
    }

    // Read the response
    if (fs.existsSync("response.json")) {
      const response = fs.readFileSync("response.json", "utf8");

      try {
        const parsedResponse = JSON.parse(response);
        console.log("");
        console.log("📥 Lambda Response:");
        console.log(JSON.stringify(parsedResponse, null, 2));

        // If it's our slot machine response, format it nicely
        if (parsedResponse.statusCode === 200) {
          try {
            const slotResult = JSON.parse(parsedResponse.body);
            console.log("");
            console.log("🎰 Slot Machine Result:");
            console.log(`   🎲 Reels: ${slotResult.reels.join(" ")}`);
            console.log(`   💰 Win: ${slotResult.isWin ? "YES" : "NO"}`);
            if (slotResult.isWin) {
              console.log(`   💵 Amount: ${slotResult.winAmount}`);
              console.log(`   🎯 Combination: ${slotResult.combination}`);
            }
            console.log(`   🆔 Spin ID: ${slotResult.spinId}`);
          } catch {
            // Not a slot machine response, that's fine
          }
        }
      } catch (error) {
        console.log("");
        console.log("📥 Raw Response:");
        console.log(response);
      }

      // Clean up response file
      fs.unlinkSync("response.json");
    }

    // Clean up payload file
    fs.unlinkSync(payloadFile);

    console.log("");
    console.log("✅ Function invocation completed");
  } catch (error) {
    console.error(`❌ Error invoking function: ${error.message}`);

    // Clean up files if they exist
    try {
      const fs = require("fs");
      if (fs.existsSync("response.json")) fs.unlinkSync("response.json");
    } catch {}
  }
}

function invokeWithCustomPayload(environment, bet) {
  const customPayload = {
    httpMethod: "POST",
    path: "/spin",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ bet: parseInt(bet) }),
    pathParameters: null,
    queryStringParameters: null,
    isBase64Encoded: false,
  };

  invokeFunction(environment, customPayload);
}

function runTestSuite(environment = "dev") {
  console.log(
    `🧪 Running test suite for ${environment.toUpperCase()} environment...`
  );
  console.log("");

  const tests = [
    { name: "Default bet (1)", bet: 1 },
    { name: "Small bet (5)", bet: 5 },
    { name: "Medium bet (25)", bet: 25 },
    { name: "Large bet (100)", bet: 100 },
    { name: "Invalid bet (150)", bet: 150 },
  ];

  tests.forEach((test, index) => {
    console.log(`\n🔍 Test ${index + 1}/5: ${test.name}`);
    console.log("─".repeat(50));
    invokeWithCustomPayload(environment, test.bet);
  });

  console.log("\n🎉 Test suite completed!");
}

// Parse command line arguments
const args = process.argv.slice(2);
const environment = args.find((arg) => ["dev", "prod"].includes(arg)) || "dev";
const betAmount = args.find((arg) => /^\\d+$/.test(arg));
const isTestSuite = args.includes("--test") || args.includes("-t");

if (require.main === module) {
  if (isTestSuite) {
    runTestSuite(environment);
  } else if (betAmount) {
    invokeWithCustomPayload(environment, betAmount);
  } else {
    invokeFunction(environment);
  }
}

module.exports = { invokeFunction, invokeWithCustomPayload, runTestSuite };
