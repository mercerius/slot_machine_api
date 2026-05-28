module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src", "<rootDir>/tests"],
  testMatch: [
    "**/__tests__/**/*.+(ts|tsx|js)",
    "**/*.(test|spec).+(ts|tsx|js)",
  ],
  transform: {
    "^.+\\.(ts|tsx)$": "ts-jest",
  },
  collectCoverageFrom: ["src/**/*.{ts,tsx}", "!src/**/*.d.ts"],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html"],
  // Improved test performance and cleanup
  testTimeout: 5000, // Reduced from 10000
  maxWorkers: "50%", // Limit workers to improve performance
  detectOpenHandles: true, // Help detect memory leaks
  // Clean up modules between tests to prevent memory leaks
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  // Force exit after tests complete
  forceExit: true,
  // Set NODE_ENV to test to avoid trying to load real secrets
  setupFilesAfterEnv: ["<rootDir>/tests/setup.ts"],
};
