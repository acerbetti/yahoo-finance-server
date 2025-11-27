# MCP (Model Context Protocol) Integration Guide

This document describes the MCP server implementation for the Yahoo Finance API,
using the official `@modelcontextprotocol/sdk` for full protocol compliance.

## MCP Server Overview

The MCP server extends the Yahoo Finance API with a protocol-compliant interface optimized for Large Language Models (LLMs). It provides:

- **5 Aggregated Financial Data Tools**: Comprehensive tools that combine multiple data sources for better LLM integration
- **Official MCP SDK Integration**: Full protocol compliance via `@modelcontextprotocol/sdk`
- **Stateless HTTP Transport**: Uses `StreamableHTTPServerTransport` for stateless request handling
- **Native MCP Protocol**: Compatible with Claude, VS Code, Cursor, and any MCP-compatible client

## Architecture

```
Express Server (Port 3000)
├── /api/*                     [Financial API endpoints]
├── /api-docs                  [Swagger UI documentation]
└── /mcp/*                     [MCP endpoints]
    └── POST /mcp              [MCP Protocol endpoint (SDK)]
```

## Connecting MCP Clients

### Claude Code

```bash
claude mcp add --transport http yahoo-finance http://localhost:3000/mcp
```

### VS Code

```bash
code --add-mcp "{\"name\":\"yahoo-finance\",\"type\":\"http\",\"url\":\"http://localhost:3000/mcp\"}"
```

### Cursor

Add to your Cursor MCP settings:

```json
{
  "mcpServers": {
    "yahoo-finance": {
      "type": "http",
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

### MCP Inspector

```bash
npx @modelcontextprotocol/inspector
# Connect to: http://localhost:3000/mcp
```

## MCP Endpoints

### 1. MCP Protocol Endpoint (Primary)

**POST** `/mcp`

The main MCP protocol endpoint using the official SDK's `StreamableHTTPServerTransport`. This handles all MCP protocol messages including:

- `initialize` - Client handshake and server information
- `tools/list` - List available tools
- `tools/call` - Execute a tool
- `ping` - Health check

This is the **only endpoint** you should use for MCP clients.

## Available Tools

### 1. `get_stock_overview`

Get comprehensive stock overview combining current quotes, company information, and key financial metrics.

**Arguments:**

- `symbol` (string, required): Stock ticker symbol (e.g., 'AAPL', 'GOOGL', 'MSFT')

**Returns:** Complete stock overview including:

- Current price, change, and market data
- Company information (name, industry, sector, website, business summary)
- Key financial metrics (P/E, dividend, market cap, beta, forward P/E)
- 52-week high/low and trading volume

### 2. `get_stock_analysis`

Get comprehensive stock analysis combining recommendations, insights, performance data, and optional news.

**Arguments:**

- `symbol` (string, required): Stock ticker symbol
- `includeNews` (boolean): Whether to include latest news articles (default: true)
- `newsCount` (number): Number of news articles to include (default: 5, max: 20)

**Returns:** Complete analysis including:

- Similar stock recommendations with scores
- Analyst insights (recommendation trends, insider activity, upgrades/downgrades)
- Performance analysis (1-year returns, volatility, trend direction)
- Latest news articles (if requested)

### 3. `get_market_intelligence`

Get market intelligence data including trending symbols, stock screeners, and symbol search.

**Arguments:**

- `action` (string, required): Type of market intelligence. Options: 'trending', 'screener', 'search'
- `region` (string): Region for trending data (default: 'US'). Options: 'US', 'GB', 'AU', 'CA', 'FR', 'DE', 'HK', 'SG', 'IN'
- `screenerType` (string): Screener type when action is 'screener'. Options: 'day_gainers', 'day_losers', 'most_actives', etc.
- `searchQuery` (string): Search query when action is 'search'
- `count` (number): Number of results to return (default: 25, max: 100)

**Returns:** Market intelligence data based on action:

- **trending**: List of trending symbols with prices and changes
- **screener**: Stocks matching screener criteria with market data
- **search**: Search results with symbol, name, type, and exchange

### 4. `get_financial_deep_dive`

Get comprehensive financial data including statements and holdings information.

**Arguments:**

- `symbol` (string, required): Stock ticker symbol (works best with ETFs and mutual funds)

**Returns:** Financial deep dive including:

- Financial statements (income, balance sheet, cash flow) for last 3 years
- Holdings data for ETFs/mutual funds (top holdings, sector allocations, fund profile)
- Key financial metrics and ratios

### 5. `get_news_and_research`

Get news and research data including articles, article reading, and symbol search.

**Arguments:**

- `action` (string, required): Type of news/research action. Options: 'news', 'read', 'search'
- `symbol` (string): Stock ticker symbol (required for 'news' action)
- `query` (string): Search query (required for 'search' action)
- `url` (string): Full Yahoo Finance article URL (required for 'read' action)
- `count` (number): Number of results (default: 10, max: 50)

**Returns:** News and research data based on action:

- **news**: Latest news articles for a stock symbol
- **read**: Full article content extracted from Yahoo Finance URL
- **search**: Symbol search results matching the query

## Usage Examples

### Using MCP Protocol with curl

```bash
# Initialize session and get server info
curl -X POST http://localhost:3000/mcp \
  -H "Accept: application/json, text/event-stream" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": { "name": "curl", "version": "1.0.0" }
    }
  }'

