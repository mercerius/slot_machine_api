// Unit tests for internal slot machine logic
// Since the internal functions are not exported, we'll test them through the main handler
// but also create some specific tests for edge cases and game logic

import { handler } from "../src/handler";
import { createMockEvent } from "./mocks/event-mock";

describe("Slot Machine Game Logic", () => {
  describe("Payout combinations", () => {
    const validSymbols = ["🍒", "🍋", "🍊", "🍇", "🔔", "⭐", "💎", "7️⃣"];

    it("should have valid symbol distribution", async () => {
      // Test that all symbols appear over multiple spins
      const symbolCounts: Record<string, number> = {};
      // Increase number of spins for better statistical analysis
      const numSpins = 1000;

      for (let i = 0; i < numSpins; i++) {
        const event = createMockEvent();
        const result = await handler(event);
        const body = JSON.parse(result.body);

        body.reels.forEach((symbol: string) => {
          symbolCounts[symbol] = (symbolCounts[symbol] || 0) + 1;
        });
      }

      // All symbols should appear at least once
      validSymbols.forEach((symbol) => {
        expect(symbolCounts[symbol]).toBeGreaterThan(0);
      });

      // Calculate total symbols seen across all spins
      const totalSymbols = Object.values(symbolCounts).reduce(
        (sum, count) => sum + count,
        0
      );

      // Calculate expected distribution (equal probability)
      const expectedPercentage = 1 / validSymbols.length;
      const allowedDeviation = 0.02; // Allow 2% deviation from perfect distribution

      // Log the distribution for analysis
      console.log("Symbol distribution over", numSpins, "spins:");
      validSymbols.forEach((symbol) => {
        const count = symbolCounts[symbol] || 0;
        const percentage = count / totalSymbols;
        console.log(
          `${symbol}: ${count} occurrences (${(percentage * 100).toFixed(2)}%)`
        );

        // Assert that distribution is within acceptable deviation from equal probability
        expect(percentage).toBeGreaterThanOrEqual(
          expectedPercentage - allowedDeviation
        );
        expect(percentage).toBeLessThanOrEqual(
          expectedPercentage + allowedDeviation
        );
      });

      // Calculate chi-square value to test uniformity of distribution
      const expectedCount = totalSymbols / validSymbols.length;
      const chiSquare = validSymbols.reduce((sum, symbol) => {
        const observedCount = symbolCounts[symbol] || 0;
        const difference = observedCount - expectedCount;
        return sum + (difference * difference) / expectedCount;
      }, 0);

      // For 7 degrees of freedom (8 symbols - 1) and 95% confidence,
      // chi-square should be less than 14.07
      console.log(`Chi-square value: ${chiSquare.toFixed(2)}`);
      expect(chiSquare).toBeLessThan(14.07);
    }, 30000); // Increase timeout for statistical tests

    it("should calculate winnings correctly for different bet amounts", async () => {
      const betAmounts = [1, 2, 5, 10, 25, 50, 100];

      for (const bet of betAmounts) {
        const event = createMockEvent(JSON.stringify({ bet }));
        const result = await handler(event);

        expect(result.statusCode).toBe(200);

        const body = JSON.parse(result.body);

        if (body.isWin) {
          // Win amount should be proportional to bet
          expect(body.winAmount).toBeGreaterThan(0);
          expect(body.winAmount % bet).toBe(0); // Should be a multiple of bet
        }
      }
    });

    it("should handle maximum bet amount correctly", async () => {
      const event = createMockEvent(JSON.stringify({ bet: 100 }));
      const result = await handler(event);

      expect(result.statusCode).toBe(200);

      const body = JSON.parse(result.body);
      expect(body).toHaveProperty("reels");
      expect(body).toHaveProperty("isWin");
      expect(body).toHaveProperty("winAmount");
    });

    it("should maintain consistent payout structure", async () => {
      // Test that the same combination yields consistent results
      interface TestResult {
        reels: string[];
        isWin: boolean;
        winAmount: number;
        combination?: string;
        timestamp: string;
        spinId: string;
      }

      const results: TestResult[] = [];

      for (let i = 0; i < 20; i++) {
        const event = createMockEvent(JSON.stringify({ bet: 1 }));
        const result = await handler(event);
        const body = JSON.parse(result.body);
        results.push(body);
      }

      // Group results by combination
      const combinationGroups: Record<string, TestResult[]> = {};
      results.forEach((result) => {
        if (result.isWin && result.combination) {
          const key = result.combination;
          if (!combinationGroups[key]) {
            combinationGroups[key] = [];
          }
          combinationGroups[key].push(result);
        }
      });

      // Check that same combinations have same win amounts (for bet = 1)
      Object.values(combinationGroups).forEach((group) => {
        if (group.length > 1) {
          const firstWinAmount = group[0].winAmount;
          group.forEach((result) => {
            expect(result.winAmount).toBe(firstWinAmount);
          });
        }
      });
    });
  });

  describe("Random number generation", () => {
    it("should produce different results across multiple spins", async () => {
      const results: string[] = [];
      const numSpins = 50;

      for (let i = 0; i < numSpins; i++) {
        const event = createMockEvent();
        const result = await handler(event);
        const body = JSON.parse(result.body);
        results.push(body.reels.join(""));
      }

      // We should have some variety in results (not all the same)
      const uniqueResults = new Set(results);
      expect(uniqueResults.size).toBeGreaterThan(1);
    });

    it("should generate different spin IDs for concurrent requests", async () => {
      const promises = Array.from({ length: 10 }, () => {
        const event = createMockEvent();
        return handler(event);
      });

      const results = await Promise.all(promises);
      const spinIds = results.map((result) => JSON.parse(result.body).spinId);
      const uniqueSpinIds = new Set(spinIds);

      expect(uniqueSpinIds.size).toBe(10); // All spin IDs should be unique
    });
  });

  describe("Edge cases and robustness", () => {
    it("should handle malformed JSON gracefully", async () => {
      const malformedJsonCases = [
        '{"bet": }',
        '{"bet": "not a number"}',
        '{"bet": null}',
        '{"bet": undefined}',
        "{bet: 5}", // Missing quotes
        '{"bet": 5,}', // Trailing comma
      ];

      for (const malformedJson of malformedJsonCases) {
        const event = createMockEvent(malformedJson);
        const result = await handler(event);

        // Should still return a successful response with default behavior
        expect(result.statusCode).toBe(200);

        const body = JSON.parse(result.body);
        expect(body).toHaveProperty("reels");
        expect(body).toHaveProperty("isWin");
        expect(body).toHaveProperty("winAmount");
      }
    });

    it("should handle various bet value types", async () => {
      const betValueCases = [
        { bet: "5" }, // String number
        { bet: 5.5 }, // Float
        { bet: null }, // Null
        { bet: undefined }, // Undefined
        { bet: "" }, // Empty string
        { bet: "abc" }, // Non-numeric string
        { bet: [] }, // Array
        { bet: {} }, // Object
      ];

      for (const betCase of betValueCases) {
        const event = createMockEvent(JSON.stringify(betCase));
        const result = await handler(event);

        // Should handle gracefully - either accept the bet or use default
        expect([200, 400]).toContain(result.statusCode);

        if (result.statusCode === 200) {
          const body = JSON.parse(result.body);
          expect(body).toHaveProperty("reels");
          expect(body).toHaveProperty("isWin");
          expect(body).toHaveProperty("winAmount");
        }
      }
    });

    it("should handle extremely large numbers", async () => {
      const largeBetCases = [
        { bet: Number.MAX_SAFE_INTEGER },
        { bet: Number.POSITIVE_INFINITY },
        { bet: Number.NEGATIVE_INFINITY },
        { bet: Number.NaN },
      ];

      for (const betCase of largeBetCases) {
        const event = createMockEvent(JSON.stringify(betCase));
        const result = await handler(event);

        // Should either reject with 400 or use default behavior
        expect([200, 400]).toContain(result.statusCode);
      }
    });

    it("should maintain performance under load", async () => {
      const startTime = Date.now();
      // Reduce from 100 to 50 for faster tests
      const numRequests = 50;

      const promises = Array.from({ length: numRequests }, () => {
        const event = createMockEvent(
          JSON.stringify({ bet: Math.floor(Math.random() * 10) + 1 })
        );
        return handler(event);
      });

      const results = await Promise.all(promises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // All requests should complete successfully
      results.forEach((result) => {
        expect([200, 400]).toContain(result.statusCode);
      });

      // Performance check - should complete 50 requests in reasonable time
      expect(totalTime).toBeLessThan(2000); // 2 seconds should be more than enough
    });
  });
});
