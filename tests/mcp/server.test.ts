/**
 * MCP Server tests
 * Tests for MCP (Model Context Protocol) server using official SDK
 * @module tests/mcp/server.test
 */

import { mcpServer } from "../../src/mcp/server";

describe("MCP Server", () => {
  describe("Server Configuration", () => {
    test("mcpServer should be defined", () => {
      expect(mcpServer).toBeDefined();
    });

    test("mcpServer should be an McpServer instance", () => {
      expect(mcpServer).toHaveProperty("connect");
      expect(typeof mcpServer.connect).toBe("function");
    });
  });
});
