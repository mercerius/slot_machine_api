// Jest global setup file for slot machine API tests

// Make this file a module so TypeScript allows `declare global` augmentations
export {};

// Set NODE_ENV to test to ensure deterministic configuration
process.env["NODE_ENV"] = "test";

// Increase Jest timeout for tests that might take longer
// This is a more conservative value than in jest.config to avoid test flakiness
jest.setTimeout(5000);

// Configure console to avoid excessive noise during tests
// This helps reduce memory usage from console logging during tests
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

// In test environment, we'll filter out non-critical logs
if (process.env["NODE_ENV"] === "test" && !process.env["DEBUG"]) {
  console.log = (...args: any[]) => {
    // Only allow critical logs or when DEBUG=true
    if (
      args[0]?.includes &&
      (args[0].includes("[CRITICAL]") || process.env["DEBUG"])
    ) {
      originalConsoleLog(...args);
    }
  };

  console.error = (...args: any[]) => {
    // Always show errors but limit their size
    const truncatedArgs = args.map((arg) =>
      typeof arg === "string" && arg.length > 500
        ? `${arg.substring(0, 500)}...`
        : arg
    );
    originalConsoleError(...truncatedArgs);
  };

  console.warn = (...args: any[]) => {
    // Only show warnings when DEBUG=true
    if (process.env["DEBUG"]) {
      originalConsoleWarn(...args);
    }
  };
}

// Add global teardown to clean up resources after all tests
afterAll(async () => {
  // Restore original console methods
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;

  // Allow time for any pending callbacks or timers to complete
  // This can help avoid memory leaks from dangling promises or timeouts
  await new Promise((resolve) => setTimeout(resolve, 100));
});

// Clear all mocks automatically before each test
// This is redundant with the jest.config settings but ensures it happens
// even if the config is changed
beforeEach(() => {
  jest.clearAllMocks();
});

// Define global helper functions for tests to reduce duplication
declare global {
  var flushPromises: () => Promise<void>;
}

global.flushPromises = async () => {
  // This helper allows tests to flush all pending promises
  return new Promise((resolve) => setImmediate(resolve));
};

// Add memory usage tracking in debug mode
if (process.env["DEBUG"]) {
  afterEach(() => {
    const memoryUsage = process.memoryUsage();
    console.log(
      `Memory usage: ${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB / ${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`
    );
  });
}
