import { getAppConfig } from "../src/config.js";
import { hashIp, recordSpin } from "../src/db.js";
import { spinSlotMachine } from "../src/core/game.js";
import {
  createCorsHeaders,
  normalizeBet,
  parseSpinRequest,
  resolveCorsOrigin,
} from "../src/core/http.js";

interface VercelLikeRequest {
  method?: string;
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
}

interface VercelLikeResponse {
  status: (code: number) => VercelLikeResponse;
  setHeader: (name: string, value: string) => void;
  json: (body: unknown) => void;
  send: (body: unknown) => void;
}

function bodyToString(body: unknown): string | undefined {
  if (typeof body === "string") {
    return body;
  }

  if (body && typeof body === "object") {
    return JSON.stringify(body);
  }

  return undefined;
}

export default async function spinHandler(
  req: VercelLikeRequest,
  res: VercelLikeResponse
): Promise<void> {
  const config = getAppConfig();
  const origin = resolveCorsOrigin(config.corsOrigins);
  const headers = createCorsHeaders(origin);

  Object.entries(headers).forEach(([name, value]) => {
    res.setHeader(name, value);
  });

  if (req.method === "OPTIONS") {
    res.status(200).send("");
    return;
  }

  if (req.method !== "POST" && req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const requestBody =
    req.method === "POST" ? parseSpinRequest(bodyToString(req.body)) : {};
  const bet = normalizeBet(requestBody.bet);

  if (bet > config.maxBetAmount) {
    res
      .status(400)
      .json({ error: `Maximum bet amount is ${config.maxBetAmount}` });
    return;
  }

  const result = spinSlotMachine(bet);

  const rawIp = req.headers?.["x-forwarded-for"];
  const ipStr = Array.isArray(rawIp) ? (rawIp[0] ?? null) : (rawIp ?? null);

  // recordSpin is best-effort and has its own timeout so a slow DB write
  // cannot keep this Vercel function alive longer than necessary.
  await recordSpin(result, bet, hashIp(ipStr));

  res.status(200).json(result);
}
