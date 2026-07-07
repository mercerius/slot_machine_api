import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAppConfig } from "../src/config.js";
import { createCorsHeaders, resolveCorsOrigin } from "../src/core/http.js";

export default function healthHandler(
  req: VercelRequest,
  res: VercelResponse
): void {
  const config = getAppConfig();
  const origin = resolveCorsOrigin(config.corsOrigins);
  const headers = createCorsHeaders(origin, "OPTIONS, GET");

  Object.entries(headers).forEach(([name, value]) => {
    res.setHeader(name, value);
  });

  if (req.method === "OPTIONS") {
    res.status(200).send("");
    return;
  }

  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
}
