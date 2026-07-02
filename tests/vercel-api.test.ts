import healthHandler from "../api/health";
import spinHandler from "../api/spin";
import { clearAppConfigCache } from "../src/config";

jest.mock("../src/db", () => ({
  hashIp: jest.fn(() => "hashed-ip"),
  recordSpin: jest.fn().mockResolvedValue(undefined),
}));

type Headers = Record<string, string>;

function createMockResponse() {
  const headers: Headers = {};
  const response = {
    statusCode: 200,
    payload: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    setHeader(name: string, value: string) {
      headers[name] = value;
    },
    json(body: unknown) {
      this.payload = body;
    },
    send(body: unknown) {
      this.payload = body;
    },
  };

  return { response, headers };
}

describe("Vercel handlers", () => {
  beforeEach(() => {
    process.env["MAX_BET_AMOUNT"] = "100";
    process.env["CORS_ORIGINS"] = "*";
    clearAppConfigCache();
  });

  it("should return health response", () => {
    const { response } = createMockResponse();
    healthHandler({ method: "GET" }, response);

    expect(response.statusCode).toBe(200);
    expect(response.payload).toHaveProperty("status", "ok");
  });

  it("should spin successfully with valid bet", async () => {
    const { response } = createMockResponse();
    await spinHandler({ method: "POST", body: { bet: 5 } }, response);

    expect(response.statusCode).toBe(200);
    expect(response.payload).toHaveProperty("reels");
    expect(response.payload).toHaveProperty("spinId");
  });

  it("should reject oversized bet", async () => {
    const { response } = createMockResponse();
    await spinHandler({ method: "POST", body: { bet: 150 } }, response);

    expect(response.statusCode).toBe(400);
    expect(response.payload).toEqual({ error: "Maximum bet amount is 100" });
  });

  it("should allow GET spin with default bet", async () => {
    const { response } = createMockResponse();
    await spinHandler({ method: "GET" }, response);

    expect(response.statusCode).toBe(200);
    expect(response.payload).toHaveProperty("reels");
    expect(response.payload).toHaveProperty("spinId");
  });

  it("should handle CORS preflight", async () => {
    const { response, headers } = createMockResponse();
    await spinHandler({ method: "OPTIONS" }, response);

    expect(response.statusCode).toBe(200);
    expect(headers["Access-Control-Allow-Origin"]).toBe("*");
  });
});
