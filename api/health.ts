interface VercelLikeRequest {
  method?: string;
}

interface VercelLikeResponse {
  status: (code: number) => VercelLikeResponse;
  setHeader: (name: string, value: string) => void;
  json: (body: unknown) => void;
}

export default function healthHandler(
  req: VercelLikeRequest,
  res: VercelLikeResponse
): void {
  if (req.method && req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  res.setHeader("Content-Type", "application/json");
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
}
