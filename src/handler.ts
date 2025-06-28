import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { getAppSecrets, AppSecrets } from "./secrets";

// Define the slot machine symbols
const SYMBOLS = ["🍒", "🍋", "🍊", "🍇", "🔔", "⭐", "💎", "7️⃣"];

// Define payout multipliers for different combinations
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

interface SlotMachineResult {
  reels: string[];
  isWin: boolean;
  winAmount: number;
  combination: string | undefined;
  timestamp: string;
  spinId: string;
}

interface SpinRequest {
  bet?: number;
}

// Generate a random symbol
function getRandomSymbol(): string {
  const index = Math.floor(Math.random() * SYMBOLS.length);
  return SYMBOLS[index]!;
}

// Generate a unique spin ID
function generateSpinId(): string {
  return `spin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Calculate winnings based on the reel combination
function calculateWinnings(
  reels: string[],
  bet: number
): { isWin: boolean; winAmount: number; combination: string | undefined } {
  const combination = reels.join("");

  // Check for exact matches first (3 symbols)
  if (PAYOUTS[combination]) {
    return {
      isWin: true,
      winAmount: PAYOUTS[combination]! * bet,
      combination,
    };
  }

  // Check for partial matches (2 symbols)
  const twoSymbolCombo = reels.slice(0, 2).join("");
  if (PAYOUTS[twoSymbolCombo]) {
    return {
      isWin: true,
      winAmount: PAYOUTS[twoSymbolCombo]! * bet,
      combination: twoSymbolCombo,
    };
  }

  return {
    isWin: false,
    winAmount: 0,
    combination: undefined,
  };
}

// Spin the slot machine
function spinSlotMachine(bet: number = 1): SlotMachineResult {
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

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // Load application secrets
    const secrets = await getAppSecrets();

    // Parse request body if it exists
    let requestBody: SpinRequest = {};
    if (event.body) {
      try {
        requestBody = JSON.parse(event.body);
      } catch {
        // If parsing fails, use default values
      }
    }

    // Get bet amount from request body or use default
    const bet = requestBody.bet && requestBody.bet > 0 ? requestBody.bet : 1;

    // Validate bet amount using secrets configuration
    const maxBetAmount = secrets.maxBetAmount || 100;
    if (bet > maxBetAmount) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": secrets.corsOrigins?.[0] || "*",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
        },
        body: JSON.stringify({
          error: `Maximum bet amount is ${maxBetAmount}`,
        }),
      };
    }

    // Spin the slot machine
    const result = spinSlotMachine(bet);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": secrets.corsOrigins?.[0] || "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
      },
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error("Error in slot machine handler:", error);

    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
      },
      body: JSON.stringify({
        error: "Internal server error",
      }),
    };
  }
};

// Handle CORS preflight requests
export const corsHandler = async (
  _event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  return {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
    },
    body: "",
  };
};