# List available tools
curl -X POST http://localhost:3000/mcp \
  -H "Accept: application/json, text/event-stream" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list"
  }'

# Call a tool
curl -X POST http://localhost:3000/mcp \
  -H "Accept: application/json, text/event-stream" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "get_stock_overview",
      "arguments": { "symbol": "AAPL" }
    }
  }'

# Health check
curl -X POST http://localhost:3000/mcp \
  -H "Accept: application/json, text/event-stream" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 4,
    "method": "ping"
  }'
```

### Using JavaScript/TypeScript with MCP Client

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const transport = new StreamableHTTPClientTransport(
  new URL("http://localhost:3000/mcp")
);

const client = new Client({
  name: "yahoo-finance-client",
  version: "1.0.0",
});

await client.connect(transport);

// List tools
const tools = await client.listTools();
console.log("Available tools:", tools);

// Call a tool
const result = await client.callTool({
  name: "get_stock_overview",
  arguments: { symbol: "AAPL" },
});
console.log("Result:", result);

await client.close();
```

### Using Python with MCP Client

```python
from mcp import ClientSession
from mcp.client.streamable_http import streamablehttp_client

async with streamablehttp_client("http://localhost:3000/mcp") as (read, write):
    async with ClientSession(read, write) as session:
        await session.initialize()

        # List tools
        tools = await session.list_tools()
        print("Available tools:", tools)

        # Call a tool
        result = await session.call_tool(
            "get_stock_overview",
            arguments={"symbol": "AAPL"}
        )
        print("Result:", result)
```

## Error Handling

When a tool execution fails, the response follows the MCP protocol error format:

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Error: Invalid symbol 'INVALID'"
      }
    ],
    "isError": true
  }
}
```

## Performance Considerations

- **Caching**: The main API endpoints cache responses (300s TTL by default)
- **Rate Limiting**: 100 requests per 15 minutes per IP address
- **Timeouts**: Yahoo Finance API calls may take 1-3 seconds
- **Stateless**: Each request is handled independently (no session state)

## Deployment

The MCP server is automatically started when the main server runs:

```bash
npm start
```

MCP endpoints are available at:

```
http://localhost:3000/mcp
```

For production deployment with custom domains:

```bash
SWAGGER_SERVER_URL=https://api.example.com npm start
```

The MCP endpoints will be available at:

```
https://api.example.com/mcp
```

## Technical Implementation

The MCP server uses:

- **@modelcontextprotocol/sdk**: Official TypeScript SDK for MCP
- **StreamableHTTPServerTransport**: Stateless HTTP transport for request handling
- **Zod schemas**: Input validation for tool parameters
- **Express.js**: HTTP server integration

### Key Files

- `src/mcp/mcpServer.ts` - MCP server instance with tool registrations
- `src/mcp/endpoints.ts` - Express router with MCP endpoints
- `src/mcp/handlers.ts` - Tool implementation logic
- `src/mcp/server.ts` - Main export for MCP router
