export interface AppConfig {
  maxBetAmount: number;
  jackpotMultiplier: number;
  corsOrigins: string[];
  rateLimit: number;
  environment: string;
  debugMode: boolean;
  apiKeys: Record<string, string>;
}

let cachedConfig: AppConfig | null = null;

function parseNumberEnv(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid numeric env value: ${value}`);
  }

  return parsed;
}

function parseBooleanEnv(
  value: string | undefined,
  fallback: boolean
): boolean {
  if (!value) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "true" || normalized === "1") {
    return true;
  }

  if (normalized === "false" || normalized === "0") {
    return false;
  }

  throw new Error(`Invalid boolean env value: ${value}`);
}

function parseCorsOrigins(value: string | undefined): string[] {
  if (!value) {
    return ["*"];
  }

  const origins = value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return origins.length > 0 ? origins : ["*"];
}

function parseApiKeys(value: string | undefined): Record<string, string> {
  if (!value) {
    return {};
  }

  const parsed = JSON.parse(value) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("API_KEYS_JSON must be a JSON object");
  }

  return Object.fromEntries(
    Object.entries(parsed).map(([key, rawValue]) => [key, String(rawValue)])
  );
}

export function loadAppConfig(): AppConfig {
  const nodeEnv = process.env["NODE_ENV"] || "development";
  const environment =
    process.env["ENVIRONMENT"] ||
    (nodeEnv === "production"
      ? "prod"
      : nodeEnv === "development"
        ? "dev"
        : nodeEnv);

  return {
    maxBetAmount: parseNumberEnv(process.env["MAX_BET_AMOUNT"], 100),
    jackpotMultiplier: parseNumberEnv(process.env["JACKPOT_MULTIPLIER"], 1000),
    corsOrigins: parseCorsOrigins(process.env["CORS_ORIGINS"]),
    rateLimit: parseNumberEnv(process.env["RATE_LIMIT"], 100),
    environment,
    debugMode: parseBooleanEnv(
      process.env["DEBUG_MODE"],
      environment === "dev"
    ),
    apiKeys: parseApiKeys(process.env["API_KEYS_JSON"]),
  };
}

export function getAppConfig(): AppConfig {
  if (!cachedConfig) {
    cachedConfig = loadAppConfig();
  }
  return cachedConfig;
}

export function clearAppConfigCache(): void {
  cachedConfig = null;
}
