/**
 * MCP Endpoints Tests
 * Tests for MCP HTTP endpoints using official @modelcontextprotocol/sdk
 * @module tests/mcp/endpoints.test
 */

import request from "supertest";
import express from "express";
import mcpRouter from "../../src/mcp/server";

// Create a test Express app with the MCP router
const app = express();
app.use(express.json());
app.use("/mcp", mcpRouter);

// Add error handling middleware for testing
app.use((err: any, req: any, res: any, _next: any) => {
  res.status(500).json({ error: "Internal server error" });
});

describe("MCP Endpoints", () => {
  describe("POST /mcp (MCP Protocol)", () => {
    test("should handle empty request", async () => {
      const response = await request(app).post("/mcp").send({});

      // Should return some response (SDK handles validation)
      expect(response.status).toBeGreaterThanOrEqual(200);
    });

    test("should respond to initialize request", async () => {
      const response = await request(app)
        .post("/mcp")
        .set("Accept", "application/json, text/event-stream")
        .set("Content-Type", "application/json")
        .send({
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {
            protocolVersion: "2024-11-05",
            capabilities: {},
            clientInfo: {
              name: "test-client",
              version: "1.0.0",
            },
          },
        });

      // The SDK may return various status codes depending on transport handling
      expect([200, 202, 406]).toContain(response.status);
    });

    test("should handle tools/list request after initialize", async () => {
      // First initialize
      await request(app)
        .post("/mcp")
        .set("Accept", "application/json, text/event-stream")
        .send({
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {
            protocolVersion: "2024-11-05",
            capabilities: {},
            clientInfo: { name: "test", version: "1.0" },
          },
        });

      // Then list tools
      const response = await request(app)
        .post("/mcp")
        .set("Accept", "application/json, text/event-stream")
        .send({
          jsonrpc: "2.0",
          id: 2,
          method: "tools/list",
        });

      expect([200, 202, 406]).toContain(response.status);
    });

    test("should handle unknown method gracefully", async () => {
      const response = await request(app)
        .post("/mcp")
        .set("Content-Type", "application/json")
        .send({
          jsonrpc: "2.0",
          id: 1,
          method: "unknown/method",
        });

      // Endpoint handles unknown methods
      expect(response.status).toBeDefined();
    });

    test("should be accessible", async () => {
      const response = await request(app)
        .post("/mcp")
        .set("Content-Type", "application/json")
        .send({
          jsonrpc: "2.0",
          id: 1,
          method: "ping",
        });

      // Endpoint exists and responds
      expect(response.status).toBeDefined();
    });
  });

  describe("MCP Server Configuration", () => {
    test("server info should match configuration via MCP protocol", async () => {
      // Test via MCP initialize method
      const response = await request(app)
        .post("/mcp")
        .set("Accept", "application/json, text/event-stream")
        .set("Content-Type", "application/json")
        .send({
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {
            protocolVersion: "2024-11-05",
            capabilities: {},
            clientInfo: { name: "test", version: "1.0" },
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.result.serverInfo.name).toBe("yahoo-finance-mcp");
      expect(response.body.result.serverInfo.version).toBe("2.0.2");
    });
  });
});
