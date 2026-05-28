import { clearAppConfigCache, getAppConfig } from "../src/config";

describe("App config", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env["MAX_BET_AMOUNT"];
    delete process.env["JACKPOT_MULTIPLIER"];
    delete process.env["CORS_ORIGINS"];
    delete process.env["RATE_LIMIT"];
    delete process.env["DEBUG_MODE"];
    delete process.env["API_KEYS_JSON"];
    delete process.env["ENVIRONMENT"];
    process.env["NODE_ENV"] = "development";
    clearAppConfigCache();
  });

  afterAll(() => {
    process.env = originalEnv;
    clearAppConfigCache();
  });

  it("should use defaults when env vars are missing", () => {
    const config = getAppConfig();

    expect(config.maxBetAmount).toBe(100);
    expect(config.jackpotMultiplier).toBe(1000);
    expect(config.corsOrigins).toEqual(["*"]);
    expect(config.rateLimit).toBe(100);
    expect(config.environment).toBe("dev");
  });

  it("should parse env vars when present", () => {
    process.env["MAX_BET_AMOUNT"] = "250";
    process.env["CORS_ORIGINS"] = "https://a.com,https://b.com";
    process.env["DEBUG_MODE"] = "false";
    clearAppConfigCache();

    const config = getAppConfig();
    expect(config.maxBetAmount).toBe(250);
    expect(config.corsOrigins).toEqual(["https://a.com", "https://b.com"]);
    expect(config.debugMode).toBe(false);
  });
});
