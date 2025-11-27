/**
 * MCP HTTP API Endpoints
 * Express routes for MCP server using official @modelcontextprotocol/sdk
 *
 * @module mcp/endpoints
 */

import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express, { Request, Response } from "express";

import { log } from "../utils/logger";

import { mcpServer } from "./mcpServer";

const router = express.Router();

// ============================================================================
// MCP Protocol Endpoint (Streamable HTTP Transport)
// ============================================================================

/**
 * MCP Protocol Endpoint
 * POST /mcp
 * Handles all MCP protocol messages using the official SDK transport
 * Compatible with MCP clients: Claude, VS Code, Cursor, MCP Inspector
 */
router.post("/", async (req: Request, res: Response) => {
  try {
    log("debug", "MCP: Request received", { method: req.body?.method });

    // Create a new transport for each request (stateless mode)
    // This prevents request ID collisions between different clients
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });

    res.on("close", () => {
      transport.close();
    });

    await mcpServer.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    log("error", "MCP: Protocol error:", error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: "Internal server error",
        },
        id: null,
      });
    }
  }
});

/**
 * @swagger
 * tags:
 *   - name: MCP
 *     description: Model Context Protocol endpoint for LLM integration
 */

/**
 * @swagger
 * /mcp:
 *   post:
 *     summary: MCP Protocol endpoint
 *     description: Handles MCP JSON-RPC protocol messages. Use MCP clients (Claude, VS Code, Cursor) to interact with this endpoint.
 *     tags: [MCP]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               jsonrpc:
 *                 type: string
 *                 example: "2.0"
 *               id:
 *                 type: integer
 *                 example: 1
 *               method:
 *                 type: string
 *                 example: "tools/list"
 *               params:
 *                 type: object
 *     responses:
 *       200:
 *         description: MCP response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 jsonrpc:
 *                   type: string
 *                   example: "2.0"
 *                 id:
 *                   type: integer
 *                 result:
 *                   type: object
 */

export default router;
