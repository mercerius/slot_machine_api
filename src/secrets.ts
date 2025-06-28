import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";

// Initialize the Secrets Manager client
const secretsClient = new SecretsManagerClient({
  region: process.env["AWS_REGION"] || "us-east-1",
});

// Cache for secrets to avoid repeated API calls
const secretsCache = new Map<string, any>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds
const cacheTimestamps = new Map<string, number>();

export interface AppSecrets {
  // Game configuration secrets
  maxBetAmount?: number;
  jackpotMultiplier?: number;

  // API configuration secrets
  corsOrigins?: string[];
  rateLimit?: number;

  // Environment-specific secrets
  environment?: string;
  debugMode?: boolean;

  // External API keys (if needed in future)
  apiKeys?: {
    [serviceName: string]: string;
  };
}

/**
 * Get a secret value from AWS Secrets Manager with caching
 */
async function getSecretFromAWS(secretName: string): Promise<string> {
  try {
    const command = new GetSecretValueCommand({
      SecretId: secretName,
    });

    const response = await secretsClient.send(command);

    if (!response.SecretString) {
      throw new Error(`Secret ${secretName} has no string value`);
    }

    return response.SecretString;
  } catch (error) {
    console.error(`Failed to retrieve secret ${secretName}:`, error);
    throw error;
  }
}

/**
 * Get and parse application secrets with caching
 */
export async function getAppSecrets(): Promise<AppSecrets> {
  const environment = process.env["NODE_ENV"] || "dev";
  const secretName = `slot-machine-api/${environment}`;

  // Check cache first
  const now = Date.now();
  const cacheKey = secretName;

  if (secretsCache.has(cacheKey)) {
    const cacheTime = cacheTimestamps.get(cacheKey) || 0;
    if (now - cacheTime < CACHE_TTL) {
      return secretsCache.get(cacheKey);
    }
  }

  try {
    const secretString = await getSecretFromAWS(secretName);
    const secrets: AppSecrets = JSON.parse(secretString);

    // Cache the result
    secretsCache.set(cacheKey, secrets);
    cacheTimestamps.set(cacheKey, now);

    return secrets;
  } catch (error) {
    console.warn(
      `Failed to load secrets from AWS Secrets Manager: ${error}. Using defaults.`
    );

    // Return default configuration if secrets can't be loaded
    const defaultSecrets: AppSecrets = {
      maxBetAmount: 100,
      jackpotMultiplier: 1000,
      corsOrigins: ["*"],
      rateLimit: 100,
      environment,
      debugMode: environment === "dev",
      apiKeys: {},
    };

    // Cache defaults for a shorter time
    secretsCache.set(cacheKey, defaultSecrets);
    cacheTimestamps.set(cacheKey, now);

    return defaultSecrets;
  }
}

/**
 * Get a specific secret value by key
 */
export async function getSecret(key: keyof AppSecrets): Promise<any> {
  const secrets = await getAppSecrets();
  return secrets[key];
}

/**
 * Clear the secrets cache (useful for testing or manual refresh)
 */
export function clearSecretsCache(): void {
  secretsCache.clear();
  cacheTimestamps.clear();
}

/**
 * Check if secrets are being loaded from AWS or using defaults
 */
export async function isUsingAWSSecrets(): Promise<boolean> {
  const environment = process.env["NODE_ENV"] || "dev";
  const secretName = `slot-machine-api/${environment}`;

  try {
    await getSecretFromAWS(secretName);
    return true;
  } catch {
    return false;
  }
}
