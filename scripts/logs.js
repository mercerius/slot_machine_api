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
    throw error;
  }
}

function getLogs(environment = "dev", lines = 50) {
  const { functionName } = config[environment];

  if (!functionName) {
    console.error(`❌ Unknown environment: ${environment}`);
    console.error("Available environments: dev, prod");
    process.exit(1);
  }

  console.log(`📋 Fetching last ${lines} log entries for ${functionName}...`);
  console.log("");

  try {
    // Get log groups for the function
    const logGroupName = `/aws/lambda/${functionName}`;

    const command = `aws logs describe-log-streams \\
      --log-group-name ${logGroupName} \\
      --order-by LastEventTime \\
      --descending \\
      --max-items 1 \\
      --no-cli-pager`;

    const output = executeCommand(command, "Getting latest log stream");
    const logStreams = JSON.parse(output);

    if (!logStreams.logStreams || logStreams.logStreams.length === 0) {
      console.log(
        "📝 No log streams found. The function may not have been invoked yet."
      );
      return;
    }

    const latestStream = logStreams.logStreams[0];
    console.log(`📂 Latest log stream: ${latestStream.logStreamName}`);
    console.log(
      `⏰ Last event: ${new Date(latestStream.lastEventTime).toISOString()}`
    );
    console.log("");

    // Get log events
    const eventsCommand = `aws logs get-log-events \\
      --log-group-name ${logGroupName} \\
      --log-stream-name ${latestStream.logStreamName} \\
      --start-from-head \\
      --no-cli-pager`;

    const eventsOutput = executeCommand(eventsCommand, "Fetching log events");
    const events = JSON.parse(eventsOutput);

    if (!events.events || events.events.length === 0) {
      console.log("📝 No log events found in the latest stream.");
      return;
    }

    console.log("📄 Log Events:");
    console.log("=".repeat(80));

    // Display the last N events
    const recentEvents = events.events.slice(-lines);

    recentEvents.forEach((event) => {
      const timestamp = new Date(event.timestamp).toISOString();
      console.log(`[${timestamp}] ${event.message}`);
    });

    console.log("=".repeat(80));
    console.log(
      `📊 Showing ${recentEvents.length} of ${events.events.length} total events`
    );
  } catch (error) {
    if (error.message.includes("ResourceNotFoundException")) {
      console.log(`📝 No logs found for function: ${functionName}`);
      console.log(
        "The function may not have been invoked yet, or logs may not be enabled."
      );
    } else {
      console.error(`❌ Error fetching logs: ${error.message}`);
    }
  }
}

function streamLogs(environment = "dev") {
  const { functionName } = config[environment];

  console.log(`📡 Streaming logs for ${functionName}...`);
  console.log("Press Ctrl+C to stop streaming");
  console.log("");

  try {
    const logGroupName = `/aws/lambda/${functionName}`;

    const command = `aws logs tail ${logGroupName} --follow`;

    // Use spawn instead of execSync for streaming
    const { spawn } = require("child_process");
    const tail = spawn("aws", ["logs", "tail", logGroupName, "--follow"], {
      stdio: "inherit",
    });

    tail.on("error", (error) => {
      console.error(`❌ Error streaming logs: ${error.message}`);
      process.exit(1);
    });

    tail.on("close", (code) => {
      console.log(`\n📡 Log streaming ended with code ${code}`);
    });
  } catch (error) {
    console.error(`❌ Error starting log stream: ${error.message}`);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const environment = args.find((arg) => ["dev", "prod"].includes(arg)) || "dev";
const lines = parseInt(args.find((arg) => /^\\d+$/.test(arg))) || 50;
const isStreaming = args.includes("--follow") || args.includes("-f");

if (require.main === module) {
  if (isStreaming) {
    streamLogs(environment);
  } else {
    getLogs(environment, lines);
  }
}

module.exports = { getLogs, streamLogs };
