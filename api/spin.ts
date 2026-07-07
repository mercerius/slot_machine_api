import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAppConfig } from "../src/config.js";
import { hashIp, recordSpin } from "../src/db.js";
import { spinSlotMachine } from "../src/core/game.js";
import {
  createCorsHeaders,
  normalizeBet,
  resolveCorsOrigin,
} from "../src/core/http.js";

export default async function spinHandler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  const config = getAppConfig();
  const origin = resolveCorsOrigin(config.corsOrigins);
  const headers = createCorsHeaders(origin, "OPTIONS, POST");

  Object.entries(headers).forEach(([name, value]) => {
    res.setHeader(name, value);
  });

  if (req.method === "OPTIONS") {
    res.status(200).send("");
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const bet = normalizeBet(req.body?.bet);

  if (bet > config.maxBetAmount) {
    res
      .status(400)
      .json({ error: `Maximum bet amount is ${config.maxBetAmount}` });
    return;
  }

  const result = spinSlotMachine(bet);

  const rawIp = req.headers["x-forwarded-for"];
  const ipStr = Array.isArray(rawIp) ? (rawIp[0] ?? null) : (rawIp ?? null);

  // recordSpin is best-effort and has its own timeout so a slow DB write
  // cannot keep this Vercel function alive longer than necessary.
  await recordSpin(result, bet, hashIp(ipStr));

  res.status(200).json(result);
}
