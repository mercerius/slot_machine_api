import type { VercelRequest, VercelResponse } from "@vercel/node";
import healthHandler from "../api/health";
import spinHandler from "../api/spin";
import { clearAppConfigCache } from "../src/config";

jest.mock("../src/db", () => ({
  hashIp: jest.fn(() => "hashed-ip"),
  recordSpin: jest.fn().mockResolvedValue(undefined),
}));

type Headers = Record<string, string>;

interface MockVercelResponse extends VercelResponse {
  statusCode: number;
  payload: unknown;
}

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

  return { response: response as unknown as MockVercelResponse, headers };
}

function createMockRequest(
  overrides: Partial<VercelRequest> = {}
): VercelRequest {
  return {
    method: "GET",
    body: {},
    headers: {},
    ...overrides,
  } as unknown as VercelRequest;
}

describe("Vercel handlers", () => {
  beforeEach(() => {
    process.env["MAX_BET_AMOUNT"] = "100";
    process.env["CORS_ORIGINS"] = "*";
    clearAppConfigCache();
  });

  describe("health", () => {
    it("should return health response", () => {
      const { response } = createMockResponse();
      healthHandler(createMockRequest({ method: "GET" }), response);

      expect(response.statusCode).toBe(200);
      expect(response.payload).toHaveProperty("status", "ok");
    });

    it("should handle CORS preflight", () => {
      const { response, headers } = createMockResponse();
      healthHandler(createMockRequest({ method: "OPTIONS" }), response);

      expect(response.statusCode).toBe(200);
      expect(headers["Access-Control-Allow-Origin"]).toBe("*");
      expect(headers["Access-Control-Allow-Methods"]).toBe("OPTIONS, GET");
    });

    it("should reject non-GET methods", () => {
      const { response } = createMockResponse();
      healthHandler(createMockRequest({ method: "POST" }), response);

      expect(response.statusCode).toBe(405);
    });
  });

  describe("spin", () => {
    it("should spin successfully with valid bet", async () => {
      const { response } = createMockResponse();
      await spinHandler(
        createMockRequest({ method: "POST", body: { bet: 5 } }),
        response
      );

      expect(response.statusCode).toBe(200);
      expect(response.payload).toHaveProperty("reels");
      expect(response.payload).toHaveProperty("spinId");
    });

    it("should reject oversized bet", async () => {
      const { response } = createMockResponse();
      await spinHandler(
        createMockRequest({ method: "POST", body: { bet: 150 } }),
        response
      );

      expect(response.statusCode).toBe(400);
      expect(response.payload).toEqual({ error: "Maximum bet amount is 100" });
    });

    it("should reject GET spin", async () => {
      const { response } = createMockResponse();
      await spinHandler(createMockRequest({ method: "GET" }), response);

      expect(response.statusCode).toBe(405);
    });

    it("should handle CORS preflight", async () => {
      const { response, headers } = createMockResponse();
      await spinHandler(createMockRequest({ method: "OPTIONS" }), response);

      expect(response.statusCode).toBe(200);
      expect(headers["Access-Control-Allow-Origin"]).toBe("*");
      expect(headers["Access-Control-Allow-Methods"]).toBe("OPTIONS, POST");
    });

    it("should reject unsupported methods", async () => {
      const { response } = createMockResponse();
      await spinHandler(createMockRequest({ method: "DELETE" }), response);

      expect(response.statusCode).toBe(405);
    });
  });
});
