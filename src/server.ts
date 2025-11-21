/**
 * Yahoo Finance API Server
 * Main entry point for Express server providing Yahoo Finance data
 *
 * Features:
 * - Multi-ticker support for all endpoints
 * - Response caching with configurable TTL
 * - Rate limiting per IP address
 * - Comprehensive API logging with configurable levels
 * - Swagger/OpenAPI interactive documentation
 * - MCP (Model Context Protocol) support with HTTP + SSE streaming
 * - Error handling and health checks
 */

import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";
import routes from "./routes/index";
import mcpRouter from "./mcp/server";
import { limiter, logRateLimitConfig } from "./middleware/index";
import { swaggerOptions } from "./config/swagger";
import { log } from "./utils/logger";

/**
 * Initialize Express application
 */
const app = express();

// ============================================================================
// Middleware Setup
// ============================================================================

app.use(
  cors({
    origin: true, // Allow all origins
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);
app.use(express.json());
app.use(limiter);

// ============================================================================
// Swagger/OpenAPI Documentation Setup
// ============================================================================

/**
 * Generate OpenAPI specification using JSDoc comments from routes
 * @type {Object}
 */
const swaggerSpec = swaggerJsdoc(swaggerOptions);

/**
 * Serve interactive Swagger UI documentation
 */
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/**
 * Serve OpenAPI JSON specification for third-party tools
 */
app.get("/api-docs.tson", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerSpec);
});

/**
 * Redirect root path to API documentation
 */
app.get("/", (req, res) => {
  res.redirect("/api-docs");
});

// ============================================================================
// API Routes
// ============================================================================

/**
 * Mount all API routes under root path
 */
app.use(routes);

/**
 * Mount MCP routes for LLM integration
 * Provides tool discovery and execution with SSE streaming
 */
app.use("/mcp", mcpRouter);

// ============================================================================
// Error Handling & 404
// ============================================================================

/**
 * Error handling middleware
 * Logs unhandled errors and returns generic error response
 */
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  log(
    "error",
    `Unhandled error for ${req.method} ${req.url}: ${err.message}`,
    err
  );
  res.status(500).json({ error: "Internal server error" });
});

/**
 * 404 handler for undefined routes
 */
app.use((req: Request, res: Response) => {
  log("warn", `404 Not Found: ${req.method} ${req.url} from ${req.ip}`);
  res.status(404).json({ error: "Not found" });
});

// ============================================================================
// Server Startup
// ============================================================================

const PORT = process.env.PORT || 3000;

/**
 * Start server and log configuration/endpoints
 * Only runs if this module is executed directly (not imported)
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  // Log startup configuration
  log("info", `Server starting with configuration:`, {
    logLevel: process.env.LOG_LEVEL || "info",
    cacheEnabled: process.env.CACHE_ENABLED !== "false",
    cacheTTL: parseInt(process.env.CACHE_TTL || "300"),
    rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000"),
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || "100"),
  });
  logRateLimitConfig();

  // Start listening
  app.listen(PORT, () => {
    const serverUrl =
      process.env.SWAGGER_SERVER_URL || `http://localhost:${PORT}`;
    log("info", `🚀 Server running on port ${PORT}`);
    log("info", `📖 API Documentation: ${serverUrl}/api-docs`);
    log("info", `📊 Health check: http://localhost:${PORT}/health`);
    if (process.env.SWAGGER_SERVER_URL) {
      log("info", `🔗 Swagger server URL: ${process.env.SWAGGER_SERVER_URL}`);
    } else {
      log(
        "info",
        `💡 For container environments, set SWAGGER_SERVER_URL (e.g., http://host.docker.internal:3000)`
      );
    }
    log("info", `💰 Finance API endpoints:`);
    log("info", `   GET /health - Health check`);
    log("info", `   GET /quote/:symbols - Stock quotes`);
    log("info", `   GET /history/:symbols - Historical data`);
    log("info", `   GET /info/:symbols - Company information`);
    log("info", `   GET /search/:query - Search symbols and news`);
    log("info", `   GET /trending/:region - Trending symbols by region`);
    log(
      "info",
      `   GET /recommendations/:symbol - Similar stock recommendations`
    );
    log("info", `   GET /insights/:symbol - Comprehensive stock insights`);
    log(
      "info",
      `   GET /screener/:type - Stock screeners (gainers, losers, etc.)`
    );
    log(
      "info",
      `   GET /financial/:symbol/:type - Financial statements (income, balance, cashflow)`
    );
    log("info", `   GET /news/:symbol - Company news and market context`);
    log("info", `\n🤖 MCP (Model Context Protocol) Endpoints:`);
    log("info", `   GET /mcp/health - MCP server health & tools info`);
    log("info", `   GET /mcp/tools - List all available MCP tools`);
    log("info", `   POST /mcp/call - Execute tool (JSON response)`);
    log("info", `   POST /mcp/call-stream - Execute tool (SSE streaming)`);
  });
}

export default app;
