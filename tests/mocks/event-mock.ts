import { APIGatewayProxyEvent } from "aws-lambda";

/**
 * Creates a mock API Gateway event for testing Lambda handlers
 */
export const createMockEvent = (
  body?: string,
  httpMethod: string = "POST"
): APIGatewayProxyEvent => ({
  body: body || null,
  headers: {},
  multiValueHeaders: {},
  httpMethod,
  isBase64Encoded: false,
  path: "/spin",
  pathParameters: null,
  queryStringParameters: null,
  multiValueQueryStringParameters: null,
  stageVariables: null,
  requestContext: {
    accountId: "123456789012",
    apiId: "api-id",
    protocol: "HTTP/1.1",
    httpMethod,
    path: "/spin",
    stage: "test",
    requestId: "test-request-id",
    requestTime: "09/Apr/2015:12:34:56 +0000",
    requestTimeEpoch: 1428582896000,
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
      sourceIp: "127.0.0.1",
      user: null,
      userAgent: "Custom User Agent String",
      userArn: null,
      clientCert: null,
    },
    authorizer: null,
    resourceId: "123456",
    resourcePath: "/spin",
  },
  resource: "/spin",
});
