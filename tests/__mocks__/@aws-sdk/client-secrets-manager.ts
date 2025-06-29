// Mock for AWS Secrets Manager SDK
const MOCK_SECRETS = {
  maxBetAmount: 100,
  jackpotMultiplier: 1000,
  corsOrigins: ["*"],
  rateLimit: 100,
  environment: "test",
  debugMode: true,
  apiKeys: {},
};

export class SecretsManagerClient {
  constructor(_config?: any) {
    // Mock constructor
  }

  // Make this synchronous for tests to eliminate any waiting
  send(command: any): any {
    const secretId = command.input?.SecretId || "";

    // Mock implementation that returns default secrets for test environments
    if (secretId.includes("slot-machine-api/") || secretId.includes("test")) {
      return Promise.resolve({
        SecretString: JSON.stringify(MOCK_SECRETS),
      });
    }

    // Simulate secret not found for other cases
    const error = new Error("Secrets Manager can't find the specified secret.");
    (error as any).$fault = "client";
    (error as any).$metadata = {
      httpStatusCode: 400,
      requestId: "mock-request-id",
      extendedRequestId: undefined,
      cfId: undefined,
      attempts: 1,
      totalRetryDelay: 0,
    };
    (error as any).__type = "ResourceNotFoundException";
    return Promise.reject(error);
  }
}

export class GetSecretValueCommand {
  input: any;

  constructor(input: any) {
    this.input = input;
  }
}
