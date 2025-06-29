import { handler, corsHandler } from "../src/handler";
import { createMockEvent } from "./mocks/event-mock";

describe("Slot Machine Handler", () => {
  describe("handler function", () => {
    it("should return a successful spin result with default bet", async () => {
      const event = createMockEvent();
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(result.headers).toEqual({
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
      });

      const body = JSON.parse(result.body);
      expect(body).toHaveProperty("reels");
      expect(body).toHaveProperty("isWin");
      expect(body).toHaveProperty("winAmount");
      expect(body).toHaveProperty("timestamp");
      expect(body).toHaveProperty("spinId");

      expect(body.reels).toHaveLength(3);
      expect(typeof body.isWin).toBe("boolean");
      expect(typeof body.winAmount).toBe("number");
      expect(typeof body.timestamp).toBe("string");
      expect(typeof body.spinId).toBe("string");
      expect(body.spinId).toMatch(/^spin_\d+_[a-z0-9]+$/);

      // Combination should be defined if there's a win, undefined/missing if there's no win
      if (body.isWin) {
        expect(body.combination).toBeDefined();
        expect(typeof body.combination).toBe("string");
      } else {
        // When there's no win, combination might be undefined or not present at all due to JSON.stringify behavior
        expect(body.combination).toBeUndefined();
      }
    });

    it("should handle custom bet amount", async () => {
      const requestBody = JSON.stringify({ bet: 5 });
      const event = createMockEvent(requestBody);
      const result = await handler(event);

      expect(result.statusCode).toBe(200);

      const body = JSON.parse(result.body);
      expect(body).toHaveProperty("reels");
      expect(body).toHaveProperty("isWin");
      expect(body).toHaveProperty("winAmount");

      // Win amount should be multiplied by bet if there's a win
      if (body.isWin) {
        expect(body.winAmount).toBeGreaterThan(0);
      } else {
        expect(body.winAmount).toBe(0);
      }
    });

    it("should reject bet amounts over 100", async () => {
      const requestBody = JSON.stringify({ bet: 150 });
      const event = createMockEvent(requestBody);
      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      expect(result.headers).toEqual({
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
      });

      const body = JSON.parse(result.body);
      expect(body).toEqual({
        error: "Maximum bet amount is 100",
      });
    });

    it("should handle invalid JSON in request body gracefully", async () => {
      const event = createMockEvent("invalid json");
      const result = await handler(event);

      expect(result.statusCode).toBe(200);

      const body = JSON.parse(result.body);
      expect(body).toHaveProperty("reels");
      expect(body).toHaveProperty("isWin");
      expect(body).toHaveProperty("winAmount");
    });

    it("should handle negative bet amounts by using default", async () => {
      const requestBody = JSON.stringify({ bet: -5 });
      const event = createMockEvent(requestBody);
      const result = await handler(event);

      expect(result.statusCode).toBe(200);

      const body = JSON.parse(result.body);
      expect(body).toHaveProperty("reels");
      expect(body).toHaveProperty("isWin");
      expect(body).toHaveProperty("winAmount");
    });

    it("should handle zero bet amount by using default", async () => {
      const requestBody = JSON.stringify({ bet: 0 });
      const event = createMockEvent(requestBody);
      const result = await handler(event);

      expect(result.statusCode).toBe(200);

      const body = JSON.parse(result.body);
      expect(body).toHaveProperty("reels");
      expect(body).toHaveProperty("isWin");
      expect(body).toHaveProperty("winAmount");
    });

    it("should handle empty request body", async () => {
      const event = createMockEvent("");
      const result = await handler(event);

      expect(result.statusCode).toBe(200);

      const body = JSON.parse(result.body);
      expect(body).toHaveProperty("reels");
      expect(body).toHaveProperty("isWin");
      expect(body).toHaveProperty("winAmount");
    });

    it("should handle null request body", async () => {
      const event = createMockEvent(undefined);
      const result = await handler(event);

      expect(result.statusCode).toBe(200);

      const body = JSON.parse(result.body);
      expect(body).toHaveProperty("reels");
      expect(body).toHaveProperty("isWin");
      expect(body).toHaveProperty("winAmount");
    });

    it("should generate valid timestamps", async () => {
      const event = createMockEvent();
      const result = await handler(event);

      expect(result.statusCode).toBe(200);

      const body = JSON.parse(result.body);
      const timestamp = new Date(body.timestamp);
      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.getTime()).not.toBeNaN();
    });

    it("should generate unique spin IDs", async () => {
      const event1 = createMockEvent();
      const event2 = createMockEvent();

      const result1 = await handler(event1);
      const result2 = await handler(event2);

      const body1 = JSON.parse(result1.body);
      const body2 = JSON.parse(result2.body);

      expect(body1.spinId).not.toBe(body2.spinId);
    });

    it("should return valid symbols", async () => {
      const event = createMockEvent();
      const result = await handler(event);

      expect(result.statusCode).toBe(200);

      const body = JSON.parse(result.body);
      const validSymbols = ["🍒", "🍋", "🍊", "🍇", "🔔", "⭐", "💎", "7️⃣"];

      body.reels.forEach((symbol: string) => {
        expect(validSymbols).toContain(symbol);
      });
    });

    it("should have consistent win calculation", async () => {
      // Test multiple spins to ensure win calculation is consistent
      const promises = Array.from({ length: 10 }, () => {
        const event = createMockEvent(JSON.stringify({ bet: 2 }));
        return handler(event);
      });

      const results = await Promise.all(promises);

      results.forEach((result) => {
        expect(result.statusCode).toBe(200);

        const body = JSON.parse(result.body);
        if (body.isWin) {
          expect(body.winAmount).toBeGreaterThan(0);
          expect(body.combination).toBeDefined();
        } else {
          expect(body.winAmount).toBe(0);
        }
      });
    });
  });

  describe("corsHandler function", () => {
    it("should return proper CORS headers", async () => {
      const event = createMockEvent(undefined, "OPTIONS");
      const result = await corsHandler(event);

      expect(result.statusCode).toBe(200);
      expect(result.headers).toEqual({
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
      });
      expect(result.body).toBe("");
    });
  });

  describe("Error handling", () => {
    it("should handle unexpected errors gracefully", async () => {
      // Create a spy on console.error to verify it gets called
      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      // Mock Math.random to throw an error - this will cause an error in getRandomSymbol
      const originalMathRandom = Math.random;
      Math.random = jest.fn().mockImplementation(() => {
        throw new Error("Test error");
      });

      const event = createMockEvent(JSON.stringify({ bet: 1 }));
      const result = await handler(event);

      expect(result.statusCode).toBe(500);
      expect(result.headers).toEqual({
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
      });

      const body = JSON.parse(result.body);
      expect(body).toEqual({
        error: "Internal server error",
      });

      // Verify that the error was logged
      expect(consoleSpy).toHaveBeenCalledWith(
        "Error in slot machine handler:",
        expect.any(Error)
      );

      // Restore original functions
      Math.random = originalMathRandom;
      consoleSpy.mockRestore();
    });
  });
});
