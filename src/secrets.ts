import { AppConfig, clearAppConfigCache, getAppConfig } from "./config";

export interface AppSecrets {
  maxBetAmount?: number;
  jackpotMultiplier?: number;
  corsOrigins?: string[];
  rateLimit?: number;
  environment?: string;
  debugMode?: boolean;
  apiKeys?: {
    [serviceName: string]: string;
  };
}

function toAppSecrets(config: AppConfig): AppSecrets {
  return {
    maxBetAmount: config.maxBetAmount,
    jackpotMultiplier: config.jackpotMultiplier,
    corsOrigins: config.corsOrigins,
    rateLimit: config.rateLimit,
    environment: config.environment,
    debugMode: config.debugMode,
    apiKeys: config.apiKeys,
  };
}

export async function getAppSecrets(): Promise<AppSecrets> {
  return toAppSecrets(getAppConfig());
}

export async function getSecret(
  key: keyof AppSecrets
): Promise<AppSecrets[keyof AppSecrets]> {
  const secrets = await getAppSecrets();
  return secrets[key];
}

export function clearSecretsCache(): void {
  clearAppConfigCache();
}

export async function isUsingAWSSecrets(): Promise<boolean> {
  return false;
}
