const fs = require("fs");
const path = require("path");
const archiver = require("archiver");

const DIST_DIR = path.join(__dirname, "..", "dist");
const OUTPUT_DIR = path.join(__dirname, "..", "build");
const PACKAGE_NAME = "slot-machine-api.zip";
const PACKAGE_PATH = path.join(OUTPUT_DIR, PACKAGE_NAME);

async function createDeploymentPackage() {
  console.log("📦 Creating deployment package...");

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Check if dist directory exists
  if (!fs.existsSync(DIST_DIR)) {
    console.error(
      '❌ Error: dist directory not found. Please run "pnpm build" first.'
    );
    process.exit(1);
  }

  return new Promise((resolve, reject) => {
    // Create a file to stream archive data to
    const output = fs.createWriteStream(PACKAGE_PATH);
    const archive = archiver("zip", {
      zlib: { level: 9 }, // Maximum compression
    });

    // Listen for all archive data to be written
    output.on("close", () => {
      const sizeInMB = (archive.pointer() / 1024 / 1024).toFixed(2);
      console.log(
        `✅ Deployment package created: ${PACKAGE_NAME} (${sizeInMB} MB)`
      );
      console.log(`📍 Location: ${PACKAGE_PATH}`);
      resolve(PACKAGE_PATH);
    });

    // Handle errors
    archive.on("error", (err) => {
      console.error("❌ Error creating deployment package:", err);
      reject(err);
    });

    // Pipe archive data to the file
    archive.pipe(output);

    // Add the compiled JavaScript files
    archive.directory(DIST_DIR, false);

    // Add package.json (required for Lambda)
    const packageJson = {
      name: "slot_machine_api",
      version: "1.0.0",
      main: "handler.js",
      dependencies: {},
    };
    archive.append(JSON.stringify(packageJson, null, 2), {
      name: "package.json",
    });

    // Finalize the archive
    archive.finalize();
  });
}

if (require.main === module) {
  createDeploymentPackage().catch(console.error);
}

module.exports = { createDeploymentPackage, PACKAGE_PATH };
