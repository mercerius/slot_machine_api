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

    // First, try to get recent log events directly using filter-log-events
    // This is more reliable than trying to access specific log streams
    console.log(`🔄 Getting recent log events from ${logGroupName}...`);

    try {
      const filterCommand = `aws logs filter-log-events \\
        --log-group-name "${logGroupName}" \\
        --start-time ${Date.now() - 24 * 60 * 60 * 1000} \\
        --max-items ${lines} \\
        --no-cli-pager`;

      const filterOutput = executeCommand(
        filterCommand,
        "Fetching recent log events",
        true
      );
      const events = JSON.parse(filterOutput);

      if (events.events && events.events.length > 0) {
        console.log("📄 Recent Log Events:");
        console.log("=".repeat(80));

        events.events.forEach((event) => {
          try {
            const timestamp =
              typeof event.timestamp === "string"
                ? parseInt(event.timestamp)
                : event.timestamp;
            const date = new Date(timestamp);
            const timeStr = !isNaN(date.getTime())
              ? date.toISOString()
              : event.timestamp.toString();
            console.log(`[${timeStr}] ${event.message}`);
          } catch (timestampError) {
            console.log(`[${event.timestamp}] ${event.message}`);
          }
        });

        console.log("=".repeat(80));
        console.log(`📊 Showing ${events.events.length} recent events`);
        return;
      }
    } catch (filterError) {
      // If filter-log-events fails, fall back to the stream-based approach
      console.log("🔄 Trying stream-based log retrieval...");
    }

    // Fallback: Get log streams and try to access them
    const command = `aws logs describe-log-streams \\
      --log-group-name "${logGroupName}" \\
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

    // Safely handle timestamp conversion
    if (latestStream.lastEventTime) {
      try {
        const timestamp =
          typeof latestStream.lastEventTime === "string"
            ? parseInt(latestStream.lastEventTime)
            : latestStream.lastEventTime;
        const date = new Date(timestamp);
        if (!isNaN(date.getTime())) {
          console.log(`⏰ Last event: ${date.toISOString()}`);
        }
      } catch (timestampError) {
        console.log(`⏰ Last event time: ${latestStream.lastEventTime} (raw)`);
      }
    }
    console.log("");

    // Get log events
    const eventsCommand = `aws logs get-log-events \\
      --log-group-name "${logGroupName}" \\
      --log-stream-name "${latestStream.logStreamName}" \\
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
      try {
        const timestamp =
          typeof event.timestamp === "string"
            ? parseInt(event.timestamp)
            : event.timestamp;
        const date = new Date(timestamp);
        const timeStr = !isNaN(date.getTime())
          ? date.toISOString()
          : event.timestamp.toString();
        console.log(`[${timeStr}] ${event.message}`);
      } catch (timestampError) {
        console.log(`[${event.timestamp}] ${event.message}`);
      }
    });

    console.log("=".repeat(80));
    console.log(
      `📊 Showing ${recentEvents.length} of ${events.events.length} total events`
    );
  } catch (error) {
    if (error.message.includes("ResourceNotFoundException")) {
      console.log(`📝 No logs found for function: ${functionName}`);
      console.log("");
      console.log("💡 Possible reasons:");
      console.log("   • Function hasn't been invoked yet");
      console.log(
        "   • Log group doesn't exist (will be created on first invocation)"
      );
      console.log("   • Function exists but no recent activity");
      console.log("");
      console.log("🚀 Try these steps:");
      console.log("   1. Invoke the function: pnpm invoke");
      console.log("   2. Wait a few moments for logs to appear");
      console.log("   3. Run this command again: pnpm logs");
      console.log("   4. Or stream live logs: pnpm logs --follow");
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
