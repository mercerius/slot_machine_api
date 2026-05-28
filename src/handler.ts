import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { getAppSecrets, AppSecrets } from "./secrets";
import { spinSlotMachine } from "./core/game";
import {
  createCorsHeaders,
  normalizeBet,
  parseSpinRequest,
  resolveCorsOrigin,
} from "./core/http";

let cachedSecrets: AppSecrets | null = null;

export async function preloadSecrets(): Promise<AppSecrets | null> {
  if (cachedSecrets) {
    return cachedSecrets;
  }

  try {
    cachedSecrets = await getAppSecrets();
    return cachedSecrets;
  } catch (error) {
    console.warn("Failed to preload secrets:", error);
    return null;
  }
}

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    let secrets = cachedSecrets;
    if (!secrets) {
      secrets = (await preloadSecrets()) ?? (await getAppSecrets());
      cachedSecrets = secrets;
    }

    const requestBody = parseSpinRequest(event.body);
    const bet = normalizeBet(requestBody.bet);
    const maxBetAmount = secrets.maxBetAmount || 100;
    const origin = resolveCorsOrigin(secrets.corsOrigins);

    if (bet > maxBetAmount) {
      return {
        statusCode: 400,
        headers: createCorsHeaders(origin),
        body: JSON.stringify({
          error: `Maximum bet amount is ${maxBetAmount}`,
        }),
      };
    }

    const result = spinSlotMachine(bet);

    return {
      statusCode: 200,
      headers: createCorsHeaders(origin),
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error("Error in slot machine handler:", error);

    return {
      statusCode: 500,
      headers: createCorsHeaders("*"),
      body: JSON.stringify({
        error: "Internal server error",
      }),
    };
  }
};

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
