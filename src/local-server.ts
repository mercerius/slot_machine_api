import express from "express";
import { APIGatewayProxyEvent } from "aws-lambda";
import { handler, corsHandler } from "./handler";

const app = express();
const PORT = process.env["PORT"] || 3000;

// Set NODE_ENV for local development
process.env["NODE_ENV"] = process.env["NODE_ENV"] || "dev";

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS middleware
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Convert Express request to Lambda event format
function createLambdaEvent(req: express.Request): APIGatewayProxyEvent {
  // Convert query parameters safely
  const queryStringParameters: { [key: string]: string } | null =
    Object.keys(req.query).length > 0
      ? Object.fromEntries(
          Object.entries(req.query).map(([key, value]) => [
            key,
            Array.isArray(value)
              ? value[0]?.toString() || ""
              : value?.toString() || "",
          ])
        )
      : null;

  return {
    httpMethod: req.method,
    path: req.path,
    pathParameters: Object.keys(req.params).length > 0 ? req.params : null,
    queryStringParameters,
    headers: req.headers as { [key: string]: string },
    body: req.body ? JSON.stringify(req.body) : null,
    isBase64Encoded: false,
    multiValueHeaders: {},
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {
      accountId: "local",
      apiId: "local",
      protocol: "HTTP/1.1",
      httpMethod: req.method,
      path: req.path,
      stage: "local",
      requestId: `local-${Date.now()}`,
      requestTime: new Date().toISOString(),
      requestTimeEpoch: Date.now(),
      resourceId: "local",
      resourcePath: req.path,
      identity: {
        accessKey: null,
        accountId: null,
        apiKey: null,
        apiKeyId: null,
        caller: null,
        cognitoAuthenticationProvider: null,
        cognitoAuthenticationType: null,
        cognitoIdentityId: null,
        cognitoIdentityPoolId: null,
        principalOrgId: null,
        sourceIp: req.ip ?? "127.0.0.1",
        user: null,
        userAgent: req.get("User-Agent") || null,
        userArn: null,
        clientCert: null,
      },
      authorizer: null,
    },
    resource: req.path,
  };
}

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Main slot machine endpoint
app.post("/spin", async (req, res) => {
  try {
    const event = createLambdaEvent(req);
    const result = await handler(event);

    res.status(result.statusCode);

    // Set headers from Lambda response
    if (result.headers) {
      Object.entries(result.headers).forEach(([key, value]) => {
        res.set(key, value as string);
      });
    }

    // Parse body if it's JSON
    let responseBody = result.body;
    try {
      responseBody = JSON.parse(result.body);
    } catch {
      // Keep as string if not JSON
    }

    res.send(responseBody);
  } catch (error) {
    console.error("Error in local server:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Handle OPTIONS for CORS preflight
app.options("/spin", async (req, res) => {
  try {
    const event = createLambdaEvent(req);
    const result = await corsHandler(event);

    res.status(result.statusCode);
    if (result.headers) {
      Object.entries(result.headers).forEach(([key, value]) => {
        res.set(key, value as string);
      });
    }
    res.send(result.body);
  } catch (error) {
    console.error("Error in CORS handler:", error);
    res.status(200).json({});
  }
});

// Handle all other OPTIONS requests
app.options("*", (req, res) => {
  res.sendStatus(200);
});

// Catch all other routes
app.all("*", async (req, res) => {
  try {
    const event = createLambdaEvent(req);
    const result = await handler(event);

    res.status(result.statusCode);

    if (result.headers) {
      Object.entries(result.headers).forEach(([key, value]) => {
        res.set(key, value as string);
      });
    }

    let responseBody = result.body;
    try {
      responseBody = JSON.parse(result.body);
    } catch {
      // Keep as string if not JSON
    }

    res.send(responseBody);
  } catch (error) {
    console.error("Error in local server:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(PORT, () => {
  console.log(
    `🎰 Slot Machine API running locally on http://localhost:${PORT}`
  );
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🎲 Spin endpoint: POST http://localhost:${PORT}/spin`);
  console.log("");
  console.log("Example request:");
  console.log(
    `curl -X POST http://localhost:${PORT}/spin -H "Content-Type: application/json" -d '{"bet": 5}'`
  );
});
