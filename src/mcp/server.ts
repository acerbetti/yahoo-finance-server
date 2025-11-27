/**
 * MCP (Model Context Protocol) Server Implementation
 * Uses official @modelcontextprotocol/sdk for protocol-compliant MCP server
 *
 * Provides financial data tools to LLM models via Streamable HTTP transport.
 * Compatible with MCP clients: Claude, VS Code, Cursor, MCP Inspector
 *
 * @module mcp/server
 */

import router from "./endpoints";

export { mcpServer } from "./mcpServer";

export default router;
