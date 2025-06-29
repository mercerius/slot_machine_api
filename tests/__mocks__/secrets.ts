// Jest mock for the secrets module
import { AppSecrets } from "../../src/secrets";

// Default test secrets to use in all tests
const testSecrets: AppSecrets = {
  maxBetAmount: 100,
  jackpotMultiplier: 1000,
  corsOrigins: ["*"],
  rateLimit: 100,
  environment: "test",
  debugMode: true,
  apiKeys: {},
};

// Mock exported functions
export const getAppSecrets = jest.fn().mockResolvedValue(testSecrets);
export const getSecret = jest
  .fn()
  .mockImplementation(async (key: keyof AppSecrets) => {
    return testSecrets[key];
  });
export const clearSecretsCache = jest.fn();
export const isUsingAWSSecrets = jest.fn().mockResolvedValue(false);

// Export the default test secrets for tests that need to reference them
export const defaultTestSecrets = testSecrets;
