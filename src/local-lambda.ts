import { APIGatewayProxyEvent } from "aws-lambda";
import { handler } from "./handler";

// Simple Lambda local simulator
class LocalLambdaSimulator {
  private createMockEvent(body?: any): APIGatewayProxyEvent {
    return {
      httpMethod: "POST",
      path: "/spin",
      pathParameters: null,
      queryStringParameters: null,
      headers: {
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : null,
      isBase64Encoded: false,
      multiValueHeaders: {},
      multiValueQueryStringParameters: null,
      stageVariables: null,
      requestContext: {
        accountId: "local",
        apiId: "local",
        protocol: "HTTP/1.1",
        httpMethod: "POST",
        path: "/spin",
        stage: "local",
        requestId: `local-${Date.now()}`,
        requestTime: new Date().toISOString(),
        requestTimeEpoch: Date.now(),
        resourceId: "local",
        resourcePath: "/spin",
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
          userAgent: "Local Lambda Simulator",
          userArn: null,
          clientCert: null,
        },
        authorizer: null,
      },
      resource: "/spin",
    };
  }

  async testSpin(bet?: number) {
    console.log(
      `\n🎰 Testing slot machine spin${bet ? ` with bet: ${bet}` : ""}...`
    );

    const event = this.createMockEvent(bet ? { bet } : undefined);

    try {
      const result = await handler(event);

      console.log(`📊 Status: ${result.statusCode}`);

      if (result.statusCode === 200) {
        const response = JSON.parse(result.body);
        console.log(`🎲 Reels: ${response.reels.join(" ")}`);
        console.log(`💰 Win: ${response.isWin ? "YES" : "NO"}`);
        if (response.isWin) {
          console.log(`💵 Amount: ${response.winAmount}`);
          console.log(`🎯 Combination: ${response.combination}`);
        }
        console.log(`🆔 Spin ID: ${response.spinId}`);
        console.log(`⏰ Timestamp: ${response.timestamp}`);
      } else {
        const errorResponse = JSON.parse(result.body);
        console.log(`❌ Error: ${errorResponse.error}`);
      }
    } catch (error) {
      console.error("❌ Error testing spin:", error);
    }
  }

  async runMultipleTests() {
    console.log("🚀 Starting Local Lambda Tests...\n");

    // Test default bet
    await this.testSpin();

    // Test with different bet amounts
    await this.testSpin(5);
    await this.testSpin(10);
    await this.testSpin(25);

    // Test invalid bet (too high)
    await this.testSpin(150);

    console.log("\n✅ Local Lambda tests completed!");
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const simulator = new LocalLambdaSimulator();
  simulator.runMultipleTests().catch(console.error);
}

export { LocalLambdaSimulator };
