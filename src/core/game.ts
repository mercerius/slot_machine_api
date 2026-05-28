export const SYMBOLS = ["🍒", "🍋", "🍊", "🍇", "🔔", "⭐", "💎", "7️⃣"];

const PAYOUTS: Record<string, number> = {
  "💎💎💎": 1000,
  "7️⃣7️⃣7️⃣": 500,
  "⭐⭐⭐": 250,
  "🔔🔔🔔": 100,
  "🍇🍇🍇": 50,
  "🍊🍊🍊": 25,
  "🍋🍋🍋": 15,
  "🍒🍒🍒": 10,
  "💎💎": 20,
  "7️⃣7️⃣": 15,
  "⭐⭐": 10,
  "🔔🔔": 5,
  "🍒🍒": 2,
};

export interface SlotMachineResult {
  reels: string[];
  isWin: boolean;
  winAmount: number;
  combination: string | undefined;
  timestamp: string;
  spinId: string;
}

export function getRandomSymbol(): string {
  const index = Math.floor(Math.random() * SYMBOLS.length);
  const symbol = SYMBOLS[index];
  if (!symbol) {
    throw new Error("Failed to get random symbol");
  }
  return symbol;
}

export function generateSpinId(): string {
  return `spin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function calculateWinnings(
  reels: string[],
  bet: number
): { isWin: boolean; winAmount: number; combination: string | undefined } {
  const combination = reels.join("");

  const fullPayout = PAYOUTS[combination];
  if (fullPayout) {
    return {
      isWin: true,
      winAmount: fullPayout * bet,
      combination,
    };
  }

  const twoSymbolCombo = reels.slice(0, 2).join("");
  const twoSymbolPayout = PAYOUTS[twoSymbolCombo];
  if (twoSymbolPayout) {
    return {
      isWin: true,
      winAmount: twoSymbolPayout * bet,
      combination: twoSymbolCombo,
    };
  }

  return {
    isWin: false,
    winAmount: 0,
    combination: undefined,
  };
}

export function spinSlotMachine(bet: number = 1): SlotMachineResult {
  const reels = [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()];
  const { isWin, winAmount, combination } = calculateWinnings(reels, bet);

  return {
    reels,
    isWin,
    winAmount,
    combination,
    timestamp: new Date().toISOString(),
    spinId: generateSpinId(),
  };
}
