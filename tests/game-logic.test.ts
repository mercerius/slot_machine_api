import {
  SYMBOLS,
  calculateWinnings,
  generateSpinId,
  getRandomSymbol,
  spinSlotMachine,
} from "../src/core/game";

describe("Slot Machine Game Logic", () => {
  describe("Symbol generation", () => {
    it("should return valid symbols", () => {
      for (let i = 0; i < 100; i++) {
        expect(SYMBOLS).toContain(getRandomSymbol());
      }
    });

    it("should have a uniform symbol distribution", () => {
      const symbolCounts: Record<string, number> = {};
      const numSpins = 3000;

      for (let i = 0; i < numSpins; i++) {
        const symbol = getRandomSymbol();
        symbolCounts[symbol] = (symbolCounts[symbol] || 0) + 1;
      }

      SYMBOLS.forEach((symbol) => {
        expect(symbolCounts[symbol]).toBeGreaterThan(0);
      });

      const totalSymbols = Object.values(symbolCounts).reduce(
        (sum, count) => sum + count,
        0
      );
      const expectedPercentage = 1 / SYMBOLS.length;
      const allowedDeviation = 0.02;

      SYMBOLS.forEach((symbol) => {
        const count = symbolCounts[symbol] || 0;
        const percentage = count / totalSymbols;
        expect(percentage).toBeGreaterThanOrEqual(
          expectedPercentage - allowedDeviation
        );
        expect(percentage).toBeLessThanOrEqual(
          expectedPercentage + allowedDeviation
        );
      });

      const expectedCount = totalSymbols / SYMBOLS.length;
      const chiSquare = SYMBOLS.reduce((sum, symbol) => {
        const observedCount = symbolCounts[symbol] || 0;
        const difference = observedCount - expectedCount;
        return sum + (difference * difference) / expectedCount;
      }, 0);

      expect(chiSquare).toBeLessThan(14.07);
    }, 30000);
  });

  describe("Payout calculation", () => {
    it("should pay out for three matching symbols", () => {
      const result = calculateWinnings(["💎", "💎", "💎"], 1);
      expect(result.isWin).toBe(true);
      expect(result.winAmount).toBe(1000);
      expect(result.combination).toBe("💎💎💎");
    });

    it("should pay out for two matching symbols at the start", () => {
      const result = calculateWinnings(["🍒", "🍒", "🍋"], 1);
      expect(result.isWin).toBe(true);
      expect(result.winAmount).toBe(2);
      expect(result.combination).toBe("🍒🍒");
    });

    it("should not pay out when no symbols match at the start", () => {
      const result = calculateWinnings(["🍒", "🍋", "🍊"], 1);
      expect(result.isWin).toBe(false);
      expect(result.winAmount).toBe(0);
      expect(result.combination).toBeUndefined();
    });

    it("should scale winnings by bet amount", () => {
      const betAmounts = [1, 2, 5, 10, 25, 50, 100];

      betAmounts.forEach((bet) => {
        const result = calculateWinnings(["💎", "💎", "💎"], bet);
        expect(result.winAmount).toBe(1000 * bet);
      });
    });

    it("should prefer three-of-a-kind over two-of-a-kind", () => {
      const result = calculateWinnings(["🍒", "🍒", "🍒"], 1);
      expect(result.combination).toBe("🍒🍒🍒");
      expect(result.winAmount).toBe(10);
    });
  });

  describe("Spin results", () => {
    it("should return a valid spin result", () => {
      const result = spinSlotMachine();

      expect(result.reels).toHaveLength(3);
      result.reels.forEach((symbol) => {
        expect(SYMBOLS).toContain(symbol);
      });

      expect(typeof result.isWin).toBe("boolean");
      expect(typeof result.winAmount).toBe("number");
      expect(typeof result.timestamp).toBe("string");
      expect(typeof result.spinId).toBe("string");
      expect(result.spinId).toMatch(/^spin_\d+_[a-z0-9]+$/);

      if (result.isWin) {
        expect(result.combination).toBeDefined();
        expect(typeof result.combination).toBe("string");
        expect(result.winAmount).toBeGreaterThan(0);
      } else {
        expect(result.winAmount).toBe(0);
      }
    });

    it("should produce different results across multiple spins", () => {
      const results = new Set<string>();
      const numSpins = 50;

      for (let i = 0; i < numSpins; i++) {
        const result = spinSlotMachine();
        results.add(result.reels.join(""));
      }

      expect(results.size).toBeGreaterThan(1);
    });

    it("should generate unique spin IDs", () => {
      const spinIds = new Set<string>();

      for (let i = 0; i < 100; i++) {
        spinIds.add(generateSpinId());
      }

      expect(spinIds.size).toBe(100);
    });

    it("should generate valid timestamps", () => {
      const result = spinSlotMachine();
      const timestamp = new Date(result.timestamp);

      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.getTime()).not.toBeNaN();
    });

    it("should scale spin winnings by bet", () => {
      const betAmounts = [1, 2, 5, 10, 25, 50, 100];

      betAmounts.forEach((bet) => {
        const result = spinSlotMachine(bet);

        if (result.isWin) {
          expect(result.winAmount).toBeGreaterThan(0);
          expect(result.winAmount % bet).toBe(0);
        }
      });
    });
  });
});
