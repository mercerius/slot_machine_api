export interface SpinRequest {
  bet?: number;
}

export function parseSpinRequest(body: string | null | undefined): SpinRequest {
  if (!body) {
    return {};
  }

  try {
    const parsed = JSON.parse(body) as SpinRequest;
    return parsed ?? {};
  } catch {
    return {};
  }
}

export function normalizeBet(bet: unknown): number {
  return typeof bet === "number" && Number.isFinite(bet) && bet > 0 ? bet : 1;
}

export function createCorsHeaders(origin: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
  };
}

export function resolveCorsOrigin(origins: string[] | undefined): string {
  return origins?.[0] || "*";
}
