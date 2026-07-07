export interface SpinRequest {
  bet?: number;
}

export function normalizeBet(bet: unknown): number {
  return typeof bet === "number" && Number.isFinite(bet) && bet > 0 ? bet : 1;
}

export function createCorsHeaders(
  origin: string,
  allowedMethods = "OPTIONS, POST, GET"
): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": allowedMethods,
  };
}

export function resolveCorsOrigin(origins: string[] | undefined): string {
  return origins?.[0] || "*";
}
